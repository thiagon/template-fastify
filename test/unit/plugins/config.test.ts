import { afterEach, describe, expect, vi } from 'vitest';
import { test } from '../test.ts';

describe('config', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('decorates the app with the parsed env', async ({ app }) => {
    expect(app.env.PORT).toBe(3000);
  });

  test('logs the invalid fields and exits on a bad env', async ({ createApp }) => {
    vi.stubEnv('PORT', 'not-a-port');
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    let log: ReturnType<typeof vi.fn> | undefined;

    await expect(
      createApp(instance => {
        log = vi.spyOn(instance.log, 'error');
      }),
    ).rejects.toThrow('process.exit');

    expect(exit).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalledWith(
      { fieldErrors: { PORT: expect.any(Array) } },
      'invalid env configuration',
    );
  });
});
