import { expect, test, type Page } from './helpers/unlocked.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';
import { test as freshTest } from '@playwright/test';
import { reviewScreenshot } from './helpers/render.js';
import landmarkIndex from '../../data/landmarks/index.json' with { type: 'json' };
import blueHolePoses from '../../tools/blue-hole-poses.json' with { type: 'json' };
import { waitForFrames } from './helpers/frames.js';

/** Wall support and per-view render budgets; review captures are opt-in. */
const shots = '.cache/codex/shots/f-geo-scarp';

interface ScarpGame {
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
  await waitForFrames(page, 2);
}

test.describe('wall geometry and view budgets', () => {
  test.describe.configure({ timeout: 240_000 });
  test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  for (const { id, hero } of sites) {
    // Regression guard: seated rubble and every authored view retain their draw/triangle budgets.
    test(`${id}: ${hero} across five wall views`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // These geometry checks require rubble, which CI's Low tier omits.
      await page.goto(`/?tile=${id}&skipBriefing=1&tier=medium`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await page.waitForFunction(() => window.__gameReady === true, undefined, {
        timeout: 120_000,
      });
      await page.waitForFunction(
        () => {
          const g = window.__game as unknown as ScarpGame | undefined;
          return g?.props.loaded && g.discovery.loaded;
        },
        undefined,
        { timeout: 90_000 },
      );
      // Review aids: hide the HUD and lift the headlight fill so the shapes read.
      await page.addStyleTag({ content: 'body > :not(#viewport) { display: none !important; }' });
      const original = await page.evaluate(() => {
        const g = window.__game as unknown as ScarpGame;
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
      for (const view of [...views.map((v) => v.name), 'cockpit']) {
        if (view !== 'cockpit') {
          const v = views.find((candidate) => candidate.name === view)!;
          await page.evaluate(
            ({ hero, v }) => {
              const g = window.__game as unknown as ScarpGame;
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
          await reviewScreenshot(page, { path: `${shots}/${id}-${v.name}.png`, timeout: 60_000 });
        } else {
          // Default headlights, cockpit view, close to the foot of the wall (what a player sees).
          await page.evaluate(
            ({ hero, original }) => {
              const g = window.__game as unknown as ScarpGame;
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
          await reviewScreenshot(page, { path: `${shots}/${id}-cockpit.png`, timeout: 60_000 });
        }
        const perf = await page.evaluate(() => {
          const g = window.__game as unknown as ScarpGame;
          return { tier: g.perf.tier, draws: g.perf.drawCalls, triangles: g.perf.triangles };
        });
        // Every instanced rock rests on the real terrain/apron: not buried deep, not hovering.
        const rocks = await page.evaluate((hero) => {
          const g = window.__game as unknown as ScarpGame;
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
        expect(perf.triangles).toBeLessThan(950_000);
        expect(errors).toEqual([]);
      }
    });
  }
});

test.describe('seabed camera states', () => {
  const shots = '.cache/codex/shots/f1-terrain';
  // @ts-expect-error process is not typed in the browser tsconfig.
  const tag: string = process.env.SHOT_TAG ?? 'after';

  interface SeabedGame {
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
      // Regression guard: both seabed camera states load without unexpected browser errors.
      test(`terrain ${s.tile} ${tier}`, async ({ page }) => {
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
          const g = window.__game as unknown as SeabedGame;
          const y = g.terrain.sampleHeight(p.x, p.z) + p.alt;
          g.sub.reset(p.x, y, p.z, p.yaw);
        }, s);
        await page.waitForTimeout(3000);
        await reviewScreenshot(page, { path: `${shots}/${s.tile}-${tier}-${tag}.png` });
        const perf = await page.evaluate(() => {
          const g = window.__game as unknown as SeabedGame;
          return { calls: g.perf.drawCalls, tris: g.perf.triangles };
        });
        await page.evaluate(() => {
          const g = window.__game as unknown as SeabedGame;
          g.rig.setMode('first-person');
          const q = g.sub as unknown as { position: { x: number; y: number; z: number } };
          q.position.y = g.terrain.sampleHeight(q.position.x, q.position.z) + 3.5;
          g.sub.pitch = -0.3;
        });
        await page.waitForTimeout(1500);
        await reviewScreenshot(page, { path: `${shots}/${s.tile}-${tier}-${tag}-close.png` });
        console.log(`PERF ${s.tile} ${tier} calls=${perf.calls} tris=${perf.tris}`);
        expect(errors.filter((e) => !/favicon|404/.test(e))).toEqual([]);
      });
    }
  }
});

const approachShots = '.cache/codex/shots/f-visual-qa';
// Prefer the first primary's prop; terrain-only primaries use the site's hero.
// Names are the actual placed prop IDs, not model names or POI IDs.
const heroes: Record<string, string> = {
  titanic: 'bow-hull',
  'challenger-deep': 'north-wall-scarp',
  'lost-city': 'poseidon-tower',
  'monterey-canyon': 'canyon-wall-ledge',
  endurance: 'main-hull',
  'axial-seamount-ashes': 'mushroom-chimney',
  'hudson-canyon': 'coral-ledge-mound',
  kamaehuakanaloa: 'hiolo-north-chimney-1',
  'beebe-vent-field': 'beebe-chimney-1',
  'great-blue-hole': 'karst-grotto',
  bismarck: 'main-hull',
  'hunga-tonga-caldera': 'caldera-tuff-wall',
  'blake-plateau-corals': 'lophelia-mound',
};

interface ApproachGame {
  sub: Submarine;
  rig: CameraRig;
  props: Props;
  terrain: { sampleHeight(x: number, z: number): number };
  discovery: { loaded: boolean; landmarkId: string };
  meta: { id: string };
  perf: { tier: string; tierSource: string; drawCalls: number; triangles: number };
  config: { submarine: { hullRadius: number; maxPitch: number } };
}

/** Wait for rendered frames as well as wall time on slow software WebGL. */
async function settleApproach(page: Page): Promise<void> {
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

freshTest.describe('catalog hero loading and safe approaches', () => {
  // One worker, independent contexts and no fail-fast serial group: a broken
  // site must not prevent the other twelve from producing review evidence.
  freshTest.describe.configure({ timeout: 300_000 });
  freshTest.use({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    // Also remove the CI config's saved low-tier preference.
    storageState: { cookies: [], origins: [] },
  });

  for (const id of landmarkIndex.landmarks) {
    // Regression guard: every catalog hero loads and has a collision-free approach at both ranges.
    freshTest(`${id}: spawn, hero approach, hero detail`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto(`/?tile=${id}&skipBriefing=1`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await page.waitForFunction(() => window.__gameReady === true, undefined, {
        timeout: 120_000,
      });
      // __gameReady only promises the first render; content loads separately.
      await page.waitForFunction(
        () => {
          const g = window.__game as unknown as ApproachGame | undefined;
          return g?.props.loaded && g.discovery.loaded;
        },
        undefined,
        { timeout: 90_000 },
      );
      await settleApproach(page);
      await reviewScreenshot(page, { path: `${approachShots}/${id}-1.png`, timeout: 60_000 });

      const heroId = heroes[id];
      expect(heroId, `Add a hero mapping for ${id}`).toBeTruthy();
      const approach = await page.evaluate((propId) => {
        const g = window.__game as unknown as ApproachGame;
        const hero = g.props.placed.find((p) => p.def.id === propId);
        if (!hero) {
          throw new Error(`Missing hero ${propId}; props: ${g.props.debugString()}`);
        }
        if (hero.localBounds.isEmpty()) throw new Error(`Empty hero bounds: ${propId}`);
        hero.root.updateMatrixWorld(true);
        const centre = hero.localBounds.getCenter(g.sub.position.clone());
        const half = hero.localBounds.getSize(g.sub.position.clone()).multiplyScalar(0.5);
        const candidates = [];
        // Find a clear side for BOTH distances, favouring a level approach.
        // Test real collision volumes to avoid a neighbouring chimney/wreck.
        for (let i = 0; i < 16; i++) {
          const angle = Math.PI / 4 + (i * Math.PI) / 8;
          const dx = Math.sin(angle);
          const dz = -Math.cos(angle);
          const edge = Math.min(
            half.x / Math.max(Math.abs(dx), 1e-6),
            half.z / Math.max(Math.abs(dz), 1e-6),
          );
          const target = hero.root.localToWorld(
            centre.clone().add(g.sub.position.clone().set(dx * edge, 0, dz * edge)),
          );
          const worldCentre = hero.root.localToWorld(centre.clone());
          const direction = target.clone().sub(worldCentre).setY(0).normalize();
          if (direction.lengthSq() < 0.5) continue;
          let score = 0;
          let clear = true;
          for (const range of [40, 15]) {
            const p = target.clone().addScaledVector(direction, range);
            p.y = Math.min(-2, g.terrain.sampleHeight(p.x, p.z) + 15);
            if (g.props.collide(p.clone(), g.config.submarine.hullRadius, p.clone())) {
              clear = false;
              break;
            }
            score += Math.abs(p.y - target.y);
          }
          if (clear) candidates.push({ target, direction, score });
        }
        candidates.sort((a, b) => a.score - b.score);
        const chosen = candidates[0];
        if (!chosen) throw new Error(`No collision-free 40/15 m approach for ${propId}`);
        return {
          target: { x: chosen.target.x, y: chosen.target.y, z: chosen.target.z },
          direction: { x: chosen.direction.x, z: chosen.direction.z },
        };
      }, heroId);

      for (const [n, range] of [
        [2, 40],
        [3, 15],
      ] as const) {
        await page.evaluate(
          ({ target, direction, range }) => {
            const g = window.__game as unknown as ApproachGame;
            const x = target.x + direction.x * range;
            const z = target.z + direction.z * range;
            const y = Math.min(-2, g.terrain.sampleHeight(x, z) + 15);
            // Physics uses +yaw toward east, zero toward -Z (north).
            const yaw = Math.atan2(target.x - x, -(target.z - z));
            g.sub.reset(x, y, z, yaw);
            const aimPitch = Math.atan2(target.y - y, range);
            const maxPitch = g.config.submarine.maxPitch;
            g.sub.pitch = Math.max(-maxPitch, Math.min(maxPitch, aimPitch));
            g.rig.resetView();
            g.rig.setMode('first-person');
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
            // Aim from the actual cockpit offset, not the hull centre. A small
            // chimney can otherwise fall outside the close frame. The rig's
            // first-person look elevation applies with a 0.55 sensitivity.
            const camera = g.rig.camera.position;
            const cameraPitch = Math.atan2(
              target.y - camera.y,
              Math.hypot(target.x - camera.x, target.z - camera.z),
            );
            g.rig.lookElevation = (cameraPitch - g.sub.pitch) / 0.55;
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          },
          { ...approach, range },
        );
        await settleApproach(page);
        await reviewScreenshot(page, { path: `${approachShots}/${id}-${n}.png`, timeout: 60_000 });
      }

      // Print diagnostics into the gate log without extra output artifacts.
      const probe = await page.evaluate(() => {
        const g = window.__game as unknown as ApproachGame;
        return {
          tile: g.meta.id,
          landmark: g.discovery.landmarkId,
          tier: g.perf.tier,
          tierSource: g.perf.tierSource,
          draws: g.perf.drawCalls,
          triangles: g.perf.triangles,
          failedProps: g.props.stats.failed,
          skippedProps: g.props.stats.skipped,
        };
      });
      console.log(`VISUAL_QA ${id} hero=${heroId} ${JSON.stringify(probe)}`);
      expect(probe.tile).toBe(id);
      expect(probe.landmark).toBe(id);
      expect(probe.draws).toBeGreaterThan(0);
      expect(probe.failedProps).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  // Regression guard: the authored east-grotto pose clears hull, camera and seabed.
  freshTest('great-blue-hole: authored east grotto close', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/?tile=great-blue-hole&skipBriefing=1&tutorial=0');
    await page.waitForFunction(
      () => {
        const g = window.__game as unknown as ApproachGame | undefined;
        return window.__gameReady && g?.props.loaded && g.discovery.loaded;
      },
      undefined,
      { timeout: 120_000 },
    );
    const clearance = await page.evaluate((pose) => {
      const g = window.__game as unknown as ApproachGame;
      const hero = g.props.placed.find((p) => p.def.id === 'karst-grotto-east');
      if (!hero) throw new Error('Missing east grotto');
      hero.root.updateMatrixWorld(true);
      const target = hero.root.localToWorld(g.sub.position.clone().fromArray(pose.target));
      const { range, above, lateral } = pose.close;
      const [dx, , dz] = pose.direction;
      const x = target.x + dx * range - dz * lateral;
      const z = target.z + dz * range + dx * lateral;
      const y = hero.root.position.y + above;
      const yaw = Math.atan2(target.x - x, -(target.z - z));
      g.sub.step = () => {};
      g.sub.reset(x, y, z, yaw);
      g.sub.pitch = Math.max(
        -g.config.submarine.maxPitch,
        Math.min(
          g.config.submarine.maxPitch,
          Math.atan2(target.y - y, Math.hypot(target.x - x, target.z - z)),
        ),
      );
      g.rig.resetView();
      g.rig.setMode('first-person');
      g.rig.snap(g.sub.position, yaw, g.sub.pitch);
      const eye = g.rig.camera.position;
      const pitch = Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z));
      g.rig.lookElevation = (pitch - g.sub.pitch) / 0.55;
      g.rig.snap(g.sub.position, yaw, g.sub.pitch);
      return {
        blocked: g.props.collide(
          g.sub.position.clone(),
          g.config.submarine.hullRadius,
          g.sub.position.clone(),
        ),
        floor: y - g.terrain.sampleHeight(x, z),
        eyeBlocked: g.props.collide(eye.clone(), 0.3, eye.clone()),
        underwater: eye.y < -2,
        failedProps: g.props.stats.failed,
      };
    }, blueHolePoses.east);
    expect(clearance.blocked).toBe(false);
    expect(clearance.eyeBlocked).toBe(false);
    expect(clearance.floor).toBeGreaterThan(1);
    expect(clearance.underwater).toBe(true);
    expect(clearance.failedProps).toBe(0);
    await settleApproach(page);
    await reviewScreenshot(page, {
      path: `${approachShots}/great-blue-hole-east-3.png`,
      timeout: 60_000,
    });
    expect(errors).toEqual([]);
  });
});
