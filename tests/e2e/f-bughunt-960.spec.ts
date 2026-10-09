import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { completeScan, scanWithKeyboard } from './helpers/scan.js';
import { scanAim } from './helpers/scanAim.js';
import { dismissTutorial } from './helpers/tutorial.js';
import { expectCompactPhoneHud } from './helpers/phoneHud.js';

type Game = {
  discovery: Discovery;
  sub: Submarine;
  rig: CameraRig;
  props: { loaded: boolean };
  save: { get(): { gameplayMode: string; gameplay: { startPosition: string } } };
  config: { submarine: { maxPitch: number } };
};

async function ready(page: Page): Promise<void> {
  await clockFramesUntil(page, () => {
    const g = window.__game as unknown as Game;
    return !!(window.__gameReady && g.discovery.loaded && g.props.loaded);
  });
  await page.evaluate(() => document.fonts.ready);
}

async function reachable(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport({ ratio: 1 });
  expect(
    await target.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!hit && (hit === e || e.contains(hit));
    }),
  ).toBe(true);
}

for (const layout of [
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
  { width: 1280, height: 720, touch: false },
]) {
  test.describe(`960 ${layout.width}x${layout.height}`, () => {
    test.use({
      viewport: layout,
      hasTouch: layout.touch,
      isMobile: layout.touch,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      storageState: { cookies: [], origins: [] },
    });
    for (const mode of ['arcade', 'realistic'] as const) {
      for (const tier of ['low', 'high']) {
        for (const site of ['titanic', 'great-blue-hole']) {
          test(`${site} ${mode} ${tier}: briefing, assisted scan, Journal, debrief and saves`, async ({
            page,
          }, info) => {
            test.setTimeout(240_000);
            const errors: string[] = [];
            page.on('pageerror', (error) => errors.push(error.message));
            // Unlock the two Class B missions, retaining fresh tutorial/discovery saves.
            await page.addInitScript(() => {
              if (!localStorage.getItem('subexplorer.progress.v1'))
                localStorage.setItem(
                  'subexplorer.progress.v1',
                  JSON.stringify({
                    version: 1,
                    points: 0,
                    lifetime: 900,
                    awarded: [],
                    upgrades: {},
                    ratings: {},
                  }),
                );
            });
            await pauseClockBeforeNavigation(page);
            await page.goto(`/?tier=${tier}&dynres=0&lifeSeed=42`, {
              waitUntil: 'domcontentloaded',
            });
            await ready(page);
            const act = async (target: Locator): Promise<void> => {
              await reachable(target);
              if (layout.touch) await target.tap();
              else await target.click();
            };
            const home = page.locator('.home-screen');
            await home
              .getByRole('radio', { name: mode === 'arcade' ? 'Arcade' : 'Realistic', exact: true })
              .check();
            await act(
              home.locator('.home-menu').getByRole('button', { name: 'Dive sites', exact: true }),
            );
            await act(home.locator(`[data-mission="${site}"]`));
            await ready(page);
            const briefing = page.locator('.briefing');
            await expect(briefing).toBeVisible();
            await expect(
              briefing.getByRole('radio', { name: 'near the first target', exact: true }),
            ).toBeChecked();
            const panel = briefing.locator('.briefing-panel');
            expect(await panel.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(
              1,
            );
            if (layout.width === 390)
              expect(
                await panel.evaluate((e) => e.scrollHeight - e.clientHeight),
              ).toBeLessThanOrEqual(1);
            await page.screenshot({ path: info.outputPath('briefing.png') });
            const more = briefing.locator('.briefing-site-more');
            await more.locator('summary').focus();
            await page.keyboard.press('Enter');
            await expect(more).toHaveAttribute('open', '');
            await expect(briefing).toBeVisible();
            await page.keyboard.press('Space');
            await expect(more).not.toHaveAttribute('open', '');
            await act(briefing.locator('.briefing-begin'));
            await page.clock.runFor(34);
            await expect(briefing).toBeHidden();
            if (layout.touch) {
              // A keyboard event in the disclosure changes the active input device.
              await act(page.getByRole('button', { name: 'Skip', exact: true }));
              await page.clock.runFor(34);
              await expectCompactPhoneHud(page);
              await page.keyboard.press('F9');
              await page.clock.runFor(34);
              await expect(page.locator('.onboard-card-phone-text')).toHaveText(
                'Hold Space to rise or Ctrl to sink.',
              );
              await expect(
                page.getByRole('button', { name: 'Skip step', exact: true }),
              ).toBeVisible();
              // Keys switch the entire HUD to keyboard mode. A real touch on
              // the scene restores phone controls before looking up their names.
              await page.locator('#viewport').tap({
                position: { x: layout.width / 2, y: layout.height - 80 },
              });
              await page.clock.runFor(34);
              await expect(page.locator('.onboard-card-phone-text')).toBeVisible();
              await expect(page.locator('.onboard-card-phone-text')).toHaveText(
                'Right slider: up to rise, down to sink.',
              );
              await act(page.getByRole('button', { name: 'Skip', exact: true }));
              await page.clock.runFor(34);
              await expect(page.locator('.onboard-card-phone-text')).toHaveText(
                'Tap LIGHTS to switch the headlights.',
              );
            }
            await page.screenshot({ path: info.outputPath('opening.png') });
            await dismissTutorial(page, layout.touch, true);

            // Explicit assisted scan isolates HUD/input/mission wiring from navigation.
            // Opening screenshots precede this teleport; natural approach acceptance remains separate.
            const target = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              const poi = g.discovery.pois[0]!;
              const pose = g.discovery.spawnPose(poi.id)!;
              g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
              g.discovery.stats.markTeleport();
              return {
                id: poi.id,
                from: g.sub.position.toArray(),
                to: poi.position.toArray(),
                maxPitch: g.config.submarine.maxPitch,
              };
            });
            const xyz = (p: number[]) => ({ x: p[0]!, y: p[1]!, z: p[2]! });
            const aim = scanAim(xyz(target.from), xyz(target.to), target.maxPitch);
            await page.evaluate((aim) => {
              const g = window.__game as unknown as Game;
              g.sub.yaw = aim.yaw;
              g.sub.pitch = aim.pitch;
              g.rig.snap(g.sub.position, aim.yaw, aim.pitch);
            }, aim);
            await page.clock.runFor(34);
            if (layout.touch) {
              await expect(page.locator('.d-scan-edge')).toBeHidden();
              await expect(page.locator('.d-scan-objective-hint')).toBeHidden();
              await expect(page.locator('.objectives-panel .obj-list')).toBeHidden();
              const scan = page.locator('.tc-btn-scan');
              await reachable(scan);
              const r = (await scan.boundingBox())!;
              const cdp = await page.context().newCDPSession(page);
              try {
                await cdp.send('Input.dispatchTouchEvent', {
                  type: 'touchStart',
                  touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }],
                });
                await completeScan(page, target.id);
              } finally {
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await cdp.detach();
              }
            } else await scanWithKeyboard(page, target.id);
            await page.clock.runFor(34);
            await page.screenshot({ path: info.outputPath('assisted-scan.png') });
            if (layout.touch) await act(page.locator('.tc-btn-pause'));
            else await page.keyboard.press('Escape');
            await act(page.locator('.pause-surface'));
            const debrief = page.locator('.mission-debrief');
            await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText(
              '1',
            );
            await page.screenshot({ path: info.outputPath('debrief.png') });
            await act(debrief.locator('[data-action="journal"]'));
            const journal = page.locator('.journal');
            await expect(journal).toBeVisible();
            await expect(journal.locator('.jr-locked')).toHaveCount(0);
            await act(journal.locator('.jr-close'));
            await expect(debrief.locator('[data-action="journal"]')).toBeFocused();
            const snapshot = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              return { discoveries: g.discovery.store.snapshot(), settings: g.save.get() };
            });
            expect(snapshot.settings.gameplayMode).toBe(mode);
            expect(snapshot.settings.gameplay.startPosition).toBe('near-site');
            for (let reload = 0; reload < 2; reload++) {
              await page.reload({ waitUntil: 'domcontentloaded' });
              await ready(page);
              expect(
                await page.evaluate(() => {
                  const g = window.__game as unknown as Game;
                  return { discoveries: g.discovery.store.snapshot(), settings: g.save.get() };
                }),
              ).toEqual(snapshot);
              expect(
                await page.evaluate(
                  () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone,
                ),
              ).toBe(true);
            }
            expect(errors).toEqual([]);
          });
        }
      }
    }
  });
}
