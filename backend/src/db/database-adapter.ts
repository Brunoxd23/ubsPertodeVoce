import pg from 'pg';
import { IUbs } from '../modules/ubs/ubs.entity.js';
import { env } from '../config/env.js';

let DatabaseSync: any;
try {
  // Carrega o módulo nativo do Node sem interferência de bundlers do Vitest
  const dynamicRequire = eval('require');
  DatabaseSync = dynamicRequire('node:sqlite').DatabaseSync;
} catch {
  // node:sqlite não disponível neste ambiente
}

export interface UbsSearchParams {
  lat?: number;
  lon?: number;
  raioKm?: number;
  municipio?: string;
  uf?: string;
  bairro?: string;
  cep?: string;
  termo?: string;
  page: number;
  limit: number;
}

export interface UbsSearchResult {
  items: (IUbs & { distanciaKm?: number })[];
  total: number;
}

export interface UbsMapParams {
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
  lat?: number;
  lon?: number;
  raioKm?: number;
  municipio?: string;
  uf?: string;
  bairro?: string;
  termo?: string;
  limit?: number;
}

export interface UbsMapResult {
  items: (IUbs & { distanciaKm?: number })[];
  mode: 'NACIONAL_DISTRIBUIDO' | 'BOUNDING_BOX' | 'PROXIMIDADE' | 'FILTRO_TEXTUAL';
}

export interface IUbsRepository {
  findByIdOrCnes(idOrCnes: string): Promise<IUbs | null>;
  search(params: UbsSearchParams): Promise<UbsSearchResult>;
  getMapPins(params: UbsMapParams): Promise<UbsMapResult>;
  upsertMany(items: IUbs[]): Promise<{ inserted: number; updated: number }>;
  count(): Promise<number>;
}

// -------------------------------------------------------------
// Adaptador 1: PostgreSQL + PostGIS (Ambiente de Produção e Docker)
// -------------------------------------------------------------
export class PostgisUbsRepository implements IUbsRepository {
  private pool: pg.Pool;

  constructor(databaseUrl = env.DATABASE_URL) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  public async count(): Promise<number> {
    const res = await this.pool.query('SELECT COUNT(*) FROM ubs');
    return parseInt(res.rows[0].count, 10);
  }

  public async findByIdOrCnes(idOrCnes: string): Promise<IUbs | null> {
    const query = `
      SELECT 
        id, cnes, nome_oficial AS "nomeOficial", nome_fantasia AS "nomeFantasia",
        tipo_estabelecimento AS "tipoEstabelecimento", endereco, numero, complemento,
        bairro, municipio, uf, cep, telefone, latitude, longitude,
        fonte_dados AS "fonteDados", 
        data_atualizacao_fonte AS "dataAtualizacaoFonte",
        data_ultima_importacao AS "dataUltimaImportacao",
        status_validacao AS "statusValidacao"
      FROM ubs 
      WHERE id = $1 OR cnes = $1
      LIMIT 1;
    `;
    const res = await this.pool.query(query, [idOrCnes]);
    return res.rows[0] || null;
  }

