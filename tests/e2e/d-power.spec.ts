// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const shots = '.cache/codex/shots/d-power';

test('Arcade hides supplies; Custom enables them; depletion ascends and debriefs safely', async ({
  page,
}) => {
  await mkdir(shots, { recursive: true });
  await page.goto('/?mission=titanic&skipBriefing=1');
  await page.waitForFunction(() => window.__gameReady === true);
  const gauge = page.locator('.hud-power');
  await expect(gauge).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog.getByLabel('Mode', { exact: true })).toHaveValue('arcade');
  await dialog.getByLabel('Battery and oxygen').selectOption('true');
  await expect(dialog.getByLabel('Mode', { exact: true })).toHaveValue('custom');
  await dialog.screenshot({ path: `${shots}/settings-custom-battery.png` });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(gauge).toBeVisible();
  await page.screenshot({ path: `${shots}/gauge-normal.png` });
  await page.evaluate(() => {
    const power = (window.__game as { power: { setLevels(b: number, o: number): void } }).power;
    power.setLevels(0.24, 0.6);
  });
  await expect(page.locator('.hud-warning')).toContainText('BATTERY LOW');
  await page.screenshot({ path: `${shots}/gauge-low-warning.png` });
  await page.evaluate(() => {
    const power = (window.__game as { power: { setLevels(b: number, o: number): void } }).power;
    power.setLevels(0.000001, 0.6);
  });
  await page.waitForFunction(
    () =>
      (window.__game as { missionRouter: { emergencyAscent: boolean } }).missionRouter
        .emergencyAscent,
  );
  await expect(page.locator('.hud-warning')).toContainText('EMERGENCY ASCENT');
  await page.screenshot({ path: `${shots}/emergency-ascent.png` });
  // Advance the already active blow to the surface without waiting for the
  // full 3,800 m real-time trip. The physics still performs the final step.
  await page.evaluate(() => {
    const sub = (window.__game as { sub: { position: { y: number } } }).sub;
    sub.position.y = -10;
  });
  await expect(page.locator('.mission-debrief')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.mission-debrief')).toContainText('Supplies exhausted');
  await expect(page.locator('.mission-debrief')).toContainText('Dive again');
});
