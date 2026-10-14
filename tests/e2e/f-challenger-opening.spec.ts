// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { SubMesh } from '../../src/sub/SubMesh.js';
import type { Props } from '../../src/world/Props.js';
import type { InstancedMesh, Mesh } from 'three';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

interface Probe {
  sub: Submarine;
  rig: CameraRig;
  subMesh: SubMesh;
  props: Props;
  discovery: { loaded: boolean };
}
const shots = '.cache/codex/shots/F-1020';

test.describe('1020 portrait openings', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  for (const site of [
    'challenger-deep',
    'endurance',
    'hunga-tonga-caldera',
    'axial-seamount-ashes',
  ]) {
    test(`${site}: level framed opening stays quiet at its starting depth`, async ({ page }) => {
      await pauseClockBeforeNavigation(page);
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.onboard.v1',
          JSON.stringify({
            version: 1,
            tutorialDone: true,
            seenHints: ['battery-low', 'creature'],
          }),
        );
      });
      await page.goto(`/?tile=${site}&tier=low&touch=1&tutorial=0&lifeSeed=42&dynres=0`, {
        waitUntil: 'domcontentloaded',
      });
      await clockFramesUntil(page, () => {
        const g = window.__game as unknown as Probe;
        return window.__gameReady === true && g.props.loaded && g.discovery.loaded;
      });
      await page.evaluate(() => {
        (window.__game as unknown as Probe).sub.step = () => {};
      });
      await page.clock.fastForward(250);
      const opening = await page.evaluate((site) => {
        const g = window.__game as unknown as Probe;
        g.rig.camera.updateMatrixWorld(true);
        let challengerFrame = null;
        if (site === 'challenger-deep') {
          // Measure every visible hull vertex, including instances, so the
          // lateral framing cannot hide a clipped hull or an occluded lander.
          const width = window.innerWidth;
          const height = window.innerHeight;
          const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
          const depth = { near: Infinity, far: -Infinity };
          const point = g.sub.position.clone();
          g.subMesh.group.updateMatrixWorld(true);
          g.subMesh.group.traverseVisible((object) => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            const vertices = mesh.geometry.getAttribute('position');
            const instances = mesh as InstancedMesh;
            const matrix = mesh.matrixWorld.clone();
            const world = matrix.clone();
            for (let i = 0; i < (instances.isInstancedMesh ? instances.count : 1); i++) {
              if (instances.isInstancedMesh) instances.getMatrixAt(i, matrix);
              else matrix.identity();
              world.multiplyMatrices(mesh.matrixWorld, matrix);
              for (let j = 0; j < vertices.count; j++) {
                point.fromBufferAttribute(vertices, j).applyMatrix4(world).project(g.rig.camera);
                const x = ((point.x + 1) * width) / 2;
                const y = ((1 - point.y) * height) / 2;
                bounds.left = Math.min(bounds.left, x);
                bounds.right = Math.max(bounds.right, x);
                bounds.top = Math.min(bounds.top, y);
                bounds.bottom = Math.max(bounds.bottom, y);
                depth.near = Math.min(depth.near, point.z);
                depth.far = Math.max(depth.far, point.z);
              }
            }
          });
          const hero = g.props.placed.find((p) => p.def.id === 'leggo-lander-marker')!;
          hero.root.updateMatrixWorld(true);
          const heroNdc = hero.root
            .localToWorld(hero.localBounds.getCenter(point))
            .project(g.rig.camera);
          challengerFrame = {
            bounds,
            depth,
            heroX: ((heroNdc.x + 1) * width) / 2,
            heroZ: heroNdc.z,
          };
        }
        return {
          challengerFrame,
          pitch: g.sub.pitch,
          roll: g.sub.roll,
          hullNdc: g.sub.position.clone().project(g.rig.camera).toArray(),
        };
      }, site);
      expect(opening.pitch).toBe(0);
      expect(opening.roll).toBe(0);
      if (site === 'challenger-deep') {
        // F-CHALLENGER-CAM deliberately puts the hull to the right, leaving
        // at least 12 px between the lander's centre and the hull's screen span.
        const frame = opening.challengerFrame!;
        expect(frame.bounds.left).toBeGreaterThan(12);
        expect(frame.bounds.right).toBeLessThan(390 - 12);
        expect(frame.bounds.top).toBeGreaterThan(211);
        expect(frame.bounds.bottom).toBeLessThan(844 * 0.79);
        expect(frame.depth.near).toBeGreaterThan(-1);
        expect(frame.depth.far).toBeLessThan(1);
        expect(frame.heroX).toBeGreaterThan(12);
        expect(frame.heroX).toBeLessThan(390 - 12);
        expect(frame.heroZ).toBeGreaterThan(-1);
        expect(frame.heroZ).toBeLessThan(1);
        expect(frame.heroX < frame.bounds.left - 12 || frame.heroX > frame.bounds.right + 12).toBe(
          true,
        );
      } else {
        expect(opening.hullNdc[0]).toBeCloseTo(0, 6);
      }
      await expect(page.locator('.guidance-slot')).toBeVisible();
      await expect(page.locator('.guidance-slot[data-kind="urgent"]')).toBeHidden();
      await mkdir(shots, { recursive: true });
      await page.screenshot({ path: `${shots}/${site}-portrait-opening.png` });
      for (let i = 0; i < 81; i++) await page.clock.fastForward(250);
      await expect(page.locator('.guidance-slot[data-kind="urgent"]')).toBeHidden();
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).seenHints,
        ),
      ).not.toContain('near-hull');
    });
  }
});
