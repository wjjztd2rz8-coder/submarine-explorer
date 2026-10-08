import { dismissTutorial } from './helpers/tutorial.js';
/**
 * F3-ONBOARD: the first-dive tutorial, one-shot hints and the controls card.
 * These specs use the plain Playwright test (fresh player), not the
 * experienced-pilot helper the other feature specs share.
 */
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { devices, expect, test, type Page } from '@playwright/test';
import { HINT_THRESHOLDS } from '../../src/game/Hints.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { completeScan } from './helpers/scan.js';

const shots = '.cache/codex/shots/f3-onboard';
const url = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&tier=low';
const KEY = 'subexplorer.onboard.v1';

const { defaultBrowserType: _p, ...phoneLandscape } = devices['iPhone 13 landscape'];

type Probe = {
  onboard: { tutorial: { index: number; active: boolean } };
  discovery: { loaded: boolean; spawnedAt: string | null };
  scanner: { view: { candidateId: string | null } };
};

async function boot(page: Page, extra = ''): Promise<void> {
  await page.goto(url + extra, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  // The first rendered frame precedes async fixture loading and the ?poi=
  // teleport. Save/restore only the actual scan approach, not the tile spawn.
  await page.waitForFunction(
    () => {
      const g = window.__game as unknown as Probe;
      return (
        g.discovery.loaded &&
        g.discovery.spawnedAt === 'test-bow' &&
        g.scanner.view.candidateId === 'test-bow'
      );
    },
    undefined,
    { timeout: 45_000 },
  );
}
async function shot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}
const stepIndex = (page: Page): Promise<number> =>
  page.evaluate(() => (window.__game as unknown as Probe).onboard.tutorial.index);
const saved = (page: Page): Promise<{ tutorialDone: boolean; seenHints: string[] } | null> =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

test('desktop: tutorial starts, advances, skips and stays skipped after reload', async ({
  page,
}) => {
  await boot(page);
  const card = page.locator('.onboard-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Step 1 of 5');
  await expect(card).toContainText('Hold W to move');
  await expect(page.getByRole('button', { name: 'Skip tutorial' })).toBeVisible();
  await shot(page, 'desktop-step1');

  // Doing the action advances the step.
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyA');
  await expect.poll(() => stepIndex(page), { timeout: 15_000 }).toBe(1);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyA');
  await expect(card).toContainText('Step 2 of 5');
  await shot(page, 'desktop-step2');

  // The card never freezes the sim or steals focus.
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);

  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await expect(card).toBeHidden();
  expect((await saved(page))?.tutorialDone).toBe(true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForTimeout(1500);
  await expect(page.locator('.onboard-card')).toBeHidden();
  expect(
    await page.evaluate(() => (window.__game as unknown as Probe).onboard.tutorial.active),
  ).toBe(false);
});

