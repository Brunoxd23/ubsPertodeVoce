import { describe, it, expect, beforeEach } from 'vitest';
import { CnesImporterService, RawCnesRecord } from '../src/modules/importer/cnes-importer.service.js';
import { InMemoryUbsRepository } from '../src/db/database-adapter.js';

describe('CnesImporterService - Pipeline de Importação e Atualização', () => {
  let repository: InMemoryUbsRepository;
  let importer: CnesImporterService;

  beforeEach(() => {
    repository = new InMemoryUbsRepository();
    importer = new CnesImporterService(repository);
  });

  it('deve processar lote de registros ignorando estabelecimentos que não são UBS', async () => {
    const rawBatch: RawCnesRecord[] = [
      {
        CO_CNES: '1111111',
        NO_ESTABELECIMENTO: 'UBS TESTE 1',
        DS_TIPO_UNIDADE: 'CENTRO DE SAUDE/UNIDADE BASICA',
        NO_LOGRADOURO: 'RUA DAS FLORES',
        NO_MUNICIPIO: 'CURITIBA',
        SG_UF: 'PR',
        NU_LATITUDE: -25.4284,
        NU_LONGITUDE: -49.2733,
      },
      {
        CO_CNES: '2222222',
        NO_ESTABELECIMENTO: 'LABORATORIO CLINICO PRIVADO',
        DS_TIPO_UNIDADE: 'UNIDADE DE APOIO DIAGNOSE E TERAPIA',
        NO_MUNICIPIO: 'CURITIBA',
        SG_UF: 'PR',
      },
    ];

    const stats = await importer.processarLote(rawBatch);

    expect(stats.totalLidos).toBe(2);
    expect(stats.totalValidos).toBe(1);
    expect(stats.totalNaoUbsIgnorados).toBe(1);
    expect(stats.totalCoordenadasValidas).toBe(1);

    const saved = await repository.findByIdOrCnes('1111111');
    expect(saved).not.toBeNull();
    expect(saved?.nomeOficial).toBe('UBS TESTE 1');
  });

  it('deve evitar duplicações em execuções repetidas do mesmo CNES', async () => {
    const record: RawCnesRecord = {
      CO_CNES: '3333333',
      NO_ESTABELECIMENTO: 'UBS SANTA CECILIA',
      DS_TIPO_UNIDADE: 'CENTRO DE SAUDE/UNIDADE BASICA',
      NO_LOGRADOURO: 'RUA GENERAL JARDIM',
      NO_MUNICIPIO: 'SÃO PAULO',
      SG_UF: 'SP',
      NU_LATITUDE: -23.5421,
      NU_LONGITUDE: -46.6508,
    };

    // Primeira importação
    await importer.processarLote([record]);
    const totalAposPrimeira = await repository.count();
    expect(totalAposPrimeira).toBe(1);

    // Segunda importação do mesmo CNES (atualização)
    const recordAtualizado: RawCnesRecord = {
      ...record,
      NO_ESTABELECIMENTO: 'UBS SANTA CECILIA REFORMADA',
    };
    await importer.processarLote([recordAtualizado]);
    const totalAposSegunda = await repository.count();

    expect(totalAposSegunda).toBe(1); // Não duplicou
    const ubs = await repository.findByIdOrCnes('3333333');
    expect(ubs?.nomeOficial).toBe('UBS SANTA CECILIA REFORMADA');
  });
});
