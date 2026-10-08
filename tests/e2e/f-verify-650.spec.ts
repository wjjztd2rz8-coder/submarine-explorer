import { expect, test, type Page } from './helpers/unlocked.js';
import type { Mesh, InstancedMesh, Points, Scene, ShaderMaterial } from 'three';
import type { PerfStats } from '../../src/app/systems/quality.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { SubMesh } from '../../src/sub/SubMesh.js';
import type { Props } from '../../src/world/Props.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Terrain } from '../../src/world/Terrain.js';
import { waitForFrames } from './helpers/frames.js';

interface Game {
  perf: PerfStats;
  rig: CameraRig;
  sub: Submarine;
  subMesh: SubMesh;
  props: Props;
  discovery: Discovery;
  terrain: Terrain;
  scene: Scene;
  explore: { ready: boolean };
  life: object | null;
}

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
// Serve the retained pre-fix build separately to compare actual renderer counters.
const baselineURL = env.F650_BASELINE_URL;

async function opening(page: Page, site: string, tier: string, touch: boolean, origin = '') {
  await page.goto(
    `${origin}/?tile=${site}&skipBriefing=1&tutorial=0&tier=${tier}&dynres=0&lifeSeed=42${touch ? '&touch=1' : ''}`,
  );
  await page.waitForFunction(() => {
    const g = window.__game as unknown as Game | undefined;
    return window.__gameReady && g?.props.loaded && g.discovery.loaded && g.explore.ready && g.life;
  });
  await page.evaluate(() => {
    (window.__game as unknown as Game).sub.step = () => {};
  });
  // Renderer counters describe the latest frame, not a time average. Wait
  // for texture binding and two presented frames before sampling static work.
  await page.evaluate(
    () =>
      (window.__game as unknown as { terrain: { texturesReady: Promise<void> } }).terrain
        .texturesReady,
  );
  await waitForFrames(page, 2);
}

async function perf(page: Page) {
  return page.evaluate(async () => {
    const g = window.__game as unknown as Game;
    let drawCalls = 0,
      triangles = 0;
    for (let i = 0; i < 3; i++) {
      await new Promise<void>((done) => requestAnimationFrame(() => done()));
      drawCalls = Math.max(drawCalls, g.perf.drawCalls);
      triangles = Math.max(triangles, g.perf.triangles);
    }
    return { tier: g.perf.tier, drawCalls, triangles };
  });
}

