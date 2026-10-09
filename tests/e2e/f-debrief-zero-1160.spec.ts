// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { scanWithKeyboard } from './helpers/scan.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { MissionRouter } from '../../src/game/MissionRouter.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';

type Game = {
  discovery: Discovery;
  missionRouter: MissionRouter;
  sub: Submarine;
  rig: CameraRig;
  appState: string;
  save: { get(): { gameplayMode: string } };
};

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const m = g.missionRouter.mission;
    return {
      app: g.appState,
      state: m.state,
      elapsed: m.elapsedS,
      duration: m.durationS,
      sessionElapsed: g.discovery.stats.elapsedS,
      scans: g.discovery.stats.snapshot().discoveries,
      counts: m.counts(),
      pose: { ...g.sub.position, yaw: g.sub.yaw, pitch: g.sub.pitch },
      frozen: g.missionRouter.frozen,
    };
  });
}

for (const viewport of [
  { width: 390, height: 844, touch: true },
  { width: 1280, height: 720, touch: false },
]) {
  test.describe(`1160 debrief ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport,
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      storageState: { cookies: [], origins: [] },
    });
    for (const site of ['titanic', 'beebe-vent-field', 'great-blue-hole']) {
      test(`${site}: zero and one scan, focus, Journal, resume and exit`, async ({
        page,
      }, info) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await pauseClockBeforeNavigation(page);
        await page.goto(`/?mission=${site}&skipBriefing=1&tier=low`, {
          waitUntil: 'domcontentloaded',
        });
        await clockFramesUntil(
          page,
          () => window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded,
        );
        expect(
          await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode),
        ).toBe('arcade');
        const directory = `.cache/codex/shots/1160/pass-${info.repeatEachIndex + 1}/${viewport.width}x${viewport.height}/${site}`;
        await mkdir(directory, { recursive: true });
        const shot = async (name: string) => {
          await page.clock.runFor(34);
          await page.screenshot({ path: `${directory}/${name}.png` });
        };
        const act = async (selector: string) => {
          const control = page.locator(selector);
          if (viewport.touch) await control.tap();
          else await control.click();
        };
        const debrief = page.locator('.mission-debrief');
        let scanName = '';
        for (const scans of [0, 1]) {
          await page.clock.fastForward(250);
          const diving = await snapshot(page);
          await page.keyboard.press('Escape');
          await act('.pause-surface');
          await expect(debrief).toBeVisible();
          await expect(page.locator('.pause-menu')).toBeHidden();
          await expect(page.locator('.objectives-panel')).toBeHidden();
          await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
            String(scans),
          );
          await expect(debrief.locator('.debrief-highlight')).toHaveText(
            scans === 0 ? 'The site is waiting for your first scan.' : `Scanned ${scanName}.`,
          );
          await expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1);
          await expect(debrief.locator('.debrief-btn.is-primary')).toHaveAttribute(
            'data-action',
            scans === 0 ? 'keep-exploring' : 'dive-sites',
          );
          const quiet = scans === 0 ? 'dive-sites' : 'keep-exploring';
          await expect(debrief.locator('.debrief-secondary > [data-action]')).toHaveCount(2);
          await expect(
            debrief.locator(`.debrief-secondary > [data-action="${quiet}"]`),
          ).toBeVisible();
          await expect(
            debrief.locator('.debrief-secondary > [data-action="journal"]'),
          ).toBeVisible();
          await expect(debrief.locator('.debrief-more-items')).toBeHidden();
          const panel = debrief.locator('.debrief-panel');
          expect(await panel.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(
            1,
          );
          expect(await panel.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
          const box = (await panel.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
          const ended = await snapshot(page);
          expect(ended.state).toBe('debrief');
          expect(ended.frozen).toBe(true);
          expect(ended.elapsed).toBe(diving.elapsed);
          await page.keyboard.down('w');
          await page.clock.fastForward(1000);
          await page.keyboard.up('w');
          expect(await snapshot(page)).toEqual(ended);
          // Opening intentionally blurs focus to avoid held flight keys firing a button.
          const primary = scans === 0 ? 'keep-exploring' : 'dive-sites';
          for (const target of [primary, quiet, 'journal', 'more', primary]) {
            await page.keyboard.press('Tab');
            await expect(
              debrief.locator(
                target === 'more' ? '.debrief-more-toggle' : `[data-action="${target}"]`,
              ),
            ).toBeFocused();
          }
          await page.keyboard.press('Shift+Tab');
          await expect(debrief.locator('.debrief-more-toggle')).toBeFocused();
          await page.keyboard.press('Enter');
          await expect(debrief.locator('.debrief-more-toggle')).toHaveAttribute(
            'aria-expanded',
            'true',
          );
          for (const target of ['dive-again', 'home', primary]) {
            await page.keyboard.press('Tab');
            await expect(debrief.locator(`[data-action="${target}"]`)).toBeFocused();
          }
          await debrief.locator('.debrief-more-toggle').click();
          await shot(`${scans}-scan-debrief`);
          await act('.mission-debrief [data-action="journal"]');
          await expect(page.locator('.journal')).toBeVisible();
          await page.keyboard.press('Tab');
          expect(await page.evaluate(() => !!document.activeElement?.closest('.journal'))).toBe(
            true,
          );
          await act('.jr-close');
          await expect(debrief.locator('[data-action="journal"]')).toBeFocused();
          expect(await snapshot(page)).toEqual(ended);
          // Activate the new primary with Enter; exercise pointer/touch on the secondary.
          if (scans === 0) {
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await expect(debrief.locator('[data-action="keep-exploring"]')).toBeFocused();
            await page.keyboard.press('Enter');
          } else {
            await act('.mission-debrief .debrief-more-toggle');
            await expect(debrief.locator('.debrief-more-items')).toBeVisible();
            await act('.mission-debrief [data-action="keep-exploring"]');
          }
          await expect(debrief).toBeHidden();
          await expect(page.locator('.objectives-panel')).toBeVisible();
          await expect(page.locator('.hud-readouts')).toBeVisible();
          const resumed = await snapshot(page);
          expect(resumed).toEqual({ ...ended, state: diving.state, duration: null, frozen: false });
          expect(await page.evaluate(() => !!document.activeElement?.closest('.debrief'))).toBe(
            false,
          );
          await page.clock.fastForward(250);
          const ticking = await snapshot(page);
          expect(ticking.elapsed).toBeGreaterThan(resumed.elapsed);
          expect(ticking.sessionElapsed).toBeGreaterThan(resumed.sessionElapsed);
          expect(ticking.scans).toEqual(resumed.scans);
          expect(ticking.counts).toEqual(resumed.counts);
          await page.keyboard.down('w');
          for (let frame = 0; frame < 8; frame++) await page.clock.fastForward(250);
          await page.keyboard.up('w');
          expect((await snapshot(page)).pose).not.toEqual(ticking.pose);
          await shot(`${scans}-scan-resumed`);
          if (scans === 0) {
            // Use the existing assisted geometry/time helper, retaining real scan input/events.
            const target = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              const poi = g.discovery.pois[0]!;
              const pose = g.discovery.spawnPose(poi.id)!;
              g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
              g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
              g.discovery.stats.markTeleport();
              return { id: poi.id, name: poi.name };
            });
            scanName = target.name;
            await scanWithKeyboard(page, target.id);
            expect((await snapshot(page)).scans).toEqual([{ poiId: target.id, name: target.name }]);
          }
        }
        // A rebuilt summary must reset its expanded More state and retain the one scan.
        await page.keyboard.press('Escape');
        await act('.pause-surface');
        await expect(debrief.locator('.debrief-more-items')).toBeHidden();
        await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('1');
        await page.keyboard.press('Escape');
        await expect(debrief).toBeHidden();
        expect((await snapshot(page)).frozen).toBe(false);
        await page.keyboard.press('Escape');
        await act('.pause-surface');
        await act('.mission-debrief [data-action="dive-sites"]');
        await expect(page.locator('.home-sites')).toBeVisible();
        await page.getByRole('button', { name: 'Back to menu', exact: true }).click();
        await expect(page.locator('.home-menu')).toBeVisible();
        expect(errors).toEqual([]);
      });
    }
  });
}
