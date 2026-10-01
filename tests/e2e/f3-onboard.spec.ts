/**
 * F3-ONBOARD: the first-dive tutorial, one-shot hints and the controls card.
 * These specs use the plain Playwright test (fresh player), not the
 * experienced-pilot helper the other feature specs share.
 */
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { devices, expect, test, type Page } from '@playwright/test';

const shots = '.cache/codex/shots/f3-onboard';
const url = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&tier=low';
const KEY = 'subexplorer.onboard.v1';

const { defaultBrowserType: _p, ...phoneLandscape } = devices['iPhone 13 landscape'];

type Probe = { onboard: { tutorial: { index: number; active: boolean } } };

async function boot(page: Page, extra = ''): Promise<void> {
  await page.goto(url + extra, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
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

test('hints appear once, can be dismissed and are remembered', async ({ page }) => {
  await page.addInitScript((k) => {
    if (!localStorage.getItem(k))
      localStorage.setItem(
        k,
        JSON.stringify({ version: 1, tutorialDone: true, seenHints: ['near-hull'] }),
      );
  }, KEY);
  await boot(page);
  const hint = page.locator('.onboard-hint');
  await expect(hint).toBeVisible({ timeout: 30_000 });
  await expect(hint).toContainText('scan');
  await shot(page, 'desktop-hint');
  await hint.getByRole('button', { name: 'Dismiss hint' }).click();
  await expect(hint).toBeHidden();
  expect((await saved(page))?.seenHints).toContain('scan-target');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForTimeout(2500);
  await expect(page.locator('.onboard-hint')).toBeHidden();
});

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
    for (const name of ['Skip step', 'Skip tutorial']) {
      const b = (await page.getByRole('button', { name }).boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    await shot(page, 'touch-step1');
    await page.getByRole('button', { name: 'Skip step' }).tap();
    await expect(card).toContainText('Step 2 of 5');
    await expect(card).toContainText('slider');
    await shot(page, 'touch-step2');
    await page.getByRole('button', { name: 'Skip tutorial' }).tap();
    await expect(card).toBeHidden();
    await page.locator('.tc-btn-pause').tap();
    await page.locator('.pause-menu').getByRole('button', { name: 'Controls' }).tap();
    const dialog = page.getByRole('dialog', { name: 'Controls guide' });
    await expect(dialog).toContainText('Showing the layout for your touch');
    await shot(page, 'touch-controls-card');
  });
});
