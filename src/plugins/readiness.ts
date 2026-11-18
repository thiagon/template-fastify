import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    readiness: {
      add(name: string, check: () => unknown): void;
      run(): Promise<Record<string, 'ok' | 'fail'>>;
    };
  }
}

async function readinessPlugin(fastify: FastifyInstance) {
  const checks = new Map<string, () => unknown>();

  fastify.decorate('readiness', {
    add(name: string, check: () => unknown) {
      if (checks.has(name)) throw new Error(`readiness check "${name}" already registered`);
      checks.set(name, check);
    },
    async run() {
      const results = await Promise.all(
        [...checks].map(async ([name, check]) => {
          try {
            await check();
            return [name, 'ok'] as const;
          } catch (err) {
            fastify.log.warn({ err, check: name }, 'readiness check failed');
            return [name, 'fail'] as const;
          }
        }),
      );
      return Object.fromEntries(results);
    },
  });
}

export default fp(readinessPlugin, { name: 'readiness' });
