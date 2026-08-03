import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  APP_ENV: z.string().default('dev'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  SERVICE_NAME: z.string().default('fastify-template'),
  SERVICE_VERSION: z.string().default('0.0.1'),
});

export type Env = z.infer<typeof envSchema>;
