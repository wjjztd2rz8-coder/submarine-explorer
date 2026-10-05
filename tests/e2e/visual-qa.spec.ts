// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import landmarkIndex from '../../data/landmarks/index.json' with { type: 'json' };
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';
import blueHolePoses from '../../tools/blue-hole-poses.json' with { type: 'json' };

/**
 * Opt-in Phase F review: VISUAL_QA=1 npx playwright test visual-qa.spec.ts
 * 1 = untouched spawn; 2 = 40 m approach; 3 = 15 m detail, at 15 m altitude.
 * Approach distances are horizontal clearance from the actual prop bounds,
 * not its origin (which would put the sub inside the larger wrecks).
 * No tier URL override or saved preference: capture the new-player default.
 * The approach views use the playable cockpit camera to keep the hero visible.
 */
const shots = '.cache/codex/shots/f-visual-qa';
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

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

interface Game {
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

test.describe('Phase F visual QA', () => {
  // One worker, independent contexts and no fail-fast serial group: a broken
  // site must not prevent the other twelve from producing review evidence.
  test.describe.configure({ timeout: 300_000 });
  test.use({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    // Also remove the CI config's saved low-tier preference.
    storageState: { cookies: [], origins: [] },
  });
  test.skip(env.VISUAL_QA !== '1', 'Enable with VISUAL_QA=1 to collect site review images.');

  for (const id of landmarkIndex.landmarks) {
    test(`${id}: spawn, hero approach, hero detail`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await mkdir(shots, { recursive: true });
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
          const g = window.__game as unknown as Game | undefined;
          return g?.props.loaded && g.discovery.loaded;
        },
        undefined,
        { timeout: 90_000 },
      );
      await settle(page);
      await page.screenshot({ path: `${shots}/${id}-1.png`, timeout: 60_000 });

      const heroId = heroes[id];
      expect(heroId, `Add a hero mapping for ${id}`).toBeTruthy();
      const approach = await page.evaluate((propId) => {
        const g = window.__game as unknown as Game;
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
            const g = window.__game as unknown as Game;
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
        await settle(page);
        await page.screenshot({ path: `${shots}/${id}-${n}.png`, timeout: 60_000 });
      }

      // Print diagnostics into the gate log without extra output artifacts.
      const probe = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
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

  test('great-blue-hole: authored east grotto close', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mkdir(shots, { recursive: true });
    await page.goto('/?tile=great-blue-hole&skipBriefing=1&tutorial=0');
    await page.waitForFunction(
      () => {
        const g = window.__game as unknown as Game | undefined;
        return window.__gameReady && g?.props.loaded && g.discovery.loaded;
      },
      undefined,
      { timeout: 120_000 },
    );
    const clearance = await page.evaluate((pose) => {
      const g = window.__game as unknown as Game;
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
    await settle(page);
    await page.screenshot({ path: `${shots}/great-blue-hole-east-3.png`, timeout: 60_000 });
    expect(errors).toEqual([]);
  });
});
