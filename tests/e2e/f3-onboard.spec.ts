import { dismissTutorial, setScanCardSuppressed } from './helpers/tutorial.js';
/**
 * The first-dive tutorial, one-shot hints and the controls card.
 * These specs use the plain Playwright test (fresh player), not the
 * experienced-pilot helper the other feature specs share.
 */
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { devices, expect, test, type Page } from '@playwright/test';
import { HINT_THRESHOLDS } from '../../src/game/Hints.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { GUIDANCE } from './helpers/guidance.js';
import { advanceScan, completeScan } from './helpers/scan.js';
import { homeReady } from './helpers/home.js';

const shots = '.cache/codex/shots/f3-onboard';
const url = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&tier=low';
const KEY = 'subexplorer.onboard.v1';

async function expectHomeWithoutDive(page: Page, terrainRequests: string[]): Promise<void> {
  await expect(page.locator('body')).toHaveAttribute('data-app-state', 'home');
  await expect(page.locator('.home-screen')).toBeVisible();
  await expect(page.locator('#startup-loading, .hud, .tc-root, .briefing')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      ['terrain', 'sub', 'scanner', 'power', 'props', 'life', 'missionRouter', 'onboard'].filter(
        (name) => name in window.__game!,
      ),
    ),
  ).toEqual([]);
  expect(terrainRequests).toEqual([]);
}

for (const device of ['keyboard', 'gamepad'] as const) {
  test(`${device}: Home opens the device guide and retains Change keys`, async ({ page }) => {
    // Regression: Home bypassed the device guide and opened rebinding settings directly.
    const terrainRequests: string[] = [];
    page.on('request', (request) => {
      // The existing decorative title crop loads independently; guard the default dive's tile.
      if (request.url().includes('/data/tiles/titanic/')) terrainRequests.push(request.url());
    });
    if (device === 'gamepad') {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'getGamepads', {
          configurable: true,
          value: () => [{ connected: true, index: 0, axes: [0, -1, 0, 0], buttons: [] }],
        });
      });
    }
    await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
    await homeReady(page);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window.__game as { controlsCard: { device: string } }).controlsCard.device,
        ),
      )
      .toBe(device);
    const opener = page
      .locator('.home-menu')
      .getByRole('button', { name: 'Controls', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Controls guide', exact: true });
    for (let cycle = 0; cycle < 3; cycle++) {
      await opener.focus();
      // A DOM activation retains the sampled pad device; mouse/keyboard events select theirs.
      if (device === 'gamepad') await opener.dispatchEvent('click');
      else await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(
        `Showing the layout for your ${device === 'gamepad' ? 'gamepad' : 'keyboard and mouse'}`,
      );
      await expect(page.locator('.settings')).toBeHidden();
      await expect(page.locator('.controls-card')).toHaveCount(1);
      if (device === 'keyboard') await page.keyboard.press('Tab');
      else await dialog.getByRole('button', { name: 'Gamepad', exact: true }).focus();
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
      const close = dialog.getByRole('button', { name: 'Close', exact: true });
      if (device === 'gamepad') await close.dispatchEvent('click');
      else if (cycle % 2) await close.click();
      else await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
      await expectHomeWithoutDive(page, terrainRequests);
    }
    await opener.focus();
    await opener.dispatchEvent('click');
    await dialog.getByRole('button', { name: 'Keyboard and mouse', exact: true }).click();
    await dialog.getByRole('button', { name: 'Change keys', exact: true }).click();
    await expect(dialog).toBeHidden();
    const settings = page.locator('.settings');
    await expect(settings).toBeVisible();
    await expect(settings).toContainText('Choose an action, then press a key');
    await page.keyboard.press('Escape');
    await expect(settings).toBeHidden();
    await expect(opener).toBeFocused();
    await expectHomeWithoutDive(page, terrainRequests);
  });
}

const { defaultBrowserType: _p, ...phoneLandscape } = devices['iPhone 13 landscape'];

type Probe = {
  onboard: { tutorial: { index: number; active: boolean } };
  discovery: { loaded: boolean; spawnedAt: string | null };
  scanner: { view: { candidateId: string | null } };
};

/**
 * The fixture starts inside the opening contact's range. The tutorial card yields to the
 * scan card, so these specs hide the scan card unless they are testing that deference.
 */
async function boot(page: Page, extra = '', keepScanCard = false): Promise<void> {
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
  if (!keepScanCard) await setScanCardSuppressed(page, true);
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
  const card = page.locator(GUIDANCE.tutorial);
  await expect(card).toBeVisible();
  await expect(card).toContainText('STEP 1 OF 3');
  await expect(card).toContainText('Hold W to move');
  await expect(page.locator(GUIDANCE.skip)).toBeVisible();
  await shot(page, 'desktop-step1');

  // Doing the action advances the step.
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyA');
  await expect.poll(() => stepIndex(page), { timeout: 15_000 }).toBe(1);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyA');
  await expect(card).toContainText('STEP 2 OF 3');
  await shot(page, 'desktop-step2');

  // The card never freezes the sim or steals focus.
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);

  // One Skip per step: the last press ends the tutorial for good.
  for (let i = 0; i < 2; i++) await page.locator(GUIDANCE.skip).click();
  await expect(card).toBeHidden();
  expect((await saved(page))?.tutorialDone).toBe(true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForTimeout(1500);
  await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
  expect(
    await page.evaluate(() => (window.__game as unknown as Probe).onboard.tutorial.active),
  ).toBe(false);
});

