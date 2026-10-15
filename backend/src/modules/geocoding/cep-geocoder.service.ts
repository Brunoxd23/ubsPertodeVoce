export interface CepLocation {
  cep: string;
  logradouro?: string;
  bairro?: string;
  municipio: string;
  uf: string;
  latitude: number;
  longitude: number;
  fonte: 'BRASIL_API' | 'OPEN_STREET_MAP' | 'VIA_CEP_FALLBACK';
}

export class CepGeocoderService {
  private static cache = new Map<string, CepLocation>();

  /**
   * Geocodifica um CEP brasileiro retornando coordenadas de alta precisão (latitude/longitude),
   * logradouro, bairro, município e estado.
   */
  public static async geocodeCep(rawCep: string): Promise<CepLocation> {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new Error(`CEP '${rawCep}' é inválido. Um CEP deve conter 8 dígitos numéricos.`);
    }

    if (this.cache.has(cleanCep)) {
      return this.cache.get(cleanCep)!;
    }

    // 1. Provedor Primário: BrasilAPI v2 (consulta base cartográfica com coordenadas exatas de ponto)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as any;
        const lat = data.location?.coordinates?.latitude;
        const lon = data.location?.coordinates?.longitude;

        if (lat !== undefined && lon !== undefined) {
          const latNum = Number(lat);
          const lonNum = Number(lon);
          if (!isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0) {
            const result: CepLocation = {
              cep: cleanCep,
              logradouro: data.street || undefined,
              bairro: data.neighborhood || undefined,
              municipio: data.city,
              uf: data.state,
              latitude: latNum,
              longitude: lonNum,
              fonte: 'BRASIL_API',
            };
            this.cache.set(cleanCep, result);
            return result;
          }
        }

        // Se BrasilAPI retornou endereço mas sem coordenadas no v2, tenta geocodificar o endereço retornado
        if (data.city && data.state) {
          const geoLoc = await this.geocodeAddressViaNominatim(
            cleanCep,
            data.street,
            data.neighborhood,
            data.city,
            data.state
          );
          if (geoLoc) {
            this.cache.set(cleanCep, geoLoc);
            return geoLoc;
          }
        }
      }
    } catch {
      // Segue para fallback
    }

    // 2. Provedor Secundário: ViaCEP + Geocodificação OpenStreetMap/Nominatim
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as any;
        if (!data.erro && data.localidade && data.uf) {
          const geoLoc = await this.geocodeAddressViaNominatim(
            cleanCep,
            data.logradouro,
            data.bairro,
            data.localidade,
            data.uf
          );
          if (geoLoc) {
            this.cache.set(cleanCep, geoLoc);
            return geoLoc;
          }
        }
      }
    } catch {
      // Segue para erro
    }

    throw new Error(
      `Não foi possível localizar as coordenadas geográficas para o CEP '${rawCep}'. Verifique se o CEP foi digitado corretamente.`
    );
  }

  private static async geocodeAddressViaNominatim(
    cleanCep: string,
    logradouro?: string,
    bairro?: string,
    municipio?: string,
    uf?: string
  ): Promise<CepLocation | null> {
    try {
      const queryParts = [logradouro, bairro, municipio, uf, 'Brasil'].filter(Boolean);
      const query = encodeURIComponent(queryParts.join(', '));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'UbsPertoDeVoce/1.0 (contato@ubspertodevoce.com.br)' },
        }
      );
      clearTimeout(timeout);

      if (nomRes.ok) {
        const items = (await nomRes.json()) as any[];
        if (items && items.length > 0) {
          return {
            cep: cleanCep,
            logradouro: logradouro || undefined,
            bairro: bairro || undefined,
            municipio: municipio || '',
            uf: uf || '',
            latitude: Number(items[0].lat),
            longitude: Number(items[0].lon),
            fonte: 'OPEN_STREET_MAP',
          };
        }
      }
    } catch {
      // Falha silenciosa
    }

    return null;
  }
}
