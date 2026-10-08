import { expect, test, type Page } from '@playwright/test';
import blueHole from '../../data/landmarks/great-blue-hole/props.json' with { type: 'json' };
import type * as THREE from 'three';
import type { Discovery } from '../../src/game/Discovery.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';
import type { Terrain } from '../../src/world/Terrain.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { completeScan, scanWithKeyboard } from './helpers/scan.js';

interface Game {
  discovery: Discovery;
  props: Props;
  terrain: Terrain;
  rig: CameraRig;
  sub: Submarine;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  config: { submarine: { maxPitch: number } };
}

const sites = ['titanic', 'great-blue-hole', 'lost-city', 'monterey-canyon', 'beebe-vent-field'];
test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });

async function ready(page: Page): Promise<void> {
  await clockFramesUntil(page, () => {
    const g = window.__game as unknown as Game | undefined;
    return !!(window.__gameReady && g?.discovery.loaded && g.props.loaded);
  });
  await page.evaluate(async () => {
    const g = window.__game as unknown as Game;
    await g.terrain.texturesReady;
    const pending: Promise<unknown>[] = [];
    g.props.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        if (m.userData.texturesReady) pending.push(m.userData.texturesReady);
    });
    await Promise.all(pending);
  });
  await page.clock.runFor(34);
}

async function scan(page: Page, id: string, touch: boolean): Promise<void> {
  if (!touch) return scanWithKeyboard(page, id);
  const box = (await page.locator('.tc-btn-scan').boundingBox())!;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await completeScan(page, id);
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  }
}

