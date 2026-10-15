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
  createdAt?: string;
  updatedAt?: string;
}

export interface IUbsWithDistance extends IUbs {
  distanciaKm?: number;
  rotasExternas?: {
    googleMaps: string;
    openStreetMap: string;
    waze: string;
  };
}
