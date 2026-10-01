// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';

/**
 * F1-FIXES: in-game views of the vent plume, the ROV rig and the geology
 * fixes, saved to .cache/codex/shots/f1-fixes/. Asserts only that nothing
 * throws.
 */
const shots = '.cache/codex/shots/f1-fixes';
const tag =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.SHOT_TAG ?? 'after';

type G = {
  rig: {
    setMode(m: string): string;
    orbitRadius: number;
    orbitAzimuth: number;
    orbitElevation: number;
  };
};

const CASES = [
  { name: 'beebe', tile: 'beebe-vent-field', at: '18.54628,-81.71795', depth: 2240, tier: 'high' },
  { name: 'lostcity', tile: 'lost-city', at: '30.1233,-42.1195', depth: 780, tier: 'high' },
  { name: 'kama', tile: 'kamaehuakanaloa', at: '18.9122,-155.2677', depth: 1150, tier: 'high' },
  {
    name: 'axial',
    tile: 'axial-seamount-ashes',
    at: '45.93385,-130.0139',
    depth: 1520,
    tier: 'high',
  },
];

for (const c of CASES) {
  test(`fixes ${c.name}`, async ({ page }) => {
    await mkdir(shots, { recursive: true });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/?tile=${c.tile}&at=${c.at}&depth=${c.depth}&tier=${c.tier}`);
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${shots}/${c.name}-${tag}-0.png` });
    await page.evaluate(() => {
      const rig = (window.__game as unknown as G).rig;
      rig.orbitRadius = 30;
      rig.orbitAzimuth = 0.8;
      rig.orbitElevation = 0.25;
      rig.setMode('orbit');
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${shots}/${c.name}-${tag}-1.png` });
    await page.evaluate(() => {
      const rig = (window.__game as unknown as G).rig;
      rig.orbitRadius = 110;
      rig.orbitAzimuth = 2.2;
      rig.orbitElevation = 0.1;
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${shots}/${c.name}-${tag}-2.png` });
    expect(errors).toEqual([]);
  });
}

test('rov lamps', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?tile=titanic&landmark=_test&poi=test-bow');
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('e');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${shots}/rov-${tag}-0.png` });
  expect(errors).toEqual([]);
});