for (const tier of ['low', 'medium']) {
  for (const site of sites) {
    test(`${site} ${tier}: render opening, scan, reload twice and read authored Journal`, async ({
      page,
      hasTouch,
    }, testInfo) => {
      test.setTimeout(240_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await pauseClockBeforeNavigation(page);
      const url = `/?tile=${site}&skipBriefing=1&tier=${tier}&dynres=0&lifeSeed=42`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await ready(page);
      const opening = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        const target =
          g.discovery.pois.find((p) => p.id === g.discovery.scanner.view.nearestId) ??
          g.discovery.pois.reduce((nearest, p) =>
            p.position.distanceTo(g.sub.position) < nearest.position.distanceTo(g.sub.position)
              ? p
              : nearest,
          );
        const point = target.position.clone().project(g.rig.camera);
        const dome = g.scene.getObjectByName('titanicHorizon') as
          THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | undefined;
        return {
          target: {
            id: target.id,
            guide: target.guideEntry,
            screen: point.toArray(),
            distance: target.position.distanceTo(g.rig.camera.position),
          },
          failed: g.props.stats.failed,
          calls: g.renderer.info.render.calls,
          triangles: g.renderer.info.render.triangles,
          horizon: dome
            ? {
                visible: dome.visible,
                toneMapped: dome.material.toneMapped,
                depthWrite: dome.material.depthWrite,
                order: dome.renderOrder,
              }
            : null,
          relief: g.props.placed.some((p) => p.def.id === 'blue-hole-wall-relief'),
          nearestId: g.discovery.scanner.view.nearestId,
          candidateId: g.discovery.scanner.view.candidateId,
        };
      });
      await testInfo.attach('opening-state', {
        body: JSON.stringify(opening, null, 2),
        contentType: 'application/json',
      });
      await page.screenshot({ path: testInfo.outputPath('opening.png') });
      expect(opening.failed).toBe(0);
      expect(opening.calls).toBeGreaterThan(0);
      expect(opening.triangles).toBeGreaterThan(0);
      if (site === 'titanic') {
        expect(opening.horizon).toMatchObject({
          visible: true,
          toneMapped: false,
          depthWrite: false,
        });
        expect(opening.horizon!.order).toBeLessThan(0);
        expect(opening.target.distance).toBeLessThan(300);
      } else expect(opening.horizon).toBeNull();
      if (site === 'great-blue-hole') {
        expect(opening.target.id).toBe('great-blue-hole-stalactites');
        expect(opening.nearestId).toBe(opening.target.id);
        expect(opening.candidateId).toBe(opening.target.id);
        expect(Math.abs(opening.target.screen[0])).toBeLessThan(1);
        expect(Math.abs(opening.target.screen[1])).toBeLessThan(1);
        expect(
          await page.evaluate(
            () => (window.__game as unknown as Game).discovery.scanner.view.nearestDistance,
          ),
        ).toBeLessThanOrEqual(110);
      }
      // This is a separate persistence/scan check, not evidence of swimming to
      // a contact. Blue Hole's actual opening is already scannable; other sites
      // use the supported debug station without changing POI radii or rewards.
      if (site !== 'great-blue-hole') {
        await page.goto(`${url}&poi=${opening.target.id}`, { waitUntil: 'domcontentloaded' });
        await ready(page);
        await page.evaluate((id) => {
          const g = window.__game as unknown as Game;
          const target = g.discovery.pois.find((p) => p.id === id)!;
          const delta = target.position.clone().sub(g.sub.position);
          g.sub.yaw = Math.atan2(delta.x, -delta.z);
          g.sub.pitch = Math.max(
            -g.config.submarine.maxPitch,
            Math.min(
              g.config.submarine.maxPitch,
              Math.atan2(delta.y, Math.hypot(delta.x, delta.z)),
            ),
          );
          g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
        }, opening.target.id);
        await page.clock.runFor(34);
      }
      const id = opening.target.id;
      await scan(page, id, hasTouch);
      await page.clock.runFor(34);
      expect(
        await page.evaluate(
          (id) =>
            (window.__game as unknown as Game).discovery.store.get(
              (window.__game as unknown as Game).discovery.landmarkId,
              id,
            ),
          id,
        ),
      ).toMatchObject({ count: 1 });
      const snapshot = await page.evaluate(() =>
        (window.__game as unknown as Game).discovery.store.snapshot(),
      );
      for (let reload = 0; reload < 2; reload++) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await ready(page);
        expect(
          await page.evaluate(() => (window.__game as unknown as Game).discovery.store.snapshot()),
        ).toEqual(snapshot);
      }
      // Use the fresh player's tutorial action, then the real Journal key.
      const skip = page.getByRole('button', { name: 'Skip tutorial', exact: true });
      if (await skip.isVisible()) {
        if (hasTouch) await skip.tap();
        else await skip.click();
      }
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone,
        ),
      ).toBe(true);
      await page.keyboard.press('j');
      // J queues an input edge; the paused game must sample it in a real frame.
      await page.clock.runFor(34);
      await expect(page.locator('.journal')).toBeVisible();
      const toggle = page.locator('.jr-contents-toggle');
      if (await toggle.isVisible()) {
        if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
      }
      // Guide-linked contacts have one stable content row after reload.
      const entry = page.locator(`.jr-nav-item[data-target="${site}/poi/${opening.target.guide}"]`);
      await entry.scrollIntoViewIfNeeded();
      if (hasTouch) await entry.tap();
      else await entry.click();
      await expect(page.locator('.jr-locked')).toHaveCount(0);
      await expect(page.locator('.jr-body .jr-para').first()).toBeVisible();
      if (site === 'great-blue-hole')
        await expect(page.locator('.jr-title-row .jr-tag:not(.is-undiscovered)')).toHaveText(
          'Recreation',
        );
      const panel = page.locator('.jr-panel');
      expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('journal-after-reload.png') });
      expect(errors).toEqual([]);
    });
  }
}

test('830 Low wall relief is present and leaves the opening scan clear', async ({ page }) => {
  test.skip(
    !blueHole.props.some((p) => p.id === 'blue-hole-wall-relief'),
    '830 was deliberately reverted by 3f962b6; Low relief acceptance requires the director’s replacement geometry.',
  );
  await pauseClockBeforeNavigation(page);
  await page.goto('/?tile=great-blue-hole&skipBriefing=1&tier=low&dynres=0', {
    waitUntil: 'domcontentloaded',
  });
  await ready(page);
  expect(
    await page.evaluate(() =>
      (window.__game as unknown as Game).props.placed.some(
        (p) => p.def.id === 'blue-hole-wall-relief',
      ),
    ),
  ).toBe(true);
  await scanWithKeyboard(page, 'great-blue-hole-stalactites');
});
