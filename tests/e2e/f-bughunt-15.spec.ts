import { expect, test, type Page } from '@playwright/test';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { HintEngine } from '../../src/game/Hints.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import type { Save } from '../../src/core/Save.js';
import { setScanCardSuppressed } from './helpers/tutorial.js';
import { GUIDANCE } from './helpers/guidance.js';

const heroes = [
  { site: 'titanic', poi: 'titanic-bow' },
  { site: 'lost-city', poi: 'lost-city-poseidon' },
  { site: 'great-blue-hole', poi: 'great-blue-hole-stalactites' },
  { site: 'beebe-vent-field', poi: 'bvf-main-vents' },
  { site: 'monterey-canyon', poi: 'monterey-canyon-wall' },
];
const hud = [
  '.sonar',
  '.objectives-panel',
  '.hud-readouts',
  '.tc-stick',
  '.tc-slider',
  '.tc-buttons',
  '.tc-btn-pause',
];

// Sample visibility and all rectangles together, then poll for the ResizeObserver
// and entrance animation to settle. Serial visibility calls cost a software-GPU
// render apiece, repeated for every tutorial step, on hosted runners.
async function separate(page: Page, selectors: string[]): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate((selectors) => {
        const issues: string[] = [];
        const boxes = selectors.flatMap((selector) => {
          const elements = document.querySelectorAll(selector);
          // Retain the locator's strict single-element requirement as well.
          if (elements.length !== 1) {
            issues.push(`${selector} expected one element, found ${elements.length}`);
            return [];
          }
          const element = elements[0];
          const box = element.getBoundingClientRect().toJSON() as DOMRect;
          const visibility = getComputedStyle(element).visibility;
          // Match Playwright's visible check: a nonempty box and visibility
          // other than hidden/collapse. Opacity does not determine visibility.
          if (box.width <= 0 || box.height <= 0 || visibility !== 'visible')
            issues.push(`${selector} hidden: ${JSON.stringify(box)}, visibility=${visibility}`);
          return [{ selector, box }];
        });
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
        for (const phase of ['opening', 'tutorial steps', 'contextual hint']) {
          test(`${hero.site} ${uiScale}%: ${phase}, contact and controls stay separate`, async ({
            page,
          }, testInfo) => {
            await pauseClockBeforeNavigation(page);
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
                'subexplorer.settings.v3',
                JSON.stringify({ version: 2, uiScale, reduceMotion: true, graphicsTier: 'low' }),
              );
            }, uiScale);
            await page.goto(`/?mission=${hero.site}&skipBriefing=1&touch=1&tier=low`);
            await clockFramesUntil(page, () => {
              const game = window.__game as { discovery: Discovery; props: { loaded: boolean } };
              return window.__gameReady === true && game.discovery.loaded && game.props.loaded;
            });
            // Freeze the composed opening, and pause hint lifetime during layout reads.
            await page.evaluate(() => {
              (window.__game as { sub: Submarine }).sub.step = () => {};
            });
            await page.clock.runFor(34);
            expect(
              await page.evaluate(() => (window.__game as { save: Save }).save.get().gameplayMode),
            ).toBe('arcade');
            expect(
              await page.evaluate(() => (window.__game as { save: Save }).save.get().uiScale),
            ).toBe(uiScale);
            if (phase === 'opening') {
              // The tutorial card defers to the scan card, so only one of them is up.
              const scanUp = await page
                .locator('.guidance-slot:not([data-tone="dim"])')
                .isVisible();
              if (scanUp) await expect(page.locator('.guidance-slot[data-step]')).toBeHidden();
              const fresh = [...hud];
              if (await page.locator(GUIDANCE.any).isVisible()) fresh.push(GUIDANCE.any);
              await separate(page, fresh);
              await expect(page.locator('.hud-attribution')).toHaveCount(0);
              await page.screenshot({ path: testInfo.outputPath('arcade-opening.png') });
              return;
            }

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
            await clockFramesUntil(
              page,
              () =>
                !!(window.__game as { discovery: Discovery }).discovery.scanner.view.nearestInRange,
            );
            await expect(page.locator('.guidance-slot')).toBeVisible();
            if (viewport.width < viewport.height)
              await expect(page.locator('.tc-rotate-hint')).toBeHidden();
            // The scan card owns the instruction; the tutorial returns once it is out of the way.
            await expect(page.locator('.guidance-slot[data-step]')).toBeHidden();
            await setScanCardSuppressed(page, true);
            await page.clock.runFor(34);
            for (const step of ['move', 'depth', 'scan']) {
              await expect(page.locator('.guidance-slot[data-step]')).toHaveAttribute(
                'data-step',
                step,
              );
              if (phase === 'tutorial steps')
                await separate(page, [...hud, '.guidance-slot[data-step]']);
              if (step !== 'scan') {
                await page.locator('.guidance-skip').tap();
                await page.clock.runFor(34);
              }
            }
            if (phase === 'tutorial steps') {
              await page.screenshot({ path: testInfo.outputPath('contact-and-tutorial.png') });
              return;
            }
            await page.getByRole('button', { name: 'Skip', exact: true }).tap();
            await page.clock.runFor(34);
            await setScanCardSuppressed(page, false);
            await page.clock.runFor(34);
            await expect(page.locator('.guidance-slot[data-step]')).toBeHidden();
            await expect(page.locator('.guidance-slot')).toBeVisible();
            await expect(page.locator('.guidance-hint')).toHaveCount(1);
            await expect(
              page.getByText('Something to scan is in range', { exact: false }),
            ).toBeHidden();
            await expect(
              page.locator('.guidance-slot[data-kind="hint"]:not([data-step])'),
            ).not.toContainText(
              /Something to scan is in range|Face the target\. Hold .* to scan\./,
            );
            expect(
              await page.evaluate(() =>
                (window.__game as { onboard: { hints: HintEngine } }).onboard.hints.hasSeen(
                  'scan-target',
                ),
              ),
            ).toBe(false);
            await separate(page, [...hud, GUIDANCE.any]);
          });
        }
      }
    }
  });
}
