// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

const shots = '.cache/codex/shots/d-currents';

async function openSettings(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  const advanced = page.locator('.settings .mode-advanced-toggle');
  if ((await advanced.getAttribute('aria-expanded')) === 'false') await advanced.click();
}

async function closeSettings(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
}

async function speed(page: Page): Promise<number> {
  await page.clock.fastForward(250);
  return page.evaluate(() => {
    const current = (window.__game as { presets: { current: { x: number; y: number; z: number } } })
      .presets.current;
    return Math.hypot(current.x, current.y, current.z);
  });
}

test('off, gentle and realistic scale the same offline canyon field', async ({ page }) => {
  await pauseClockBeforeNavigation(page);
  await mkdir(shots, { recursive: true });
  await mkdir('.cache/codex/shots/f2-modes', { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?tile=monterey-canyon&preset=canyon', { waitUntil: 'domcontentloaded' });
  await clockFramesUntil(page, () => window.__gameReady === true);
  await clockFramesUntil(page, () => {
    const g = window.__game as { currents: { status: string }; presets: { entered: boolean } };
    return g.currents.status === 'ready' && g.presets.entered;
  });
  expect(await speed(page)).toBe(0);
  await expect(page.locator('.hud-current')).toBeHidden();
  await page.clock.runFor(17);
  await page.screenshot({ path: `${shots}/off.png` });

  await openSettings(page);
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog.getByLabel('Currents')).toHaveValue('off');
  await dialog.getByRole('radio', { name: 'Realistic' }).check();
  await expect(dialog.getByLabel('Currents')).toHaveValue('realistic');
  await page.clock.runFor(17);
  await dialog.screenshot({ path: `${shots}/settings-currents.png` });
  await closeSettings(page);
  await expect.poll(() => speed(page)).toBeGreaterThan(0.01);
  const full = await speed(page);
  await expect(page.locator('.hud-current')).toContainText('CURRENT');
  await page.clock.runFor(17);
  await page.screenshot({ path: `${shots}/indicator-realistic.png` });
  await page.clock.runFor(17);
  await page.screenshot({ path: `${shots}/realistic.png` });

  await openSettings(page);
  await page.evaluate(() =>
    (
      window.__game as { save: { setGameplayOption(key: string, value: string): void } }
    ).save.setGameplayOption('currents', 'gentle'),
  );
  await expect(dialog.locator('.mode-custom-tag')).toBeVisible();
  await expect.poll(async () => (await speed(page)) / full).toBeCloseTo(0.35, 1);
  const gentle = await speed(page);
  expect(gentle).toBeGreaterThan(0);
  await dialog.getByLabel('Currents').selectOption('exaggerated');
  await expect.poll(async () => (await speed(page)) / full).toBeCloseTo(8, 1);
  await dialog.getByLabel('Currents').scrollIntoViewIfNeeded();
  await page.clock.runFor(17);
  await page.screenshot({ path: '.cache/codex/shots/f2-modes/exaggerated-currents.png' });
  await dialog.getByLabel('Currents').selectOption('off');
  expect(await speed(page)).toBe(0);
  await closeSettings(page);
  await expect(page.locator('.hud-current')).toBeHidden();

  await openSettings(page);
  await dialog.getByLabel('Currents').selectOption('realistic');
  await closeSettings(page);
  await page.evaluate(() => {
    const sub = (
      window.__game as { sub: { velocity: { set(x: number, y: number, z: number): void } } }
    ).sub;
    sub.velocity.set(0, 0, 0);
  });
  await expect
    .poll(
      async () => {
        await page.clock.fastForward(250);
        return page.evaluate(() => {
          const v = (window.__game as { sub: { velocity: { x: number; z: number } } }).sub.velocity;
          return Math.hypot(v.x, v.z);
        });
      },
      { intervals: [20] },
    )
    .toBeGreaterThan(0);
  await page.clock.runFor(17);
  await page.screenshot({ path: `${shots}/canyon-drift.png` });
});

test('a missing offline grid gives zero flow and an honest HUD label', async ({ page }) => {
  await pauseClockBeforeNavigation(page);
  await page.route('**/data/currents/monterey-canyon.json', (route) =>
    route.fulfill({ status: 404, body: '{}' }),
  );
  await page.goto('/?tile=monterey-canyon&preset=canyon', { waitUntil: 'domcontentloaded' });
  await clockFramesUntil(page, () => window.__gameReady === true);
  await clockFramesUntil(
    page,
    () => (window.__game as { currents: { status: string } }).currents.status === 'missing',
  );
  await openSettings(page);
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByLabel('Currents')
    .selectOption('realistic');
  await closeSettings(page);
  expect(await speed(page)).toBe(0);
  await expect(page.locator('.hud-current')).toContainText('offline data unavailable');
});
