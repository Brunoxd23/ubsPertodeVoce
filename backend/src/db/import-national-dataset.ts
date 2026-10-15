import fs from 'fs';
import readline from 'readline';
import { DatabaseSync } from 'node:sqlite';
import { CnesValidator } from '../modules/importer/cnes-validator.js';

const ufMap: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
};

import path from 'path';

async function buildNationalDatabase() {
  const baseDir = fs.existsSync('data') ? 'data' : 'backend/data';
  const csvPath = path.resolve(baseDir, 'Unidades_Basicas_Saude-UBS.csv');
  const dbPath = path.resolve(baseDir, 'ubs_nacional.db');
  const ibgePath = path.resolve(baseDir, 'ibge_municipios.json');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo CSV nacional não encontrado em:', csvPath);
    return;
  }

  let ibgeMap: Record<string, { nome: string; uf: string }> = {};
  if (fs.existsSync(ibgePath)) {
    ibgeMap = JSON.parse(fs.readFileSync(ibgePath, 'utf-8'));
  }

  console.log('🚀 Conectando ao banco de dados nacional SQLite com índices...');
  const db = new DatabaseSync(dbPath);

  db.exec(`
    PRAGMA synchronous = OFF;
    PRAGMA journal_mode = MEMORY;

    CREATE TABLE IF NOT EXISTS ubs (
      id TEXT PRIMARY KEY,
      cnes TEXT UNIQUE,
      nome_oficial TEXT NOT NULL,
      nome_fantasia TEXT,
      tipo_estabelecimento TEXT NOT NULL DEFAULT 'CENTRO DE SAUDE/UNIDADE BASICA',
      endereco TEXT NOT NULL,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      municipio TEXT NOT NULL,
      uf TEXT NOT NULL,
      cep TEXT,
      telefone TEXT,
      latitude REAL,
      longitude REAL,
      fonte_dados TEXT NOT NULL DEFAULT 'CNES/DATASUS - Ministério da Saúde',
      data_atualizacao_fonte TEXT,
      data_ultima_importacao TEXT NOT NULL,
      status_validacao TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ubs_cnes ON ubs(cnes);
    CREATE INDEX IF NOT EXISTS idx_ubs_uf ON ubs(uf);
    CREATE INDEX IF NOT EXISTS idx_ubs_municipio ON ubs(municipio);
    CREATE INDEX IF NOT EXISTS idx_ubs_bairro ON ubs(bairro);
    CREATE INDEX IF NOT EXISTS idx_ubs_coords ON ubs(latitude, longitude);
  `);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO ubs (
      id, cnes, nome_oficial, nome_fantasia, tipo_estabelecimento,
      endereco, numero, complemento, bairro, municipio, uf, cep,
      telefone, latitude, longitude, fonte_dados, data_atualizacao_fonte,
      data_ultima_importacao, status_validacao
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  console.log('📦 Lendo e indexando todas as 48.000+ UBS do Brasil...');

  const fileStream = fs.createReadStream(csvPath, { encoding: 'latin1' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  let inserted = 0;
  let isHeader = true;

  db.exec('BEGIN TRANSACTION');

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    lineCount++;

    // "CNES";UF;IBGE;"NOME";"LOGRADOURO";"BAIRRO";LATITUDE;LONGITUDE
    const parts = line.split(';').map(p => p.replace(/^"|"$/g, '').trim());
    if (parts.length < 8) continue;

    const [cnesRaw, ufRaw, ibgeCode, nomeRaw, logradouro, bairroRaw, latRaw, lonRaw] = parts;
    const cnes = cnesRaw.padStart(7, '0');

    const geoVal = CnesValidator.validarCoordenadas(latRaw, lonRaw);

    const ufInfo = ibgeMap[ibgeCode];
    const municipio = ufInfo ? ufInfo.nome.toUpperCase() : 'NÃO INFORMADO';
    const uf = ufInfo ? ufInfo.uf : (ufMap[ufRaw] || 'BR');

    insertStmt.run(
      `ubs-nat-${cnes}`,
      cnes,
      nomeRaw.toUpperCase(),
      nomeRaw.toUpperCase(),
      'CENTRO DE SAUDE/UNIDADE BASICA',
      logradouro.toUpperCase() || 'ENDEREÇO NÃO CADASTRADO',
      null,
      null,
      bairroRaw ? bairroRaw.toUpperCase() : null,
      municipio,
      uf,
      null,
      null,
      geoVal.latitude,
      geoVal.longitude,
      'CNES/DATASUS - Ministério da Saúde',
      new Date().toISOString(),
      new Date().toISOString(),
      geoVal.status
    );

    inserted++;

    if (inserted % 10000 === 0) {
      console.log(`... ${inserted} unidades inseridas`);
    }
  }

  // Insere também as sementes representativas para garantir cobertura completa
  const { OFFICIAL_BRAZILIAN_UBS_SEEDS } = await import('./seeds/initial-ubs.js');
  for (const seed of OFFICIAL_BRAZILIAN_UBS_SEEDS) {
    if (!seed.cnes) continue;
    insertStmt.run(
      seed.id,
      seed.cnes,
      seed.nomeOficial,
      seed.nomeFantasia,
      seed.tipoEstabelecimento,
      seed.endereco,
      seed.numero,
      seed.complemento,
      seed.bairro,
      seed.municipio,
      seed.uf,
      seed.cep,
      seed.telefone,
      seed.latitude,
      seed.longitude,
      seed.fonteDados,
      seed.dataAtualizacaoFonte,
      seed.dataUltimaImportacao,
      seed.statusValidacao
    );
  }

  db.exec('COMMIT');
  console.log(`🎉 Sucesso absoluto! Total de ${inserted} Unidades Básicas de Saúde indexadas de todo o Brasil!`);
}

buildNationalDatabase().catch(console.error);