  public async search(params: UbsSearchParams): Promise<UbsSearchResult> {
    const { lat, lon, raioKm = 5, municipio, uf, bairro, cep, termo, page, limit } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    let distanceSelect = 'NULL::float AS "distanciaKm"';
    let orderBy = 'nome_oficial ASC';

    // Se coordenadas fornecidas, usa operador espacial do PostGIS (ST_DWithin e ST_DistanceSphere)
    if (lat !== undefined && lon !== undefined) {
      // PostGIS: MakePoint(longitude, latitude, 4326)
      const userGeomSql = `ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)`;
      values.push(lon, lat);
      paramIndex += 2;

      // Distância em metros convertida para KM
      distanceSelect = `ROUND((ST_DistanceSphere(geom, ${userGeomSql}) / 1000.0)::numeric, 2)::float AS "distanciaKm"`;

      // Raio máximo usando ST_DWithin em metros
      const raioMetros = raioKm * 1000;
      conditions.push(`geom IS NOT NULL`);
      conditions.push(`ST_DWithin(geom::geography, ${userGeomSql}::geography, $${paramIndex})`);
      values.push(raioMetros);
      paramIndex += 1;

      orderBy = `"distanciaKm" ASC, nome_oficial ASC`;
    }

    if (uf) {
      conditions.push(`uf = $${paramIndex}`);
      values.push(uf.toUpperCase());
      paramIndex += 1;
    }

    if (municipio) {
      conditions.push(`LOWER(municipio) LIKE $${paramIndex}`);
      values.push(`%${municipio.toLowerCase()}%`);
      paramIndex += 1;
    }

    if (bairro) {
      conditions.push(`LOWER(bairro) LIKE $${paramIndex}`);
      values.push(`%${bairro.toLowerCase()}%`);
      paramIndex += 1;
    }

    if (cep) {
      conditions.push(`cep = $${paramIndex}`);
      values.push(cep);
      paramIndex += 1;
    }

    if (termo) {
      conditions.push(`(
        LOWER(nome_oficial) LIKE $${paramIndex} OR 
        LOWER(nome_fantasia) LIKE $${paramIndex} OR 
        LOWER(endereco) LIKE $${paramIndex} OR
        LOWER(bairro) LIKE $${paramIndex} OR
        LOWER(municipio) LIKE $${paramIndex} OR
        cep LIKE $${paramIndex} OR
        cnes LIKE $${paramIndex}
      )`);
      values.push(`%${termo.toLowerCase()}%`);
      paramIndex += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Contagem total para paginação
    const countSql = `SELECT COUNT(*) AS total FROM ubs ${whereClause}`;
    const countRes = await this.pool.query(countSql, values.slice(0, paramIndex - 1));
    const total = parseInt(countRes.rows[0].total, 10);

    // Consulta de itens paginados
    const dataSql = `
      SELECT 
        id, cnes, nome_oficial AS "nomeOficial", nome_fantasia AS "nomeFantasia",
        tipo_estabelecimento AS "tipoEstabelecimento", endereco, numero, complemento,
        bairro, municipio, uf, cep, telefone, latitude, longitude,
        fonte_dados AS "fonteDados", 
        data_atualizacao_fonte AS "dataAtualizacaoFonte",
        data_ultima_importacao AS "dataUltimaImportacao",
        status_validacao AS "statusValidacao",
        ${distanceSelect}
      FROM ubs
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    values.push(limit, offset);
    const dataRes = await this.pool.query(dataSql, values);

    return {
      items: dataRes.rows,
      total,
    };
  }

  public async upsertMany(items: IUbs[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        const query = `
          INSERT INTO ubs (
            id, cnes, nome_oficial, nome_fantasia, tipo_estabelecimento,
            endereco, numero, complemento, bairro, municipio, uf, cep,
            telefone, latitude, longitude, geom, fonte_dados,
            data_atualizacao_fonte, data_ultima_importacao, status_validacao, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, 
            CASE WHEN $14::numeric IS NOT NULL AND $15::numeric IS NOT NULL 
                 THEN ST_SetSRID(ST_MakePoint($15, $14), 4326) 
                 ELSE NULL END,
            $16, $17, $18, $19, NOW()
          )
          ON CONFLICT (cnes) DO UPDATE SET
            nome_oficial = EXCLUDED.nome_oficial,
            nome_fantasia = EXCLUDED.nome_fantasia,
            endereco = EXCLUDED.endereco,
            numero = EXCLUDED.numero,
            bairro = EXCLUDED.bairro,
            municipio = EXCLUDED.municipio,
            uf = EXCLUDED.uf,
            cep = EXCLUDED.cep,
            telefone = EXCLUDED.telefone,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            geom = EXCLUDED.geom,
            data_ultima_importacao = EXCLUDED.data_ultima_importacao,
            status_validacao = EXCLUDED.status_validacao,
            updated_at = NOW();
        `;
        await client.query(query, [
          item.id,
          item.cnes,
          item.nomeOficial,
          item.nomeFantasia,
          item.tipoEstabelecimento,
          item.endereco,
          item.numero,
          item.complemento,
          item.bairro,
          item.municipio,
          item.uf,
          item.cep,
          item.telefone,
          item.latitude,
          item.longitude,
          item.fonteDados,
          item.dataAtualizacaoFonte,
          item.dataUltimaImportacao,
          item.statusValidacao,
        ]);
        inserted++;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return { inserted, updated: 0 };
  }

  public async getMapPins(params: UbsMapParams): Promise<UbsMapResult> {
    const { minLat, maxLat, minLon, maxLon, lat, lon, raioKm = 5, municipio, uf, bairro, termo, limit = 150 } = params;
    const conditions: string[] = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (lat !== undefined && lon !== undefined) {
      const userGeomSql = `ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)`;
      values.push(lon, lat);
      paramIndex += 2;
      conditions.push(`ST_DWithin(geom::geography, ${userGeomSql}::geography, $${paramIndex})`);
      values.push(raioKm * 1000);
      paramIndex += 1;

      const sql = `
        SELECT 
          id, cnes, nome_oficial AS "nomeOficial", nome_fantasia AS "nomeFantasia",
          tipo_estabelecimento AS "tipoEstabelecimento", endereco, numero, complemento,
          bairro, municipio, uf, cep, telefone, latitude, longitude,
          fonte_dados AS "fonteDados", 
          data_atualizacao_fonte AS "dataAtualizacaoFonte",
          data_ultima_importacao AS "dataUltimaImportacao",
          status_validacao AS "statusValidacao",
          ROUND((ST_DistanceSphere(geom, ${userGeomSql}) / 1000.0)::numeric, 2)::float AS "distanciaKm"
        FROM ubs
        WHERE ${conditions.join(' AND ')}
        ORDER BY "distanciaKm" ASC
        LIMIT $${paramIndex}
      `;
      values.push(limit);
      const res = await this.pool.query(sql, values);
      return { items: res.rows, mode: 'PROXIMIDADE' };
    }

    if (termo || municipio || uf || bairro) {
      if (uf) {
        conditions.push(`uf = $${paramIndex}`);
        values.push(uf.toUpperCase());
        paramIndex++;
      }
      if (municipio) {
        conditions.push(`LOWER(municipio) LIKE $${paramIndex}`);
        values.push(`%${municipio.toLowerCase()}%`);
        paramIndex++;
      }
      if (bairro) {
        conditions.push(`LOWER(bairro) LIKE $${paramIndex}`);
        values.push(`%${bairro.toLowerCase()}%`);
        paramIndex++;
      }
      if (termo) {
        conditions.push(`(
          LOWER(nome_oficial) LIKE $${paramIndex} OR 
          LOWER(nome_fantasia) LIKE $${paramIndex} OR 
          LOWER(endereco) LIKE $${paramIndex} OR
          cnes LIKE $${paramIndex}
        )`);
        values.push(`%${termo.toLowerCase()}%`);
        paramIndex++;
      }

      const sql = `
        SELECT 
          id, cnes, nome_oficial AS "nomeOficial", nome_fantasia AS "nomeFantasia",
          tipo_estabelecimento AS "tipoEstabelecimento", endereco, numero, complemento,
          bairro, municipio, uf, cep, telefone, latitude, longitude,
          fonte_dados AS "fonteDados", 
          data_atualizacao_fonte AS "dataAtualizacaoFonte",
          data_ultima_importacao AS "dataUltimaImportacao",
          status_validacao AS "statusValidacao"
        FROM ubs
        WHERE ${conditions.join(' AND ')}
        ORDER BY nome_oficial ASC
        LIMIT $${paramIndex}
      `;
      values.push(limit);
      const res = await this.pool.query(sql, values);
      return { items: res.rows, mode: 'FILTRO_TEXTUAL' };
    }

    if (minLat !== undefined && maxLat !== undefined && minLon !== undefined && maxLon !== undefined) {
      const latSpan = Math.abs(maxLat - minLat);
      const lonSpan = Math.abs(maxLon - minLon);

      if (latSpan <= 18 && lonSpan <= 22) {
        conditions.push(`latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        values.push(minLat, maxLat);
        paramIndex += 2;
        conditions.push(`longitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        values.push(minLon, maxLon);
        paramIndex += 2;

        const sql = `
          SELECT 
            id, cnes, nome_oficial AS "nomeOficial", nome_fantasia AS "nomeFantasia",
            tipo_estabelecimento AS "tipoEstabelecimento", endereco, numero, complemento,
            bairro, municipio, uf, cep, telefone, latitude, longitude,
            fonte_dados AS "fonteDados", 
            data_atualizacao_fonte AS "dataAtualizacaoFonte",
            data_ultima_importacao AS "dataUltimaImportacao",
            status_validacao AS "statusValidacao"
          FROM ubs
          WHERE ${conditions.join(' AND ')}
          LIMIT $${paramIndex}
        `;
        values.push(limit);
        const res = await this.pool.query(sql, values);
        return { items: res.rows, mode: 'BOUNDING_BOX' };
      }
    }

    const sql = `
      WITH Ranked AS (
        SELECT 
          id, cnes, nome_oficial AS "nomeOficial", nome_fantasia AS "nomeFantasia",
          tipo_estabelecimento AS "tipoEstabelecimento", endereco, numero, complemento,
          bairro, municipio, uf, cep, telefone, latitude, longitude,
          fonte_dados AS "fonteDados", 
          data_atualizacao_fonte AS "dataAtualizacaoFonte",
          data_ultima_importacao AS "dataUltimaImportacao",
          status_validacao AS "statusValidacao",
          ROW_NUMBER() OVER(PARTITION BY uf ORDER BY id) as rn
        FROM ubs
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      )
      SELECT * FROM Ranked WHERE rn <= 6 ORDER BY uf, rn
    `;
    const res = await this.pool.query(sql);
    return { items: res.rows, mode: 'NACIONAL_DISTRIBUIDO' };
  }
}

// -----------------------------------------------------------------------------------
// Adaptador 2: Repositório em Memória / Haversine (Execução Standalone Imediata e Testes)
// -----------------------------------------------------------------------------------
export function calcularHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export class InMemoryUbsRepository implements IUbsRepository {
  private items: Map<string, IUbs> = new Map();

  constructor(initialData: IUbs[] = []) {
    initialData.forEach((item) => this.items.set(item.id, item));
  }

  public async count(): Promise<number> {
    return this.items.size;
  }

  public async findByIdOrCnes(idOrCnes: string): Promise<IUbs | null> {
    for (const item of this.items.values()) {
      if (item.id === idOrCnes || item.cnes === idOrCnes) {
        return item;
      }
    }
    return null;
  }

  public async search(params: UbsSearchParams): Promise<UbsSearchResult> {
    const { lat, lon, raioKm = 5, municipio, uf, bairro, cep, termo, page, limit } = params;
    let list: (IUbs & { distanciaKm?: number })[] = Array.from(this.items.values());

    // Filtros textuais
    if (uf) {
      const ufUpper = uf.toUpperCase();
      list = list.filter((i) => i.uf.toUpperCase() === ufUpper);
    }

    if (municipio) {
      const munLower = municipio.toLowerCase();
      list = list.filter((i) => i.municipio.toLowerCase().includes(munLower));
    }

    if (bairro) {
      const bLower = bairro.toLowerCase();
      list = list.filter((i) => (i.bairro || '').toLowerCase().includes(bLower));
    }

    if (cep) {
      const cleanCep = cep.replace(/\D/g, '');
      list = list.filter((i) => (i.cep || '').replace(/\D/g, '') === cleanCep);
    }

    if (termo) {
      const tLower = termo.toLowerCase().trim();
      const tCleanDigits = tLower.replace(/\D/g, '');
      list = list.filter(
        (i) =>
          i.nomeOficial.toLowerCase().includes(tLower) ||
          (i.nomeFantasia && i.nomeFantasia.toLowerCase().includes(tLower)) ||
          i.endereco.toLowerCase().includes(tLower) ||
          (i.bairro && i.bairro.toLowerCase().includes(tLower)) ||
          i.municipio.toLowerCase().includes(tLower) ||
          (tCleanDigits.length >= 4 && (i.cep || '').includes(tCleanDigits)) ||
          (i.cnes && i.cnes.includes(tLower))
      );
    }

    // Filtro geográfico por proximidade (Haversine)
    if (lat !== undefined && lon !== undefined) {
      list = list
        .filter((i) => i.latitude !== null && i.longitude !== null)
        .map((i) => {
          const dist = calcularHaversineKm(lat, lon, i.latitude!, i.longitude!);
          return {
            ...i,
            distanciaKm: dist,
          };
        })
        .filter((i) => i.distanciaKm <= raioKm)
        .sort((a, b) => a.distanciaKm - b.distanciaKm);
    } else {
      list.sort((a, b) => a.nomeOficial.localeCompare(b.nomeOficial));
    }

    const total = list.length;
    const offset = (page - 1) * limit;
    const paginatedItems = list.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total,
    };
  }

  public async upsertMany(items: IUbs[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;
    for (const item of items) {
      let existingKey: string | null = null;
      for (const [key, current] of this.items.entries()) {
        if (item.cnes && current.cnes === item.cnes) {
          existingKey = key;
          break;
        }
      }

      if (existingKey) {
        this.items.set(existingKey, item);
        updated++;
      } else {
        this.items.set(item.id, item);
        inserted++;
      }
    }
    return { inserted, updated };
  }

  public async getMapPins(params: UbsMapParams): Promise<UbsMapResult> {
    const { minLat, maxLat, minLon, maxLon, lat, lon, raioKm = 5, municipio, uf, bairro, termo, limit = 150 } = params;
    let list: (IUbs & { distanciaKm?: number })[] = Array.from(this.items.values()).filter(
      (i) => i.latitude !== null && i.longitude !== null
    );

    if (lat !== undefined && lon !== undefined) {
      const items = list
        .map((i) => ({ ...i, distanciaKm: calcularHaversineKm(lat, lon, i.latitude!, i.longitude!) }))
        .filter((i) => i.distanciaKm <= raioKm)
        .sort((a, b) => a.distanciaKm - b.distanciaKm)
        .slice(0, limit);
      return { items, mode: 'PROXIMIDADE' };
    }

    if (termo || municipio || uf || bairro) {
      if (uf) {
        list = list.filter((i) => i.uf.toUpperCase() === uf.toUpperCase());
      }
      if (municipio) {
        list = list.filter((i) => i.municipio.toLowerCase().includes(municipio.toLowerCase()));
      }
      if (bairro) {
        list = list.filter((i) => (i.bairro || '').toLowerCase().includes(bairro.toLowerCase()));
      }
      if (termo) {
        const t = termo.toLowerCase().trim();
        list = list.filter(
          (i) =>
            i.nomeOficial.toLowerCase().includes(t) ||
            (i.nomeFantasia && i.nomeFantasia.toLowerCase().includes(t)) ||
            i.endereco.toLowerCase().includes(t) ||
            (i.cnes && i.cnes.includes(t))
        );
      }
      return { items: list.slice(0, limit), mode: 'FILTRO_TEXTUAL' };
    }

    if (minLat !== undefined && maxLat !== undefined && minLon !== undefined && maxLon !== undefined) {
      const latSpan = Math.abs(maxLat - minLat);
      const lonSpan = Math.abs(maxLon - minLon);
      if (latSpan <= 18 && lonSpan <= 22) {
        const bboxItems = list.filter(
          (i) =>
            i.latitude! >= minLat &&
            i.latitude! <= maxLat &&
            i.longitude! >= minLon &&
            i.longitude! <= maxLon
        );
        return { items: bboxItems.slice(0, limit), mode: 'BOUNDING_BOX' };
      }
    }

    const stateCounts: Record<string, number> = {};
    const distributed: IUbs[] = [];
    for (const item of list) {
      const count = stateCounts[item.uf] || 0;
      if (count < 6) {
        stateCounts[item.uf] = count + 1;
        distributed.push(item);
      }
    }

    return {
      items: distributed.length > 0 ? distributed : list.slice(0, limit),
      mode: 'NACIONAL_DISTRIBUIDO',
    };
  }
}

// -----------------------------------------------------------------------------------
// Adaptador 3: Repositório SQLite com as 48.000+ Unidades de Todo o Brasil
// -----------------------------------------------------------------------------------
export class SqliteNationalUbsRepository implements IUbsRepository {
  private db: any;

  constructor(dbPath: string) {
    if (!DatabaseSync) {
      throw new Error('node:sqlite não suportado neste ambiente.');
    }
    this.db = new DatabaseSync(dbPath);
  }

  public async count(): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM ubs').get() as { count: number };
    return row.count;
  }

  public async findByIdOrCnes(idOrCnes: string): Promise<IUbs | null> {
    const padded = idOrCnes.padStart(7, '0');
    const unpadded = idOrCnes.replace(/^0+/, '');
    const row = this.db
      .prepare('SELECT * FROM ubs WHERE id = ? OR cnes = ? OR cnes = ? OR cnes = ? LIMIT 1')
      .get(idOrCnes, idOrCnes, padded, unpadded) as Record<string, unknown> | undefined;

    if (!row) return null;
    return this.mapRowToUbs(row);
  }

  public async search(params: UbsSearchParams): Promise<UbsSearchResult> {
    const { lat, lon, raioKm = 5, municipio, uf, bairro, cep, termo, page, limit } = params;

    const conditions: string[] = [];
    const values: unknown[] = [];

    // Bounding Box para aproveitamento de índice espacial em B-Tree no SQLite
    if (lat !== undefined && lon !== undefined) {
      const deltaLat = (raioKm + 2) / 111.0;
      const deltaLon = (raioKm + 2) / (111.0 * Math.cos((lat * Math.PI) / 180));

      conditions.push('latitude BETWEEN ? AND ?');
      values.push(lat - deltaLat, lat + deltaLat);

      conditions.push('longitude BETWEEN ? AND ?');
      values.push(lon - deltaLon, lon + deltaLon);
    }

    if (uf) {
      conditions.push('uf = ?');
      values.push(uf.toUpperCase());
    }

    if (municipio) {
      conditions.push('municipio LIKE ?');
      values.push(`%${municipio.toUpperCase()}%`);
    }

    if (bairro) {
      conditions.push('bairro LIKE ?');
      values.push(`%${bairro.toUpperCase()}%`);
    }

    if (cep) {
      const cleanCep = cep.replace(/\D/g, '');
      conditions.push('cep LIKE ?');
      values.push(`%${cleanCep}%`);
    }

    if (termo) {
      const t = `%${termo.toUpperCase().trim()}%`;
      conditions.push(
        '(nome_oficial LIKE ? OR endereco LIKE ? OR bairro LIKE ? OR municipio LIKE ? OR cnes LIKE ?)'
      );
      values.push(t, t, t, t, t);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ubs ${whereClause}`;
    const rows = this.db.prepare(sql).all(...values) as Record<string, unknown>[];

    let items: (IUbs & { distanciaKm?: number })[] = rows.map((r) => this.mapRowToUbs(r));

    if (lat !== undefined && lon !== undefined) {
      items = items
        .filter((i) => i.latitude !== null && i.longitude !== null)
        .map((i) => ({
          ...i,
          distanciaKm: calcularHaversineKm(lat, lon, i.latitude!, i.longitude!),
        }))
        .filter((i) => i.distanciaKm <= raioKm)
        .sort((a, b) => a.distanciaKm - b.distanciaKm);
    } else {
      items.sort((a, b) => a.nomeOficial.localeCompare(b.nomeOficial));
    }

    const total = items.length;
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total,
    };
  }

