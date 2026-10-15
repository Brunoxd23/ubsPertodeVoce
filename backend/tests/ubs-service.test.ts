import { describe, it, expect, beforeEach } from 'vitest';
import { UbsService } from '../src/modules/ubs/ubs.service.js';
import { InMemoryUbsRepository } from '../src/db/database-adapter.js';
import { OFFICIAL_BRAZILIAN_UBS_SEEDS } from '../src/db/seeds/initial-ubs.js';
import { NotFoundError } from '../src/core/errors/app-error.js';

describe('UbsService - Consultas Geográficas e Regras de Negócio', () => {
  let repository: InMemoryUbsRepository;
  let service: UbsService;

  beforeEach(() => {
    repository = new InMemoryUbsRepository([...OFFICIAL_BRAZILIAN_UBS_SEEDS]);
    service = new UbsService(repository);
  });

  it('deve localizar UBS por proximidade geográfica ordenadas por distância', async () => {
    // Coordenadas da Avenida Paulista, São Paulo (-23.5615, -46.6559)
    const res = await service.searchUbs({
      lat: -23.5615,
      lon: -46.6559,
      raioKm: 5,
      page: 1,
      limit: 10,
    });

    expect(res.sucesso).toBe(true);
    expect(res.dados.length).toBeGreaterThan(0);
    expect(res.metadados.total).toBeGreaterThan(0);

    // O primeiro item deve ser o mais próximo (Bela Vista ou CSE Geraldo)
    const primeiro = res.dados[0];
    expect(primeiro.distanciaKm).toBeDefined();
    expect(primeiro.distanciaKm!).toBeLessThan(5);

    // Verifica ordenação crescente de distância
    for (let i = 1; i < res.dados.length; i++) {
      expect(res.dados[i].distanciaKm!).toBeGreaterThanOrEqual(res.dados[i - 1].distanciaKm!);
    }

    // Deve conter URLs geradas para navegação externa
    expect(primeiro.rotasExternas?.googleMaps).toContain('google.com/maps');
    expect(primeiro.rotasExternas?.openStreetMap).toContain('openstreetmap.org');
    expect(primeiro.rotasExternas?.waze).toContain('waze.com');
  });

  it('deve filtrar unidades por UF e Município sem exigir GPS', async () => {
    const res = await service.searchUbs({
      uf: 'RJ',
      municipio: 'RIO DE JANEIRO',
      page: 1,
      limit: 10,
    });

    expect(res.sucesso).toBe(true);
    expect(res.dados.length).toBeGreaterThan(0);
    res.dados.forEach((ubs) => {
      expect(ubs.uf).toBe('RJ');
      expect(ubs.municipio.toUpperCase()).toContain('RIO DE JANEIRO');
    });
  });

  it('deve respeitar a paginação e limites configurados', async () => {
    const limit = 2;
    const res = await service.searchUbs({
      page: 1,
      limit,
    });

    expect(res.dados.length).toBeLessThanOrEqual(limit);
    expect(res.metadados.limite).toBe(limit);
    expect(res.metadados.pagina).toBe(1);
    expect(res.metadados.totalPaginas).toBeGreaterThanOrEqual(1);
  });

  it('deve retornar detalhes por CNES oficial', async () => {
    // CNES 2787834 (CSE Geraldo de Paula Souza)
    const ubs = await service.findByIdOrCnes('2787834');
    expect(ubs).toBeDefined();
    expect(ubs.cnes).toBe('2787834');
    expect(ubs.nomeOficial).toContain('GERALDO DE PAULA SOUZA');
    expect(ubs.rotasExternas).toBeDefined();
  });

  it('deve localizar com precisão a UBS Jardim das Margaridas por termo, bairro, rua ou CEP', async () => {
    // 1. Busca por nome/termo "Margaridas"
    const buscaNome = await service.searchUbs({ termo: 'Margaridas', page: 1, limit: 10 });
    expect(buscaNome.dados.length).toBeGreaterThan(0);
    expect(buscaNome.dados[0].nomeOficial).toBe('UBS JARDIM DAS MARGARIDAS');
    expect(buscaNome.dados[0].cnes).toBe('2061279');

    // 2. Busca por rua "Paulo Augusto de Andrade"
    const buscaRua = await service.searchUbs({ termo: 'Paulo Augusto de Andrade', page: 1, limit: 10 });
    expect(buscaRua.dados.length).toBeGreaterThan(0);
    expect(buscaRua.dados[0].endereco).toContain('PAULO AUGUSTO DE ANDRADE');

    // 3. Busca por município "Taboão da Serra"
    const buscaMunicipio = await service.searchUbs({ termo: 'Taboão da Serra', page: 1, limit: 10 });
    expect(buscaMunicipio.dados.length).toBeGreaterThanOrEqual(9);

    // 4. Busca por CEP "06786-070"
    const buscaCep = await service.searchUbs({ termo: '06786-070', page: 1, limit: 10 });
    expect(buscaCep.dados.length).toBeGreaterThan(0);
    expect(buscaCep.dados[0].cnes).toBe('2061279');
  });

  it('deve lançar NotFoundError ao buscar CNES inexistente', async () => {
    await expect(service.findByIdOrCnes('0000000000')).rejects.toThrow(NotFoundError);
  });
});

