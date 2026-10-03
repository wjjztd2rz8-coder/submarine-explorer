import { expect, test } from './helpers/unlocked.js';
import { titleAudit } from './helpers/titleAudit.js';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const base = env.PW_BASE ?? '';

test.skip(!base, 'set PW_BASE to test a build served from that path');

test('project-base build loads data, models, and globe texture', async ({ page }, testInfo) => {
  const requests: Array<{ status: number; path: string }> = [];
  const errors: string[] = [];
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (path.includes('/data/') || path.includes('/assets/')) {
      requests.push({ status: response.status(), path });
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${base}?tile=titanic&globe=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game?.globe as { textureReady?: boolean } | undefined)?.textureReady === true,
  );
  await page.screenshot({ path: testInfo.outputPath('project-base-globe.png') });

  await page.goto(`${base}?tile=titanic&landmark=_test&skipBriefing=1`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game?.props as { loaded?: boolean } | undefined)?.loaded === true,
  );
  const stats = await page.evaluate(() => {
    const props = window.__game?.props as { stats: { models: number; failed: number } };
    return { ...props.stats };
  });
  expect(stats.models).toBe(2);
  expect(stats.failed).toBe(0);
  await expect
    .poll(() => requests.filter(({ path }) => path.endsWith('.glb')).length)
    .toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('project-base-dive.png') });

  for (const suffix of [
    '/data/tiles/titanic/meta.json',
    '/data/tiles/titanic/heightmap.bin',
    '/data/landmarks/_test/props.json',
    '/assets/models/rock_09.glb',
    '/assets/models/barrel_stove.glb',
    '/assets/globe/earth-bmng-topo-bathy-4096.jpg',
  ]) {
    expect(requests).toContainEqual({ status: 200, path: `${base.replace(/\/$/, '')}${suffix}` });
  }
  expect(requests.filter(({ path }) => !path.startsWith(base))).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('.fatal')).toHaveCount(0);
});

// Title acceptance uses identical assertions at the project deployment base.
titleAudit(base || '/');
