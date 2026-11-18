import { describe, expect, vi } from 'vitest';
import { test } from '../test.ts';

type Handler = (event: { signal?: string; err?: Error }) => Promise<void>;

const closeWithGrace = vi.hoisted(() => {
  const state = { handler: undefined as Handler | undefined, uninstall: vi.fn() };
  const mock = vi.fn((_options: unknown, handler: Handler) => {
    state.handler = handler;
    return { close: vi.fn(), uninstall: state.uninstall };
  });
  return Object.assign(mock, { state });
});

vi.mock('close-with-grace', () => ({ default: closeWithGrace }));

describe('close with grace', () => {
  test('closes the app on a signal', async ({ createApp }) => {
    const onClose = vi.fn(async () => {});
    await createApp(instance => instance.addHook('onClose', onClose));

    await closeWithGrace.state.handler?.({ signal: 'SIGTERM' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  test('logs the error and closes the app on a crash', async ({ createApp }) => {
    const onClose = vi.fn(async () => {});
    const app = await createApp(instance => instance.addHook('onClose', onClose));
    const log = vi.spyOn(app.log, 'error');

    await closeWithGrace.state.handler?.({ err: new Error('boom') });

    expect(log).toHaveBeenCalledWith({ err: expect.any(Error) }, 'shutdown failed');
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('removes its process listeners when the app closes', async ({ createApp }) => {
    closeWithGrace.state.uninstall.mockClear();
    const app = await createApp();

    await app.close();

    expect(closeWithGrace.state.uninstall).toHaveBeenCalledOnce();
  });
});
