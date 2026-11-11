import { afterEach, expect, test, vi } from 'vitest';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };

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

test.each(['', '1'])(
  'first-minute journeys preserve local, hosted and diagnostic test deadlines (CI=%s)',
  async (ci) => {
    vi.stubEnv('CI', ci);
    vi.stubEnv('PW_RENDER_REVIEW', '1');
    const playwright = await vi.importActual<typeof import('@playwright/test')>('@playwright/test');
    type Journey = (
      fixtures: { page: { on(): void; goto(): Promise<never> } },
      info: object,
    ) => Promise<void>;
    const journeys: Journey[] = [];
    let firstMinute = false;
    let budget = 0;
    // Collect the real journey bodies without starting a browser in the static gate.
    const register = Object.assign(
      (name: string, body: Journey) => {
        if (firstMinute && name.startsWith('kamaehuakanaloa:')) journeys.push(body);
      },
      {
        describe: (name: string, body: () => void) => {
          firstMinute = name.startsWith('first minute acceptance');
          body();
          firstMinute = false;
        },
        use() {},
        beforeEach() {},
        afterEach() {},
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
  },
);

test.each([
  ['', undefined, 3],
  ['1', undefined, 1],
  ['1', '1', 3],
] as const)(
  'first-minute matrix covers every site and every layout (%s, %s)',
  async (ci, review, copies) => {
    vi.stubEnv('CI', ci);
    vi.stubEnv('PW_RENDER_REVIEW', review);
    const playwright = await vi.importActual<typeof import('@playwright/test')>('@playwright/test');
    const sites: string[] = [];
    const layouts = new Set<string>();
    let layout = '';
    const register = Object.assign(
      (name: string) => {
        if (!layout) return;
        sites.push(name.split(':')[0]);
        layouts.add(layout);
      },
      {
        describe: (name: string, body: () => void) => {
          layout = name.startsWith('first minute acceptance') ? name : '';
          body();
          layout = '';
        },
        use() {},
        beforeEach() {},
        afterEach() {},
      },
    );
    vi.doMock('@playwright/test', () => ({ ...playwright, test: register }));
    await import('../e2e/phone-accept.spec.js');
    expect(layouts.size).toBe(3);
    expect(sites).toHaveLength(catalog.landmarks.length * copies);
    for (const site of catalog.landmarks)
      expect(
        sites.filter((found) => found === site),
        site,
      ).toHaveLength(copies);
  },
);
