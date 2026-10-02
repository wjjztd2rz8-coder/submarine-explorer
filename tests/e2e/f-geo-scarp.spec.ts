// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';

/**
 * F-GEO-SCARP: the four wall / scarp heroes in free dive. For each site the sub
 * is placed in front of the wall face (local -Z of the prop) and a 1280x720
 * screenshot is written to .cache/codex/shots/f-geo-scarp/: "wide" shows the
 * whole wall and apron, "toe" the talus and the feathered contact with the seabed.
 */
const shots = '.cache/codex/shots/f-geo-scarp';

interface Game {
  sub: Submarine;
  rig: CameraRig;
  props: Props;
  terrain: { sampleHeight(x: number, z: number): number };
  discovery: { loaded: boolean };
  headlights: { setPreset(p: never): void };
  perf: { drawCalls: number; triangles: number; tier: string };
  config: { submarine: { maxPitch: number } };
}

const sites = [
  { id: 'challenger-deep', hero: 'north-wall-scarp' },
  { id: 'monterey-canyon', hero: 'canyon-wall-ledge' },
  { id: 'hunga-tonga-caldera', hero: 'caldera-tuff-wall' },
  { id: 'great-blue-hole', hero: 'karst-grotto' },
];

/**
 * Orbit camera around the parked sub (a scale reference): `range` m in front of the
 * wall, camera `radius` m away at `azimuth` radians off the line behind the sub.
 */
const views = [
  { name: 'wide', range: 45, radius: 55, elevation: 0.22, azimuth: 0 },
  { name: 'toe', range: 20, radius: 26, elevation: 0.12, azimuth: 0.5 },
  { name: 'oblique', range: 30, radius: 44, elevation: 0.2, azimuth: 1.15 },
  { name: 'high', range: 28, radius: 70, elevation: 0.62, azimuth: -0.4 },
];

async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(1200);
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

test.describe('F-GEO-SCARP wall heroes', () => {
  test.describe.configure({ mode: 'default', timeout: 240_000 });
  test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  for (const { id, hero } of sites) {
    test(`${id}: ${hero} wall screenshots`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await mkdir(shots, { recursive: true });
      await page.goto(`/?tile=${id}&skipBriefing=1`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await page.waitForFunction(() => window.__gameReady === true, undefined, {
        timeout: 120_000,
      });
      await page.waitForFunction(
        () => {
          const g = window.__game as unknown as Game | undefined;
          return g?.props.loaded && g.discovery.loaded;
        },
        undefined,
        { timeout: 90_000 },
      );
      // Review aids: hide the HUD and lift the headlight fill so the shapes read.
      await page.addStyleTag({ content: 'body > :not(#viewport) { display: none !important; }' });
      await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        g.headlights.setPreset({
          intensity: 1800,
          distance: 2500,
          angleDeg: 50,
          coneOpacity: 0.01,
          fillIntensity: 2200,
          fillDistance: 220,
        } as never);
      });
      for (const v of views) {
        await page.evaluate(
          ({ hero, v }) => {
            const g = window.__game as unknown as Game;
            const p = g.props.placed.find((q) => q.def.id === hero);
            if (!p) throw new Error(`missing ${hero}`);
            p.root.updateMatrixWorld(true);
            const b = p.localBounds;
            const cx = (b.min.x + b.max.x) / 2;
            // In front of the face (local -Z), over the middle of the wall.
            const eye = p.root.localToWorld(g.sub.position.clone().set(cx, 0, b.min.z - v.range));
            const aim = p.root.localToWorld(g.sub.position.clone().set(cx, 0, 0));
            const y = Math.min(-2, g.terrain.sampleHeight(eye.x, eye.z) + 8);
            const yaw = Math.atan2(aim.x - eye.x, -(aim.z - eye.z));
            g.sub.reset(eye.x, y, eye.z, yaw);
            g.sub.pitch = 0;
            g.rig.resetView();
            g.rig.setMode('orbit');
            g.rig.orbitRadius = v.radius;
            g.rig.orbitElevation = v.elevation;
            // Behind the sub (away from the wall), turned by the view's azimuth.
            g.rig.orbitAzimuth = Math.atan2(-Math.sin(yaw), Math.cos(yaw)) + v.azimuth;
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          },
          { hero, v },
        );
        await settle(page);
        await page.screenshot({ path: `${shots}/${id}-${v.name}.png`, timeout: 60_000 });
      }
      const perf = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        return { tier: g.perf.tier, draws: g.perf.drawCalls, triangles: g.perf.triangles };
      });
      console.log(`F-GEO-SCARP ${id} ${JSON.stringify(perf)}`);
      expect(perf.draws).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });
  }
});
