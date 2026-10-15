import { CnesValidator } from './cnes-validator.js';
import { IUbs } from '../ubs/ubs.entity.js';
import { IUbsRepository } from '../../db/database-adapter.js';

export interface ImporterStats {
  totalLidos: number;
  totalValidos: number;
  totalCoordenadasValidas: number;
  totalCoordenadasInvertidasCorrigidas: number;
  totalCoordenadasForaOuAusentes: number;
  totalNaoUbsIgnorados: number;
  totalInseridosOuAtualizados: number;
  tempoGastoMs: number;
}

export interface RawCnesRecord {
  CO_CNES?: string;
  CNES?: string;
  cnes?: string;
  NO_FANTASIA?: string;
  NOME_FANTASIA?: string;
  NO_ESTABELECIMENTO?: string;
  NOME?: string;
  nome?: string;
  DS_TIPO_UNIDADE?: string;
  TIPO_ESTABELECIMENTO?: string;
  tipo?: string;
  NO_LOGRADOURO?: string;
  LOGRADOURO?: string;
  endereco?: string;
  NU_ENDERECO?: string;
  NUMERO?: string;
  numero?: string;
  NO_COMPLEMENTO?: string;
  COMPLEMENTO?: string;
  NO_BAIRRO?: string;
  BAIRRO?: string;
  bairro?: string;
  NO_MUNICIPIO?: string;
  MUNICIPIO?: string;
  municipio?: string;
  SG_UF?: string;
  UF?: string;
  uf?: string;
  CO_CEP?: string;
  CEP?: string;
  cep?: string;
  NU_TELEFONE?: string;
  TELEFONE?: string;
  telefone?: string;
  NU_LATITUDE?: string | number;
  LATITUDE?: string | number;
  latitude?: string | number;
  NU_LONGITUDE?: string | number;
  LONGITUDE?: string | number;
  longitude?: string | number;
  DT_ATUALIZACAO?: string;
}

export class CnesImporterService {
  constructor(private ubsRepository: IUbsRepository) {}

  /**
   * Processa uma lista ou lote de registros brutos extraídos do CNES.
   */
  public async processarLote(registros: RawCnesRecord[]): Promise<ImporterStats> {
    const inicio = Date.now();
    const stats: ImporterStats = {
      totalLidos: registros.length,
      totalValidos: 0,
      totalCoordenadasValidas: 0,
      totalCoordenadasInvertidasCorrigidas: 0,
      totalCoordenadasForaOuAusentes: 0,
      totalNaoUbsIgnorados: 0,
      totalInseridosOuAtualizados: 0,
      tempoGastoMs: 0,
    };

    const ubsValidas: IUbs[] = [];
    const cnesProcessados = new Set<string>();

    for (const raw of registros) {
      const cnes = String(raw.CO_CNES || raw.CNES || raw.cnes || '').trim();
      const nomeOficial = String(
        raw.NO_ESTABELECIMENTO || raw.NO_FANTASIA || raw.NOME || raw.nome || ''
      ).trim();
      const tipo = String(
        raw.DS_TIPO_UNIDADE || raw.TIPO_ESTABELECIMENTO || raw.tipo || 'CENTRO DE SAUDE/UNIDADE BASICA'
      ).trim();

      // Regra de negócio: não presumir que qualquer estabelecimento é UBS
      if (!CnesValidator.isUbsOuAtencaoBasica(tipo, nomeOficial)) {
        stats.totalNaoUbsIgnorados++;
        continue;
      }

      // Prevenção de duplicidades no mesmo lote
      if (cnes && cnesProcessados.has(cnes)) {
        continue;
      }
      if (cnes) {
        cnesProcessados.add(cnes);
      }

      const rawLat = raw.NU_LATITUDE ?? raw.LATITUDE ?? raw.latitude;
      const rawLon = raw.NU_LONGITUDE ?? raw.LONGITUDE ?? raw.longitude;
      const validacaoGeo = CnesValidator.validarCoordenadas(rawLat, rawLon);

      if (validacaoGeo.status === 'VALIDA') {
        stats.totalCoordenadasValidas++;
      } else if (validacaoGeo.status === 'INVERTIDA_CORRIGIDA') {
        stats.totalCoordenadasInvertidasCorrigidas++;
      } else {
        stats.totalCoordenadasForaOuAusentes++;
      }

      const uf = String(raw.SG_UF || raw.UF || raw.uf || 'BR').trim().toUpperCase().slice(0, 2);
      const municipio = String(raw.NO_MUNICIPIO || raw.MUNICIPIO || raw.municipio || 'NÃO INFORMADO').trim();
      const endereco = String(raw.NO_LOGRADOURO || raw.LOGRADOURO || raw.endereco || 'ENDEREÇO NÃO CADASTRADO').trim();

      const ubsEntity: IUbs = {
        id: `ubs-${cnes || Math.random().toString(36).substring(2, 9)}`,
        cnes: cnes || null,
        nomeOficial: nomeOficial || 'UNIDADE BÁSICA DE SAÚDE',
        nomeFantasia: raw.NO_FANTASIA ? String(raw.NO_FANTASIA).trim() : null,
        tipoEstabelecimento: tipo,
        endereco,
        numero: raw.NU_ENDERECO ? String(raw.NU_ENDERECO).trim() : null,
        complemento: raw.NO_COMPLEMENTO ? String(raw.NO_COMPLEMENTO).trim() : null,
        bairro: raw.NO_BAIRRO || raw.BAIRRO || raw.bairro ? String(raw.NO_BAIRRO || raw.BAIRRO || raw.bairro).trim() : null,
        municipio,
        uf,
        cep: CnesValidator.sanitizarCep(String(raw.CO_CEP || raw.CEP || raw.cep || '')),
        telefone: CnesValidator.sanitizarTelefone(String(raw.NU_TELEFONE || raw.TELEFONE || raw.telefone || '')),
        latitude: validacaoGeo.latitude,
        longitude: validacaoGeo.longitude,
        fonteDados: 'CNES/DATASUS - Ministério da Saúde',
        dataAtualizacaoFonte: raw.DT_ATUALIZACAO ? new Date(raw.DT_ATUALIZACAO).toISOString() : null,
        dataUltimaImportacao: new Date().toISOString(),
        statusValidacao: validacaoGeo.status,
      };

      ubsValidas.push(ubsEntity);
      stats.totalValidos++;
    }

    if (ubsValidas.length > 0) {
      const res = await this.ubsRepository.upsertMany(ubsValidas);
      stats.totalInseridosOuAtualizados = res.inserted + res.updated;
    }

    stats.tempoGastoMs = Date.now() - inicio;
    return stats;
  }
}
