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
});
