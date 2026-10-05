// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { InstancedMesh, Mesh } from 'three';
import type { Save } from '../../src/core/Save.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { SubMesh } from '../../src/sub/SubMesh.js';
import type { Submarine } from '../../src/sub/Submarine.js';

const shots = '.cache/codex/shots/610';
const sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon'];
// Audit panel bounds, not full-screen transparent overlay containers or their
// nested labels. Optional panels count whenever the real UI displays them.
const hudSelectors = [
  '.sonar',
  '.hud-readouts',
  '.hud-attribution',
  '.hud-warning',
  '.hud-notice',
  '.hud-objective',
  '.hud-prompt',
  '.hud-control-tips',
  '.objectives-panel',
  '.scan-panel',
  '.onboard-card',
  '.onboard-hint',
  '.explore-caption',
  '.tc-stick',
  '.tc-slider',
  '.tc-buttons',
  '.tc-btn-pause',
  '.tc-rotate-hint',
];
const requiredHud = [
  '.sonar',
  '.hud-readouts',
  '.hud-attribution',
  '.tc-stick',
  '.tc-slider',
  '.tc-buttons',
  '.tc-btn-pause',
];

interface Game {
  sub: Submarine;
  subMesh: SubMesh;
  rig: CameraRig;
  save: Save;
  props: { loaded: boolean; stats: { failed: number; skipped: number } };
  discovery: { loaded: boolean };
  presets: { entered: boolean };
  explore: { ready: boolean };
  perf: { tier: string; drawCalls: number };
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test.describe('F-VERIFY-610 portrait Low opening pitch', () => {
  test.describe.configure({ timeout: 180_000 });
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block',
  });

