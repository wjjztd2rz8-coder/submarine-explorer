// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const shots = '.cache/codex/shots/d-polish';

test('polished dive HUD keeps mission, telemetry, speed and live tips readable', async ({
  page,
}) => {
  await mkdir(shots, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?mission=titanic&skipBriefing=1');
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
  );
  await expect(page.locator('.obj-item')).toHaveCount(4);
  await expect(page.locator('.obj-item.is-current')).toContainText(
    'Locate and scan the bow section',
  );
  await expect(page.locator('.obj-item.is-optional')).toHaveCount(2);
  await expect(page.locator('.obj-check')).toHaveText(['○', '○', '○', '○']);
  await expect(page.locator('.obj-hint')).not.toBeEmpty();
  await expect(page.locator('.hud-control-tips')).toBeVisible();
  const depthSize = await page
    .locator('.hud-value[data-field="depth"]')
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(depthSize).toBeGreaterThanOrEqual(14);
  await page.screenshot({ path: `${shots}/near-site-start-titanic.png` });
  await page.locator('.objectives-panel').screenshot({ path: `${shots}/objectives-list.png` });
  await page.locator('.hud-control-tips').screenshot({ path: `${shots}/control-tips.png` });

  await page.keyboard.press('t');
  await expect(page.locator('.hud-sim-speed')).toHaveText('2× SIM SPEED');
  const stack = await page.evaluate(() => {
    const objective = document.querySelector('.objectives-panel')!.getBoundingClientRect();
    const telemetry = document.querySelector('.hud-readouts')!.getBoundingClientRect();
    const badge = document.querySelector('.hud-sim-speed')!.getBoundingClientRect();
    return {
      objectiveBottom: objective.bottom,
      telemetryTop: telemetry.top,
      badgeTop: badge.top,
      badgeBottom: badge.bottom,
      telemetryBottom: telemetry.bottom,
    };
  });
  expect(stack.telemetryTop).toBeGreaterThanOrEqual(stack.objectiveBottom);
  expect(stack.badgeTop).toBeGreaterThanOrEqual(stack.telemetryTop);
  expect(stack.badgeBottom).toBeLessThanOrEqual(stack.telemetryBottom);
  await page.screenshot({ path: `${shots}/hud-1280.png` });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await page.screenshot({ path: `${shots}/hud-1920.png` });

  await page.evaluate(() =>
    (window.__game as { save: { save(value: { controlTips: boolean }): void } }).save.save({
      controlTips: false,
    }),
  );
  await expect(page.locator('.hud-control-tips')).toBeHidden();
  await page.evaluate(() => {
    const g = window.__game as {
      save: { save(value: { controlTips: boolean }): void };
      input: { rebind(action: 'thrustForward', keys: string[]): boolean };
    };
    g.input.rebind('thrustForward', ['KeyI']);
    g.save.save({ controlTips: true });
  });
  await expect(page.locator('.hud-control-tips')).toContainText('I/S speed');
});

test('six-objective missions show the current target and the next few', async ({ page }) => {
  await page.goto('/?mission=lost-city&skipBriefing=1');
  await page.waitForFunction(() => window.__gameReady === true);
  await expect(page.locator('.obj-item')).toHaveCount(4);
  await expect(page.locator('.obj-item.is-current')).toHaveCount(1);
  await expect(page.locator('.obj-more')).toHaveText('+2 more · Esc for all');
});
