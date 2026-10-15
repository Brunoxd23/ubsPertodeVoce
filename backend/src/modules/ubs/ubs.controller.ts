import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { UbsService } from './ubs.service.js';
import { getUbsRepository } from '../../db/client.js';
import {
  ubsQuerySchema,
  ubsParamSchema,
  ubsListResponseSchema,
  ubsSingleResponseSchema,
  ubsMapQuerySchema,
  ubsMapResponseSchema,
  cepParamSchema,
  cepQuerySchema,
  cepProximityResponseSchema,
} from './ubs.schemas.js';

export const ubsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const repository = await getUbsRepository();
  const ubsService = new UbsService(repository);
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Rota de busca da UBS mais próxima por CEP
  typedApp.get(
    '/cep/:cep',
    {
      schema: {
        tags: ['CEP'],
        summary: 'Localiza a UBS mais próxima a partir de qualquer CEP brasileiro',
        description:
          'Geocodifica o CEP residencial informado para coordenadas exatas de latitude/longitude e retorna a UBS mais próxima e unidades vizinhas ordenadas por distância.',
        params: cepParamSchema,
        querystring: cepQuerySchema,
        response: {
          200: cepProximityResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { cep } = request.params;
      const { raioKm, limit } = request.query;
      const result = await ubsService.findClosestByCep(cep, raioKm, limit);
      return reply.status(200).send(result);
    }
  );

  // Rota de marcadores para mapa dinâmico (amostragem nacional, bounding box ou proximidade)
  typedApp.get(
    '/ubs/map',
    {
      schema: {
        tags: ['UBS'],
        summary: 'Obtém marcadores de UBS para o mapa interativo',
        description:
          'Retorna pontos geoespaciais distribuídos nacionalmente, delimitados por viewport (bounding box) ou filtrados por proximidade GPS e filtros textuais.',
        querystring: ubsMapQuerySchema,
        response: {
          200: ubsMapResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const query = request.query;
      const result = await ubsService.getMapPins(query);
      return reply.status(200).send(result);
    }
  );

  // Rota de listagem e busca geográfica
  typedApp.get(
    '/ubs',
    {
      schema: {
        tags: ['UBS'],
        summary: 'Consulta e geolocalização de Unidades Básicas de Saúde',
        description:
          'Permite localizar UBS por coordenadas geográficas com raio de busca, ou por filtros textuais como Município, UF, Bairro e CEP.',
        querystring: ubsQuerySchema,
        response: {
          200: ubsListResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const query = request.query;
      const result = await ubsService.searchUbs(query);
      return reply.status(200).send(result);
    }
  );

  // Rota de busca por ID ou código CNES
  typedApp.get(
    '/ubs/:idOrCnes',
    {
      schema: {
        tags: ['UBS'],
        summary: 'Detalhes de uma UBS por ID interno ou Código CNES',
        description:
          'Retorna as informações completas, coordenadas geográficas e links diretos de rotas em serviços de mapas para uma unidade de saúde específica.',
        params: ubsParamSchema,
        response: {
          200: ubsSingleResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { idOrCnes } = request.params;
      const ubs = await ubsService.findByIdOrCnes(idOrCnes);
      return reply.status(200).send({
        sucesso: true,
        dados: ubs,
      });
    }
  );

  // Rota auxiliar de Municípios por UF
  typedApp.get(
    '/municipios',
    {
      schema: {
        tags: ['Geografia'],
        summary: 'Lista municípios com UBS cadastradas por UF',
        querystring: z.object({
          uf: z.string().length(2).toUpperCase(),
        }),
        response: {
          200: z.object({
            sucesso: z.literal(true),
            uf: z.string(),
            municipios: z.array(z.string()),
          }),
        },
      },
    },
    async (request, reply) => {
      const { uf } = request.query;
      const searchRes = await repository.search({ uf, page: 1, limit: 100 });
      const uniqueMunicipios = Array.from(new Set(searchRes.items.map((i) => i.municipio))).sort();

      return reply.status(200).send({
        sucesso: true,
        uf,
        municipios: uniqueMunicipios,
      });
    }
  );
};
