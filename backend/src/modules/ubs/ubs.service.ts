import { IUbsRepository, UbsSearchParams } from '../../db/database-adapter.js';
import { IUbsWithDistance } from './ubs.entity.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import { OsmLiveProvider } from '../importer/osm-live-provider.js';

export class UbsService {
  constructor(private ubsRepository: IUbsRepository) {}

  public async findByIdOrCnes(idOrCnes: string): Promise<IUbsWithDistance> {
    const item = await this.ubsRepository.findByIdOrCnes(idOrCnes);
    if (!item) {
      throw new NotFoundError(`Unidade Básica de Saúde com identificador '${idOrCnes}' não foi encontrada.`);
    }

    return this.enrichWithRouteUrls(item);
  }

  public async searchUbs(params: UbsSearchParams) {
    let result = await this.ubsRepository.search(params);

    // Cobertura Nacional Dinâmica:
    // 1. Se o usuário estiver buscando por coordenadas e o banco local tiver poucos resultados na região (< 4),
    // consulta a Overpass API em tempo real, armazena no banco local e atualiza os resultados.
    if (params.lat !== undefined && params.lon !== undefined && result.total < 4) {
      try {
        const liveItems = await OsmLiveProvider.fetchUbsNearCoordinates(
          params.lat,
          params.lon,
          params.raioKm || 5
        );
        if (liveItems.length > 0) {
          await this.ubsRepository.upsertMany(liveItems);
          result = await this.ubsRepository.search(params);
        }
      } catch {
        // Fallback resiliente: preserva os dados locais sem quebrar
      }
    } else if (params.termo && result.total === 0) {
      // 2. Se o usuário pesquisou por um bairro/cidade não cadastrado localmente, consulta via Nominatim
      try {
        const liveByText = await OsmLiveProvider.fetchUbsByText(params.termo);
        if (liveByText.length > 0) {
          await this.ubsRepository.upsertMany(liveByText);
          result = await this.ubsRepository.search(params);
        }
      } catch {
        // Fallback resiliente
      }
    }

    const enrichedItems = result.items.map((item) => this.enrichWithRouteUrls(item));
    const totalPaginas = Math.ceil(result.total / params.limit) || 1;

    return {
      sucesso: true as const,
      metadados: {
        total: result.total,
        pagina: params.page,
        limite: params.limit,
        totalPaginas,
        raioKm: params.raioKm,
        filtrosAplicados: {
          possuiCoordenadas: params.lat !== undefined && params.lon !== undefined,
          municipio: params.municipio ?? null,
          uf: params.uf ?? null,
          bairro: params.bairro ?? null,
          cep: params.cep ?? null,
          termo: params.termo ?? null,
        },
        fonteOficial: 'CNES/DATASUS - Ministério da Saúde & Cartografia Digital',
        avisoLegal:
          'Informações públicas extraídas do CNES/DATASUS e cartografia oficial OpenStreetMap. A disponibilidade de especialidades, horários de funcionamento e vacinas deve ser confirmada diretamente com a unidade antes do deslocamento.',
      },
      dados: enrichedItems,
    };
  }

  private enrichWithRouteUrls(item: IUbsWithDistance): IUbsWithDistance {
    if (item.latitude !== null && item.longitude !== null) {
      const lat = item.latitude;
      const lon = item.longitude;

      return {
        ...item,
        rotasExternas: {
          googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
          openStreetMap: `https://www.openstreetmap.org/directions?to=${lat}%2C${lon}`,
          waze: `https://www.waze.com/ul?ll=${lat}%2C${lon}&navigate=yes`,
        },
      };
    }

    return item;
  }
}
