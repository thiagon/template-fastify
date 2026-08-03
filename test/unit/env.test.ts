import { describe, expect, it } from 'vitest';
import { envSchema } from '../../src/env.ts';

describe('envSchema', () => {
  it('applies defaults when nothing is set', () => {
    expect(envSchema.parse({})).toEqual({
      NODE_ENV: 'development',
      APP_ENV: 'dev',
      PORT: 3000,
      HOST: '0.0.0.0',
      LOG_LEVEL: 'info',
      SERVICE_NAME: 'fastify-template',
      SERVICE_VERSION: '0.0.1',
    });
  });

  it('coerces PORT to a number', () => {
    expect(envSchema.parse({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails when PORT is not numeric', () => {
    const result = envSchema.safeParse({ PORT: 'not-a-port' });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.PORT).toBeDefined();
  });
});
