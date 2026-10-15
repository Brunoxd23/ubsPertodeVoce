import { describe, it, expect } from 'vitest';
import { IUbs } from '../types/ubs';

describe('Frontend - Modelos e Regras de Interface', () => {
  const sampleUbs: IUbs = {
    id: 'ubs-test-01',
    cnes: '1234567',
    nomeOficial: 'UNIDADE BASICA DE SAUDE EXEMPLO',
    nomeFantasia: 'UBS EXEMPLO',
    tipoEstabelecimento: 'CENTRO DE SAUDE/UNIDADE BASICA',
    endereco: 'RUA DAS ACACIAS',
    numero: '100',
    complemento: null,
    bairro: 'JARDIM DAS FLORES',
    municipio: 'SÃO PAULO',
    uf: 'SP',
    cep: '01234567',
    telefone: '(11) 2345-6789',
    latitude: -23.5505,
    longitude: -46.6333,
    fonteDados: 'CNES/DATASUS',
    dataAtualizacaoFonte: '2024-01-01T00:00:00Z',
    dataUltimaImportacao: '2024-01-02T00:00:00Z',
    statusValidacao: 'VALIDA',
    distanciaKm: 2.4,
    rotasExternas: {
      googleMaps: 'https://www.google.com/maps/dir/?api=1&destination=-23.5505,-46.6333',
      openStreetMap: 'https://www.openstreetmap.org/directions?to=-23.5505%2C-46.6333',
      waze: 'https://www.waze.com/ul?ll=-23.5505%2C-46.6333&navigate=yes',
    },
  };

  it('deve possuir estrutura de dados compatível com exibição em card e mapa', () => {
    expect(sampleUbs.id).toBe('ubs-test-01');
    expect(sampleUbs.cnes).toBe('1234567');
    expect(sampleUbs.distanciaKm).toBe(2.4);
    expect(sampleUbs.rotasExternas?.googleMaps).toContain('google.com/maps');
    expect(sampleUbs.statusValidacao).toBe('VALIDA');
  });

  it('deve formatar endereço completo sem valores nulos', () => {
    const fullAddress = [
      sampleUbs.endereco,
      sampleUbs.numero ? `nº ${sampleUbs.numero}` : null,
      sampleUbs.complemento,
      sampleUbs.bairro,
      `${sampleUbs.municipio} - ${sampleUbs.uf}`,
      sampleUbs.cep ? `CEP ${sampleUbs.cep}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    expect(fullAddress).toBe(
      'RUA DAS ACACIAS, nº 100, JARDIM DAS FLORES, SÃO PAULO - SP, CEP 01234567'
    );
  });
});