test('desktop: Pause opens the controls card for the active device', async ({ page }) => {
  await page.addInitScript((k) => {
    if (!localStorage.getItem(k))
      localStorage.setItem(k, JSON.stringify({ version: 1, tutorialDone: true, seenHints: [] }));
  }, KEY);
  await boot(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-menu').getByRole('button', { name: 'Controls' }).click();
  const dialog = page.getByRole('dialog', { name: 'Controls guide' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Showing the layout for your keyboard and mouse');
  await expect(dialog).toContainText('Rise and sink');
  await shot(page, 'desktop-controls-card');
  // Escape closes the card only; the pause menu stays.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.pause-menu')).toBeVisible();
  // Peek at the touch layout.
  await page.locator('.pause-menu').getByRole('button', { name: 'Controls' }).click();
  await dialog.getByRole('button', { name: 'Touch' }).click();
  await expect(dialog).toContainText('Left stick');
});

for (const dismissal of ['button', 'expiry'] as const) {
  test(
    dismissal === 'button'
      ? 'hints appear once, can be dismissed and are remembered'
      : 'hints expire after nine seconds and stay remembered after reload',
    async ({ page }) => {
      await pauseClockBeforeNavigation(page);
      await page.addInitScript((k) => {
        if (!localStorage.getItem(k))
          localStorage.setItem(
            k,
            JSON.stringify({
              version: 1,
              tutorialDone: true,
              seenHints: ['battery-low', 'creature', 'rov'],
            }),
          );
      }, KEY);
      // Titanic is only ~58% of its fitted hull rating, so no pressure hint is due.
      // Leggo's site naturally reaches the hint band without exceeding Class C's rating.
      await page.goto('/?tile=challenger-deep&poi=cd-leggo-amphipod-site&skipBriefing=1&tier=low', {
        waitUntil: 'domcontentloaded',
      });
      const ready = () => {
        const game = window.__game as unknown as Probe;
        // spawnedAt is set just after teleport/cancel, before the next scan/HUD
        // update. Pump until the intended POI is actually the live candidate.
        return (
          window.__gameReady === true &&
          game.discovery.loaded &&
          game.discovery.spawnedAt === 'cd-leggo-amphipod-site' &&
          game.scanner.view.candidateId === 'cd-leggo-amphipod-site'
        );
      };
      await clockFramesUntil(page, ready);
      const hull = await page.evaluate(() =>
        (
          window.__game as {
            sub: {
              getState(): { hullClass: string; ratedRatio: number; hullBreached: boolean };
            };
          }
        ).sub.getState(),
      );
      expect(hull.hullClass).toBe('C');
      expect(hull.ratedRatio).toBeGreaterThanOrEqual(HINT_THRESHOLDS.hull);
      expect(hull.ratedRatio).toBeLessThan(1);
      expect(hull.hullBreached).toBe(false);
      const hint = page.locator('.onboard-hint');
      await expect(hint).toBeVisible({ timeout: 30_000 });
      await expect(hint).toContainText('Near hull rating');
      await expect(page.locator('.scan-panel')).toBeVisible();
      await shot(page, 'desktop-hint');
      if (dismissal === 'button') {
        await hint.getByRole('button', { name: 'Dismiss hint' }).click();
      } else {
        await page.clock.fastForward(8000);
        await expect(hint).toBeVisible();
        await page.clock.fastForward(1001);
      }
      await expect(hint).toBeHidden();
      expect((await saved(page))?.seenHints).toContain('near-hull');
      expect((await saved(page))?.seenHints).not.toContain('scan-target');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await clockFramesUntil(page, ready);
      await page.clock.fastForward(2500);
      await expect(page.locator('.scan-panel')).toBeVisible();
      await expect(page.locator('.onboard-hint')).toBeHidden();
    },
  );
}

test.describe('touch viewport', () => {
  test.use({ ...phoneLandscape });

  test('tutorial card clears the on-screen controls and targets are 44px', async ({ page }) => {
    await boot(page, '&touch=1');
    const card = page.locator('.onboard-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('left stick');
    const box = (await card.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    for (const sel of ['.tc-stick', '.tc-slider', '.tc-buttons']) {
      const other = (await page.locator(sel).boundingBox())!;
      const overlap =
        box.x < other.x + other.width &&
        other.x < box.x + box.width &&
        box.y < other.y + other.height &&
        other.y < box.y + box.height;
      expect(overlap, `${sel} overlaps the card`).toBe(false);
    }
    for (const name of ['Skip']) {
      const b = (await page.getByRole('button', { name }).boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(43.9);
    }
    await shot(page, 'touch-step1');
    await page.getByRole('button', { name: 'Skip', exact: true }).tap();
    await expect(card).toHaveAttribute('data-step', 'depth');
    await expect(card).toContainText('slider');
    await shot(page, 'touch-step2');
    await dismissTutorial(page, true);
    await expect(card).toBeHidden();
    await page.locator('.tc-btn-pause').tap();
    await page.locator('.pause-menu').getByRole('button', { name: 'Controls' }).tap();
    const dialog = page.getByRole('dialog', { name: 'Controls guide' });
    await expect(dialog).toContainText('Showing the layout for your touch');
    await shot(page, 'touch-controls-card');
  });

  test('PHOTO capture, Done, movement and Pause stay reachable with touch alone', async ({
    page,
  }) => {
    await boot(page, '&touch=1');
    const card = page.locator('.onboard-card');
    const start = await page.evaluate(() => {
      const sub = (
        window.__game as unknown as {
          sub: { position: { x: number; y: number; z: number }; yaw: number };
        }
      ).sub;
      return { x: sub.position.x, y: sub.position.y, z: sub.position.z, yaw: sub.yaw };
    });
    const touch = await page.context().newCDPSession(page);
    const hold = async (selector: string, x: number, y: number) => {
      const control = page.locator(selector);
      // Touch controls refresh in late.input; exiting an overlay hides it before
      // the next animation frame restores the stick. Wait for the gesture target.
      await expect(control).toBeVisible();
      const box = (await control.boundingBox())!;
      expect(box).not.toBeNull();
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
      });
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: box.x + box.width * x, y: box.y + box.height * y }],
      });
    };
    const release = () =>
      touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await hold('.tc-stick', 0.8, 0.2);
    await expect.poll(() => stepIndex(page)).toBe(1);
    await release();
    await hold('.tc-slider', 0.5, 0.1);
    await expect.poll(() => stepIndex(page)).toBe(2);
    await release();
    await page.locator('.tc-btn-lights').tap();
    await expect.poll(() => stepIndex(page)).toBe(3);
    // Return to the initial scan approach after practising thrust, turn and depth.
    await page.evaluate(
      (p) =>
        (
          window.__game as unknown as {
            sub: { reset(x: number, y: number, z: number, yaw: number): void };
          }
        ).sub.reset(p.x, p.y, p.z, p.yaw),
      start,
    );
    await expect
      .poll(() => page.evaluate(() => (window.__game as unknown as Probe).scanner.view.candidateId))
      .toBe('test-bow');
    await hold('.tc-btn-scan', 0.5, 0.5);
    await completeScan(page, 'test-bow');
    await expect.poll(() => stepIndex(page)).toBe(4);
    await release();
    await expect(card).toContainText('Step 5 of 5');
    await page.locator('.tc-btn-photo').tap();
    const mode = page.locator('.photo-mode');
    await expect(mode).toBeVisible();
    await expect(page.locator('.tc-root')).toBeHidden();
    for (const name of ['Done', 'Pause']) {
      const box = (await mode.getByRole('button', { name, exact: true }).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await mode.getByRole('button', { name: /^Capture/ }).tap();
    await expect(mode.locator('.photo-mode-toast')).toHaveText('Saved to Journal');
    await mode.getByRole('button', { name: 'Done', exact: true }).tap();
    await expect(mode).toBeHidden();
    await expect(page.locator('.tc-root')).toBeVisible();
    await expect(card).toBeHidden();
    expect((await saved(page))?.tutorialDone).toBe(true);
    await hold('.tc-stick', 0.5, 0.2);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.__game as unknown as { sub: { getState(): { speed: number } } }).sub.getState()
              .speed,
        ),
      )
      .toBeGreaterThan(0.1);
    await release();
    await page.locator('.tc-btn-photo').tap();
    await mode.getByRole('button', { name: 'Pause', exact: true }).tap();
    await expect(mode).toBeHidden();
    await expect(page.locator('.pause-menu')).toBeVisible();
    await page.locator('.pause-menu').getByRole('button', { name: 'Resume', exact: true }).tap();
    await expect(page.locator('.tc-btn-pause')).toBeVisible();
  });
});
