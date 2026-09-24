// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const shots = '.cache/codex/shots/d2-hazard';

test('live hull warning styles show vignette, gauge, and both near the rating', async ({
  page,
}) => {
  await mkdir(shots, { recursive: true });
  await page.goto('/?mission=challenger-deep&skipBriefing=1');
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game as { sub: { position: { y: number } } }).sub.position.y < -10000,
  );
  await page.evaluate(async () => {
    const game = window.__game as {
      discovery: {
        ready: Promise<void>;
        pois: Array<{ id: string; position: { x: number; z: number } }>;
      };
      terrain: { sampleHeight(x: number, z: number): number };
      sub: {
        position: { x: number; y: number; z: number };
        yaw: number;
        pitch: number;
        reset(x: number, y: number, z: number, yaw: number): void;
      };
      rig: {
        snap(position: { x: number; y: number; z: number }, yaw: number, pitch: number): void;
      };
    };
    await game.discovery.ready;
    const target = game.discovery.pois.find((poi) => poi.id === 'cd-leggo-amphipod-site')!;
    const { x, z } = target.position;
    game.sub.reset(x, game.terrain.sampleHeight(x, z) + 28, z, game.sub.yaw);
    game.rig.snap(game.sub.position, game.sub.yaw, game.sub.pitch);
  });
  const gauge = page.locator('.hull-gauge');
  const vignette = page.locator('.hull-vignette');
  await expect(gauge).toContainText('11,000 m rated');
  await expect(vignette).toBeHidden();
  await expect(page.locator('.hud-warning')).toBeHidden();
  await page.screenshot({ path: `${shots}/challenger-floor.png` });

  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  const warningChoice = page.getByRole('dialog', { name: 'Settings' }).getByLabel('Hull warning');
  await expect(warningChoice).toHaveValue('both');
  await warningChoice.selectOption('vignette');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    const game = window.__game as {
      sub: { getState(): Record<string, unknown> };
    };
    const original = game.sub.getState.bind(game.sub);
    game.sub.getState = () => ({
      ...original(),
      depth: -11500,
      ratedRatio: 11500 / 11000,
      crushWarning: true,
      hullStress: 0,
    });
  });
  await expect(page.locator('.hud-warning')).toContainText('HULL RATING EXCEEDED');
  for (const style of ['vignette', 'gauge', 'both'] as const) {
    await page.evaluate((next) => {
      const save = (window.__game as { save: { save(v: object): void } }).save;
      save.save({ hullWarningStyle: next });
    }, style);
    if (style === 'vignette') await expect(gauge).toBeHidden();
    else await expect(gauge).toBeVisible();
    if (style === 'gauge') await expect(vignette).toBeHidden();
    else await expect(vignette).toBeVisible();
    await page.screenshot({ path: `${shots}/${style}.png` });
  }
});

test('current indicator and snow advect with the measured field', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await page.goto('/?tile=blake-plateau-corals');
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game as { currents: { status: string } }).currents.status === 'ready',
  );
  await page.evaluate(() => {
    (
      window.__game as { save: { setGameplayOption(k: string, v: string): void } }
    ).save.setGameplayOption('currents', 'realistic');
  });
  await expect(page.locator('.hud-current')).toContainText('kn');
  await expect(page.locator('.hud-current')).toContainText('m/s');
  const sample = async () =>
    page.evaluate(() => {
      const game = window.__game as {
        scene: {
          getObjectByName(n: string): {
            material: { uniforms: { uFlow: { value: { x: number; y: number } } } };
          };
        };
        presets: { current: { x: number; z: number } };
      };
      const flow = game.scene.getObjectByName('marineSnow').material.uniforms.uFlow.value;
      return { x: flow.x, z: flow.y, cx: game.presets.current.x, cz: game.presets.current.z };
    });
  const before = await sample();
  await page.waitForTimeout(1200);
  const after = await sample();
  expect((after.x - before.x) * after.cx + (after.z - before.z) * after.cz).toBeGreaterThan(0);
  await page.screenshot({ path: `${shots}/currents-on.png` });
});
