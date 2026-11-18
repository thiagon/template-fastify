import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          testTimeout: 15_000,
          hookTimeout: 15_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          testTimeout: 15_000,
          hookTimeout: 15_000,
        },
      },
    ],
    server: {
      deps: { inline: ['@fastify/autoload'] },
    },
    coverage: {
      include: ['src/**'],
      reporter: ['text', 'json-summary', 'json'],
      reportOnFailure: true,
    },
  },
});
