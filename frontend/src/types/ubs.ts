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

export interface UbsMapParams {
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
  lat?: number | null;
  lon?: number | null;
  raioKm?: number;
  municipio?: string;
  uf?: string;
  bairro?: string;
  termo?: string;
  limit?: number;
}

export interface UbsMapResponse {
  sucesso: boolean;
  metadados: {
    total: number;
    modo: 'NACIONAL_DISTRIBUIDO' | 'BOUNDING_BOX' | 'PROXIMIDADE' | 'FILTRO_TEXTUAL';
  };
  dados: IUbs[];
}

