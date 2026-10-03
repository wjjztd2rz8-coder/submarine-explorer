// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';

/**
 * F-BEEBE-PLUMES: the black-smoker plumes at the Beebe vent field. The sub is posed at
 * three distances from a smoker plume and 1280x720 shots go to
 * .cache/codex/shots/f-beebe-plumes/ (the HUD stays on: this is the player's view).
 * Also checks the plume built, billows, and that the low tier gets fewer particles.
 */
const shots = '.cache/codex/shots/f-beebe-plumes';

interface Game {
  sub: Submarine;
  rig: CameraRig;
  props: Props;
  terrain: { sampleHeight(x: number, z: number): number };
  discovery: { loaded: boolean };
}

async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(1500);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 0;
        const next = (): void => {
          if (++frames >= 8) resolve();
          else requestAnimationFrame(next);
        };
        requestAnimationFrame(next);
      }),
  );
}

async function load(page: Page, tier: string): Promise<void> {
  await page.goto(`/?tile=beebe-vent-field&skipBriefing=1&tutorial=0&tier=${tier}`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const g = window.__game as unknown as Game | undefined;
      return g?.props.loaded && g.discovery.loaded;
    },
    undefined,
    { timeout: 90_000 },
  );
}

const countPlumes = (page: Page) =>
  page.evaluate(() => {
    const g = window.__game as unknown as Game;
    let n = 0;
    let particles = 0;
    for (const p of g.props.placed)
      p.root.traverse((o) => {
        if (o.name === 'plume') {
          n++;
          particles += (
            o as unknown as { geometry: { getAttribute(k: string): { count: number } } }
          ).geometry.getAttribute('aSeed').count;
        }
      });
    return { n, particles };
  });

test.describe('F-BEEBE-PLUMES', () => {
  test.describe.configure({ timeout: 300_000 });
  test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  test('smoker plumes billow; screenshots; low tier is lighter', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await mkdir(shots, { recursive: true });
    await load(page, 'high');
    const high = await countPlumes(page);
    expect(high.n).toBeGreaterThan(0);

    for (const v of [
      { name: 'wide', range: 60, up: 18, pitch: 0.12 },
      { name: 'mid', range: 34, up: 12, pitch: 0.2 },
      { name: 'close', range: 18, up: 8, pitch: 0.35 },
    ]) {
      await page.evaluate((v) => {
        const g = window.__game as unknown as Game;
        const sub = g.sub;
        const base = sub.position.clone();
        let best: { x: number; y: number; z: number } | null = null;
        let bestD = Infinity;
        for (const p of g.props.placed)
          p.root.traverse((o) => {
            if (o.name !== 'plume') return;
            const w = o.getWorldPosition(base.clone());
            const d = Math.hypot(w.x - base.x, w.z - base.z);
            if (d < bestD) {
              bestD = d;
              best = { x: w.x, y: w.y, z: w.z };
            }
          });
        if (!best) throw new Error('no plume');
        const t = best as { x: number; y: number; z: number };
        // Stand off to the south-west of the plume (current drifts it roughly east).
        const eye = { x: t.x - v.range * 0.7, z: t.z + v.range * 0.7 };
        const y = Math.min(-2, g.terrain.sampleHeight(eye.x, eye.z) + v.up);
        const yaw = Math.atan2(t.x - eye.x, -(t.z - eye.z));
        sub.reset(eye.x, y, eye.z, yaw);
        sub.pitch = v.pitch;
        g.rig.resetView();
        g.rig.setMode('first-person');
        g.rig.snap(sub.position, sub.yaw, sub.pitch);
      }, v);
      await settle(page);
      await page.screenshot({ path: `${shots}/beebe-${v.name}.png`, timeout: 60_000 });
    }
    expect(errors).toEqual([]);

    await load(page, 'low');
    const low = await countPlumes(page);
    expect(low.n).toBeGreaterThan(0);
    expect(low.particles / low.n).toBeLessThan(high.particles / high.n);
    await page.screenshot({ path: `${shots}/beebe-low-tier.png`, timeout: 60_000 });
    expect(errors).toEqual([]);
  });
});
