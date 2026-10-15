import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

import { env } from './config/env.js';
import { loggerConfig } from './core/logger.js';
import { AppError } from './core/errors/app-error.js';
import { ubsRoutes } from './modules/ubs/ubs.controller.js';
import { healthRoutes } from './modules/health/health.controller.js';

export function buildApp() {
  const app = fastify({
    logger: loggerConfig,
    genReqId: (req) => {
      const headerReqId = req.headers['x-request-id'];
      if (headerReqId && typeof headerReqId === 'string') {
        return headerReqId;
      }
      return randomUUID();
    },
    disableRequestLogging: false,
  });

  // Compiladores Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Segurança: Headers HTTP com Helmet e Content Security Policy
  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://*.tile.osm.org'],
        scriptSrc: ["'self'"],
      },
    },
  });

  // Segurança: CORS restrito
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.register(cors, {
    origin: (origin, cb) => {
      // Permite requisições sem origin, origens cadastradas, Vercel ou localhost
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        cb(null, true);
        return;
      }
      cb(new Error('Origem não permitida pela política de CORS'), false);
    },
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // Segurança: Rate Limiting
  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW_MS,
    errorResponseBuilder: () => ({
      sucesso: false,
      codigo: 'RATE_LIMIT_EXCEEDED',
      mensagem: 'Muitas requisições enviadas em um curto período. Por favor, aguarde um momento antes de tentar novamente.',
    }),
  });

  // Documentação OpenAPI / Swagger
  app.register(swagger, {
    openapi: {
      info: {
        title: 'API UBS Perto de Você',
        description:
          'Plataforma Nacional de Localização e Consulta de Unidades Básicas de Saúde (UBS) integrada a dados abertos do Ministério da Saúde / CNES.',
        version: '1.0.0',
        contact: {
          name: 'Suporte Técnico e Governança de Dados',
          url: 'https://dadosabertos.saude.gov.br/',
        },
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Ambiente Local',
        },
      ],
      tags: [
        { name: 'UBS', description: 'Consultas e geolocalização de unidades de saúde' },
        { name: 'Geografia', description: 'Metadados geográficos e de municípios' },
        { name: 'Operacional', description: 'Monitoramento e integridade' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Tratamento Global de Erros
  app.setErrorHandler((error, request, reply) => {
    // 1. Erro de Validação Zod
    if (error instanceof ZodError) {
      return reply.status(422).send({
        sucesso: false,
        codigo: 'VALIDATION_ERROR',
        mensagem: 'Erro de validação dos parâmetros enviados.',
        detalhes: error.flatten().fieldErrors,
      });
    }

    // 2. Erros de Domínio Conhecidos
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        sucesso: false,
        codigo: error.code,
        mensagem: error.message,
        detalhes: error.details,
      });
    }

    // 3. Erro de Rate Limiting
    if (error.statusCode === 429) {
      return reply.status(429).send({
        sucesso: false,
        codigo: 'RATE_LIMIT_EXCEEDED',
        mensagem: 'Limite de requisições excedido. Tente novamente em alguns segundos.',
      });
    }

    // 4. Erros Inesperados (Nunca vazar stack trace em produção)
    request.log.error({ err: error, reqId: request.id }, 'Erro interno não tratado');

    return reply.status(500).send({
      sucesso: false,
      codigo: 'INTERNAL_SERVER_ERROR',
      mensagem: 'Ocorreu um erro interno ao processar sua solicitação.',
      protocolo: request.id,
    });
  });

  // Registro de Rotas Versionadas
  app.register(ubsRoutes, { prefix: '/api/v1' });
  app.register(healthRoutes, { prefix: '/api/v1' });

  return app;
}
