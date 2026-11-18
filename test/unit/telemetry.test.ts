import { trace } from '@opentelemetry/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startTelemetry } from '../../src/telemetry.ts';
import { test } from './test.ts';

describe('startTelemetry', () => {
  afterEach(() => {
    trace.disable();
    vi.unstubAllEnvs();
  });

  it('stays off without an otlp endpoint', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', undefined);

    await using _telemetry = startTelemetry();

    expect(trace.getTracer('test').startSpan('noop').isRecording()).toBe(false);
  });

  it('records spans when an otlp endpoint is set', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://127.0.0.1:1');
    vi.stubEnv('OTEL_EXPORTER_OTLP_TIMEOUT', '100');

    await using _telemetry = startTelemetry();

    const span = trace.getTracer('test').startSpan('recorded');
    expect(span.isRecording()).toBe(true);
    span.end();
  });

  it('shuts down cleanly when the collector is unreachable', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://127.0.0.1:1');
    vi.stubEnv('OTEL_EXPORTER_OTLP_TIMEOUT', '100');
    const telemetry = startTelemetry();
    trace.getTracer('test').startSpan('pending').end();

    await expect(telemetry[Symbol.asyncDispose]()).resolves.toBeUndefined();
  });

  it('shuts down cleanly with otlp logs enabled', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://127.0.0.1:1');
    vi.stubEnv('OTEL_EXPORTER_OTLP_TIMEOUT', '100');
    vi.stubEnv('OTEL_LOGS_EXPORTER', 'otlp');
    const telemetry = startTelemetry();

    await expect(telemetry[Symbol.asyncDispose]()).resolves.toBeUndefined();
  });

  test('names request spans after the route template', async ({ createApp }) => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://127.0.0.1:1');
    vi.stubEnv('OTEL_EXPORTER_OTLP_TIMEOUT', '100');
    await using _telemetry = startTelemetry();
    const names: string[] = [];
    const app = await createApp(instance => {
      instance.addHook('onSend', async request => {
        names.push((request.opentelemetry().span as unknown as { name: string }).name);
      });
    });

    await app.inject({ method: 'GET', url: '/todos?limit=1' });
    await app.inject({ method: 'GET', url: '/does-not-exist' });

    expect(names).toEqual(['GET /todos', 'GET']);
  });

  it('rejects an endpoint without http or https', () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'lgtm:4318');

    expect(() => startTelemetry()).toThrow(/OTEL_EXPORTER_OTLP_ENDPOINT/);
  });
});
