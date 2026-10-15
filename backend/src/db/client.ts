import { env } from '../config/env.js';
import {
  IUbsRepository,
  PostgisUbsRepository,
  InMemoryUbsRepository,
} from './database-adapter.js';
import { OFFICIAL_BRAZILIAN_UBS_SEEDS } from './seeds/initial-ubs.js';

let ubsRepositoryInstance: IUbsRepository | null = null;

export async function getUbsRepository(): Promise<IUbsRepository> {
  if (ubsRepositoryInstance) {
    return ubsRepositoryInstance;
  }

  if (env.USE_EMBEDDED_DB) {
    console.log('ℹ️ [DB] Modo Standalone ativo: utilizando repositório em memória com sementes oficiais do CNES.');
    ubsRepositoryInstance = new InMemoryUbsRepository(OFFICIAL_BRAZILIAN_UBS_SEEDS);
    return ubsRepositoryInstance;
  }

  try {
    const postgisRepo = new PostgisUbsRepository(env.DATABASE_URL);
    // Testa conectividade com o PostgreSQL/PostGIS
    await postgisRepo.count();
    console.log('✅ [DB] Conectado com sucesso ao PostgreSQL/PostGIS.');
    ubsRepositoryInstance = postgisRepo;
    return ubsRepositoryInstance;
  } catch (error) {
    console.warn(
      '⚠️ [DB] Não foi possível conectar ao PostgreSQL/PostGIS:',
      (error as Error).message
    );
    console.warn('🔄 [DB] Ativando fallback automático para repositório Standalone em memória para manter o sistema operacional.');
    ubsRepositoryInstance = new InMemoryUbsRepository(OFFICIAL_BRAZILIAN_UBS_SEEDS);
    return ubsRepositoryInstance;
  }
}
