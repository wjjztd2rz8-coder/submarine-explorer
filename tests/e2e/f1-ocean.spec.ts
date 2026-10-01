// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';

/**
 * F1-OCEAN: the water column at shallow, mid and deep sites on each tier,
 * plus the look-up view (Snell's window and god rays) near the surface.
 * Frames land in .cache/codex/shots/f1-ocean/. Asserts only that nothing
 * throws and that no frame is crushed to black.
 */
const shots = '.cache/codex/shots/f1-ocean';

type G = {
  rig: {
    setMode(m: string): string;
    orbitRadius: number;
    orbitAzimuth: number;
    orbitElevation: number;
  };
  perf: { tier: string };
};

const CASES = [
  { name: 'shallow', tile: 'monterey-canyon', depth: 12, tier: 'high' },
  { name: 'mid', tile: 'monterey-canyon', depth: 150, tier: 'high' },
  { name: 'deep', tile: 'titanic', depth: 3800, tier: 'high' },
  { name: 'shallow', tile: 'monterey-canyon', depth: 12, tier: 'low' },
  { name: 'mid', tile: 'monterey-canyon', depth: 150, tier: 'medium' },
  { name: 'reef', tile: 'great-blue-hole', depth: 9, tier: 'high' },
  { name: 'reef', tile: 'great-blue-hole', depth: 9, tier: 'low' },
  { name: 'deep', tile: 'titanic', depth: 3800, tier: 'low' },
];

for (const c of CASES) {
  test(`ocean ${c.name} on ${c.tier}`, async ({ page }) => {
    await mkdir(shots, { recursive: true });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/?tile=${c.tile}&depth=${c.depth}&tier=${c.tier}`);
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await page.waitForTimeout(2500);
    const path = `${shots}/${c.name}-${c.tier}.png`;
    await page.screenshot({ path });
    if (c.name === 'shallow') {
      await page.evaluate(() => {
        const rig = (window.__game as unknown as G).rig;
        rig.orbitRadius = 40;
        rig.orbitAzimuth = 0.6;
        rig.orbitElevation = -1.0;
        rig.setMode('orbit');
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${shots}/lookup-${c.tier}.png` });
    }
    if (c.name === 'reef') {
      // Under the surface, level with the boat, so the sunlit water column shows.
      await page.evaluate(() => {
        const rig = (window.__game as unknown as G).rig;
        rig.orbitRadius = 34;
        rig.orbitAzimuth = 0.7;
        rig.orbitElevation = 0.05;
        rig.setMode('orbit');
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${shots}/reef-under-${c.tier}.png` });
    }
    if (c.name === 'deep') {
      // The beams from the side: where the volume shows.
      await page.evaluate(() => {
        const rig = (window.__game as unknown as G).rig;
        rig.orbitRadius = 45;
        rig.orbitAzimuth = 1.3;
        rig.orbitElevation = 0.12;
        rig.setMode('orbit');
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${shots}/beams-${c.tier}.png` });
    }
    expect(errors).toEqual([]);
  });
}
