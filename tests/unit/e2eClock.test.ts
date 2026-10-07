import { expect, test } from 'vitest';
import type { Page } from '@playwright/test';
import { withClockFrames } from '../e2e/helpers/clock.js';

const closedError = new Error('Target page, context or browser has been closed');

function probe(runFor: () => Promise<void>, isClosed = false) {
  let added: ((page: Page) => void) | undefined;
  const page = {
    context: () => ({
      on: (_event: string, listener: (page: Page) => void) => {
        added = listener;
      },
      off: () => {
        added = undefined;
      },
    }),
    clock: { runFor },
    isClosed: () => isClosed,
    evaluate: async () => 'complete',
  } as unknown as Page;
  return {
    page,
    closeAuxiliary: () => {
      let close: (() => void) | undefined;
      added?.({
        once: (_event: string, listener: () => void) => {
          close = listener;
        },
        off: () => {},
      } as unknown as Page);
      close?.();
    },
  };
}

test('an auxiliary-page clock race returns the audit result without replacing it', async () => {
  let finish!: (value: string) => void;
  const audit = new Promise<string>((resolve) => {
    finish = resolve;
  });
  const fixture = probe(async () => {
    fixture.closeAuxiliary();
    finish('actual audit result');
    throw closedError;
  });
  await expect(withClockFrames(fixture.page, () => audit)).resolves.toBe('actual audit result');
});

test('clock failures without an auxiliary closure and game-page closures remain failures', async () => {
  const pending = new Promise<void>(() => {});
  const fixture = probe(async () => {
    throw closedError;
  });
  await expect(withClockFrames(fixture.page, () => pending)).rejects.toBe(closedError);
  const closed = probe(async () => {}, true);
  await expect(withClockFrames(closed.page, async () => 'audit')).rejects.toThrow(
    'Game page closed',
  );
});

test('audit errors survive an auxiliary-page clock race', async () => {
  const auditError = new Error('audit failed');
  let fail!: (error: Error) => void;
  const audit = new Promise<void>((_resolve, reject) => {
    fail = reject;
  });
  const fixture = probe(async () => {
    fixture.closeAuxiliary();
    fail(auditError);
    throw closedError;
  });
  await expect(withClockFrames(fixture.page, () => audit)).rejects.toBe(auditError);
});
