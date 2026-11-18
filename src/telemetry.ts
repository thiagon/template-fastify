import { FastifyOtelInstrumentation } from '@fastify/otel';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { envSchema } from './env.ts';

export function startTelemetry(): AsyncDisposable {
  const env = envSchema
    .pick({
      SERVICE_NAME: true,
      SERVICE_VERSION: true,
      OTEL_EXPORTER_OTLP_ENDPOINT: true,
      OTEL_LOGS_EXPORTER: true,
    })
    .parse(process.env);

  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) return { [Symbol.asyncDispose]: async () => {} };

  const logsEnabled = env.OTEL_LOGS_EXPORTER !== 'none';

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: env.SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: env.SERVICE_VERSION,
    }),
    metricReaders: [],
    ...(logsEnabled ? {} : { logRecordProcessors: [] }),
    instrumentations: [
      new FastifyOtelInstrumentation({
        registerOnInitialization: true,
        instrumentHooks: false,
        requestHook: (span, request) => {
          const route = request.routeOptions.url;
          span.updateName(route ? `${request.method} ${route}` : request.method);
        },
      }),
      new HttpInstrumentation({ disableIncomingRequestInstrumentation: true }),
      new UndiciInstrumentation(),
      new PinoInstrumentation({ disableLogSending: !logsEnabled }),
    ],
  });
  sdk.start();

  return { [Symbol.asyncDispose]: () => sdk.shutdown().catch(() => {}) };
}
