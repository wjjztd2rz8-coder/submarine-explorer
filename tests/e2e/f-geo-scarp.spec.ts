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
  { name: 'wide', range: 10, radius: 70, elevation: 0.25, azimuth: 0.2, side: 0.1 },
  { name: 'toe', range: 4, radius: 22, elevation: 0.12, azimuth: 0.55, side: 0.12 },
  { name: 'oblique', range: 8, radius: 48, elevation: 0.2, azimuth: 1.05, side: 0.2 },
  { name: 'high', range: 6, radius: 75, elevation: 0.6, azimuth: -0.4, side: -0.15 },
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
      const original = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        const keep = { ...(g.headlights as unknown as { preset: object }).preset };
        g.headlights.setPreset({
          intensity: 1800,
          distance: 2500,
          angleDeg: 50,
          coneOpacity: 0.01,
          fillIntensity: 7000,
          fillDistance: 300,
        } as never);
        return keep;
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
            const w = b.max.x - b.min.x;
            // In front of the face (local -Z), over the middle of the wall.
            const eye = p.root.localToWorld(
              g.sub.position.clone().set(cx + v.side * w, 0, b.min.z - v.range),
            );
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
      // Default headlights, cockpit view, close to the foot of the wall (what a player sees).
      await page.evaluate(
        ({ hero, original }) => {
          const g = window.__game as unknown as Game;
          g.headlights.setPreset(original as never);
          const p = g.props.placed.find((q) => q.def.id === hero)!;
          const b = p.localBounds;
          const eye = p.root.localToWorld(
            g.sub.position.clone().set((b.min.x + b.max.x) / 2, 0, b.min.z - 16),
          );
          const aim = p.root.localToWorld(
            g.sub.position.clone().set((b.min.x + b.max.x) / 2, 0, 0),
          );
          const y = Math.min(-2, g.terrain.sampleHeight(eye.x, eye.z) + 10);
          const yaw = Math.atan2(aim.x - eye.x, -(aim.z - eye.z));
          g.sub.reset(eye.x, y, eye.z, yaw);
          g.sub.pitch = -0.1;
          g.rig.resetView();
          g.rig.setMode('first-person');
          g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
        },
        { hero, original },
      );
      await settle(page);
      await page.screenshot({ path: `${shots}/${id}-cockpit.png`, timeout: 60_000 });
      const perf = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        return { tier: g.perf.tier, draws: g.perf.drawCalls, triangles: g.perf.triangles };
      });
      // Every instanced rock rests on the real terrain/apron: not buried deep, not hovering.
      const rocks = await page.evaluate((hero) => {
        const g = window.__game as unknown as Game;
        const p = g.props.placed.find((q) => q.def.id === hero)!;
        p.root.updateMatrixWorld(true);
        const THREE_M = p.root.matrixWorld.constructor as new () => {
          multiplyMatrices(a: unknown, b: unknown): unknown;
          elements: number[];
        };
        let count = 0;
        let min = Infinity;
        let max = -Infinity;
        p.full.traverse((o) => {
          const im = o as unknown as {
            isInstancedMesh?: boolean;
            count: number;
            getMatrixAt(i: number, m: unknown): void;
          };
          if (!im.isInstancedMesh) return;
          const m = new THREE_M();
          const w = new THREE_M();
          for (let i = 0; i < im.count; i++) {
            im.getMatrixAt(i, m);
            w.multiplyMatrices(p.root.matrixWorld, m);
            const x = w.elements[12]!;
            const y = w.elements[13]!;
            const z = w.elements[14]!;
            const d = y - g.terrain.sampleHeight(x, z);
            count++;
            min = Math.min(min, d);
            max = Math.max(max, d);
          }
        });
        return { count, min, max, height: p.localBounds.max.y - p.localBounds.min.y };
      }, hero);
      console.log(`F-GEO-SCARP ${id} rocks ${JSON.stringify(rocks)}`);
      expect(rocks.count).toBeGreaterThan(20);
      expect(rocks.min).toBeGreaterThan(-3);
      expect(rocks.max).toBeLessThan(rocks.height * 0.5);
      console.log(`F-GEO-SCARP ${id} ${JSON.stringify(perf)}`);
      expect(perf.draws).toBeGreaterThan(0);
      expect(perf.triangles).toBeLessThan(900_000);
      expect(errors).toEqual([]);
    });
  }
});
