export interface CepLocation {
  cep: string;
  logradouro?: string;
  bairro?: string;
  municipio: string;
  uf: string;
  latitude: number;
  longitude: number;
  fonte: 'OPEN_STREET_MAP' | 'BRASIL_API' | 'VIA_CEP_FALLBACK';
}

export class CepGeocoderService {
  private static cache = new Map<string, CepLocation>();

  /**
   * Geocodifica um CEP brasileiro com máxima precisão (nível de logradouro/rua real).
   * Resolve primeiro os dados de logradouro e município e busca a geometria exata da rua.
   */
  public static async geocodeCep(rawCep: string): Promise<CepLocation> {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new Error(`CEP '${rawCep}' é inválido. Um CEP deve conter 8 dígitos numéricos.`);
    }

    if (this.cache.has(cleanCep)) {
      return this.cache.get(cleanCep)!;
    }

    let street: string | undefined;
    let neighborhood: string | undefined;
    let city: string | undefined;
    let state: string | undefined;
    let coarseLat: number | undefined;
    let coarseLon: number | undefined;

    // 1. Obter dados de endereço via BrasilAPI v2
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
        street = data.street || undefined;
        neighborhood = data.neighborhood || undefined;
        city = data.city || undefined;
        state = data.state || undefined;
        if (data.location?.coordinates?.latitude && data.location?.coordinates?.longitude) {
          coarseLat = Number(data.location.coordinates.latitude);
          coarseLon = Number(data.location.coordinates.longitude);
        }
      }
    } catch {
      // Segue para ViaCEP
    }

    // 2. Se BrasilAPI não trouxe o logradouro completo, consulta ViaCEP
    if (!street || !city) {
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
          if (!data.erro) {
            street = street || data.logradouro || undefined;
            neighborhood = neighborhood || data.bairro || undefined;
            city = city || data.localidade || undefined;
            state = state || data.uf || undefined;
          }
        }
      } catch {
        // Segue adiante
      }
    }

    // 3. Geocodificação de Alta Precisão (Nível de Rua Real via Nominatim):
    // Prioriza o Nominatim estruturado por rua, pois bases como OpenCEP frequentemente
    // retornam apenas o centroide genérico do município (ex: centro da cidade em vez da rua).
    if (street && city) {
      const streetGeo = await this.geocodeAddressViaNominatim(cleanCep, street, neighborhood, city, state);
      if (streetGeo) {
        this.cache.set(cleanCep, streetGeo);
        return streetGeo;
      }
    }

    // 4. Se a rua específica não foi indexada no OpenStreetMap, busca no nível do bairro
    if (neighborhood && city) {
      const neighborhoodGeo = await this.geocodeAddressViaNominatim(cleanCep, undefined, neighborhood, city, state);
      if (neighborhoodGeo) {
        const result = { ...neighborhoodGeo, logradouro: street };
        this.cache.set(cleanCep, result);
        return result;
      }
    }

    // 5. Fallback para coordenadas fornecidas pela BrasilAPI (se válidas)
    if (coarseLat && coarseLon && !isNaN(coarseLat) && !isNaN(coarseLon) && coarseLat !== 0) {
      const result: CepLocation = {
        cep: cleanCep,
        logradouro: street,
        bairro: neighborhood,
        municipio: city || '',
        uf: state || '',
        latitude: coarseLat,
        longitude: coarseLon,
        fonte: 'BRASIL_API',
      };
      this.cache.set(cleanCep, result);
      return result;
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      let url: string;
      if (logradouro && municipio) {
        url = `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(
          logradouro
        )}&city=${encodeURIComponent(municipio)}&state=${encodeURIComponent(
          uf || ''
        )}&country=Brazil&format=json&limit=1`;
      } else {
        const queryParts = [bairro, municipio, uf, 'Brasil'].filter(Boolean);
        url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          queryParts.join(', ')
        )}&format=json&limit=1`;
      }

      const nomRes = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'UbsPertoDeVoce/1.0 (contato@ubspertodevoce.com.br)' },
      });
      clearTimeout(timeout);

      if (nomRes.ok) {
        const items = (await nomRes.json()) as any[];
        if (items && items.length > 0) {
          return {
            cep: cleanCep,
            logradouro,
            bairro,
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