  for (const site of sites) {
    test(`${site}: sub and HUD remain fully visible after 3 s`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(() => {
        const g = window.__game as unknown as Game | undefined;
        return (
          window.__gameReady &&
          g?.props.loaded &&
          g.discovery.loaded &&
          g.presets.entered &&
          g.explore.ready
        );
      });
      await page.evaluate(() => document.fonts.ready.then(() => {}));
      // Exercise the live authored opening: no teleport, camera reset, physics
      // freeze, HUD dismissal or pose overrides before the requested settle.
      await page.waitForTimeout(3_000);
      await page.evaluate(
        () =>
          new Promise<void>((done) =>
            requestAnimationFrame(() => requestAnimationFrame(() => done())),
          ),
      );

      const opening = await page.evaluate((selectors) => {
        const g = window.__game as unknown as Game;
        const canvas = document.querySelector<HTMLCanvasElement>('#viewport')!;
        const viewport = canvas.getBoundingClientRect();
        const camera = g.rig.camera;
        camera.updateMatrixWorld(true);
        const hull = g.subMesh.vehicle.root;
        hull.updateWorldMatrix(true, true);
        const projected: { x: number; y: number; z: number }[] = [];
        // Project every visible mesh's box in its own local frame. The root's
        // world AABB would overstate rotated hull corners; the cockpit is not
        // part of this chase hull. Instanced thrusters include their transforms.
        hull.traverseVisible((object) => {
          const mesh = object as Mesh;
          if (!mesh.isMesh) return;
          const instance = mesh as InstancedMesh;
          let box;
          if (instance.isInstancedMesh) {
            instance.computeBoundingBox();
            box = instance.boundingBox;
          } else {
            mesh.geometry.computeBoundingBox();
            box = mesh.geometry.boundingBox;
          }
          if (!box || box.isEmpty()) return;
          for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y])
              for (const z of [box.min.z, box.max.z]) {
                const point = g.sub.position
                  .clone()
                  .set(x, y, z)
                  .applyMatrix4(mesh.matrixWorld)
                  .project(camera);
                projected.push({
                  x: viewport.x + ((point.x + 1) * viewport.width) / 2,
                  y: viewport.y + ((1 - point.y) * viewport.height) / 2,
                  z: point.z,
                });
              }
        });
        if (!projected.length) throw new Error('No visible hull geometry to project');
        const left = Math.min(...projected.map((p) => p.x));
        const top = Math.min(...projected.map((p) => p.y));
        const hud = selectors.flatMap((selector) => {
          const element = document.querySelector<HTMLElement>(selector);
          if (
            !element ||
            !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          )
            return [];
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return [];
          return [{ selector, x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
        });
        return {
          mode: g.save.get().gameplayMode,
          tier: g.perf.tier,
          view: g.rig.mode,
          touch: matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0,
          viewport: { width: innerWidth, height: innerHeight },
          hullVisible: hull.visible && g.subMesh.group.visible,
          hull: {
            x: left,
            y: top,
            width: Math.max(...projected.map((p) => p.x)) - left,
            height: Math.max(...projected.map((p) => p.y)) - top,
          },
          depth: {
            min: Math.min(...projected.map((p) => p.z)),
            max: Math.max(...projected.map((p) => p.z)),
          },
          position: g.sub.position.toArray(),
          camera: camera.position.toArray(),
          props: g.props.stats,
          draws: g.perf.drawCalls,
          hud,
        };
      }, hudSelectors);

      // Persist evidence before assertions so a failed composition is reviewable.
      await mkdir(shots, { recursive: true });
      const name = `${site}-low-390x844-round-${testInfo.repeatEachIndex + 1}${testInfo.retry ? `-retry-${testInfo.retry}` : ''}`;
      const screenshot = `${shots}/${name}.png`;
      await page.screenshot({ path: screenshot, timeout: 60_000 });
      const diagnostics = `${shots}/${name}.json`;
      await writeFile(
        diagnostics,
        JSON.stringify({ site, settleMs: 3000, ...opening, errors }, null, 2),
      );
      await testInfo.attach(name, { path: screenshot, contentType: 'image/png' });
      await testInfo.attach(`${name}-bounds`, {
        path: diagnostics,
        contentType: 'application/json',
      });

      expect.soft(errors).toEqual([]);
      expect.soft(opening.viewport).toEqual({ width: 390, height: 844 });
      expect.soft(opening.touch).toBe(true);
      expect.soft(opening.mode).toBe('arcade');
      expect.soft(opening.tier).toBe('low');
      expect.soft(opening.view).toBe('chase');
      expect.soft(opening.hullVisible).toBe(true);
      expect.soft(opening.props.failed).toBe(0);
      expect.soft(opening.props.skipped).toBe(0);
      expect.soft(opening.draws).toBeGreaterThan(0);
      expect.soft(opening.depth.min, 'hull is beyond the near plane').toBeGreaterThan(-1);
      expect.soft(opening.depth.max, 'hull is inside the far plane').toBeLessThan(1);
      expect.soft(opening.hull.width).toBeGreaterThan(0);
      expect.soft(opening.hull.height).toBeGreaterThan(0);
      for (const selector of requiredHud)
        expect
          .soft(
            opening.hud.some((panel) => panel.selector === selector),
            `${selector} is visible`,
          )
          .toBe(true);
      for (const box of [{ selector: 'sub hull', ...opening.hull }, ...opening.hud]) {
        expect.soft(box.x, `${box.selector} left`).toBeGreaterThanOrEqual(0);
        expect.soft(box.y, `${box.selector} top`).toBeGreaterThanOrEqual(0);
        expect.soft(box.x + box.width, `${box.selector} right`).toBeLessThanOrEqual(390);
        expect.soft(box.y + box.height, `${box.selector} bottom`).toBeLessThanOrEqual(844);
      }
      for (const panel of opening.hud)
        expect
          .soft(overlaps(opening.hull, panel), `sub hull overlaps ${panel.selector}`)
          .toBe(false);
      for (let i = 0; i < opening.hud.length; i++)
        for (const b of opening.hud.slice(i + 1)) {
          const a = opening.hud[i];
          expect.soft(overlaps(a, b), `${a.selector} overlaps ${b.selector}`).toBe(false);
        }
    });
  }
});
