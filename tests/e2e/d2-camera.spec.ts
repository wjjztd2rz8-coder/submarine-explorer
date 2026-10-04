// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/d2-camera';
const feelShots = '.cache/codex/shots/d3-feel';

async function dive(page: Page, site: string): Promise<void> {
  await page.goto(`/?mission=${site}&skipBriefing=1`);
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
  );
  await expect(page.locator('.briefing')).toBeHidden();
}

async function camera(page: Page): Promise<{ free: boolean; radius: number; mode: string }> {
  return page.evaluate(() => {
    const rig = (window.__game as { rig: { freeLook: boolean; chaseRadius: number; mode: string } })
      .rig;
    return { free: rig.freeLook, radius: rig.chaseRadius, mode: rig.mode };
  });
}

test('chase framing, dive-start tips, free look and reset controls', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await dive(page, 'titanic');
  await expect(page.locator('.hud-control-tips')).toContainText(
    'Drag: look · Wheel: zoom · X: reset camera',
  );
  await page.screenshot({ path: `${shots}/tips-row.png` });
  const radius = (await camera(page)).radius;
  expect(radius).toBeGreaterThan(95);
  const canvas = page.locator('#viewport');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await camera(page)).free).toBe(true);
  await expect(page.locator('.hud-control-tips')).toBeHidden();
  await page.screenshot({ path: `${shots}/titanic-free-look.png` });
  await mkdir(feelShots, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${feelShots}/free-look-angle-one.png` });
  await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2 - 55, {
    steps: 5,
  });
  await page.mouse.up();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${feelShots}/free-look-angle-two.png` });
  await page.keyboard.press('x');
  await expect.poll(async () => (await camera(page)).free).toBe(false);
  await page.screenshot({ path: `${shots}/titanic-chase.png` });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2);
  await page.mouse.up();
  await expect.poll(async () => (await camera(page)).free).toBe(true);
  await page.locator('.hud-reset-camera').click();
  await expect.poll(async () => (await camera(page)).free).toBe(false);
  const resetBox = (await page.locator('.hud-reset-camera').boundingBox())!;
  const attributionBox = (await page.locator('.hud-attribution').boundingBox())!;
  expect(resetBox.x + resetBox.width).toBeLessThan(attributionBox.x);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2);
  await page.mouse.up();
  await expect.poll(async () => (await camera(page)).free).toBe(true);
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(async () => (await camera(page)).free).toBe(false);
  await page.keyboard.press('q');
  await expect.poll(async () => (await camera(page)).mode).toBe('first-person');
  await page.keyboard.press('q');
  await expect.poll(async () => (await camera(page)).mode).toBe('chase');
  await dive(page, 'lost-city');
  await page.screenshot({ path: `${shots}/lost-city-chase.png` });
});

test('pointer look preference survives menus; lock loss pauses and Esc resume shows hint', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let locked: Element | null = null;
    let requests = 0;
    let rejectNext = false;
    Object.defineProperty(document, 'pointerLockElement', {
      configurable: true,
      get: () => locked,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'requestPointerLock', {
      configurable: true,
      value: function (this: HTMLCanvasElement) {
        requests++;
        if (rejectNext) {
          rejectNext = false;
          return Promise.reject(new Error('Pointer lock denied'));
        }
        locked = this;
        document.dispatchEvent(new Event('pointerlockchange'));
        return Promise.resolve();
      },
    });
    Object.defineProperty(document, 'exitPointerLock', {
      configurable: true,
      value: () => {
        locked = null;
        document.dispatchEvent(new Event('pointerlockchange'));
      },
    });
    (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests = () => requests;
    (window as unknown as { cameraRejectNextLock: () => void }).cameraRejectNextLock = () => {
      rejectNext = true;
    };
  });
  await dive(page, 'titanic');
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings').getByRole('button', { name: 'Controls' }).click();
  await page.locator('.settings-pointer-lock').click();
  await expect(page.locator('.settings')).toBeVisible();
  await expect(page.locator('.settings-pointer-lock')).toHaveText('Disable pointer look');
  await page.locator('.settings-close').click();
  await expect(page.locator('.settings')).toBeHidden();
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  await page.locator('.pause-menu').getByRole('button', { name: 'Resume' }).click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests(),
    ),
  ).toBe(1);
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('.settings')).toBeVisible();
  const tips = page.locator('.settings').getByLabel('Control tips');
  await tips.uncheck();
  await page.locator('.settings-close').click();
  await expect(page.locator('.settings')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeHidden();
  await expect(page.locator('.d3-pointer-look-hint')).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests(),
    ),
  ).toBe(1);
  await page.locator('#viewport').click({ position: { x: 300, y: 300 } });
  await expect(page.locator('.d3-pointer-look-hint')).toBeHidden();
  expect(
    await page.evaluate(() =>
      (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests(),
    ),
  ).toBe(2);
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { cameraRejectNextLock: () => void }).cameraRejectNextLock(),
  );
  await page.locator('.pause-menu').getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.d3-pointer-look-hint')).toBeVisible();
  await page.locator('#viewport').click({ position: { x: 300, y: 300 } });
  await expect(page.locator('.d3-pointer-look-hint')).toBeHidden();
  expect(
    await page.evaluate(() =>
      (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests(),
    ),
  ).toBe(4);
});