test('scan coaching waits through held progress and interruption until completion', async ({
  page,
}) => {
  await pauseClockBeforeNavigation(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await clockFramesUntil(page, () => {
    const g = window.__game as unknown as Probe;
    return (
      window.__gameReady === true &&
      g.discovery.loaded &&
      g.discovery.spawnedAt === 'test-bow' &&
      g.scanner.view.candidateId === 'test-bow'
    );
  });
  // The contact is in range, so its card keeps the tutorial hidden; hold it away to read the coach.
  await setScanCardSuppressed(page, true);
  await page.clock.fastForward(50);
  for (let i = 0; i < 2; i++) await page.locator(GUIDANCE.skip).click();
  await page.clock.fastForward(50);
  const card = page.locator(GUIDANCE.any);
  await expect(card).toHaveAttribute('data-step', 'scan');
  await page.keyboard.down('g');
  await advanceScan(page, 0.5);
  await page.clock.fastForward(50);
  await expect(card.locator(GUIDANCE.name)).toContainText('Scanning…');
  expect(await stepIndex(page)).toBe(2);
  await page.keyboard.up('g');
  await page.clock.fastForward(50);
  await expect(card.locator(GUIDANCE.name)).not.toContainText('Scanning…');
  expect(await stepIndex(page)).toBe(2);
  await page.keyboard.down('g');
  await completeScan(page, 'test-bow');
  await page.keyboard.up('g');
  await page.clock.fastForward(50);
  expect(await stepIndex(page)).toBe(3);
  await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
});

test('the scan card outranks the tutorial step instead of stacking with it', async ({ page }) => {
  // Regression: the coach card and the scan card used to share the centre lane.
  await boot(page, '', true);
  await expect(page.locator(GUIDANCE.scan)).toBeVisible();
  await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
  expect(await stepIndex(page)).toBe(0);
  await setScanCardSuppressed(page, true);
  await expect(page.locator(GUIDANCE.tutorial)).toBeVisible();
});

test('desktop: Pause opens the controls card for the active device', async ({ page }) => {
  // Regression: sharing Home's guide must retain Pause's overlay ownership and opener focus.
  await page.addInitScript((k) => {
    if (!localStorage.getItem(k))
      localStorage.setItem(k, JSON.stringify({ version: 1, tutorialDone: true, seenHints: [] }));
  }, KEY);
  await boot(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeVisible();
  const opener = page.locator('.pause-menu').getByRole('button', { name: 'Controls', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Controls guide' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Showing the layout for your keyboard and mouse');
  await expect(dialog).toContainText('Rise and sink');
  await shot(page, 'desktop-controls-card');
  // Escape closes the card only; the pause menu stays.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.pause-menu')).toBeVisible();
  await expect(opener).toBeFocused();
  for (let cycle = 0; cycle < 2; cycle++) {
    await opener.click();
    await expect(page.locator('.controls-card')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('body')).toHaveAttribute('data-app-state', 'pause');
  }
  // Peek at the touch layout.
  await page.locator('.pause-menu').getByRole('button', { name: 'Controls' }).click();
  await dialog.getByRole('button', { name: 'Touch' }).click();
  const howTo = page.getByRole('dialog', { name: 'How to play', exact: true });
  await expect(howTo).toBeVisible();
  await expect(howTo).toContainText('Left stick');
  await expect(howTo.locator('.how-to-tile svg')).toHaveCount(9);
  await expect(howTo.locator('.controls-card-tabs')).toBeVisible();
});

{
  test('hints expire after nine seconds and stay remembered after reload', async ({ page }) => {
    await pauseClockBeforeNavigation(page);
    await page.addInitScript((k) => {
      if (!localStorage.getItem(k))
        localStorage.setItem(
          k,
          JSON.stringify({
            version: 1,
            tutorialDone: true,
            seenHints: ['battery-low', 'creature'],
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
    // Pressure and battery tips are warnings, so they outrank the scan card.
    const hint = page.locator(GUIDANCE.urgent);
    await expect(hint).toBeHidden();
    // The authored deep approach must stay quiet after the opening grace
    // period as well. Keep physics fixed while advancing real dive frames.
    await page.evaluate(() => {
      const g = window.__game as unknown as {
        sub: { step(): void; position: { y: number } };
      };
      g.sub.step = () => {};
    });
    for (let i = 0; i < 81; i++) await page.clock.fastForward(250);
    await expect(hint).toBeHidden();
    expect((await saved(page))?.seenHints).not.toContain('near-hull');
    // A new descent beyond the opening depth still earns the one-shot hint.
    await page.evaluate(() => {
      const g = window.__game as unknown as { sub: { position: { y: number } } };
      g.sub.position.y -= 11;
    });
    await page.clock.fastForward(250);
    await expect(hint).toBeVisible({ timeout: 30_000 });
    await expect(hint).toContainText('Near hull rating');
    await shot(page, 'desktop-hint');
    // Hints run down on dive time, so advance real frames (250 ms each).
    for (let i = 0; i < 32; i++) await page.clock.fastForward(250);
    await expect(hint).toBeVisible();
    for (let i = 0; i < 5; i++) await page.clock.fastForward(250);
    await expect(hint).toBeHidden();
    expect((await saved(page))?.seenHints).toContain('near-hull');
    expect((await saved(page))?.seenHints).not.toContain('scan-target');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await clockFramesUntil(page, ready);
    await page.clock.fastForward(2500);
    await expect(page.locator(GUIDANCE.scan)).toBeVisible();
    await expect(page.locator(GUIDANCE.urgent)).toBeHidden();
  });
}

test.describe('touch viewport', () => {
  test.use({ ...phoneLandscape });

  test('touch: Home and Pause reuse How to play through repeated close and back', async ({
    page,
  }) => {
    // Regression: touch Home showed key rebinding; the guide must work before any dive loads.
    const terrainRequests: string[] = [];
    page.on('request', (request) => {
      // The existing decorative title crop loads independently; guard the default dive's tile.
      if (request.url().includes('/data/tiles/titanic/')) terrainRequests.push(request.url());
    });
    await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
    await homeReady(page);
    const dialog = page.getByRole('dialog', { name: 'How to play', exact: true });
    for (const source of ['home', 'pause'] as const) {
      if (source === 'pause') {
        await boot(page, '&touch=1');
        await page.locator('.tc-btn-pause').tap();
      }
      const opener = page
        .locator(source === 'home' ? '.home-menu' : '.pause-menu')
        .getByRole('button', { name: source === 'home' ? 'Controls' : 'How to play', exact: true });
      for (let cycle = 0; cycle < 3; cycle++) {
        await opener.tap();
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Left stick');
        await expect(dialog).toContainText('Right slider');
        await expect(dialog.locator('.how-to-tile svg')).toHaveCount(9);
        await expect(dialog.locator('.controls-card-tabs')).toBeHidden();
        await expect(dialog.getByRole('button', { name: 'Change keys' })).toHaveCount(0);
        await expect(page.locator('.settings')).toBeHidden();
        await expect(page.locator('.controls-card')).toHaveCount(1);
        if (source === 'home') await expectHomeWithoutDive(page, terrainRequests);
        if (cycle === 1) await page.keyboard.press('Escape');
        else await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
        await expect(dialog).toBeHidden();
        await expect(opener).toBeFocused();
        await expect(page.locator('body')).toHaveAttribute('data-app-state', source);
      }
    }
    await page.locator('.pause-menu').getByRole('button', { name: 'Quit to home' }).tap();
    await page.locator('.home-menu').getByRole('button', { name: 'Controls', exact: true }).tap();
    await expect(dialog).toBeVisible();
    await expect(page.locator('.controls-card')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
    await expect(
      page.locator('.home-menu').getByRole('button', { name: 'Controls', exact: true }),
    ).toBeFocused();
  });

  test('Journal returns to Pause without switching out of touch mode', async ({ page }) => {
    await boot(page, '&touch=1');
    await dismissTutorial(page, true);
    await page.locator('.tc-btn-pause').tap();
    const pause = page.locator('.pause-menu');
    await pause.getByRole('button', { name: 'Journal', exact: true }).tap();
    const journal = page.locator('.journal');
    await expect(journal).toBeVisible();
    await journal.getByRole('button', { name: 'Close Journal', exact: true }).tap();
    await expect(journal).toBeHidden();
    await expect(pause).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/is-touch/);
    await pause.getByRole('button', { name: 'Resume', exact: true }).tap();
    await expect(page.locator('.tc-btn-pause')).toBeVisible();
    await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
  });

  test('tutorial card clears the on-screen controls and targets are 44px', async ({ page }) => {
    await boot(page, '&touch=1');
    const card = page.locator(GUIDANCE.any);
    await expect(page.locator(GUIDANCE.tutorial)).toBeVisible();
    await expect(card).toContainText(/left stick/i);
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
    await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
    await page.locator('.tc-btn-pause').tap();
    await page
      .locator('.pause-menu')
      .getByRole('button', { name: 'How to play', exact: true })
      .tap();
    const dialog = page.getByRole('dialog', { name: 'How to play', exact: true });
    await expect(dialog).toContainText('Left stick');
    await expect(dialog).toContainText('Right slider');
    await expect(dialog.locator('.how-to-tile svg')).toHaveCount(9);
    await expect(dialog.locator('.controls-card-tabs')).toBeHidden();
    await shot(page, 'touch-controls-card');
  });

  test('PHOTO capture, Done, movement and Pause stay reachable with touch alone', async ({
    page,
  }) => {
    await boot(page, '&touch=1');
    const card = page.locator(GUIDANCE.tutorial);
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
    await expect.poll(() => stepIndex(page)).toBe(3);
    await release();
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