for (const layout of [
  { width: 1600, height: 900, touch: false },
  { width: 844, height: 390, touch: true },
  { width: 360, height: 640, touch: true },
]) {
  test.describe(`650 merges ${layout.width}×${layout.height}`, () => {
    test.use({
      viewport: layout,
      hasTouch: layout.touch,
      isMobile: layout.touch,
      deviceScaleFactor: 1,
    });
    for (const tier of ['low', 'medium']) {
      for (const site of ['titanic', 'beebe-vent-field', 'monterey-canyon']) {
        test(`${site} ${tier}: opening intent and rendered work`, async ({ page }, info) => {
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          let baseline: Awaited<ReturnType<typeof perf>> | undefined;
          if (site === 'monterey-canyon' && baselineURL) {
            await opening(page, site, tier, layout.touch, baselineURL.replace(/\/$/, ''));
            baseline = await perf(page);
            await page.screenshot({ path: info.outputPath('main-minus-3.png') });
          }
          await opening(page, site, tier, layout.touch);
          await expect(page.locator('canvas').first()).toBeVisible();
          const current = await perf(page);
          expect(current.tier).toBe(tier);
          expect(current.drawCalls).toBeGreaterThan(0);
          expect(current.triangles).toBeGreaterThan(10_000);
          await info.attach('renderer-performance', {
            body: JSON.stringify({ current, baseline: baseline ?? 'not supplied' }, null, 2),
            contentType: 'application/json',
          });
          if (baseline) {
            expect(current.drawCalls).toBeLessThanOrEqual(baseline.drawCalls);
            expect(current.triangles).toBeLessThanOrEqual(baseline.triangles);
          }
          if (site === 'titanic') {
            const snow = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              const points = g.scene.getObjectByName('marineSnow') as Points;
              const u = (points.material as ShaderMaterial).uniforms;
              return {
                visible: points.visible,
                count: points.geometry.getAttribute('aSeed').count,
                opacity: u.uOpacity.value,
                maxSize: u.uMaxSizePx.value,
                density: u.uDensity.value,
              };
            });
            expect(snow.visible).toBe(true);
            expect(snow.count).toBe(tier === 'low' ? 300 : 1200);
            expect(snow.opacity).toBe(0.24);
            expect(snow.maxSize).toBe(3);
            expect(snow.density).toBeGreaterThan(0);
          }
          if (site === 'beebe-vent-field') {
            await expect(page.locator('.scan-reticle')).toBeVisible();
            const framing = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              const reticle = document.querySelector('.scan-reticle')!.getBoundingClientRect();
              const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
              const point = g.sub.position.clone();
              const instance = g.subMesh.group.matrixWorld.clone();
              const world = instance.clone();
              g.subMesh.group.updateMatrixWorld(true);
              g.rig.camera.updateMatrixWorld(true);
              g.subMesh.group.traverseVisible((object) => {
                const mesh = object as Mesh;
                if (!mesh.isMesh) return;
                const batched = mesh as InstancedMesh;
                const vertices = mesh.geometry.getAttribute('position');
                for (let i = 0; i < (batched.isInstancedMesh ? batched.count : 1); i++) {
                  if (batched.isInstancedMesh) batched.getMatrixAt(i, instance);
                  else instance.identity();
                  world.multiplyMatrices(mesh.matrixWorld, instance);
                  for (let j = 0; j < vertices.count; j++) {
                    point
                      .fromBufferAttribute(vertices, j)
                      .applyMatrix4(world)
                      .project(g.rig.camera);
                    const x = ((point.x + 1) * innerWidth) / 2,
                      y = ((1 - point.y) * innerHeight) / 2;
                    bounds.left = Math.min(bounds.left, x);
                    bounds.right = Math.max(bounds.right, x);
                    bounds.top = Math.min(bounds.top, y);
                    bounds.bottom = Math.max(bounds.bottom, y);
                  }
                }
              });
              return {
                bounds,
                clear:
                  bounds.right <= reticle.left ||
                  bounds.left >= reticle.right ||
                  bounds.bottom <= reticle.top ||
                  bounds.top >= reticle.bottom,
                width: innerWidth,
                height: innerHeight,
              };
            });
            expect(framing.clear, JSON.stringify(framing)).toBe(true);
            expect(framing.bounds.left).toBeGreaterThanOrEqual(0);
            expect(framing.bounds.top).toBeGreaterThanOrEqual(0);
            expect(framing.bounds.right).toBeLessThanOrEqual(framing.width);
            expect(framing.bounds.bottom).toBeLessThanOrEqual(framing.height);
          }
          if (site === 'monterey-canyon') {
            const rocks = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              let count = 0,
                buried = 0;
              const instance = g.subMesh.group.matrixWorld.clone(),
                world = instance.clone(),
                point = g.sub.position.clone();
              for (const prop of g.props.placed.filter((p) => p.def.feature === 'canyon-ledge')) {
                prop.root.updateMatrixWorld(true);
                prop.full.traverse((object) => {
                  const mesh = object as InstancedMesh;
                  if (!mesh.isInstancedMesh || !mesh.name.startsWith('boulders-')) return;
                  const vertices = mesh.geometry.getAttribute('position');
                  for (let i = 0; i < mesh.count; i++) {
                    mesh.getMatrixAt(i, instance);
                    world.multiplyMatrices(mesh.matrixWorld, instance);
                    let exposed = -Infinity;
                    for (let j = 0; j < vertices.count; j++) {
                      point.fromBufferAttribute(vertices, j).applyMatrix4(world);
                      exposed = Math.max(
                        exposed,
                        point.y - g.terrain.sampleHeight(point.x, point.z),
                      );
                    }
                    if (exposed <= 0.25) buried++;
                    count++;
                  }
                });
              }
              return { count, buried };
            });
            expect(rocks.count).toBe(tier === 'low' ? 0 : 384);
            expect(rocks.buried).toBe(0);
          }
          expect(errors).toEqual([]);
          // Pixel readability is reviewed from these captures, independently of geometry assertions.
          await page.screenshot({ path: info.outputPath(`${site}-${tier}-opening.png`) });
        });
      }
    }
  });
}
