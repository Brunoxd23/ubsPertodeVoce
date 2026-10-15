import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('API REST - Testes de Integração e Segurança (Fastify Endpoints)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health - deve retornar status operacional sem vazar dados sensíveis', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
    expect(body.versao).toBe('1.0.0');
    expect(body.uptimeSegundos).toBeDefined();
    expect(body.bancoDados.conectado).toBe(true);
    // Assegura que credenciais não foram vazadas
    expect(body.bancoDados.password).toBeUndefined();
    expect(body.bancoDados.connectionString).toBeUndefined();
  });

  it('GET /api/v1/ubs - deve listar UBS com metadados e aviso legal da fonte oficial', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ubs?uf=SP&limit=5',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sucesso).toBe(true);
    expect(body.metadados).toBeDefined();
    expect(body.metadados.fonteOficial).toContain('CNES/DATASUS');
    expect(body.metadados.avisoLegal).toBeDefined();
    expect(body.dados.length).toBeGreaterThan(0);
    expect(body.dados.length).toBeLessThanOrEqual(5);
  });

  it('GET /api/v1/ubs - deve validar coordenadas geográficas e retornar erro 422 amigável se inválidas', async () => {
    // Latitude fornecida sem longitude
    const resSemLon = await app.inject({
      method: 'GET',
      url: '/api/v1/ubs?lat=-23.55',
    });
    expect(resSemLon.statusCode).toBe(422);
    const bodySemLon = JSON.parse(resSemLon.body);
    expect(bodySemLon.codigo).toBe('VALIDATION_ERROR');

    // Raio maior que 100km (proteção contra varreduras exaustivas)
    const resRaioGrande = await app.inject({
      method: 'GET',
      url: '/api/v1/ubs?lat=-23.55&lon=-46.63&raioKm=150',
    });
    expect(resRaioGrande.statusCode).toBe(422);

    // Latitude fora da faixa válida (-90 a 90)
    const resLatInvalida = await app.inject({
      method: 'GET',
      url: '/api/v1/ubs?lat=95&lon=-46.63',
    });
    expect(resLatInvalida.statusCode).toBe(422);
  });

  it('GET /api/v1/ubs/:idOrCnes - deve retornar detalhes e rotas externas para UBS válida', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ubs/2787834',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sucesso).toBe(true);
    expect(body.dados.cnes).toBe('2787834');
    expect(body.dados.rotasExternas).toBeDefined();
    expect(body.dados.rotasExternas.googleMaps).toContain('google.com/maps');
  });

  it('GET /api/v1/ubs/:idOrCnes - deve retornar 404 padronizado para UBS inexistente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ubs/inexistente-99999999',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.codigo).toBe('NOT_FOUND');
    expect(body.mensagem).toContain('não foi encontrada');
  });

  it('Segurança: deve aplicar cabeçalhos de proteção HTTP (Helmet)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('GET /api/v1/ubs/map - deve retornar amostragem nacional balanceada em todos os estados quando sem filtros', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ubs/map',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sucesso).toBe(true);
    expect(body.metadados.modo).toBe('NACIONAL_DISTRIBUIDO');
    expect(body.dados.length).toBeGreaterThan(50);

    // Deve cobrir diversos estados do Brasil (Norte, Nordeste, Centro-Oeste, Sudeste, Sul)
    const ufs = new Set(body.dados.map((d: any) => d.uf));
    expect(ufs.size).toBeGreaterThanOrEqual(20);
    expect(ufs.has('SP')).toBe(true);
    expect(ufs.has('RJ')).toBe(true);
    expect(ufs.has('MG')).toBe(true);
    expect(ufs.has('BA')).toBe(true);
    expect(ufs.has('RS')).toBe(true);
  });

  it('GET /api/v1/ubs/map - deve retornar marcadores dentro do bounding box da viewport', async () => {
    // Região Metropolitana de São Paulo
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ubs/map?minLat=-23.7&maxLat=-23.4&minLon=-46.8&maxLon=-46.4&limit=50',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sucesso).toBe(true);
    expect(body.metadados.modo).toBe('BOUNDING_BOX');
    expect(body.dados.length).toBeGreaterThan(0);
    body.dados.forEach((d: any) => {
      expect(d.latitude).toBeGreaterThanOrEqual(-23.7);
      expect(d.latitude).toBeLessThanOrEqual(-23.4);
      expect(d.longitude).toBeGreaterThanOrEqual(-46.8);
      expect(d.longitude).toBeLessThanOrEqual(-46.4);
    });
  });

  it('GET /api/v1/cep/:cep - deve resolver qualquer CEP brasileiro e retornar a primeira UBS mais próxima', async () => {
    // CEP do Jardim Margarida / São Judas em Taboão da Serra - SP
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/cep/06786-070?raioKm=10',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sucesso).toBe(true);
    expect(body.origemCep).toBeDefined();
    expect(body.origemCep.cep).toBe('06786070');
    expect(body.origemCep.municipio).toBe('Taboão da Serra');
    expect(body.origemCep.latitude).toBeDefined();
    expect(body.origemCep.longitude).toBeDefined();

    // Deve retornar a UBS mais próxima no topo
    expect(body.ubsMaisProxima).toBeDefined();
    expect(body.ubsMaisProxima.distanciaKm).toBeDefined();
    expect(body.ubsMaisProxima.distanciaKm).toBeLessThan(2);
    expect(body.dados.length).toBeGreaterThan(0);
    expect(body.dados[0].id).toBe(body.ubsMaisProxima.id);
  });

  it('GET /api/v1/cep/06817-230 - deve resolver Rua Ilha de Marajó em Embu das Artes e retornar UBS Parque Esplanada', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/cep/06817-230?raioKm=5',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sucesso).toBe(true);
    expect(body.origemCep.cep).toBe('06817230');
    expect(body.origemCep.logradouro).toContain('Ilha de Marajó');
    expect(body.origemCep.municipio).toBe('Embu das Artes');

    // UBS mais próxima deve ser a UBS Parque Esplanada a ~0.1 km (100 metros)
    expect(body.ubsMaisProxima).toBeDefined();
    expect(body.ubsMaisProxima.nomeOficial).toContain('ESPLANADA');
    expect(body.ubsMaisProxima.distanciaKm).toBeLessThan(0.5);
  });
});
