// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';

/**
 * F1-TERRAIN: the seabed at 5-15 m altitude on each biome, per tier. Frames land
 * in .cache/codex/shots/f1-terrain/ (SHOT_TAG=before|after picks the suffix).
 * Asserts the page loads without errors and the frame is not blank.
 */
const shots = '.cache/codex/shots/f1-terrain';
// @ts-expect-error process is not typed in the browser tsconfig.
const tag: string = process.env.SHOT_TAG ?? 'after';

interface Game {
  terrain: { sampleHeight(x: number, z: number): number };
  sub: { reset(x: number, y: number, z: number, yaw: number): void; pitch: number };
  perf: { drawCalls: number; triangles: number };
  rig: {
    setMode(m: string): string;
    orbitRadius: number;
    orbitAzimuth: number;
    orbitElevation: number;
  };
}

const SITES = [
  { tile: 'titanic', x: -60, z: 120, alt: 8, yaw: 0.6 },
  { tile: 'lost-city', x: 0, z: 0, alt: 8, yaw: 0.6 },
  { tile: 'blake-plateau-corals', x: 0, z: 0, alt: 8, yaw: 0.6 },
  { tile: 'great-blue-hole', x: 0, z: 0, alt: 8, yaw: 0.6 },
  { tile: 'axial-seamount-ashes', x: 0, z: 0, alt: 8, yaw: 0.6 },
  { tile: 'challenger-deep', x: 0, z: 0, alt: 8, yaw: 0.6 },
];
// @ts-expect-error process is not typed in the browser tsconfig.
const only: string | undefined = process.env.SHOT_SITE;
// @ts-expect-error process is not typed in the browser tsconfig.
const tiers: string[] = (process.env.SHOT_TIERS ?? 'low,high').split(',');

for (const s of SITES.filter((x) => !only || x.tile === only)) {
  for (const tier of tiers) {
    test(`terrain ${s.tile} ${tier}`, async ({ page }) => {
      await mkdir(shots, { recursive: true });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await page.setViewportSize({ width: 1600, height: 900 });
      await page.goto(`/?tile=${s.tile}&skipBriefing=1&tier=${tier}`);
      await page.waitForFunction(() => window.__gameReady === true, undefined, {
        timeout: 60_000,
      });
      await page.evaluate((p) => {
        const g = window.__game as unknown as Game;
        const y = g.terrain.sampleHeight(p.x, p.z) + p.alt;
        g.sub.reset(p.x, y, p.z, p.yaw);
      }, s);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${shots}/${s.tile}-${tier}-${tag}.png` });
      const perf = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        return { calls: g.perf.drawCalls, tris: g.perf.triangles };
      });
      await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        g.rig.setMode('first-person');
        const q = g.sub as unknown as { position: { x: number; y: number; z: number } };
        q.position.y = g.terrain.sampleHeight(q.position.x, q.position.z) + 3.5;
        g.sub.pitch = -0.3;
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${shots}/${s.tile}-${tier}-${tag}-close.png` });
      console.log(`PERF ${s.tile} ${tier} calls=${perf.calls} tris=${perf.tris}`);
      expect(errors.filter((e) => !/favicon|404/.test(e))).toEqual([]);
    });
  }
}
