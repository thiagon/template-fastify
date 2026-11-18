import { test as base } from 'vitest';

export const test = base.extend<{ baseUrl: string }>({
  baseUrl: process.env.SERVICE_URL ?? 'http://localhost:3000',
});
