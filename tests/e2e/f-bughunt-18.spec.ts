import { expect, test, type Page } from './helpers/unlocked.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { Props } from '../../src/world/Props.js';
import type { Save } from '../../src/core/Save.js';

interface Game {
  rig: CameraRig;
  sub: Submarine;
  terrain: Terrain;
  props: Props;
  save: Save;
}
const shots = '.cache/bughunt18/screenshots';
const defaultRadius = Math.hypot(38, 90);

async function ready(page: Page, query: string): Promise<void> {
  await page.goto(`/?${query}&tutorial=0&tier=low`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const g = window.__game as unknown as Game | undefined;
    return window.__gameReady === true && g?.props.loaded;
  });
}

function camera(page: Page) {
  return page.evaluate(() => {
    const { rig, sub, terrain } = window.__game as unknown as Game;
    return {
      radius: rig.chaseRadius,
      orbitRadius: rig.orbitRadius,
      mode: rig.mode,
      freeLook: rig.freeLook,
      position: sub.position.toArray(),
      offset: rig.camera.position.clone().sub(sub.position).toArray(),
      clearance:
        rig.camera.position.y - terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z),
    };
  });
}

async function drag(page: Page): Promise<void> {
  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width / 2, height * 0.42);
  await page.mouse.down();
  await page.mouse.move(width / 2 + 60, height * 0.42 + 15, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await camera(page)).freeLook).toBe(true);
}

