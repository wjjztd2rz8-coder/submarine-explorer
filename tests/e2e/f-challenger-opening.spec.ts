// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

interface Probe {
  sub: Submarine;
  rig: CameraRig;
  props: { loaded: boolean };
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
    test(`${site}: level centred opening stays quiet at its starting depth`, async ({ page }) => {
      await pauseClockBeforeNavigation(page);
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.onboard.v1',
          JSON.stringify({
            version: 1,
            tutorialDone: true,
            seenHints: ['battery-low', 'creature', 'rov'],
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
      const opening = await page.evaluate(() => {
        const g = window.__game as unknown as Probe;
        g.rig.camera.updateMatrixWorld(true);
        return {
          pitch: g.sub.pitch,
          roll: g.sub.roll,
          hullNdc: g.sub.position.clone().project(g.rig.camera).toArray(),
        };
      });
      expect(opening.pitch).toBe(0);
      expect(opening.roll).toBe(0);
      expect(opening.hullNdc[0]).toBeCloseTo(0, 6);
      await expect(page.locator('.scan-panel')).toBeVisible();
      await expect(page.locator('.onboard-hint')).toBeHidden();
      await mkdir(shots, { recursive: true });
      await page.screenshot({ path: `${shots}/${site}-portrait-opening.png` });
      for (let i = 0; i < 81; i++) await page.clock.fastForward(250);
      await expect(page.locator('.onboard-hint')).toBeHidden();
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).seenHints,
        ),
      ).not.toContain('near-hull');
    });
  }
});
