import { StatusValidacaoCoordenada } from '../ubs/ubs.entity.js';

// Limites geográficos do território brasileiro (Bounding Box com margem de segurança para ilhas oceânicas)
export const BRAZIL_BOUNDS = {
  minLat: -33.75,
  maxLat: 5.27,
  minLon: -73.99,
  maxLon: -34.79,
};

export interface CoordenadaValidada {
  latitude: number | null;
  longitude: number | null;
  status: StatusValidacaoCoordenada;
}

export class CnesValidator {
  /**
   * Valida e normaliza coordenadas geográficas, detectando inversões lat/lon
   * e demarcando registros anômalos ou fora do Brasil.
   */
  public static validarCoordenadas(
    rawLat: string | number | null | undefined,
    rawLon: string | number | null | undefined
  ): CoordenadaValidada {
    if (rawLat === null || rawLat === undefined || rawLon === null || rawLon === undefined) {
      return { latitude: null, longitude: null, status: 'AUSENTE' };
    }

    const latStr = String(rawLat).trim().replace(',', '.');
    const lonStr = String(rawLon).trim().replace(',', '.');

    if (!latStr || !lonStr) {
      return { latitude: null, longitude: null, status: 'AUSENTE' };
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
      return { latitude: null, longitude: null, status: 'AUSENTE' };
    }

    // Verifica se está dentro do Brasil diretamente
    const isLatInBrazil = lat >= BRAZIL_BOUNDS.minLat && lat <= BRAZIL_BOUNDS.maxLat;
    const isLonInBrazil = lon >= BRAZIL_BOUNDS.minLon && lon <= BRAZIL_BOUNDS.maxLon;

    if (isLatInBrazil && isLonInBrazil) {
      return { latitude: lat, longitude: lon, status: 'VALIDA' };
    }

    // Verifica se os eixos estão invertidos (comum em cadastros manuais do DATASUS)
    const isSwappedLatInBrazil = lon >= BRAZIL_BOUNDS.minLat && lon <= BRAZIL_BOUNDS.maxLat;
    const isSwappedLonInBrazil = lat >= BRAZIL_BOUNDS.minLon && lat <= BRAZIL_BOUNDS.maxLon;

    if (isSwappedLatInBrazil && isSwappedLonInBrazil) {
      return {
        latitude: lon,
        longitude: lat,
        status: 'INVERTIDA_CORRIGIDA',
      };
    }

    // Fora do polígono geográfico brasileiro
    return {
      latitude: lat,
      longitude: lon,
      status: 'FORA_DO_BRASIL',
    };
  }

  /**
   * Verifica se o estabelecimento pode ser classificado como Unidade Básica de Saúde.
   */
  public static isUbsOuAtencaoBasica(tipoEstabelecimento: string | null | undefined, nome: string): boolean {
    const combined = `${tipoEstabelecimento || ''} ${nome || ''}`.toUpperCase();

    const ubsKeywords = [
      'CENTRO DE SAUDE',
      'UNIDADE BASICA',
      'POSTO DE SAUDE',
      'UBS',
      'ESF',
      'SAUDE DA FAMILIA',
      'UNIDADE DE SAUDE',
      'CLINICA DA FAMILIA',
      'CENTRO MUNICIPAL DE SAUDE',
      'CMS',
    ];

    return ubsKeywords.some((keyword) => combined.includes(keyword));
  }

  /**
   * Limpa e padroniza CEP (somente dígitos).
   */
  public static sanitizarCep(cep: string | null | undefined): string | null {
    if (!cep) return null;
    const clean = cep.replace(/\D/g, '');
    return clean.length === 8 ? clean : null;
  }

  /**
   * Limpa telefone.
   */
  public static sanitizarTelefone(tel: string | null | undefined): string | null {
    if (!tel) return null;
    const clean = tel.trim();
    return clean.length >= 8 ? clean : null;
  }
}
