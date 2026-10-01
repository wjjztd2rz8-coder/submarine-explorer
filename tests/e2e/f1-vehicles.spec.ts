// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/f1-vehicles';
const url = '/?tile=titanic&landmark=_test&poi=test-bow';

type G = {
  rig: {
    setMode(m: string): string;
    mode: string;
    orbitRadius: number;
    orbitAzimuth: number;
    orbitElevation: number;
    chaseRadius: number;
  };
  sub: { setHullClass(c: string): boolean; position: { y: number } };
  subMesh: { hullClass: string };
};

test('hull classes, ROV with tether and cockpit view render', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      window.__gameReady &&
      (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt ===
        'test-bow',
  );
  const frames = (n: number) =>
    page.evaluate(
      (k) =>
        new Promise<void>((resolve) => {
          let i = 0;
          const step = () => (++i >= k ? resolve() : requestAnimationFrame(step));
          requestAnimationFrame(step);
        }),
      n,
    );

  // Shallow water: the fixture sits at ~3.8 km, past the crush depth of class A.
  await page.evaluate(() => {
    (window.__game as unknown as G).sub.position.y = -140;
  });
  for (const cls of ['A', 'B', 'C']) {
    await page.evaluate((c) => (window.__game as unknown as G).sub.setHullClass(c), cls);
    await page.evaluate(() => (window.__game as unknown as G).rig.setMode('chase'));
    await frames(20);
    expect(await page.evaluate(() => (window.__game as unknown as G).subMesh.hullClass)).toBe(cls);
    await page.screenshot({ path: `${shots}/hull-${cls}-chase.png` });
    await page.evaluate(() => {
      const rig = (window.__game as unknown as G).rig;
      rig.orbitRadius = 48;
      rig.orbitAzimuth = 0.9;
      rig.orbitElevation = 0.2;
      rig.setMode('orbit');
    });
    await frames(20);
    await page.screenshot({ path: `${shots}/hull-${cls}-orbit.png` });
    await page.evaluate(() => (window.__game as unknown as G).rig.setMode('first-person'));
    await frames(20);
    await page.screenshot({ path: `${shots}/cockpit-${cls}.png` });
  }

  await page.evaluate(() => (window.__game as unknown as G).rig.setMode('chase'));
  await page.evaluate(() => {
    (window.__game as unknown as G).rig.chaseRadius = 30;
  });
  await page.keyboard.press('e');
  await expect(page.locator('.hud-rov')).toBeVisible();
  await frames(90);
  await page.screenshot({ path: `${shots}/rov-tether.png` });
});
