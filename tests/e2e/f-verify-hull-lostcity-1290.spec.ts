import type { Mesh } from 'three';
import type { Props } from '../../src/world/Props.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { PerfStats } from '../../src/app/systems/quality.js';
import { expect, test } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

interface Game {
  props: Props;
  terrain: Terrain;
  sub: Submarine;
  rig: CameraRig;
  discovery: { loaded: boolean };
  presets: { entered: boolean };
  perf: PerfStats;
}

for (const viewport of [
  { name: 'desktop', width: 1600, height: 900, touch: false },
  { name: 'portrait', width: 390, height: 844, touch: true },
  { name: 'landscape', width: 844, height: 390, touch: true },
]) {
  test.describe(`1290 ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      storageState: { cookies: [], origins: [] },
    });
    for (const site of ['endurance', 'lost-city']) {
      for (const tier of ['low', 'high']) {
        test(`${site} ${tier}: merged opening clears terrain and tower-tip HUD`, async ({
          page,
        }, testInfo) => {
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await pauseClockBeforeNavigation(page);
          await page.goto(
            `/?tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42${viewport.touch ? '&touch=1' : ''}`,
            {
              waitUntil: 'domcontentloaded',
            },
          );
          await clockFramesUntil(page, () => {
            const g = window.__game as unknown as Game;
            return !!(
              window.__gameReady &&
              g.props.loaded &&
              g.discovery.loaded &&
              g.presets.entered
            );
          });
          await page.evaluate(() => {
            (window.__game as unknown as Game).sub.step = () => {};
          });
          await page.clock.fastForward(50);
          const opening = await page.evaluate((siteId) => {
            const g = window.__game as unknown as Game;
            const camera = g.rig.camera;
            camera.updateMatrixWorld(true);
            const nearClearances: number[] = [];
            for (const x of [-1, 0, 1])
              for (const y of [-1, 0, 1]) {
                const p = g.sub.position.clone().set(x, y, -1).unproject(camera);
                nearClearances.push(p.y - g.terrain.sampleHeight(p.x, p.z));
              }
            let tip: { x: number; y: number; z: number } | null = null;
            if (siteId === 'lost-city') {
              const hero = g.props.placed.find((p) => p.def.id === 'poseidon-tower')!;
              const solid = hero.full.children[0] as Mesh;
              solid.updateWorldMatrix(true, false);
              const vertices = solid.geometry.getAttribute('position');
              let topY = -Infinity;
              const top = g.sub.position.clone();
              for (let i = 0; i < vertices.count; i++) {
                const point = g.sub.position
                  .clone()
                  .fromBufferAttribute(vertices, i)
                  .applyMatrix4(solid.matrixWorld);
                if (point.y > topY) {
                  topY = point.y;
                  top.copy(point);
                }
              }
              top.project(camera);
              tip = {
                x: ((top.x + 1) * innerWidth) / 2,
                y: ((1 - top.y) * innerHeight) / 2,
                z: top.z,
              };
            }
            const panel = document.querySelector<HTMLElement>('.guidance-slot')!;
            const card = panel.getBoundingClientRect();
            return {
              tip,
              card: {
                left: card.left,
                right: card.right,
                top: card.top,
                bottom: card.bottom,
                visible: panel.checkVisibility(),
              },
              nearClearances,
              eyeClearance:
                camera.position.y - g.terrain.sampleHeight(camera.position.x, camera.position.z),
              radius: g.rig.chaseRadius,
              calls: g.perf.drawCalls,
              triangles: g.perf.triangles,
              props: { ...g.props.stats },
            };
          }, site);
          await page.screenshot({
            path: testInfo.outputPath(`${site}-${tier}-${viewport.name}.png`),
          });
          await testInfo.attach('opening-probe', {
            body: JSON.stringify(opening, null, 2),
            contentType: 'application/json',
          });
          expect(errors).toEqual([]);
          expect(opening.props.failed).toBe(0);
          expect(opening.radius).toBe(site === 'endurance' ? 70 : 66);
          expect(opening.eyeClearance).toBeGreaterThanOrEqual(6 - 1e-8);
          expect(Math.min(...opening.nearClearances)).toBeGreaterThan(0);
          if (tier === 'low') {
            expect(opening.calls).toBeGreaterThan(0);
            expect(opening.triangles).toBeGreaterThan(10_000);
            expect(opening.calls).toBeLessThanOrEqual(1500);
            expect(opening.triangles).toBeLessThanOrEqual(1_500_000);
          }
          if (opening.tip) {
            const { tip, card } = opening;
            expect(card.visible).toBe(true);
            expect(tip.z).toBeGreaterThan(-1);
            expect(tip.z).toBeLessThan(1);
            expect(tip.x).toBeGreaterThan(0);
            expect(tip.x).toBeLessThan(viewport.width);
            expect(tip.y).toBeGreaterThan(0);
            expect(tip.y).toBeLessThan(viewport.height);
            const gap = 8;
            expect(
              tip.x < card.left - gap ||
                tip.x > card.right + gap ||
                tip.y < card.top - gap ||
                tip.y > card.bottom + gap,
              'actual carbonate tip clears the scan card by at least 8 CSS pixels',
            ).toBe(true);
          }
        });
      }
    }
  });
}
