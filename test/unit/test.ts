import type { FastifyInstance } from 'fastify';
import { test as base } from 'vitest';
import { buildApp } from '../../src/app.ts';

type Extend = (app: FastifyInstance) => void;

interface Fixtures {
  createApp: (extend?: Extend) => Promise<FastifyInstance>;
  app: FastifyInstance;
}

export const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest requires destructuring in the first argument
  createApp: async ({}, use) => {
    const apps: FastifyInstance[] = [];
    await use(async extend => {
      const instance = buildApp({ logger: false });
      extend?.(instance);
      await instance.ready();
      apps.push(instance);
      return instance;
    });
    await Promise.all(apps.map(instance => instance.close()));
  },
  app: async ({ createApp }, use) => {
    await use(await createApp());
  },
});
