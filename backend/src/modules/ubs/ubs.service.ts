import { IUbsRepository, UbsSearchParams } from '../../db/database-adapter.js';
import { IUbsWithDistance } from './ubs.entity.js';
import { NotFoundError } from '../../core/errors/app-error.js';

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
    const result = await this.ubsRepository.search(params);

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
        fonteOficial: 'CNES/DATASUS - Ministério da Saúde',
        avisoLegal:
          'Informações públicas extraídas do CNES/DATASUS. A disponibilidade de especialidades, horários de funcionamento e vacinas deve ser confirmada diretamente com a unidade antes do deslocamento.',
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
