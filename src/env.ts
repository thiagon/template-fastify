import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  APP_ENV: z.string().default('dev'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  SERVICE_NAME: z.string().default('fastify-template'),
  SERVICE_VERSION: z.string().default('0.0.1'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  CORS_ORIGIN: z
    .string()
    .default('*')
    .transform(value => (value === '*' ? value : value.split(',').map(origin => origin.trim()))),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  DOCS_ENABLED: z.stringbool().default(true),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
  OTEL_EXPORTER_OTLP_TIMEOUT: z.coerce.number().int().positive().optional(),
  OTEL_LOGS_EXPORTER: z.enum(['otlp', 'console', 'none']).default('none'),
});

export type Env = z.infer<typeof envSchema>;
