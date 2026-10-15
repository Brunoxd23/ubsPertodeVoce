import { IUbs } from '../ubs/ubs.entity.js';
import { CnesValidator } from './cnes-validator.js';

export class OsmLiveProvider {
  private static USER_AGENT = 'UbsPertoDeVoce/1.0 (https://github.com/Brunoxd23/ubsPertodeVoce)';

  /**
   * Consulta unidades de saúde próximas às coordenadas geográficas informadas via Overpass API.
   */
  public static async fetchUbsNearCoordinates(
    lat: number,
    lon: number,
    raioKm: number
  ): Promise<IUbs[]> {
    const raioMetros = Math.min(Math.round(raioKm * 1000), 50000); // máximo 50km
    const query = `[out:json][timeout:8];
(
  node["amenity"="clinic"](around:${raioMetros},${lat},${lon});
  node["healthcare"="centre"](around:${raioMetros},${lat},${lon});
  node["healthcare:speciality"="community"](around:${raioMetros},${lat},${lon});
  way["amenity"="clinic"](around:${raioMetros},${lat},${lon});
  way["healthcare"="centre"](around:${raioMetros},${lat},${lon});
);
out center tags;`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      if (!data.elements || !Array.isArray(data.elements)) {
        return [];
      }

      const results: IUbs[] = [];

      for (const el of data.elements) {
        const tags = el.tags || {};
        const name = tags.name || tags['name:pt'] || tags.operator || '';
        const tipo = tags.healthcare || tags.amenity || 'CENTRO DE SAUDE/UNIDADE BASICA';

        // Filtra para garantir que seja UBS ou unidade pública de saúde
        if (!CnesValidator.isUbsOuAtencaoBasica(tipo, name) && !name.toUpperCase().includes('UBS')) {
          continue;
        }

        const elLat = el.lat || el.center?.lat;
        const elLon = el.lon || el.center?.lon;

        const val = CnesValidator.validarCoordenadas(elLat, elLon);
        if (val.status !== 'VALIDA' && val.status !== 'INVERTIDA_CORRIGIDA') {
          continue;
        }

        const street = tags['addr:street'] || tags['addr:place'] || 'Endereço cadastrado no OpenStreetMap';
        const housenumber = tags['addr:housenumber'] || null;
        const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:district'] || null;
        const city = tags['addr:city'] || 'SÃO PAULO';
        const state = (tags['addr:state'] || 'SP').toUpperCase().slice(0, 2);
        const postcode = tags['addr:postcode'] || null;
        const phone = tags.phone || tags['contact:phone'] || null;

        const ubs: IUbs = {
          id: `osm-${el.type}-${el.id}`,
          cnes: tags['cnes'] || tags['ref:cnes'] || null,
          nomeOficial: name.toUpperCase(),
          nomeFantasia: tags['name:alt'] || null,
          tipoEstabelecimento: 'CENTRO DE SAUDE/UNIDADE BASICA',
          endereco: street.toUpperCase(),
          numero: housenumber,
          complemento: null,
          bairro: suburb ? suburb.toUpperCase() : null,
          municipio: city.toUpperCase(),
          uf: state,
          cep: CnesValidator.sanitizarCep(postcode),
          telefone: CnesValidator.sanitizarTelefone(phone),
          latitude: val.latitude,
          longitude: val.longitude,
          fonteDados: 'OpenStreetMap / DATASUS Geocoding',
          dataAtualizacaoFonte: new Date().toISOString(),
          dataUltimaImportacao: new Date().toISOString(),
          statusValidacao: val.status,
        };

        results.push(ubs);
      }

      return results;
    } catch {
      // Falha silenciosa para não travar a requisição principal
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Consulta unidades de saúde por nome textual ou bairro/município via Nominatim.
   */
  public static async fetchUbsByText(termo: string): Promise<IUbs[]> {
    if (!termo || termo.trim().length < 3) return [];

    const searchQuery = termo.toLowerCase().includes('ubs')
      ? `${termo} Brasil`
      : `UBS ${termo} Brasil`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchQuery
      )}&format=json&addressdetails=1&countrycodes=br&limit=10`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
        signal: controller.signal,
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const results: IUbs[] = [];

      for (const item of data) {
        const address = item.address || {};
        const name = item.name || item.display_name.split(',')[0];
        const val = CnesValidator.validarCoordenadas(item.lat, item.lon);

        if (val.status !== 'VALIDA' && val.status !== 'INVERTIDA_CORRIGIDA') {
          continue;
        }

        const street = address.road || address.pedestrian || address.suburb || 'Endereço não informado';
        const city = address.city || address.town || address.municipality || 'NÃO INFORMADO';
        const state = (address.state_code || address.state || 'BR').toUpperCase().slice(0, 2);

        const ubs: IUbs = {
          id: `nom-${item.osm_type || 'node'}-${item.osm_id}`,
          cnes: null,
          nomeOficial: name.toUpperCase(),
          nomeFantasia: null,
          tipoEstabelecimento: 'CENTRO DE SAUDE/UNIDADE BASICA',
          endereco: street.toUpperCase(),
          numero: address.house_number || null,
          complemento: null,
          bairro: (address.suburb || address.neighbourhood || '').toUpperCase() || null,
          municipio: city.toUpperCase(),
          uf: state,
          cep: CnesValidator.sanitizarCep(address.postcode),
          telefone: null,
          latitude: val.latitude,
          longitude: val.longitude,
          fonteDados: 'OpenStreetMap / Nominatim',
          dataAtualizacaoFonte: new Date().toISOString(),
          dataUltimaImportacao: new Date().toISOString(),
          statusValidacao: val.status,
        };

        results.push(ubs);
      }

      return results;
    } catch {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