  public async upsertMany(items: IUbs[]): Promise<{ inserted: number; updated: number }> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ubs (
        id, cnes, nome_oficial, nome_fantasia, tipo_estabelecimento,
        endereco, numero, complemento, bairro, municipio, uf, cep,
        telefone, latitude, longitude, fonte_dados, data_atualizacao_fonte,
        data_ultima_importacao, status_validacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    this.db.exec('BEGIN TRANSACTION');
    for (const item of items) {
      stmt.run(
        item.id,
        item.cnes,
        item.nomeOficial,
        item.nomeFantasia,
        item.tipoEstabelecimento,
        item.endereco,
        item.numero,
        item.complemento,
        item.bairro,
        item.municipio,
        item.uf,
        item.cep,
        item.telefone,
        item.latitude,
        item.longitude,
        item.fonteDados,
        item.dataAtualizacaoFonte,
        item.dataUltimaImportacao,
        item.statusValidacao
      );
      count++;
    }
    this.db.exec('COMMIT');
    return { inserted: count, updated: 0 };
  }

  private nationalOverviewCache: IUbs[] | null = null;

  public async getMapPins(params: UbsMapParams): Promise<UbsMapResult> {
    const { minLat, maxLat, minLon, maxLon, lat, lon, raioKm = 5, municipio, uf, bairro, termo, limit = 150 } = params;

    // 1. Proximidade Geográfica (GPS do usuário)
    if (lat !== undefined && lon !== undefined) {
      const deltaLat = (raioKm + 2) / 111.0;
      const deltaLon = (raioKm + 2) / (111.0 * Math.cos((lat * Math.PI) / 180));

      const sql = `
        SELECT * FROM ubs 
        WHERE latitude BETWEEN ? AND ? 
          AND longitude BETWEEN ? AND ?
      `;
      const rows = this.db.prepare(sql).all(lat - deltaLat, lat + deltaLat, lon - deltaLon, lon + deltaLon) as Record<string, unknown>[];

      const items = rows
        .map((r) => this.mapRowToUbs(r))
        .filter((i) => i.latitude !== null && i.longitude !== null)
        .map((i) => ({
          ...i,
          distanciaKm: calcularHaversineKm(lat, lon, i.latitude!, i.longitude!),
        }))
        .filter((i) => i.distanciaKm <= raioKm)
        .sort((a, b) => a.distanciaKm - b.distanciaKm)
        .slice(0, limit);

      return { items, mode: 'PROXIMIDADE' };
    }

    // 2. Filtros Textuais (Município, UF, Bairro, Termo)
    if (termo || municipio || uf || bairro) {
      const conditions: string[] = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];
      const values: unknown[] = [];

      if (uf) {
        conditions.push('uf = ?');
        values.push(uf.toUpperCase());
      }
      if (municipio) {
        conditions.push('municipio LIKE ?');
        values.push(`%${municipio.toUpperCase()}%`);
      }
      if (bairro) {
        conditions.push('bairro LIKE ?');
        values.push(`%${bairro.toUpperCase()}%`);
      }
      if (termo) {
        const t = `%${termo.toUpperCase().trim()}%`;
        conditions.push(
          '(nome_oficial LIKE ? OR endereco LIKE ? OR bairro LIKE ? OR municipio LIKE ? OR cnes LIKE ?)'
        );
        values.push(t, t, t, t, t);
      }

      const sql = `SELECT * FROM ubs WHERE ${conditions.join(' AND ')} LIMIT ?`;
      const rows = this.db.prepare(sql).all(...values, limit) as Record<string, unknown>[];
      const items = rows.map((r) => this.mapRowToUbs(r));

      return { items, mode: 'FILTRO_TEXTUAL' };
    }

