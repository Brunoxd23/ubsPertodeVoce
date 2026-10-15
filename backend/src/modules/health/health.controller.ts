import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getUbsRepository } from '../../db/client.js';

const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  versao: z.string(),
  uptimeSegundos: z.number(),
  timestamp: z.string(),
  ambiente: z.string(),
  bancoDados: z.object({
    conectado: z.boolean(),
    totalRegistrosUbs: z.number().optional(),
  }),
});

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/health',
    {
      schema: {
        tags: ['Operacional'],
        summary: 'Health check da aplicação',
        description:
          'Verificação de integridade operacional do serviço, expondo métricas públicas não-sensíveis.',
        response: {
          200: healthResponseSchema,
          503: healthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      let isDbConnected = false;
      let totalUbs = 0;

      try {
        const repo = await getUbsRepository();
        totalUbs = await repo.count();
        isDbConnected = true;
      } catch {
        isDbConnected = false;
      }

      const status = isDbConnected ? 'healthy' : 'degraded';
      const statusCode = isDbConnected ? 200 : 503;

      return reply.status(statusCode).send({
        status,
        versao: '1.0.0',
        uptimeSegundos: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        ambiente: process.env.NODE_ENV || 'development',
        bancoDados: {
          conectado: isDbConnected,
          totalRegistrosUbs: totalUbs,
        },
      });
    }
  );
};
