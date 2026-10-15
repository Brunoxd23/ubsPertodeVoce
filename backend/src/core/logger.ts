import { env } from '../config/env.js';

/**
 * Configuração de logger do Fastify com redação nativa de alta performance do Pino
 * para conformidade com a LGPD e privacidade de geolocalização.
 */
export const loggerConfig = {
  level: env.LOG_LEVEL,
  redact: {
    paths: env.REDACT_GEOLOCATION_LOGS
      ? [
          'req.query.lat',
          'req.query.lon',
          'req.query.latitude',
          'req.query.longitude',
          'req.headers.authorization',
          'req.headers.cookie',
        ]
      : ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED_LGPD]',
  },
};
