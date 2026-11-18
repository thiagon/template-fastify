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
      TRUST_PROXY: 'false',
      CORS_ORIGIN: '*',
      RATE_LIMIT_MAX: 100,
      RATE_LIMIT_WINDOW: '1 minute',
      DOCS_ENABLED: true,
      OTEL_LOGS_EXPORTER: 'none',
    });
  });

  it('coerces PORT to a number', () => {
    expect(envSchema.parse({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('splits CORS_ORIGIN into a list of origins', () => {
    expect(envSchema.parse({ CORS_ORIGIN: 'https://a.com, https://b.com' }).CORS_ORIGIN).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('parses DOCS_ENABLED as a boolean', () => {
    expect(envSchema.parse({ DOCS_ENABLED: 'false' }).DOCS_ENABLED).toBe(false);
  });
});
