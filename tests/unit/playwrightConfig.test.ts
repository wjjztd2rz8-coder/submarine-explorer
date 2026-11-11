import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@playwright/test');
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each([
  ['local suite owns its preview by default', '', undefined, false],
  ['interactive local run can explicitly reuse preview', '', '1', true],
  ['gate override prevents inherited interactive reuse', '', '0', false],
  ['CI always owns preview even with interactive opt-in', '1', '1', false],
] as const)('%s', async (_name, ci, reuse, expected) => {
  vi.stubEnv('CI', ci);
  vi.stubEnv('PW_REUSE_SERVER', reuse);
  vi.stubEnv('PW_PORT', '4371');
  vi.stubEnv('PW_OUTDIR', 'dist-isolated-gate');
  vi.stubEnv('GATES_CONFIG_MODE', undefined);
  const { default: config } = await import('../../playwright.config.js');
  expect(config.webServer).toMatchObject({
    reuseExistingServer: expected,
    command: 'npm run preview -- --port 4371 --strictPort --outDir dist-isolated-gate',
    url: 'http://localhost:4371',
  });
});

test.each([
  ['', undefined, false],
  ['1', undefined, true],
  ['1', '1', false],
] as const)(
  'render guards remain discoverable outside push CI (%s, %s)',
  async (ci, review, excluded) => {
    vi.stubEnv('CI', ci);
    vi.stubEnv('PW_RENDER_REVIEW', review);
    const { default: config } = await import('../../playwright.config.js');
    expect(Boolean(config.grepInvert)).toBe(excluded);
    if (excluded) expect(config.grepInvert).toEqual(/@render/);
  },
);

test('phone acceptance preserves test deadlines and bounds every teardown screenshot', async () => {
  const playwright = await vi.importActual<typeof import('@playwright/test')>('@playwright/test');
  type Journey = (
    fixtures: { page: { on(): void; goto(): Promise<never> } },
    info: object,
  ) => Promise<void>;
  const journeys: Journey[] = [];
  type Teardown = (
    fixtures: { page: { screenshot: ReturnType<typeof vi.fn> } },
    info: { status: string; outputPath(name: string): string },
  ) => Promise<void>;
  const rootTeardowns: Teardown[] = [];
  const suites: Array<{ name: string; teardowns: Teardown[] }> = [];
  let suite: (typeof suites)[number] | undefined;
  let firstMinute = false;
  let budget = 0;
  // Collect the real journey bodies without starting a browser in the static gate.
  const register = Object.assign(
    (name: string, body: Journey) => {
      if (firstMinute && name.startsWith('kamaehuakanaloa:')) journeys.push(body);
    },
    {
      describe: (name: string, body: () => void) => {
        const parent = suite;
        suite = { name, teardowns: [...(parent?.teardowns ?? rootTeardowns)] };
        suites.push(suite);
        firstMinute = name.startsWith('first minute acceptance');
        body();
        suite = parent;
        firstMinute = false;
      },
      use() {},
      beforeEach() {},
      afterEach: (body: Teardown) => (suite?.teardowns ?? rootTeardowns).push(body),
      setTimeout: (timeout: number) => {
        budget = timeout;
      },
    },
  );
  vi.doMock('@playwright/test', () => ({ ...playwright, test: register }));
  await import('../e2e/phone-accept.spec.js');
  expect(journeys).toHaveLength(3);
  const navigation = new Error('navigation reached');
  const page = {
    on() {},
    goto: async (): Promise<never> => {
      throw navigation;
    },
  };
  for (const timeout of [90_000, 240_000, 1_500]) {
    for (const journey of journeys) {
      budget = timeout;
      await expect(journey({ page }, {})).rejects.toBe(navigation);
      // A body-level timeout override otherwise makes a hung goto outlive the configured deadline.
      expect(budget).toBe(timeout);
    }
  }
  expect(suites).toHaveLength(5);
  for (const { name, teardowns } of suites) {
    expect(teardowns, name).toHaveLength(1);
    for (const status of ['passed', 'failed', 'interrupted', 'timedOut']) {
      const screenshot = vi.fn().mockResolvedValue(undefined);
      for (const teardown of teardowns)
        await teardown({ page: { screenshot } }, { status, outputPath: (file) => file });
      if (status === 'timedOut') expect(screenshot, name).not.toHaveBeenCalled();
      else {
        expect(screenshot, name).toHaveBeenCalledExactlyOnceWith({
          path: expect.stringMatching(/\.png$/),
          timeout: 5_000,
        });
      }
    }
  }
});
