// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';
import { waitForFrames } from './helpers/frames.js';
import { GUIDANCE } from './helpers/guidance.js';

const shots = '.cache/codex/shots/d-input-hud';
const diveUrl = '/?tile=titanic&landmark=_test&poi=test-bow';

async function ready(page: Page, url = diveUrl): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
  );
}

test('held keys and queued toggles are discarded across focus loss and pause/resume', async ({
  page,
}) => {
  // Guards unintended thrust and delayed camera toggles after an interruption.
  await ready(page, '/?tile=great-blue-hole&tier=low');
  const throttle = () =>
    page.evaluate(
      () => (window.__game as { input: { state: { throttle: number } } }).input.state.throttle,
    );
  await page.keyboard.down('w');
  await expect.poll(throttle).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeHidden();
  await expect.poll(throttle).toBe(0);
  await page.keyboard.up('w');
  await page.keyboard.down('w');
  await expect.poll(throttle).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(throttle).toBe(0);
  await page.keyboard.up('w');
  const mode = await page.evaluate(() => {
    const game = window.__game as {
      input: { injectKey(code: string, down: boolean): void };
      rig: { mode: string };
    };
    game.input.injectKey('KeyQ', true);
    window.dispatchEvent(new Event('blur'));
    return game.rig.mode;
  });
  await waitForFrames(page, 3);
  await expect
    .poll(() => page.evaluate(() => (window.__game as { rig: { mode: string } }).rig.mode))
    .toBe(mode);
});

test('readable contextual HUD, controls and UI scale survive reload', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await ready(page);
  await expect(page.locator('.hud-help')).toHaveCount(0);
  await expect(page.locator('body > .mission-select')).toBeHidden();
  await expect(page.locator(`${GUIDANCE.scan} ${GUIDANCE.detail}`)).toContainText('HOLD G TO SCAN');
  await page.screenshot({ path: `${shots}/hud-1280.png` });
  await page.screenshot({ path: `${shots}/dive.png` });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const fontSize = await page
    .locator('.hud-value[data-field="depth"]')
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(14);
  await page.screenshot({ path: `${shots}/hud-1920.png` });

  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  const settings = page.locator('.settings');
  await expect(settings.getByLabel('Legacy default sim speed')).toHaveCount(0);
  await settings.getByRole('button', { name: 'Controls' }).click();
  await expect(page.getByRole('dialog', { name: 'Controls' })).toBeVisible();
  await expect(settings.locator('[data-action="scan"]')).toHaveText('G');
  await expect(settings.locator('[data-action="ballastFlood"]')).toContainText('Ctrl');
  await expect(settings.locator('[data-action="ping"]')).toHaveCount(0);
  await expect(settings.locator('[data-action="togglePhotoMode"]')).toHaveText('P');
  await expect(settings.locator('[data-action="capturePhoto"]')).toHaveText('Enter');
  await page.screenshot({ path: `${shots}/controls.png` });
  await settings.getByRole('button', { name: 'Back to Settings' }).click();
  await settings.getByLabel('UI scale', { exact: true }).focus();
  await page.keyboard.press('End'); // the slider's maximum, 150%
  await expect(settings.locator('.settings-scale-value')).toHaveText('150%');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForFunction(() => window.__gameReady === true);
  expect(
    await page.evaluate(
      () => (window.__game as { save: { get(): { uiScale: number } } }).save.get().uiScale,
    ),
  ).toBe(150);
  await expect(page.locator(`${GUIDANCE.scan} ${GUIDANCE.detail}`)).toContainText('HOLD G TO SCAN');
  await page.screenshot({ path: `${shots}/scaled-150.png` });
  await page.keyboard.press('t');
  await expect(page.locator('.hud-sim-speed')).toHaveText('2× SIM SPEED');
});

