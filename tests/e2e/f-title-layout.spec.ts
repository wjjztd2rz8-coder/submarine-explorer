// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/f-title-d';

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];

async function boot(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await expect(page.locator('.home-screen')).toBeVisible();
}

test('home copy, semantic order and first focus', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.home-screen')).toHaveAttribute('aria-label', 'Bathyline home');
  await expect(page.locator('.home-kicker')).toHaveText('A CINEMATIC OCEAN EXPLORATION GAME');
  await expect(page.locator('.home-screen h1')).toHaveText('Bathyline');
  await expect(page.locator('.home-tagline')).toHaveText('Explore the real deep.');
  await expect(page.locator('.home-desc')).toHaveText(
    'Real terrain, simple controls, discoveries worth finding.',
  );
  await expect(page.locator('.home-notes')).toContainText('Play in your browser');
  await expect(page.locator('.home-notes')).toContainText('Touch, keyboard or controller');
  await expect(page.locator('.home-scene-caption')).toHaveText(
    /^(Expedition preview|Monterey Canyon · Real GMRT bathymetry)$/,
  );
  await expect(page.locator('.home-scene-caveat')).toHaveText(
    'Vehicle and lighting are illustrative.',
  );
  const order = await page
    .locator('.home-menu > button:not(.daily-card), .home-menu > .mode-selector')
    .evaluateAll((els) =>
      els.map((e) => (e.classList.contains('mode-selector') ? 'MODE' : (e.textContent ?? ''))),
    );
  expect(order).toEqual([
    'Continue',
    'Dive sites',
    'Free dive',
    'MODE',
    'Journal',
    'Settings',
    'Controls',
    'Upgrades',
  ]);
  // Fresh save: Continue is disabled, so Dive sites takes first focus.
  await expect(page.getByRole('button', { name: 'Dive sites' })).toBeFocused();
});

test('both selector entry buttons restore focus on Back and Escape', async ({ page }) => {
  await boot(page);
  const menu = page.locator('.home-menu');
  for (const [name, via] of [
    ['Dive sites', 'back'],
    ['Free dive', 'back'],
    ['Dive sites', 'escape'],
    ['Free dive', 'escape'],
  ] as const) {
    await menu.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.home-sites')).toBeVisible();
    if (via === 'back') await page.getByRole('button', { name: 'Back to menu' }).click();
    else await page.keyboard.press('Escape');
    await expect(page.locator('.home-sites')).toBeHidden();
    await expect(menu.getByRole('button', { name, exact: true })).toBeFocused();
  }
});

for (const viewport of VIEWPORTS) {
  test(`home layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await mkdir(shots, { recursive: true });
    await page.setViewportSize(viewport);
    await boot(page);
    const size = `${viewport.width}x${viewport.height}`;
    await page.screenshot({ path: `${shots}/home-${size}.png` });

    const noHScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= window.innerWidth &&
        [...document.querySelectorAll('.home-screen, .home-screen *')].every((e) => {
          const r = e.getBoundingClientRect();
          return r.width === 0 || (r.left >= -0.5 && r.right <= window.innerWidth + 0.5);
        }),
    );
    expect(noHScroll, 'nothing leaves the viewport horizontally').toBe(true);

    // Copy, menu scroller and caption plate never overlap.
    const boxes = await page.evaluate(() =>
      ['.home-copy', '.home-menu', '.home-scene-plate'].map((sel) => {
        const r = document.querySelector(sel)!.getBoundingClientRect();
        const c = document.querySelector(sel)!.parentElement!.getBoundingClientRect();
        // The menu may be clipped by its scroller; compare the visible part.
        const scroller = sel === '.home-menu' ? document.querySelector('.home-body')! : null;
        const s = scroller?.getBoundingClientRect() ?? r;
        void c;
        return {
          sel,
          x: Math.max(r.x, s.x),
          y: Math.max(r.y, s.y),
          r: Math.min(r.right, s.right),
          b: Math.min(r.bottom, s.bottom),
        };
      }),
    );
    for (let i = 0; i < boxes.length; i++) {
      for (const o of boxes.slice(i + 1)) {
        const a = boxes[i];
        expect(a.x < o.r && o.x < a.r && a.y < o.b && o.y < a.b, `${a.sel} overlaps ${o.sel}`).toBe(
          false,
        );
      }
    }

    // Touch targets and reachability of every action, including the last.
    const buttons = page.locator('.home-menu button:visible');
    const n = await buttons.count();
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i);
      await b.scrollIntoViewIfNeeded();
      const box = (await b.boundingBox())!;
      expect(box.height, `button ${i} height`).toBeGreaterThanOrEqual(48);
      expect(box.width, `button ${i} width`).toBeGreaterThanOrEqual(48);
      expect(
        await b.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return hit !== null && el.contains(hit);
        }),
        `button ${i} receives taps`,
      ).toBe(true);
    }
    await page.getByRole('button', { name: 'Dive sites' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/sites-${size}.png` });
    const back = page.getByRole('button', { name: 'Back to menu' });
    const bb = (await back.boundingBox())!;
    expect(bb.height).toBeGreaterThanOrEqual(48);
    expect(bb.y + bb.height).toBeLessThanOrEqual(viewport.height);
  });
}
