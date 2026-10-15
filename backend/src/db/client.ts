import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import {
  IUbsRepository,
  PostgisUbsRepository,
  InMemoryUbsRepository,
  SqliteNationalUbsRepository,
} from './database-adapter.js';
import { OFFICIAL_BRAZILIAN_UBS_SEEDS } from './seeds/initial-ubs.js';

let ubsRepositoryInstance: IUbsRepository | null = null;

function resolveNationalDbPath(): string | null {
  const possiblePaths = [
    path.resolve(process.cwd(), 'data', 'ubs_nacional.db'),
    path.resolve(process.cwd(), 'backend', 'data', 'ubs_nacional.db'),
    path.resolve('data', 'ubs_nacional.db'),
    path.resolve('backend', 'data', 'ubs_nacional.db'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

export async function getUbsRepository(): Promise<IUbsRepository> {
  if (ubsRepositoryInstance) {
    return ubsRepositoryInstance;
  }

  // 1. Prioridade no modo Standalone: Base Nacional SQLite Completa (48.000+ UBSs do Brasil)
  if (env.USE_EMBEDDED_DB) {
    const nationalDbPath = resolveNationalDbPath();
    if (nationalDbPath) {
      try {
        console.log(`🇧🇷 [DB] Base Nacional Completa Ativa: ${nationalDbPath}`);
        const sqliteRepo = new SqliteNationalUbsRepository(nationalDbPath);
        const total = await sqliteRepo.count();
        console.log(`✅ [DB] Total de ${total} Unidades Básicas de Saúde do Brasil carregadas e indexadas!`);
        ubsRepositoryInstance = sqliteRepo;
        return ubsRepositoryInstance;
      } catch (err: any) {
        console.warn('⚠️ [DB] Base SQLite indisponível ou ambiente sem node:sqlite:', err.message);
      }
    }

    console.log('ℹ️ [DB] Modo Standalone ativo com sementes iniciais.');
    ubsRepositoryInstance = new InMemoryUbsRepository(OFFICIAL_BRAZILIAN_UBS_SEEDS);
    return ubsRepositoryInstance;
  }

  // 2. Modo PostGIS / PostgreSQL
  try {
    const postgisRepo = new PostgisUbsRepository(env.DATABASE_URL);
    await postgisRepo.count();
    console.log('✅ [DB] Conectado com sucesso ao PostgreSQL/PostGIS.');
    ubsRepositoryInstance = postgisRepo;
    return ubsRepositoryInstance;
  } catch (error) {
    console.warn(
      '⚠️ [DB] Não foi possível conectar ao PostgreSQL/PostGIS:',
      (error as Error).message
    );
    const nationalDbPath = resolveNationalDbPath();
    if (nationalDbPath) {
      try {
        console.log(`🔄 [DB] Ativando fallback para Base Nacional Completa SQLite: ${nationalDbPath}`);
        const sqliteRepo = new SqliteNationalUbsRepository(nationalDbPath);
        ubsRepositoryInstance = sqliteRepo;
        return ubsRepositoryInstance;
      } catch (err: any) {
        console.warn('⚠️ [DB] Base SQLite indisponível no fallback:', err.message);
      }
    }

    console.warn('🔄 [DB] Ativando fallback para repositório em memória.');
    ubsRepositoryInstance = new InMemoryUbsRepository(OFFICIAL_BRAZILIAN_UBS_SEEDS);
    return ubsRepositoryInstance;
  }
}
