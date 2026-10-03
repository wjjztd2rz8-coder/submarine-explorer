import { scanWithKeyboard, advanceScan } from './helpers/scan.js';
import { expect, test, type Page } from './helpers/unlocked.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

const shots = '.cache/codex/shots/d-scan';
const scanUrl = '/?tile=titanic&landmark=_test&poi=test-bow';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => {
      const g = window.__game as { discovery?: { loaded: boolean; spawnedAt: string | null } };
      return (
        g.discovery?.loaded &&
        (!new URLSearchParams(location.search).has('poi') || g.discovery.spawnedAt)
      );
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function screenshot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}

test('scanned contacts stay marked and cannot be rescanned until a new dive', async ({ page }) => {
  await boot(page, scanUrl);
  await expect(page.locator('.scan-panel .scan-hint')).toHaveText(/HOLD G TO SCAN/);
  await scanWithKeyboard(page, 'test-bow');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window.__game as {
            sonar: {
              markers: Array<{ poiId: string; icon: string; scanned: boolean; visible: boolean }>;
            };
          }
        ).sonar.markers.find((m) => m.poiId === 'test-bow'),
      ),
    )
    .toMatchObject({ icon: '✓', scanned: true, visible: true });
  await expect(page.locator('.d-scan-world-marker[data-poi="test-bow"]')).toHaveClass(/is-scanned/);
  await screenshot(page, 'scanned-marker');
  await screenshot(page, 'scanned');
  await page.waitForFunction(
    () =>
      !(window.__game as { discovery: { overlay: { bannerActive: boolean } } }).discovery.overlay
        .bannerActive,
  );
  await expect(page.locator('.scan-panel .scan-hint')).toHaveText('Logged · Journal');
  await screenshot(page, 'already-logged-prompt');
  await page.keyboard.down('g');
  await advanceScan(page, 3.6);
  await page.keyboard.up('g');
  expect(
    await page.evaluate(() => {
      const g = window.__game as {
        scanner: { view: { completed: number }; isScanned(l: string, p: string): boolean };
        discoveries: { get(l: string, p: string): { count: number } | null };
      };
      return [
        g.scanner.view.completed,
        g.discoveries.get('_test', 'test-bow')?.count,
        g.scanner.isScanned('_test', 'test-bow'),
      ];
    }),
  ).toEqual([1, 1, true]);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () =>
      (window.__game as { discovery?: { spawnedAt: string | null } }).discovery?.spawnedAt ===
      'test-bow',
  );
  await expect(page.locator('.scan-panel .scan-hint')).toHaveText(/HOLD G TO SCAN/);
  await scanWithKeyboard(page, 'test-bow');
  expect(
    await page.evaluate(() => {
      const g = window.__game as {
        scanner: { view: { lastCompleteFirstTime: boolean } };
        discoveries: { get(l: string, p: string): { count: number } | null };
      };
      return [g.scanner.view.lastCompleteFirstTime, g.discoveries.get('_test', 'test-bow')?.count];
    }),
  ).toEqual([false, 2]);
});

test('visual hints show an objective waypoint and obey the saved toggle', async ({ page }) => {
  await boot(page, '/?mission=titanic&skipBriefing=1&poi=titanic-bow');
  await expect(page.locator('.d-scan-objective-hint')).toContainText('bow');
  await expect(page.locator('.d-scan-edge')).toBeVisible();
  await expect(page.locator('.d-scan-edge')).toContainText(/m · [↑↓]\d+ m/);
  await screenshot(page, 'waypoint-onscreen');
  await screenshot(page, 'waypoint');
  await page.evaluate(() => {
    const g = window.__game as {
      sub: {
        position: { x: number; y: number; z: number };
        reset(x: number, y: number, z: number, yaw: number): void;
      };
      rig: { snap(p: { x: number; y: number; z: number }, yaw: number, pitch: number): void };
    };
    const p = g.sub.position;
    g.sub.reset(p.x, p.y, p.z, Math.PI);
    g.rig.snap(g.sub.position, Math.PI, 0);
  });
  await expect(page.locator('.d-scan-edge')).not.toHaveClass(/is-onscreen/);
  await screenshot(page, 'waypoint-offscreen-arrow');
  await page.evaluate(() => {
    const g = window.__game as { save: { setGameplayOption(k: 'visualHints', v: boolean): void } };
    g.save.setGameplayOption('visualHints', false);
  });
  await expect(page.locator('.d-scan-waypoints')).toHaveAttribute('data-hints', 'false');
  await expect(page.locator('.d-scan-edge')).toBeHidden();
  await expect(page.locator('.d-scan-objective-hint')).toContainText('bow');
  await screenshot(page, 'hints-off');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await expect(page.locator('.d-scan-waypoints')).toHaveAttribute('data-hints', 'false');
  await expect(page.locator('.d-scan-objective-hint')).toContainText('bow');
});