async function presentedFrame(page: Page): Promise<void> {
  // UI handlers change mode immediately; the rig applies the pose on the next
  // game frame. Compare rendered views on both sides of photo mode.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

for (const size of [
  { width: 1600, height: 900 },
  { width: 844, height: 390 },
]) {
  for (const route of ['tile', 'mission']) {
    test(`Lost City ${route}: reset, wheel and photo at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await mkdir(shots, { recursive: true });
      await ready(page, `${route}=lost-city`);
      if (route === 'mission') {
        await page
          .locator('.briefing')
          .getByRole('button', { name: 'Begin dive', exact: true })
          .click();
        await expect(page.locator('.briefing')).toBeHidden();
      }
      await expect.poll(async () => (await camera(page)).radius).toBe(50);
      const prefix = `${shots}/${route}-${size.width}x${size.height}`;
      await page.screenshot({ path: `${prefix}-opening.png` });
      await page.mouse.move(size.width / 2, size.height * 0.42);
      await page.mouse.wheel(0, -100000);
      await expect.poll(async () => (await camera(page)).radius).toBe(35);
      await page.mouse.wheel(0, 100000);
      await expect.poll(async () => (await camera(page)).radius).toBe(180);
      await drag(page);
      await page.keyboard.press('x');
      await expect.poll(async () => (await camera(page)).radius).toBe(50);
      await expect.poll(async () => (await camera(page)).freeLook).toBe(false);
      await page.screenshot({ path: `${prefix}-reset.png` });
      expect((await camera(page)).clearance).toBeGreaterThanOrEqual(6 - 1e-6);
      await drag(page);
      await page.locator('.hud-reset-camera').click();
      await expect.poll(async () => (await camera(page)).freeLook).toBe(false);
      expect((await camera(page)).radius).toBe(50);
      await drag(page);
      await page.mouse.dblclick(size.width / 2, size.height * 0.42);
      await expect.poll(async () => (await camera(page)).freeLook).toBe(false);
      expect((await camera(page)).radius).toBe(50);

      await presentedFrame(page);
      const before = await camera(page);
      await page.keyboard.press('p');
      await expect(page.locator('.photo-mode')).toBeVisible();
      await expect.poll(async () => (await camera(page)).mode).toBe('orbit');
      const frozen = (await camera(page)).position;
      await page.screenshot({ path: `${prefix}-photo.png` });
      await page.mouse.dblclick(size.width / 2, size.height * 0.42);
      expect((await camera(page)).mode).toBe('orbit');
      await page.mouse.wheel(0, -100000);
      await expect.poll(async () => (await camera(page)).orbitRadius).toBe(6);
      await page.mouse.wheel(0, 100000);
      await expect.poll(async () => (await camera(page)).orbitRadius).toBe(220);
      expect((await camera(page)).position).toEqual(frozen);
      expect((await camera(page)).radius).toBe(50);
      await page.locator('.photo-mode-exit').click();
      await expect.poll(async () => (await camera(page)).mode).toBe('chase');
      await presentedFrame(page);
      const returned = await camera(page);
      for (let i = 0; i < 3; i++) expect(returned.offset[i]).toBeCloseTo(before.offset[i]!, 2);
      expect(returned.radius).toBe(50);
      await page.keyboard.press('q');
      await expect.poll(async () => (await camera(page)).mode).toBe('first-person');
      await page.keyboard.press('p');
      await expect.poll(async () => (await camera(page)).mode).toBe('orbit');
      await page.locator('.photo-mode-exit').click();
      await expect.poll(async () => (await camera(page)).mode).toBe('first-person');
      await page.keyboard.press('q');
      await expect.poll(async () => (await camera(page)).mode).toBe('chase');
      expect((await camera(page)).radius).toBe(50);
    });
  }
}

test('Lost City briefing mode changes and surface starts restore the appropriate reset distance', async ({
  page,
}) => {
  await ready(page, 'mission=lost-city');
  await expect.poll(async () => (await camera(page)).radius).toBe(50);
  const briefing = page.locator('.briefing');
  await briefing.getByRole('radio', { name: 'Realistic', exact: true }).check();
  await expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6);
  const preview = (await camera(page)).position;
  await briefing.getByRole('button', { name: 'Begin dive', exact: true }).click();
  await expect(briefing).toBeHidden();
  await page.keyboard.press('x');
  expect((await camera(page)).radius).toBeCloseTo(defaultRadius, 6);
  const started = (await camera(page)).position;
  for (let i = 0; i < 3; i++) expect(started[i]).toBeCloseTo(preview[i]!, 0);

  await page.evaluate(() => (window.__game as unknown as Game).save.setGameplayMode('arcade'));
  await ready(page, 'mission=lost-city');
  await expect.poll(async () => (await camera(page)).radius).toBe(50);
  await page
    .locator('.briefing')
    .getByRole('radio', { name: /^Surface/ })
    .check();
  await expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6);
  await page.locator('.briefing').getByRole('button', { name: 'Begin dive', exact: true }).click();
  await page.keyboard.press('x');
  await expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6);
});

for (const mode of ['realistic', 'custom'])
  for (const route of ['tile', 'mission']) {
    test(`Lost City ${mode} ${route} restores the legacy camera distance`, async ({ page }) => {
      await page.addInitScript(
        (gameplayMode) =>
          localStorage.setItem(
            'subexplorer.settings.v2',
            JSON.stringify({ version: 2, gameplayMode, graphicsTier: 'low' }),
          ),
        mode,
      );
      await ready(page, `${route}=lost-city&skipBriefing=1`);
      await page.keyboard.press('x');
      await expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6);
      if (route === 'tile') {
        const range = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          const hero = g.props.placed.find((p) => p.def.id === 'poseidon-tower')!;
          return Math.hypot(
            g.sub.position.x - hero.root.position.x,
            g.sub.position.z - hero.root.position.z,
          );
        });
        expect(range).toBeCloseTo(44, 0);
      }
    });
  }

test('new sites and explicit Lost City probes restore the global chase radius', async ({
  page,
}) => {
  await ready(page, 'tile=lost-city');
  await expect.poll(async () => (await camera(page)).radius).toBe(50);
  for (const query of [
    'tile=titanic',
    'mission=titanic&skipBriefing=1',
    'tile=beebe-vent-field',
    'tile=monterey-canyon',
    'tile=lost-city&depth=700',
    'mission=lost-city&poi=lost-city-poseidon&skipBriefing=1',
  ]) {
    await ready(page, query);
    // Beebe's authored nearer chase radius (Spawn.ts) may land after the keypress.
    const accepted = query.includes('beebe') ? [54, defaultRadius] : [defaultRadius];
    await expect
      .poll(async () => {
        await page.keyboard.press('x');
        const radius = (await camera(page)).radius;
        return accepted.some((value) => Math.abs(radius - value) < 1e-6);
      })
      .toBe(true);
  }
});
