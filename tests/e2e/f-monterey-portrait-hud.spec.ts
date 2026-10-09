import { expect, test, type Page } from '@playwright/test';
import type { Camera } from 'three';
import type { Submarine } from '../../src/sub/Submarine.js';

// Phone portrait at the Monterey Canyon spawn: every HUD panel owns its own
// space, and the submarine is on screen and not hidden behind any of them.
const HUD = [
  '.sonar',
  '.hud-readouts',
  '.hud-footer',
  '.objectives-panel',
  '.scan-stack',
  '.onboard-card',
  '.hud-notice',
  '.hud-warning',
  '.tc-stick',
  '.tc-slider',
  '.tc-buttons',
  '.tc-btn-pause',
];

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function boot(page: Page, query: string): Promise<void> {
  await page.addInitScript(() =>
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
    ),
  );
  await page.goto(`/?tile=monterey-canyon&tier=low&touch=1&skipBriefing=1&${query}`);
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
  );
}

async function expectClearLayout(page: Page, credits: boolean): Promise<void> {
  const selectors = credits ? [...HUD, '.hud-attribution-panel'] : HUD;
  const m = await page.evaluate((selectors) => {
    const boxes = selectors.flatMap((selector) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden')
        return [];
      const r = el.getBoundingClientRect();
      return [{ selector, x: r.x, y: r.y, width: r.width, height: r.height }];
    });
    const game = window.__game as { sub: Submarine; rig: { camera: Camera } };
    const p = game.sub.position.clone().project(game.rig.camera);
    return {
      boxes,
      w: innerWidth,
      h: innerHeight,
      sx: ((p.x + 1) / 2) * innerWidth,
      sy: ((1 - p.y) / 2) * innerHeight,
    };
  }, selectors);
  expect(m.boxes.map((b) => b.selector)).toEqual(
    expect.arrayContaining(['.sonar', '.hud-readouts']),
  );
  for (const b of m.boxes) {
    expect(b.x, b.selector).toBeGreaterThanOrEqual(0);
    expect(b.y, b.selector).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, b.selector).toBeLessThanOrEqual(m.w);
    expect(b.y + b.height, b.selector).toBeLessThanOrEqual(m.h);
    const covers = m.sx >= b.x && m.sx <= b.x + b.width && m.sy >= b.y && m.sy <= b.y + b.height;
    expect(covers, `${b.selector} must not cover the submarine`).toBe(false);
  }
  for (let i = 0; i < m.boxes.length; i++) {
    for (const b of m.boxes.slice(i + 1)) {
      const a = m.boxes[i]!;
      const overlaps =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlaps, `${a.selector} overlaps ${b.selector}`).toBe(false);
    }
  }
  expect(m.sx).toBeGreaterThan(40);
  expect(m.sx).toBeLessThan(m.w - 40);
  expect(m.sy).toBeGreaterThan(40);
  expect(m.sy).toBeLessThan(m.h - 40);
}

test('free dive: portrait HUD panels do not overlap, credits open or closed', async ({ page }) => {
  await boot(page, 'tutorial=0');
  await expect(page.locator('.scan-stack')).toBeVisible();
  await expectClearLayout(page, false);
  await page.locator('.hud-attribution summary').tap();
  await expect(page.locator('.hud-attribution-panel')).toBeVisible();
  // Visibility changes before the queued details toggle places the panel.
  await expect(page.locator('.hud-attribution summary')).toHaveAttribute('aria-expanded', 'true');
  await expectClearLayout(page, true);
});

test('mission with tutorial: card, objectives, scan and readouts stay separate', async ({
  page,
}) => {
  await boot(page, 'mission=monterey-canyon');
  await expect(page.locator('.onboard-card')).toBeVisible();
  await expect(page.locator('.objectives-panel')).toBeVisible();
  await expectClearLayout(page, false);
  await page.locator('.hud-attribution summary').tap();
  await expect(page.locator('.hud-attribution-panel')).toBeVisible();
  await expect(page.locator('.hud-attribution summary')).toHaveAttribute('aria-expanded', 'true');
  await expectClearLayout(page, true);
});
