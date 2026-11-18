import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import autoload from '@fastify/autoload';
import fastify, { type FastifyInstance, type FastifyServerOptions, LogController } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    trustProxy: process.env.TRUST_PROXY === 'true',
    requestTimeout: 30_000,
    logController: new LogController({ disableRequestLogging: true }),
    ...options,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      { req: request, res: reply, responseTime: reply.elapsedTime },
      'request completed',
    );
  });

  app.register(autoload, { dir: join(import.meta.dirname, 'plugins') });
  app.register(autoload, { dir: join(import.meta.dirname, 'modules') });

  return app;
}
