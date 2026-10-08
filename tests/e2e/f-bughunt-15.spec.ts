import { expect, test, type Page } from '@playwright/test';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { HintEngine } from '../../src/game/Hints.js';
import type { Save } from '../../src/core/Save.js';

const heroes = [
  { site: 'titanic', poi: 'titanic-bow' },
  { site: 'lost-city', poi: 'lost-city-poseidon' },
  { site: 'great-blue-hole', poi: 'great-blue-hole-outer-dropoff' },
  { site: 'beebe-vent-field', poi: 'bvf-main-vents' },
  { site: 'monterey-canyon', poi: 'monterey-canyon-head' },
];
const hud = [
  '.sonar',
  '.objectives-panel',
  '.hud-readouts',
  '.hud-attribution',
  '.tc-stick',
  '.tc-slider',
  '.tc-buttons',
  '.tc-btn-pause',
];

// Sample all rectangles in one frame, then poll for the ResizeObserver and
// entrance animation to settle. Fail with the actual rectangles for diagnosis.
async function separate(page: Page, selectors: string[]): Promise<void> {
  for (const selector of selectors) await expect(page.locator(selector)).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate((selectors) => {
        const boxes = selectors.map((selector) => ({
          selector,
          box: document.querySelector(selector)!.getBoundingClientRect().toJSON() as DOMRect,
        }));
        const issues: string[] = [];
        for (const { selector, box } of boxes) {
          if (box.x < 0 || box.y < 0 || box.right > innerWidth || box.bottom > innerHeight)
            issues.push(`${selector} offscreen: ${JSON.stringify(box)}`);
        }
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i];
          for (const b of boxes.slice(i + 1)) {
            if (
              a.box.left < b.box.right &&
              b.box.left < a.box.right &&
              a.box.top < b.box.bottom &&
              b.box.top < a.box.bottom
            )
              issues.push(
                `${a.selector} overlaps ${b.selector}: ${JSON.stringify([a.box, b.box])}`,
              );
          }
        }
        return issues;
      }, selectors),
    )
    .toEqual([]);
}

for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test.describe(`hero touch HUD ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });

    // Rotate the default UI across heroes; Beebe's long objectives exercise
    // every touch breakpoint at both scales. Other HUD specs cover the full
    // viewport matrix without repeating the complete tutorial at every site.
    for (const hero of heroes.filter(
      (hero, index) =>
        hero.site === 'beebe-vent-field' ||
        index % 3 === (viewport.width === 360 ? 0 : viewport.width === 390 ? 1 : 2),
    )) {
      for (const uiScale of hero.site === 'beebe-vent-field' ? [100, 150] : [100]) {
        test(`${hero.site} ${uiScale}%: tutorial, contact and controls stay separate`, async ({
          page,
        }, testInfo) => {
          await page.addInitScript((uiScale) => {
            // Unlock sites, but leave tutorial and hint history fresh.
            localStorage.setItem(
              'subexplorer.progress.v1',
              JSON.stringify({
                version: 1,
                points: 0,
                lifetime: 900,
                awarded: [],
                upgrades: {},
                ratings: {},
              }),
            );
            localStorage.setItem(
              'subexplorer.settings.v2',
              JSON.stringify({ version: 2, uiScale, reduceMotion: true, graphicsTier: 'low' }),
            );
          }, uiScale);
          await page.goto(`/?mission=${hero.site}&skipBriefing=1&touch=1&tier=low`);
          await page.waitForFunction(() => window.__gameReady === true, undefined, {
            timeout: 45_000,
          });
          await page.waitForFunction(
            () => (window.__game as { discovery: Discovery }).discovery.loaded,
          );
          expect(
            await page.evaluate(() => (window.__game as { save: Save }).save.get().gameplayMode),
          ).toBe('arcade');
          expect(
            await page.evaluate(() => (window.__game as { save: Save }).save.get().uiScale),
          ).toBe(uiScale);
          const fresh = [...hud, '.onboard-card'];
          if (await page.locator('.scan-panel').isVisible()) fresh.push('.scan-panel');
          await separate(page, fresh);
          await expect(page.locator('.hud-attribution summary')).toContainText('GMRT');
          expect((await page.locator('.hud-attribution').boundingBox())!.height).toBeLessThan(48);
          await page.screenshot({ path: testInfo.outputPath('arcade-opening.png') });

          // Exercise the real in-range scanner even for openings farther from
          // their target. Use the same safe pose as ?poi= without reloading.
          await page.evaluate((poi) => {
            const game = window.__game as {
              discovery: Discovery;
              sub: Submarine;
              rig: CameraRig;
            };
            const pose = game.discovery.spawnPose(poi);
            if (!pose) throw new Error(`Missing hero POI ${poi}`);
            game.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
            game.rig.snap(game.sub.position, game.sub.yaw, game.sub.pitch);
          }, hero.poi);
          await expect(page.locator('.scan-panel')).toBeVisible();
          await page.waitForFunction(
            () => (window.__game as { discovery: Discovery }).discovery.scanner.view.nearestInRange,
          );
          await expect(page.locator('.hud-control-tips')).toBeHidden();
          await expect(page.locator('.hud-prompt')).toBeHidden();
          if (viewport.width < viewport.height)
            await expect(page.locator('.tc-rotate-hint')).toBeHidden();
          for (const step of ['move', 'depth', 'lights', 'scan', 'journal']) {
            await expect(page.locator('.onboard-card')).toHaveAttribute('data-step', step);
            await separate(page, [...hud, '.onboard-card', '.scan-panel']);
            if (step !== 'journal') await page.locator('.onboard-skip-step').tap();
          }
          await page.screenshot({ path: testInfo.outputPath('contact-and-tutorial.png') });
          await page.getByRole('button', { name: 'Skip', exact: true }).tap();
          await expect(page.locator('.onboard-card')).toBeHidden();
          await expect(page.locator('.scan-panel')).toBeVisible();
          await expect(page.locator('.scan-hint')).toHaveCount(1);
          await expect(page.locator('.hud-prompt')).toBeHidden();
          await expect(
            page.getByText('Something to scan is in range', { exact: false }),
          ).toBeHidden();
          await expect(page.locator('.onboard-hint')).not.toContainText(
            /Something to scan is in range|Face the target\. Hold .* to scan\./,
          );
          expect(
            await page.evaluate(() =>
              (window.__game as { onboard: { hints: HintEngine } }).onboard.hints.hasSeen(
                'scan-target',
              ),
            ),
          ).toBe(false);
          const after = [...hud, '.scan-panel'];
          // Other contextual hints are legitimate; check their layout too.
          if (await page.locator('.onboard-hint').isVisible()) after.push('.onboard-hint');
          await separate(page, after);
        });
      }
    }
  });
}
