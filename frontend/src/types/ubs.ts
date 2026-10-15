export type StatusValidacaoCoordenada = 
  | 'VALIDA'
  | 'INVERTIDA_CORRIGIDA'
  | 'FORA_DO_BRASIL'
  | 'AUSENTE';

export interface IUbs {
  id: string;
  cnes: string | null;
  nomeOficial: string;
  nomeFantasia: string | null;
  tipoEstabelecimento: string;
  endereco: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string;
  uf: string;
  cep: string | null;
  telefone: string | null;
  latitude: number | null;
  longitude: number | null;
  fonteDados: string;
  dataAtualizacaoFonte: string | null;
  dataUltimaImportacao: string;
  statusValidacao: StatusValidacaoCoordenada;
  distanciaKm?: number;
  rotasExternas?: {
    googleMaps: string;
    openStreetMap: string;
    waze: string;
  };
}

export interface UbsListResponse {
  sucesso: boolean;
  metadados: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
    raioKm?: number;
    filtrosAplicados: {
      possuiCoordenadas: boolean;
      municipio: string | null;
      uf: string | null;
      bairro: string | null;
      cep: string | null;
      termo: string | null;
    };
    fonteOficial: string;
    avisoLegal: string;
  };
  dados: IUbs[];
}

export interface UbsFilterState {
  termo: string;
  uf: string;
  municipio: string;
  raioKm: number;
  userLat: number | null;
  userLon: number | null;
  page: number;
  limit: number;
}
