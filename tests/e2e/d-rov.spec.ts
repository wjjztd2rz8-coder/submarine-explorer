// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/d-rov';
const url = '/?tile=titanic&landmark=_test&poi=test-bow';

/** Sample the final, post-processed screenshot for clipping and useful scene light. */
async function exposure(
  page: Page,
  path: string,
): Promise<{ nearWhite: number; centreMean: number }> {
  const png = await page.screenshot({ path });
  return page.evaluate(
    async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let nearWhite = 0;
      let centreTotal = 0;
      let centrePixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i]! > 245 && pixels[i + 1]! > 245 && pixels[i + 2]! > 245) nearWhite++;
        const pixel = i / 4;
        const x = pixel % canvas.width;
        const y = Math.floor(pixel / canvas.width);
        if (
          x >= canvas.width * 0.3 &&
          x < canvas.width * 0.7 &&
          y >= canvas.height * 0.3 &&
          y < canvas.height * 0.7
        ) {
          centreTotal += pixels[i]! * 0.2126 + pixels[i + 1]! * 0.7152 + pixels[i + 2]! * 0.0722;
          centrePixels++;
        }
      }
      return { nearWhite: nearWhite / (pixels.length / 4), centreMean: centreTotal / centrePixels };
    },
    `data:image/png;base64,${png.toString('base64')}`,
  );
}

test('deploy, scan through the shared discovery path, and retrieve', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      window.__gameReady &&
      (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt ===
        'test-bow',
  );
  await page.keyboard.press('e');
  await expect(page.locator('.hud-rov')).toBeVisible();
  await expect(page.locator('.hud-rov')).toContainText('ROV');
  expect(
    await page.evaluate(() => {
      const g = window.__game as {
        rig: { camera: { position: { distanceTo(other: unknown): number } } };
        sub: { position: unknown };
        config: { rov: { mothershipCameraClearanceM: number } };
      };
      return (
        g.rig.camera.position.distanceTo(g.sub.position) - g.config.rov.mothershipCameraClearanceM
      );
    }),
  ).toBeGreaterThanOrEqual(-0.01);
  const rovOnScreen = await page.evaluate(() => {
    const g = window.__game as {
      rov: {
        position: { clone(): { project(camera: unknown): { x: number; y: number; z: number } } };
      };
      rig: { camera: unknown };
    };
    const p = g.rov.position.clone().project(g.rig.camera);
    return { x: p.x, y: p.y, z: p.z };
  });
  expect(Math.abs(rovOnScreen.x)).toBeLessThan(1);
  expect(rovOnScreen.y).toBeLessThan(1 / 3);
  expect(rovOnScreen.y).toBeGreaterThan(-1);
  expect(Math.abs(rovOnScreen.z)).toBeLessThan(1);
  const deployedExposure = await exposure(page, `${shots}/deployed.png`);
  expect(deployedExposure.nearWhite).toBeLessThan(0.05);
  expect(deployedExposure.centreMean).toBeGreaterThan(35);
  await page.keyboard.down('g');
  await page.waitForFunction(
    () =>
      (window.__game as { scanner: { view: { completed: number } } }).scanner.view.completed === 1,
    undefined,
    { timeout: 15000 },
  );
  await page.keyboard.up('g');
  expect(
    await page.evaluate(
      () =>
        (
          window.__game as { discoveries: { get(l: string, p: string): { count: number } | null } }
        ).discoveries.get('_test', 'test-bow')?.count,
    ),
  ).toBe(1);
  expect((await exposure(page, `${shots}/rov-scan.png`)).nearWhite).toBeLessThan(0.05);
  await page.keyboard.press('e');
  await expect
    .poll(() => page.evaluate(() => (window.__game as { rov: { deployed: boolean } }).rov.deployed))
    .toBe(false);
  await expect(page.locator('.hud-rov')).toBeHidden();
});

test('tether limit and pause return control safely; controls show E', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await page.goto('/?tile=titanic');
  await page.waitForFunction(() => window.__gameReady);
  // Use an open-water anchor so the world-edge or terrain clamp cannot shorten
  // the intended 150 m tether setup.
  await page.evaluate(() => {
    const g = window.__game as {
      sub: { reset(x: number, y: number, z: number, yaw: number): void };
      terrain: { sampleHeight(x: number, z: number): number };
    };
    const floor = Math.max(g.terrain.sampleHeight(0, 0), g.terrain.sampleHeight(0, -150));
    g.sub.reset(0, floor + 100, 0, 0);
  });
  await page.keyboard.press('e');
  await expect
    .poll(() => page.evaluate(() => (window.__game as { rov: { deployed: boolean } }).rov.deployed))
    .toBe(true);
  await page.evaluate(() => {
    const g = window.__game as {
      rov: { position: { set(x: number, y: number, z: number): void } };
      sub: { position: { x: number; y: number; z: number } };
    };
    g.rov.position.set(g.sub.position.x, g.sub.position.y, g.sub.position.z - 149.6);
  });
  expect(
    await page.evaluate(() => {
      const g = window.__game as {
        rov: { position: { distanceTo(p: unknown): number } };
        sub: { position: unknown };
      };
      return g.rov.position.distanceTo(g.sub.position);
    }),
  ).toBeGreaterThan(149);
  await page.keyboard.down('w');
  await expect(page.locator('.hud-rov')).toContainText('TETHER LIMIT');
  await page.keyboard.up('w');
  await page.screenshot({ path: `${shots}/tether-limit.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('.hud-rov')).toBeHidden();
  expect(
    await page.evaluate(() => (window.__game as { rov: { deployed: boolean } }).rov.deployed),
  ).toBe(false);
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings').getByRole('button', { name: 'Controls' }).click();
  await expect(page.locator('[data-action="toggleRov"]')).toContainText('E');
  await page.screenshot({ path: `${shots}/controls-with-rov.png` });
});
