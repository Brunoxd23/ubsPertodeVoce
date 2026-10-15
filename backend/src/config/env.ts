import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIME_WINDOW_MS: z.coerce.number().default(60000),
  DATABASE_URL: z.string().default('postgresql://ubs_user:ubs_secure_password@localhost:5432/ubs_db'),
  USE_EMBEDDED_DB: z.preprocess(
    (val) => (val === undefined ? true : val === 'true' || val === true || val === '1'),
    z.boolean().default(true)
  ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  REDACT_GEOLOCATION_LOGS: z.preprocess(
    (val) => (val === undefined ? true : val === 'true' || val === true || val === '1'),
    z.boolean().default(true)
  ),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Erro na validação das variáveis de ambiente:', _env.error.format());
  throw new Error('Variáveis de ambiente inválidas');
}

export const env = _env.data;
