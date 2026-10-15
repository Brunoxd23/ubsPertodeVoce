import { getUbsRepository } from './client.js';
import { OFFICIAL_BRAZILIAN_UBS_SEEDS } from './seeds/initial-ubs.js';

async function seed() {
  console.log('🌱 Populando banco de dados com as unidades oficiais...');
  const repo = await getUbsRepository();
  const res = await repo.upsertMany(OFFICIAL_BRAZILIAN_UBS_SEEDS);
  console.log(`✅ Sucesso! Inseridas/Atualizadas: ${res.inserted + res.updated} unidades.`);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
