// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const shots = '.cache/codex/shots/d-currents';

async function openSettings(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
}

async function closeSettings(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
}

async function speed(page: Page): Promise<number> {
  return page.evaluate(() => {
    const current = (window.__game as { presets: { current: { x: number; y: number; z: number } } })
      .presets.current;
    return Math.hypot(current.x, current.y, current.z);
  });
}

test('off, gentle and realistic scale the same offline canyon field', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?tile=monterey-canyon&preset=canyon', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(() => {
    const g = window.__game as { currents: { status: string }; presets: { entered: boolean } };
    return g.currents.status === 'ready' && g.presets.entered;
  });
  expect(await speed(page)).toBe(0);
  await expect(page.locator('.hud-current')).toBeHidden();
  await page.screenshot({ path: `${shots}/off.png` });

  await openSettings(page);
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog.getByLabel('Currents')).toHaveValue('off');
  await dialog.getByLabel('Mode', { exact: true }).selectOption('realistic');
  await expect(dialog.getByLabel('Currents')).toHaveValue('realistic');
  await dialog.screenshot({ path: `${shots}/settings-currents.png` });
  await closeSettings(page);
  await expect.poll(() => speed(page)).toBeGreaterThan(0.01);
  const full = await speed(page);
  await expect(page.locator('.hud-current')).toContainText('CURRENT');
  await page.screenshot({ path: `${shots}/indicator-realistic.png` });
  await page.screenshot({ path: `${shots}/realistic.png` });

  await openSettings(page);
  await dialog.getByLabel('Currents').selectOption('gentle');
  await expect(dialog.getByLabel('Mode', { exact: true })).toHaveValue('custom');
  await expect.poll(async () => (await speed(page)) / full).toBeCloseTo(0.35, 1);
  const gentle = await speed(page);
  expect(gentle).toBeGreaterThan(0);
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
    .poll(async () =>
      page.evaluate(() => {
        const v = (window.__game as { sub: { velocity: { x: number; z: number } } }).sub.velocity;
        return Math.hypot(v.x, v.z);
      }),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: `${shots}/canyon-drift.png` });
});

test('a missing offline grid gives zero flow and an honest HUD label', async ({ page }) => {
  await page.route('**/data/currents/monterey-canyon.json', (route) =>
    route.fulfill({ status: 404, body: '{}' }),
  );
  await page.goto('/?tile=monterey-canyon&preset=canyon', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
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