    // 3. Bounding Box da Janela Visível do Mapa (Pan / Zoom)
    if (minLat !== undefined && maxLat !== undefined && minLon !== undefined && maxLon !== undefined) {
      const latSpan = Math.abs(maxLat - minLat);
      const lonSpan = Math.abs(maxLon - minLon);

      // Se a janela cobrir quase o país inteiro (zoom 1 a 4), retorna a visão nacional distribuída
      if (latSpan > 18 || lonSpan > 22) {
        return { items: this.getNationalOverview(), mode: 'NACIONAL_DISTRIBUIDO' };
      }

      const sql = `
        SELECT * FROM ubs 
        WHERE latitude BETWEEN ? AND ? 
          AND longitude BETWEEN ? AND ?
        LIMIT ?
      `;
      const rows = this.db.prepare(sql).all(minLat, maxLat, minLon, maxLon, limit) as Record<string, unknown>[];
      const items = rows.map((r) => this.mapRowToUbs(r));

      return { items, mode: 'BOUNDING_BOX' };
    }

    // 4. Padrão inicial: Visão Nacional Distribuída (todos os 27 estados representados)
    return { items: this.getNationalOverview(), mode: 'NACIONAL_DISTRIBUIDO' };
  }

  private getNationalOverview(): IUbs[] {
    if (this.nationalOverviewCache && this.nationalOverviewCache.length > 0) {
      return this.nationalOverviewCache;
    }

    const sql = `
      WITH Ranked AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY uf ORDER BY id) as rn
        FROM ubs
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      )
      SELECT * FROM Ranked
      WHERE rn <= 6
      ORDER BY uf, rn
    `;
    const rows = this.db.prepare(sql).all() as Record<string, unknown>[];
    this.nationalOverviewCache = rows.map((r) => this.mapRowToUbs(r));
    return this.nationalOverviewCache;
  }

  private mapRowToUbs(row: Record<string, unknown>): IUbs {
    return {
      id: String(row.id),
      cnes: row.cnes ? String(row.cnes) : null,
      nomeOficial: String(row.nome_oficial),
      nomeFantasia: row.nome_fantasia ? String(row.nome_fantasia) : null,
      tipoEstabelecimento: String(row.tipo_estabelecimento),
      endereco: String(row.endereco),
      numero: row.numero ? String(row.numero) : null,
      complemento: row.complemento ? String(row.complemento) : null,
      bairro: row.bairro ? String(row.bairro) : null,
      municipio: String(row.municipio),
      uf: String(row.uf),
      cep: row.cep ? String(row.cep) : null,
      telefone: row.telefone ? String(row.telefone) : null,
      latitude: typeof row.latitude === 'number' ? row.latitude : null,
      longitude: typeof row.longitude === 'number' ? row.longitude : null,
      fonteDados: String(row.fonte_dados),
      dataAtualizacaoFonte: row.data_atualizacao_fonte ? String(row.data_atualizacao_fonte) : null,
      dataUltimaImportacao: String(row.data_ultima_importacao),
      statusValidacao: (row.status_validacao as any) || 'VALIDA',
    };
  }
}

