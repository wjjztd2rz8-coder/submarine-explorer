import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
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
