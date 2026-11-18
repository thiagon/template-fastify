import underPressure from '@fastify/under-pressure';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function underPressurePlugin(fastify: FastifyInstance) {
  await fastify.register(underPressure);

  fastify.readiness.add('pressure', () => {
    const { eventLoopDelay, eventLoopUtilized } = fastify.memoryUsage();
    if (eventLoopDelay > 1000 || eventLoopUtilized > 0.98) {
      throw new Error('service under pressure');
    }
  });
}

export default fp(underPressurePlugin, { name: 'under-pressure', dependencies: ['readiness'] });