test('Ctrl tip is once-only and C still descends if keyboard lock fails', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await page.addInitScript(() => {
    (window as unknown as { __lockCalls: number }).__lockCalls = 0;
    Object.defineProperty(navigator, 'keyboard', {
      configurable: true,
      value: {
        lock: async () => {
          (window as unknown as { __lockCalls: number }).__lockCalls++;
          throw new Error('lock denied');
        },
        unlock: () => {},
      },
    });
  });
  await ready(page, '/?tile=titanic');
  await page.evaluate(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.querySelector('#viewport'),
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __lockCalls: number }).__lockCalls))
    .toBe(1);
  await page.keyboard.down('Control');
  await expect(page.locator('.hud-ctrl-tip')).toContainText('Ctrl+W may close this tab');
  await page.screenshot({ path: `${shots}/ctrl-tip.png` });
  await page.keyboard.up('Control');
  await page.locator('.hud-ctrl-tip button', { hasText: 'Dismiss' }).click();
  const before = await page.evaluate(
    () => (window.__game as { sub: { position: { y: number } } }).sub.position.y,
  );
  await page.keyboard.down('c');
  await page.waitForTimeout(1200);
  await page.keyboard.up('c');
  const after = await page.evaluate(
    () => (window.__game as { sub: { position: { y: number } } }).sub.position.y,
  );
  expect(after).toBeLessThan(before);
  await page.reload();
  await page.waitForFunction(() => window.__gameReady === true);
  await page.keyboard.press('Control');
  await expect(page.locator('.hud-ctrl-tip')).toBeHidden();
});

test('canvas drag orbits chase camera and wheel zooms without pointer lock', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await ready(page, '/?tile=titanic');
  await page.screenshot({ path: `${shots}/chase-camera.png` });
  const canvas = page.locator('#viewport');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const camera = () =>
    page.evaluate(() => {
      const rig = (
        window.__game as {
          rig: { camera: { position: { x: number; y: number; z: number } }; chaseRadius: number };
        }
      ).rig;
      return {
        x: rig.camera.position.x,
        y: rig.camera.position.y,
        z: rig.camera.position.z,
        radius: rig.chaseRadius,
      };
    });
  const before = await camera();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 120, box!.y + box!.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const dragged = await camera();
  expect(
    Math.hypot(dragged.x - before.x, dragged.y - before.y, dragged.z - before.z),
  ).toBeGreaterThan(1);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(100);
  expect((await camera()).radius).toBeGreaterThan(before.radius);
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
});

test('v1 custom bindings migrate without taking new one-handed defaults', async ({ page }) => {
  await ready(page, '/?tile=titanic');
  await page.evaluate(() => {
    localStorage.removeItem('subexplorer.bindings.v3');
    localStorage.setItem(
      'subexplorer.bindings.v1',
      JSON.stringify({
        version: 1,
        keys: {
          thrustForward: ['KeyI'],
          toggleLights: [],
          scan: ['KeyG'],
          ballastFlood: ['ShiftLeft', 'ShiftRight'],
          toggleGuide: ['KeyH'],
        },
      }),
    );
  });
  await page.reload();
  await page.waitForFunction(() => window.__gameReady === true);
  const bindings = await page.evaluate(() => {
    const input = (
      window.__game as { input: { getAction(id: string): { keys: string[] } | undefined } }
    ).input;
    return {
      ahead: input.getAction('thrustForward')?.keys,
      toggleLights: input.getAction('toggleLights')?.keys,
      scan: input.getAction('scan')?.keys,
      descend: input.getAction('ballastFlood')?.keys,
      journal: input.getAction('toggleJournal')?.keys,
      saved: JSON.parse(localStorage.getItem('subexplorer.bindings.v3') ?? '{}').version,
    };
  });
  expect(bindings).toEqual({
    ahead: ['KeyI'],
    toggleLights: [],
    scan: ['KeyG'],
    descend: ['ControlLeft', 'ControlRight', 'KeyC'],
    journal: ['KeyH'],
    saved: 3,
  });
});
