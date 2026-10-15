import { renderReview, reviewScreenshot } from './helpers/render.js';
import { expect, test as freshTest, type Page, type Locator } from '@playwright/test';
import { test as experiencedTest } from './helpers/unlocked.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, writeFile } from 'node:fs/promises';
import { finishAnimations } from './helpers/hudTips.js';
import { GUIDANCE } from './helpers/guidance.js';
import { dismissTutorial, setScanCardSuppressed } from './helpers/tutorial.js';
import { expectCompactPhoneHud, expectObjectiveGuidance } from './helpers/phoneHud.js';
import { advanceScan, completeScan, scanWithKeyboard } from './helpers/scan.js';
import { homeReady } from './helpers/home.js';
import { diveReady, loadDive } from './helpers/dive.js';
import { type Discovery } from '../../src/game/Discovery.js';
import { type Submarine } from '../../src/sub/Submarine.js';
import { type CameraRig } from '../../src/sub/CameraRig.js';
import { type HintEngine } from '../../src/game/Hints.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { type Save } from '../../src/core/Save.js';
import { type Camera, type PerspectiveCamera, type Vector3 } from 'three';
import { type Life } from '../../src/world/life/Life.js';
import { type ScanOverlay } from '../../src/ui/ScanOverlay.js';
import { scanAim } from './helpers/scanAim.js';
import { type Input } from '../../src/core/Input.js';
import { type TouchControls } from '../../src/ui/TouchControls.js';
import { type Journal } from '../../src/ui/Journal.js';
import { type Props } from '../../src/world/Props.js';
import { openBriefingAdvanced } from './helpers/briefing.js';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };
import sites from '../../data/landmarks/index.json' with { type: 'json' };

experiencedTest.describe('guidance lifecycle', () => {
  for (const transition of ['scan', 'pause', 'crush', 'power'] as const) {
    // Regression guard: scan progress/results replace the target, and covered or
    // failed dives discard timed messages instead of restoring stale guidance.
    experiencedTest(`clears obsolete guidance through ${transition}`, async ({ page }) => {
      await loadDive(
        page,
        '/?mission=titanic&landmark=_test&poi=test-bow&skipBriefing=1&tier=low&tutorial=0',
      );
      await expect(page.locator(GUIDANCE.scan)).toBeVisible();
      if (transition === 'scan') {
        await page.keyboard.down('g');
        try {
          await advanceScan(page, 1 / 60);
          await expect(page.locator(GUIDANCE.kicker)).toHaveText('SCANNING');
          await completeScan(page, 'test-bow');
        } finally {
          await page.keyboard.up('g');
        }
        await expect(page.locator(GUIDANCE.discovery)).toBeVisible();
        await expect(page.locator(GUIDANCE.kicker)).toHaveText('NEW ENTRY');
        await expect(page.locator(GUIDANCE.scan)).toBeHidden();
        return;
      }
      await page.evaluate(() => {
        const g = window.__game as unknown as { discovery: Discovery };
        g.discovery.overlay.slot.notice('Obsolete dive notice', 60);
      });
      if (transition === 'pause') {
        await page.keyboard.press('Escape');
        await expect(page.locator('.pause-menu')).toBeVisible();
      } else {
        await page.evaluate((cause) => {
          const sub = (window.__game as unknown as { sub: Submarine }).sub;
          if (cause === 'crush') {
            sub.setHullClass('A');
            sub.reset(0, sub.getCrushDepth() - 1, 0);
            sub.velocity.y = 20; // Clear the crush threshold before the blow's lock expires.
          } else {
            sub.reset(0, -10, 0);
            sub.startEmergencyAscent();
          }
        }, transition);
        await expect(page.locator('.mission-debrief.is-aborted')).toBeVisible();
      }
      await expect(page.locator(GUIDANCE.any)).toBeHidden();
      if (transition === 'pause') {
        await page.keyboard.press('Escape');
        await expect(page.locator('.pause-menu')).toBeHidden();
        await expect(page.locator(GUIDANCE.scan)).toBeVisible();
      }
      // Drop current offers: a hidden timed notice must have been discarded, not just covered.
      const remaining = await page.evaluate(() => {
        const slot = (window.__game as unknown as { discovery: Discovery }).discovery.overlay.slot;
        for (const [source, kind] of [
          ['scan', 'scan'],
          ['objective', 'objective'],
          ['warning', 'urgent'],
          ['complete', 'discovery'],
        ] as const)
          slot.offer(source, kind, null);
        return slot.visible;
      });
      expect(remaining).toBe(false);
    });
  }
});

freshTest.describe('fixture and mission layout', () => {
  const test = freshTest;
  const shots = '.cache/codex/shots/hud-touch/layout';
  const url = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&tier=low';

  async function boot(page: Page, touch: boolean): Promise<void> {
    await page.goto(url + (touch ? '&touch=1' : ''), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    // A contact is in range from the start, so its card is up and the tutorial waits.
    await expect(page.locator(GUIDANCE.scan)).toBeVisible();
    await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
  }

  async function shot(page: Page, name: string): Promise<void> {
    await mkdir(shots, { recursive: true });
    await reviewScreenshot(page, { path: `${shots}/${name}.png` });
  }

  async function clearLayout(page: Page, selectors: string[]): Promise<void> {
    const viewport = page.viewportSize()!;
    // One renderer round trip observes a coherent layout, rather than waiting
    // for WebGL separately for every rectangle at every tutorial step.
    const boxes = await page.evaluate(
      (selectors) =>
        selectors.map((selector) => {
          const element = document.querySelector<HTMLElement>(selector)!;
          const box = element.getBoundingClientRect();
          return { selector, x: box.x, y: box.y, width: box.width, height: box.height };
        }),
      selectors,
    );
    for (const box of boxes) {
      expect(box.width, box.selector).toBeGreaterThan(0);
      expect(box.height, box.selector).toBeGreaterThan(0);
      expect(box.x, box.selector).toBeGreaterThanOrEqual(0);
      expect(box.y, box.selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (const b of boxes.slice(i + 1)) {
        const a = boxes[i]!;
        const overlaps =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlaps, `${a.selector} overlaps ${b.selector}`).toBe(false);
      }
    }
  }

  for (const layout of [
    { name: 'desktop-1600', width: 1600, height: 900, touch: false },
    { name: 'desktop-1280', width: 1280, height: 720, touch: false },
    { name: 'phone-landscape', width: 844, height: 390, touch: true },
    { name: 'tablet-landscape', width: 1024, height: 768, touch: true },
  ]) {
    test.describe(layout.name, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: layout.touch,
      });
      // Regression guard: fresh scan/tutorial cards overlapped telemetry or touch-control wrappers.
      test('fresh dive HUD has separate spaces', async ({ page }) => {
        await boot(page, layout.touch);
        await shot(page, `opening-${layout.name}`);
        const selectors = ['.guidance-slot', '.hud-readouts'];
        if (layout.touch) selectors.push('.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause');
        else selectors.push('.hud-reset-camera');
        await clearLayout(page, selectors);
        // The tutorial is laid out on its own: it never shares the screen with the scan card.
        await setScanCardSuppressed(page, true);
        await finishAnimations(page, '.guidance-slot[data-step]');
        const tutorialSelectors = ['.guidance-slot[data-step]', ...selectors.slice(1)];
        await clearLayout(page, tutorialSelectors);
        const skip = (await page.getByRole('button', { name: 'Skip', exact: true }).boundingBox())!;
        expect(skip.width).toBeGreaterThanOrEqual(44);
        expect(skip.height).toBeGreaterThanOrEqual(44);
        for (let step = 1; step < 3; step++) {
          const button = page.locator('.guidance-skip');
          if (layout.touch) await button.tap();
          else await button.click();
          await expect(page.locator('.guidance-slot[data-step]')).toHaveAttribute(
            'data-step',
            ['move', 'depth', 'scan'][step],
          );
          await clearLayout(page, tutorialSelectors);
        }
      });
    });
  }

  // A real mission: on desktop the objectives panel is up too; phones name the objective in the slot.
  for (const layout of [
    { name: 'desktop-1280', width: 1280, height: 720, touch: false },
    { name: 'phone-landscape', width: 844, height: 390, touch: true },
  ]) {
    test.describe(`mission ${layout.name}`, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: layout.touch,
      });
      // Regression guard: fresh scan/tutorial cards overlapped telemetry or touch-control wrappers.
      test('card, objectives and readouts do not overlap', async ({ page }) => {
        // Unlock the mission without touching the tutorial record: a fresh pilot's tutorial still runs.
        await page.addInitScript(() =>
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
          ),
        );
        await page.goto(
          `/?mission=monterey-canyon&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`,
        );
        await diveReady(page, {});
        await expect(page.locator('.guidance-slot[data-step]')).toBeVisible();
        if (!layout.touch) await expect(page.locator('.objectives-panel')).toBeVisible();
        else await expect(page.locator('.objectives-panel')).toBeHidden();
        await finishAnimations(page, '.guidance-slot[data-step]');
        await shot(page, `mission-${layout.name}`);
        const selectors = ['.guidance-slot[data-step]', '.hud-readouts'];
        if (!layout.touch) selectors.push('.objectives-panel');
        if (layout.touch) selectors.push('.tc-stick', '.tc-slider', '.tc-buttons');
        await clearLayout(page, selectors);
      });
    });
  }

  // The HUD is three regions in one grid: top info (sonar, objectives, readouts), the guidance
  // slot and the controls (Pause, Journal, Reset camera and the touch dock).
  for (const layout of [
    { name: 'phone-portrait', width: 390, height: 844, touch: true },
    { name: 'phone-landscape', width: 844, height: 390, touch: true },
    { name: 'desktop-1280', width: 1280, height: 720, touch: false },
  ]) {
    test.describe(`regions ${layout.name}`, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: layout.touch,
        isMobile: layout.touch,
      });
      // Regression guard: landscape guidance sat 4 px under Pause/Journal, and the permanent
      // sonar legend added a caption block to every map.
      test('top info, guidance and controls stay clear of each other', async ({ page }) => {
        await page.addInitScript(() =>
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
          ),
        );
        await page.goto(
          `/?mission=monterey-canyon&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`,
        );
        await page.waitForFunction(() => window.__gameReady === true, undefined, {
          timeout: 45_000,
        });
        await finishAnimations(page, '.guidance-slot[data-step]');
        await shot(page, `regions-${layout.name}`);
        await expect(page.locator('.d-sonar-legend')).toHaveCount(0);
        const selectors = ['.sonar', '.hud-readouts', '.guidance-slot', '.hud-journal'];
        if (layout.touch) selectors.push('.tc-btn-pause', '.tc-stick', '.tc-slider', '.tc-buttons');
        else selectors.push('.objectives-panel', '.hud-reset-camera');
        await clearLayout(page, selectors);
        if (layout.touch) {
          // Pause/Journal and the card are separate flow items with the region gap between.
          const gaps = await page.evaluate(() => {
            const bottom = (selector: string): number =>
              document.querySelector(selector)!.getBoundingClientRect().bottom;
            const card = document.querySelector('.guidance-slot')!.getBoundingClientRect();
            return {
              pause: card.top - bottom('.tc-btn-pause'),
              journal: card.top - bottom('.hud-journal'),
            };
          });
          if (layout.width > layout.height) {
            expect(gaps.pause).toBeGreaterThanOrEqual(8);
            expect(gaps.journal).toBeGreaterThanOrEqual(8);
          }
        }
      });
    });
  }
});

freshTest.describe('large UI and menu reachability', () => {
  const test = freshTest;
  const dive = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&touch=1&tier=low';

  async function ready(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (url === '/?touch=1&tier=low') await homeReady(page);
    else
      await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  }

  async function separate(page: Page, selectors: string[]): Promise<void> {
    const viewport = page.viewportSize()!;
    // Observe one layout snapshot. Hundreds of separate browser round trips can
    // exhaust a shard while WebGL is rendering, even when every box is correct.
    await expect
      .poll(() =>
        page.evaluate(
          (selectors) =>
            selectors.every((selector) => {
              const el = document.querySelector<HTMLElement>(selector);
              return (
                !!el &&
                el.getBoundingClientRect().width > 0 &&
                el.getBoundingClientRect().height > 0 &&
                getComputedStyle(el).visibility === 'visible'
              );
            }),
          selectors,
        ),
      )
      .toBe(true);
    const boxes = await page.evaluate(
      (selectors) =>
        selectors.map((selector) => {
          const el = document.querySelector<HTMLElement>(selector)!;
          const box = el.getBoundingClientRect();
          return { selector, x: box.x, y: box.y, width: box.width, height: box.height };
        }),
      selectors,
    );
    for (const box of boxes) {
      expect(box.x, box.selector).toBeGreaterThanOrEqual(0);
      expect(box.y, box.selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height);
    }
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      for (const b of boxes.slice(i + 1)) {
        expect(
          a.x < b.x + b.width &&
            b.x < a.x + a.width &&
            a.y < b.y + b.height &&
            b.y < a.y + a.height,
          `${a.selector} overlaps ${b.selector}`,
        ).toBe(false);
      }
    }
  }

  async function reachable(target: Locator, minSize = 44): Promise<void> {
    await expect(target).toBeVisible();
    await target.scrollIntoViewIfNeeded();
    const box = await target.evaluate((element) => {
      const r = element.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        width: r.width,
        height: r.height,
        x: r.x,
        y: r.y,
        hit: hit?.className,
        receivesTap: hit !== null && element.contains(hit),
      };
    });
    expect(box.width).toBeGreaterThanOrEqual(minSize);
    expect(box.height).toBeGreaterThanOrEqual(minSize);
    expect(
      box.receivesTap,
      `the centre of the touch target must receive the tap: ${JSON.stringify(box)}`,
    ).toBe(true);
  }

  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 667, height: 375 },
    { width: 844, height: 390 },
  ]) {
    test.describe(`touch audit ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport, hasTouch: true, isMobile: true });
      test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
          localStorage.setItem(
            'subexplorer.settings.v3',
            JSON.stringify({ version: 2, uiScale: 150, reduceMotion: true, graphicsTier: 'low' }),
          );
        });
      });

      // Stress every viewport at large UI; the smallest portrait/landscape also
      // cover normal/minimum scale. Other HUD specs cover normal UI at larger sizes.
      for (const scale of viewport.width === 360 || viewport.width === 667
        ? [80, 100, 150]
        : [150]) {
        // Regression guard: large UI clipped guidance, touch targets and menu/Journal navigation.
        test(`fresh dive separates HUD and controls at ${scale}% UI`, async ({
          page,
        }, testInfo) => {
          await ready(page, dive);
          await page.evaluate((uiScale) => {
            (window.__game as { save: { save(settings: { uiScale: number }): void } }).save.save({
              uiScale,
            });
          }, scale);
          await expect(page.locator('.guidance-slot')).toBeVisible();
          await expect(page.locator('.guidance-hint')).toHaveText('HOLD SCAN TO SCAN');
          const controls = [
            '.tc-stick',
            '.tc-slider',
            '.tc-btn-scan',
            '.tc-btn-lights',
            '.tc-btn-sonar',
            '.tc-btn-photo',
            '.tc-btn-pause',
            '.tc-btn-boost',
            '.hud-journal',
          ];
          const hud = ['.sonar', '.hud-readouts', '.guidance-slot'];
          if (viewport.width < viewport.height)
            await expect(page.locator('.tc-rotate-hint')).toBeHidden();
          // The tutorial defers to the scan card, so each is checked on its own.
          await expect(page.locator('.guidance-slot[data-step]')).toBeHidden();
          await separate(page, [...hud, ...controls]);
          await setScanCardSuppressed(page, true);
          const tutorialHud = hud.filter((selector) => selector !== '.guidance-slot');
          await separate(page, [...tutorialHud, '.guidance-slot[data-step]', ...controls]);
          for (const button of await page
            .locator('.d2-sonar-controls button:visible, .tc-btn')
            .all())
            await reachable(button);
          await reachable(page.getByRole('button', { name: 'Skip', exact: true }));
          await expect(page.locator('.guidance-slot[data-step] button:visible')).toHaveCount(1);
          await expect(page.locator('.d-sonar-legend')).toHaveCount(0);
          expect((await page.locator('.sonar').boundingBox())!.width).toBe(
            viewport.width > viewport.height ? 120 : 96,
          );
          // Check every instruction: the last step is longer than the first.
          for (const step of ['move', 'depth', 'scan']) {
            await expect(page.locator('.guidance-slot[data-step]')).toHaveAttribute(
              'data-step',
              step,
            );
            expect(
              await page
                .locator('.guidance-slot[data-step]')
                .evaluate((e) => e.scrollWidth <= e.clientWidth),
            ).toBe(true);
            await separate(page, [...tutorialHud, '.guidance-slot[data-step]', ...controls]);
            await expectCompactPhoneHud(page);
            if (step !== 'scan') await page.locator('.guidance-skip').tap();
          }
          if (scale === 100)
            await reviewScreenshot(page, { path: testInfo.outputPath('tutorial-landscape.png') });
          await page.getByRole('button', { name: 'Skip', exact: true }).tap();
          await expect(page.locator('.guidance-slot[data-step]')).toBeHidden();
          await setScanCardSuppressed(page, false);
          // The scan card carries the scan prompt; no separate hint appears.
          await expect(
            page.locator('.guidance-slot[data-kind="hint"]:not([data-step])'),
          ).toBeHidden();
          // A ready contact outranks a result, so finish the real scan first (as a player would).
          {
            const cdp = await page.context().newCDPSession(page);
            const button = (await page.locator('.tc-btn-scan').boundingBox())!;
            try {
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [
                  { x: button.x + button.width / 2, y: button.y + button.height / 2, id: 1 },
                ],
              });
              await completeScan(page);
            } finally {
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
              await cdp.detach();
            }
          }
          await page.evaluate(() => {
            const game = window.__game as {
              discovery: {
                overlay: {
                  showComplete(
                    title: string,
                    first: boolean,
                    keys: { scan: string; guide: string },
                  ): void;
                };
              };
            };
            game.discovery.overlay.showComplete(
              'A very long named contact with an unbroken identifier ABCDEFGHIJKLMNOPQRSTUVWXYZ',
              true,
              { scan: 'G', guide: 'J' },
            );
          });
          await expect(page.locator('.guidance-hint')).toHaveText('OPEN JOURNAL');
          expect(
            await page.locator('.guidance-slot').evaluate((e) => e.scrollWidth <= e.clientWidth),
          ).toBe(true);
          await separate(page, ['.guidance-slot', ...controls]);
          await page.locator('.sonar canvas').tap();
          await expect(page.locator('.sonar')).toHaveClass(/d-sonar-expanded/);
          for (const button of await page.locator('.d2-sonar-controls button').all())
            await reachable(button);
          await separate(page, [
            '.sonar',
            '.tc-btn-scan',
            '.tc-btn-lights',
            '.tc-btn-sonar',
            '.tc-btn-photo',
            '.tc-btn-pause',
            '.tc-btn-boost',
            '.hud-journal',
          ]);
          if (scale === 100)
            await reviewScreenshot(page, { path: testInfo.outputPath('expanded-sonar.png') });
          await page.locator('.tc-btn-sonar').tap();
          await expect(page.locator('.tc-stick')).toBeVisible();
        });
      }

      // Regression guard: large UI clipped guidance, touch targets and menu/Journal navigation.

      test('mission objectives and readouts share the phone column', async ({ page }) => {
        await page.addInitScript(() => {
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
        });
        await ready(page, '/?mission=monterey-canyon&skipBriefing=1&touch=1&tier=low');
        // Phones name the objective in the slot; the panel only carries the completion banner.
        await expect(page.locator('.objectives-panel')).toBeHidden();
        await expect(page.locator('.guidance-slot[data-step]')).toBeVisible();
        await separate(page, [
          '.hud-readouts',
          '.guidance-slot[data-step]',
          '.sonar',
          '.tc-stick',
          '.tc-slider',
          '.tc-btn-scan',
          '.tc-btn-lights',
          '.tc-btn-sonar',
          '.tc-btn-photo',
          '.tc-btn-pause',
        ]);
        expect(
          await page.locator('.hud-readouts').evaluate((e) => e.scrollWidth <= e.clientWidth),
        ).toBe(true);
      });

      // 360×640 was added for the HUD audit; retain the existing menu matrix.
      if (viewport.width === 360) return;

      // Full menu/Journal journeys run at 390x844 portrait and 667x375 landscape.
      // The HUD and mission layout checks above still run at all four sizes.
      if (viewport.width === 390 || viewport.width === 667) {
        // Regression guard: large UI clipped guidance, touch targets and menu/Journal navigation.
        test('Daily, expanded mode picker and menu exits are reachable by touch', async ({
          page,
        }) => {
          await ready(page, '/?touch=1&tier=low');
          const home = page.locator('.home-screen');
          const menu = home.locator('.home-menu');
          // The menu sits in the scrolling `.home-body` ; the scroller stays on screen.
          expect((await home.locator('.home-body').boundingBox())!.height).toBeGreaterThan(300);
          await separate(page, ['.home-copy', '.home-body']);
          await expect(page.locator('.globe.is-embedded')).toBeHidden();
          expect(
            await menu
              .locator(':scope > *')
              .evaluateAll((elements) =>
                elements.map((element) =>
                  element.classList.contains('daily-card')
                    ? 'Daily dive'
                    : element.classList.contains('mode-selector')
                      ? 'Mode'
                      : element.textContent,
                ),
              ),
          ).toEqual([
            'Dive',
            'Dive sites',
            'Free dive',
            'Daily dive',
            'Mode',
            'Journal',
            'Settings',
            'Controls',
          ]);
          for (const name of ['Dive sites', 'Free dive']) {
            const origin = menu.getByRole('button', { name, exact: true });
            await reachable(origin);
            await origin.tap();
            await expect(home.locator('.home-sites h2')).toHaveText(name);
            await expect(page.locator('.globe.is-embedded')).toBeVisible();
            // The list is a sheet over the globe: its header (the part a collapsed sheet shows) must clear it.
            await separate(page, ['.home-globe-wrap', '.home-sites-head']);
            const back = home.getByRole('button', { name: 'Back to menu' });
            await reachable(back);
            await back.tap();
            await expect(page.locator('.globe.is-embedded')).toBeHidden();
            await expect(origin).toBeFocused();
          }
          const mode = home.locator('.mode-selector');
          for (const radio of await mode.getByRole('radio').all()) await reachable(radio);
          await mode.getByRole('radio', { name: 'Realistic' }).tap();
          await expect(mode.getByRole('radio', { name: 'Realistic' })).toBeChecked();
          const advanced = mode.getByRole('button', { name: 'Advanced' });
          await advanced.tap();
          // The Advanced switches are text-sized checkboxes on a labelled line, by design.
          for (const select of await mode.getByRole('switch').all()) await reachable(select, 16);
          await mode.getByLabel('Currents', { exact: true }).uncheck();
          await expect(mode.locator('.mode-custom-tag')).toBeVisible();
          for (const name of ['Daily dive', 'Controls', 'Journal'])
            await reachable(menu.getByRole('button', { name: new RegExp(name) }));
          // Daily must launch even while the expanded picker is scrolled out of view.
          await menu.getByRole('button', { name: /Daily dive/ }).tap();
          await expect(page.locator('.briefing')).toBeVisible();
          const briefing = page.locator('.briefing');
          await briefing.getByRole('button', { name: 'Advanced' }).tap();
          for (const select of await briefing.getByRole('switch').all())
            await reachable(select, 16);
          await reachable(briefing.locator('.briefing-begin'));
          await reachable(briefing.getByRole('link', { name: 'Free dive', exact: true }));
        });

        // Regression guard: large UI clipped guidance, touch targets and menu/Journal navigation.

        test('journal spoilers, navigation, entries and Close remain reachable', async ({
          page,
        }) => {
          await ready(page, '/?touch=1&tier=low');
          await page
            .locator('.home-menu')
            .getByRole('button', { name: 'Journal', exact: true })
            .tap();
          const journal = page.getByRole('dialog', { name: 'Journal', exact: true });
          await expect(journal).toBeVisible();
          // Initial async catalogue loading replaces the sheet. Measure only its settled content.
          await page.evaluate(() =>
            (window.__game as { journal: { load(): Promise<void> } }).journal.load(),
          );
          const sites = journal.locator('.jr-site-card[data-target]:not(.is-photos)');
          await expect(sites).toHaveCount(catalog.landmarks.length);
          await reachable(journal.locator('.jr-spoilers'));
          await journal.locator('.jr-spoilers').tap();
          await expect(
            journal.getByRole('switch', { name: 'Show spoilers', exact: true }),
          ).toBeChecked();
          await expect(journal).toHaveClass(/is-phone/);
          await reachable(sites.first());
          await reachable(sites.last());
          const site = journal.locator('.jr-site-card[data-target="titanic"]');
          await reachable(site);
          await site.tap();
          await expect(journal.locator('.jr-body .jr-title')).toHaveText('RMS Titanic');
          const entries = journal.locator('.jr-body .jr-row');
          await reachable(entries.first());
          await reachable(entries.last());
          const entry = entries.first();
          const title = await entry.locator('.jr-row-title').innerText();
          await entry.tap();
          await expect(journal.locator('.jr-body .jr-title')).toHaveText(title);
          await expect(journal.locator('.jr-body .jr-title')).not.toHaveText('Undiscovered');
          const back = journal.getByRole('button', { name: 'Back', exact: true });
          await reachable(back);
          await back.tap();
          await expect(journal.locator('.jr-body .jr-title')).toHaveText('RMS Titanic');
          await reachable(back);
          await back.tap();
          await expect(journal).toHaveClass(/at-front/);
          expect(
            await journal.locator('.jr-header').evaluate((e) => e.scrollWidth <= e.clientWidth),
          ).toBe(true);
          await reachable(journal.locator('.jr-close'));
          await journal.locator('.jr-close').tap();
          await expect(journal).toBeHidden();
          await expect(page.locator('.home-screen')).toBeVisible();
        });
      }
    });
  }
});

freshTest.describe('landscape guidance and completion', () => {
  const test = freshTest;
  const shots = '.cache/codex/shots/hud-touch/landscape';
  const stackUrl = '/?mission=titanic&skipBriefing=1&touch=1&tier=low';
  const tutorialUrl = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&touch=1&tier=low';

  async function ready(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  }

  for (const viewport of [
    { width: 844, height: 390 },
    { width: 667, height: 375 },
    { width: 932, height: 430 },
  ]) {
    test.describe(`touch stack ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport, hasTouch: true, isMobile: true });
      const tag = `${viewport.width}x${viewport.height}`;

      // Regression guard: landscape guidance and completion banner hid touch controls and Surface.

      test('tutorial stays one line at its last step and yields to the scan card', async ({
        page,
      }) => {
        await ready(page, tutorialUrl);
        const card = page.locator(GUIDANCE.tutorial);
        // A contact is in range from the start: its card owns the slot, the tutorial waits.
        await expect(page.locator(GUIDANCE.scan)).toBeVisible();
        await expect(card).toBeHidden();
        await setScanCardSuppressed(page, true);
        for (const step of ['move', 'depth']) {
          await expect(card).toHaveAttribute('data-step', step);
          await page.locator('.guidance-skip').tap();
        }
        await expect(card).toHaveAttribute('data-step', 'scan');
        await reviewScreenshot(page, { path: `${shots}/tutorial-scan-${tag}.png` });
        const h = (await card.boundingBox())!.height;
        expect(h).toBeLessThanOrEqual(56);
        await setScanCardSuppressed(page, false);
        await expect(card).toBeHidden();
        await expect(page.locator(GUIDANCE.scan)).toBeVisible();
        // The scan card alone leaves the middle of the screen open.
        const bottom = await page.evaluate(
          () => document.querySelector('.guidance-slot')!.getBoundingClientRect().bottom,
        );
        expect(bottom).toBeLessThan(viewport.height * 0.5 + 20);
      });

      // Regression guard: landscape guidance and completion banner hid touch controls and Surface.

      test('completion banner clears every touch control and the telemetry', async ({ page }) => {
        // Regression: on a phone in landscape the banner sat under Sonar/Lights/Boost, hiding Surface.
        await ready(page, stackUrl);
        await dismissTutorial(page, true);
        await page.evaluate(() =>
          (
            window.__game as unknown as { missionRouter: { showBanner(kind: 'primary'): void } }
          ).missionRouter.showBanner('primary'),
        );
        const banner = page.locator('.obj-banner');
        await expect(banner).toBeVisible();
        await banner.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
        await reviewScreenshot(page, { path: `${shots}/completion-banner-${tag}.png` });
        const hits = await page.evaluate(() => {
          const b = document.querySelector('.obj-banner')!.getBoundingClientRect();
          return [
            '.tc-stick',
            '.tc-slider',
            '.tc-buttons',
            '.tc-btn-pause',
            '.hud-journal',
            '.hud-readouts',
            '.sonar',
          ].filter((selector) => {
            const r = document.querySelector(selector)?.getBoundingClientRect();
            return (
              !!r &&
              r.width > 0 &&
              r.left < b.right &&
              b.left < r.right &&
              r.top < b.bottom &&
              b.top < r.bottom
            );
          });
        });
        expect(hits).toEqual([]);
        for (const name of ['Keep exploring', 'Surface and debrief']) {
          const box = (await banner.getByRole('button', { name }).boundingBox())!;
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        }
      });

      // Regression guard: landscape guidance and completion banner hid touch controls and Surface.

      test('the standing objective line shows when no contact is in range', async ({ page }) => {
        await ready(page, stackUrl);
        await dismissTutorial(page, true);
        await page.evaluate(() => {
          const g = window.__game as {
            sub: { position: { x: number; y: number; z: number }; yaw: number; pitch: number };
            rig: { snap(p: unknown, yaw: number, pitch: number): void };
          };
          g.sub.position.x += 900;
          g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
        });
        await expect(page.locator(GUIDANCE.scan)).toBeHidden();
        const chip = page.locator(GUIDANCE.objective);
        await expect(chip).toBeVisible();
        await expect(chip).toContainText('OBJECTIVE');
        const box = (await chip.boundingBox())!;
        expect(box.height).toBeLessThanOrEqual(64);
        const overlaps = await page.evaluate((b) => {
          return [
            '.tc-stick',
            '.tc-slider',
            '.tc-btn-scan',
            '.tc-btn-lights',
            '.tc-btn-sonar',
            '.tc-btn-photo',
            '.tc-btn-pause',
            '.tc-btn-boost',
            '.hud-journal',
            '.sonar',
            '.hud-readouts',
            '.objectives-panel',
          ]
            .flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s)))
            .filter((e) => e.checkVisibility())
            .map((e) => e.getBoundingClientRect())
            .filter(
              (r) => b.x < r.right && r.x < b.x + b.width && b.y < r.bottom && r.y < b.y + b.height,
            ).length;
        }, box);
        expect(overlaps).toBe(0);
        await reviewScreenshot(page, { path: `${shots}/objective-chip-${tag}.png` });
      });
    });
  }
});

freshTest.describe('hero guidance sequence', () => {
  const test = freshTest;
  const heroes = [
    { site: 'titanic', poi: 'titanic-bow' },
    { site: 'lost-city', poi: 'lost-city-poseidon' },
    { site: 'great-blue-hole', poi: 'great-blue-hole-stalactites' },
    { site: 'beebe-vent-field', poi: 'bvf-main-vents' },
    { site: 'monterey-canyon', poi: 'monterey-canyon-wall' },
  ];
  // Phones have no objectives panel (the guidance slot carries the objective), so
  // callers add it only where it is on screen.
  const hud = [
    '.sonar',
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
    if (await page.locator('.objectives-panel').isVisible())
      selectors = [...selectors, '.objectives-panel'];
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
          // Regression guard: hero touch guidance and controls collided and duplicated the retired scan-target hint.
          test(`${hero.site} ${uiScale}%: opening, tutorial and hint keep contact and controls separate`, async ({
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
            {
              // The tutorial card defers to the scan card, so only one of them is up.
              const scanUp = await page.locator('.guidance-slot[data-kind="scan"]').isVisible();
              if (scanUp) await expect(page.locator('.guidance-slot[data-step]')).toBeHidden();
              const fresh = [...hud];
              if (await page.locator(GUIDANCE.any).isVisible()) fresh.push(GUIDANCE.any);
              await separate(page, fresh);
              await expect(page.locator('.hud-attribution')).toHaveCount(0);
              await reviewScreenshot(page, { path: testInfo.outputPath('arcade-opening.png') });
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
              await separate(page, [...hud, '.guidance-slot[data-step]']);
              if (step !== 'scan') {
                await page.locator('.guidance-skip').tap();
                await page.clock.runFor(34);
              }
            }
            {
              await reviewScreenshot(page, {
                path: testInfo.outputPath('contact-and-tutorial.png'),
              });
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
            await expect(page.locator('.guidance-slot')).not.toContainText(
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
    });
  }
});

freshTest.describe('portrait telemetry and small controls', () => {
  const test = experiencedTest;
  async function separate(page: Page, a: string, b: string) {
    await expect(page.locator(a)).toBeVisible();
    await expect(page.locator(b)).toBeVisible();
    const first = (await page.locator(a).boundingBox())!;
    const second = (await page.locator(b).boundingBox())!;
    const overlap =
      first.x < second.x + second.width &&
      second.x < first.x + first.width &&
      first.y < second.y + second.height &&
      second.y < first.y + first.height;
    expect(overlap, `${a} overlaps ${b}: ${JSON.stringify({ first, second })}`).toBe(false);
  }

  test.describe('Portrait portrait telemetry', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    for (const site of ['great-blue-hole', 'monterey-canyon']) {
      // Regression guard: portrait sonar collided with readouts or Daily objectives and thrust shared a boost target.
      test(`${site} Free dive sonar has space beside readouts and pause`, async ({ page }) => {
        await page.goto(`/?tile=${site}&tier=low&touch=1`);
        await diveReady(page, {});
        await separate(page, '.sonar', '.hud-readouts');
        await separate(page, '.sonar', '.tc-btn-pause');
      });
    }
    // Regression guard: portrait sonar collided with readouts or Daily objectives and thrust shared a boost target.
    test('Daily objectives have space beside sonar', async ({ page }) => {
      await page.goto('/?tier=low&touch=1');
      await homeReady(page);
      await Promise.all([
        page.waitForURL((url) => url.searchParams.has('daily'), { waitUntil: 'domcontentloaded' }),
        page.locator('.daily-card').click(),
      ]);
      await diveReady(page, {});
      await page.locator('.briefing-begin').click();
      await expect(page.locator('.briefing')).toBeHidden();
      // The daily route reboots without ?touch=1; a real touch restores touch mode.
      await page.touchscreen.tap(195, 420);
      await expect(page.locator('html.is-touch')).toHaveCount(1);
      await expectObjectiveGuidance(page, true);
      await expect(page.locator('.objectives-panel')).toBeHidden();
      await separate(page, '.sonar', GUIDANCE.any);
      await separate(page, '.sonar', '.hud-readouts');
    });
  });

  for (const layout of [
    { width: 320, height: 568, scale: 100 },
    { width: 390, height: 844, scale: 150 },
  ]) {
    test.describe(`Portrait ${layout.width}px controls at ${layout.scale}%`, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: true,
        isMobile: true,
      });
      // Regression guard: portrait sonar collided with readouts or Daily objectives and thrust shared a boost target.
      test('thrust and boost have separate touch targets', async ({ page }) => {
        await page.addInitScript((scale) => {
          localStorage.setItem(
            'subexplorer.settings.v3',
            JSON.stringify({ version: 2, uiScale: scale, graphicsTier: 'low' }),
          );
        }, layout.scale);
        await page.goto('/?tile=great-blue-hole&tier=low&touch=1');
        await diveReady(page, {});
        await separate(page, '.tc-stick', '.tc-btn-boost');
        await separate(page, '.tc-stick', '.tc-buttons');
        await separate(page, '.tc-slider', '.tc-buttons');
        for (const selector of ['.tc-stick', '.tc-slider', '.tc-buttons']) {
          const box = (await page.locator(selector).boundingBox())!;
          expect(box.x, selector).toBeGreaterThanOrEqual(0);
          expect(box.y, selector).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width, selector).toBeLessThanOrEqual(layout.width);
          expect(box.y + box.height, selector).toBeLessThanOrEqual(layout.height);
        }
        for (const button of await page.locator('.tc-buttons .tc-btn').all()) {
          const box = (await button.boundingBox())!;
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      });
    });
  }
});

freshTest.describe('projected submarine clearance', () => {
  const test = freshTest;
  // Phone portrait at the Monterey Canyon spawn: every HUD panel owns its own
  // space, and the submarine is on screen and not hidden behind any of them.
  const HUD = [
    '.sonar',
    '.hud-readouts',
    '.hud-footer',
    '.objectives-panel',
    '.guidance-slot',
    '.tc-stick',
    '.tc-slider',
    '.tc-buttons',
    '.tc-btn-pause',
  ];

  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  async function boot(page: Page, query: string): Promise<void> {
    await page.addInitScript(() =>
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
      ),
    );
    await page.goto(`/?tile=monterey-canyon&tier=low&touch=1&skipBriefing=1&${query}`);
    await diveReady(page, {});
  }

  async function expectClearLayout(page: Page): Promise<void> {
    const selectors = HUD;
    const m = await page.evaluate((selectors) => {
      const boxes = selectors.flatMap((selector) => {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden')
          return [];
        const r = el.getBoundingClientRect();
        return [{ selector, x: r.x, y: r.y, width: r.width, height: r.height }];
      });
      const game = window.__game as { sub: Submarine; rig: { camera: Camera } };
      const p = game.sub.position.clone().project(game.rig.camera);
      return {
        boxes,
        w: innerWidth,
        h: innerHeight,
        sx: ((p.x + 1) / 2) * innerWidth,
        sy: ((1 - p.y) / 2) * innerHeight,
      };
    }, selectors);
    expect(m.boxes.map((b) => b.selector)).toEqual(
      expect.arrayContaining(['.sonar', '.hud-readouts']),
    );
    for (const b of m.boxes) {
      expect(b.x, b.selector).toBeGreaterThanOrEqual(0);
      expect(b.y, b.selector).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, b.selector).toBeLessThanOrEqual(m.w);
      expect(b.y + b.height, b.selector).toBeLessThanOrEqual(m.h);
      const covers = m.sx >= b.x && m.sx <= b.x + b.width && m.sy >= b.y && m.sy <= b.y + b.height;
      expect(covers, `${b.selector} must not cover the submarine`).toBe(false);
    }
    for (let i = 0; i < m.boxes.length; i++) {
      for (const b of m.boxes.slice(i + 1)) {
        const a = m.boxes[i]!;
        const overlaps =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlaps, `${a.selector} overlaps ${b.selector}`).toBe(false);
      }
    }
    expect(m.sx).toBeGreaterThan(40);
    expect(m.sx).toBeLessThan(m.w - 40);
    expect(m.sy).toBeGreaterThan(40);
    expect(m.sy).toBeLessThan(m.h - 40);
  }

  // Regression guard: Monterey portrait HUD covered the submarine or other HUD panels; map records uncertain bug attribution.

  test('free dive: portrait HUD panels do not overlap', async ({ page }) => {
    await boot(page, 'tutorial=0');
    await expect(page.locator('.guidance-slot')).toBeVisible();
    await expectClearLayout(page);
  });

  // Regression guard: Monterey portrait HUD covered the submarine or other HUD panels; map records uncertain bug attribution.

  test('mission with tutorial: card, objectives, scan and readouts each stay clear', async ({
    page,
  }) => {
    await boot(page, 'mission=monterey-canyon');
    // Phones name the objective in the guidance slot; the panel only shows its completion banner.
    await expect(page.locator('.objectives-panel')).toBeHidden();
    await expect(page.locator('.guidance-slot[data-step]')).toBeVisible();
    await expectClearLayout(page);
  });
});

freshTest.describe('animal guidance placement', () => {
  const test = freshTest;
  const shots = '.cache/codex/shots/hud-touch/animal';

  interface Probe {
    life: Life | null;
    sub: { position: Vector3; step(): void };
    rig: { camera: PerspectiveCamera };
    discovery: { loaded: boolean; overlay: ScanOverlay };
    props: { loaded: boolean };
    onboard: { hints: HintEngine };
  }

  async function separate(page: Page, selectors: string[]): Promise<void> {
    const boxes = await page.evaluate(
      (selectors) =>
        selectors.map((selector) => {
          const element = document.querySelector<HTMLElement>(selector)!;
          const r = element.getBoundingClientRect();
          return {
            selector,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            visible: getComputedStyle(element).visibility === 'visible',
            fits: element.scrollWidth <= element.clientWidth,
          };
        }),
      selectors,
    );
    const viewport = page.viewportSize()!;
    for (const box of boxes) {
      expect(box.visible, box.selector).toBe(true);
      expect(box.width, box.selector).toBeGreaterThan(0);
      expect(box.height, box.selector).toBeGreaterThan(0);
      expect(box.fits, `${box.selector} clips text`).toBe(true);
      expect(box.x, box.selector).toBeGreaterThanOrEqual(0);
      expect(box.y, box.selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height);
    }
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      for (const b of boxes.slice(i + 1)) {
        expect(
          a.x < b.x + b.width &&
            b.x < a.x + a.width &&
            a.y < b.y + b.height &&
            b.y < a.y + a.height,
          `${a.selector} overlaps ${b.selector}`,
        ).toBe(false);
      }
    }
  }

  async function screenshot(page: Page, name: string): Promise<void> {
    await mkdir(shots, { recursive: true });
    await reviewScreenshot(page, { path: `${shots}/${name}.png` });
  }

  for (const layout of [
    { width: 1600, height: 900, touch: false, scale: 100 },
    { width: 1280, height: 720, touch: false, scale: 100 },
    ...[100, 150].flatMap((scale) =>
      [
        { width: 390, height: 844 },
        { width: 360, height: 640 },
        { width: 844, height: 390 },
      ].map((viewport) => ({ ...viewport, touch: true, scale })),
    ),
  ]) {
    const name = `${layout.width}x${layout.height}-${layout.scale}`;
    test.describe(name, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: layout.touch,
        isMobile: layout.touch,
      });

      // Both animal habitats remain covered. Geometry depends on viewport/scale;
      // alternate habitats instead of repeating that matrix twice.
      for (const site of [
        layout.width === 1600 ||
        layout.width === 390 ||
        (layout.width === 844 && layout.scale === 150)
          ? 'great-blue-hole'
          : 'monterey-canyon',
      ]) {
        // Regression guard: animal guidance overlapped scan/reward cards or its dismiss target became untappable.
        test(`${site}: the animal hint waits for the scan card, then clears the HUD`, async ({
          page,
        }) => {
          await pauseClockBeforeNavigation(page);
          await page.addInitScript((scale) => {
            localStorage.setItem(
              'subexplorer.settings.v3',
              JSON.stringify({
                version: 2,
                uiScale: scale,
                reduceMotion: true,
                graphicsTier: 'low',
              }),
            );
            localStorage.setItem(
              'subexplorer.onboard.v1',
              JSON.stringify({
                version: 1,
                tutorialDone: false,
                seenHints: ['battery-low', 'near-hull', 'scan-target'],
              }),
            );
          }, layout.scale);
          await page.goto(
            `/?tile=${site}&skipBriefing=1&tier=low&lifeSeed=3${layout.touch ? '&touch=1' : ''}`,
            { waitUntil: 'domcontentloaded' },
          );
          await clockFramesUntil(page, () => {
            const game = window.__game as unknown as Probe;
            // Wildlife can finish loading before POIs; a paused clock cannot
            // make the scan panel appear while a DOM-only assertion waits.
            return (
              window.__gameReady === true &&
              !!game.life &&
              game.discovery.loaded &&
              game.props.loaded
            );
          });
          await page.clock.runFor(34);
          await expect(page.locator(GUIDANCE.scan)).toBeVisible();
          // The scan card outranks the tutorial step, so only the scan card is laid out here.
          await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
          const hud = ['.sonar', '.hud-readouts'];
          const controls = layout.touch
            ? ['.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause']
            : ['.hud-reset-camera'];
          await separate(page, [...hud, GUIDANCE.any, ...controls]);
          await expect(page.locator(GUIDANCE.hint)).toBeHidden();

          // Exercise the actual animal-hint trigger; hold a placed animal so
          // drift and ambient spawn timing do not decide whether the hint fires.
          const spawned = await page.evaluate(() => {
            const game = window.__game as unknown as Probe;
            game.sub.step = () => {};
            const sub = {
              ...game.sub.position,
              vx: 0,
              vy: 0,
              vz: 0,
              fx: 0,
              fy: 0,
              fz: -1,
              speed: 0,
              lightsOn: true,
              hullR: 7,
            };
            game.life!.sim.clear();
            const animal = game.life!.sim.spawnNear('comb-jelly', sub, 9, 1);
            game.life!.update(0, sub, game.rig.camera, window.innerHeight, 0);
            game.life!.enabled = false;
            return { spawned: animal !== null, targets: game.life!.targets.length };
          });
          expect(spawned.spawned).toBe(true);
          expect(spawned.targets).toBeGreaterThan(0);
          await dismissTutorial(page, layout.touch, true);
          await page.clock.runFor(50);
          const hint = page.locator(GUIDANCE.hint);
          await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
          // The opening contact's scan card holds the slot, so the animal hint waits
          // behind it and is not used up unseen.
          for (let frame = 0; frame < 40; frame++) await page.clock.fastForward(250);
          await expect(page.locator(GUIDANCE.scan)).toBeVisible();
          await expect(hint).toBeHidden();
          expect(
            await page.evaluate(() =>
              (window.__game as unknown as Probe).onboard.hints.hasSeen('creature'),
            ),
          ).toBe(false);
          // Withdraw only the scan source: covering play would suppress every hint too.
          await setScanCardSuppressed(page, true);
          for (let frame = 0; frame < 40; frame++) {
            // Read the slot without auto-waiting: the clock is paused, so a locator wait
            // for an absent slot would never advance the frames that offer the hint.
            if (
              await page.evaluate((selector) => {
                const slot = document.querySelector<HTMLElement>(selector);
                return (
                  !!slot &&
                  slot.dataset.kind === 'hint' &&
                  !!slot.textContent?.includes('Animal nearby.')
                );
              }, GUIDANCE.any)
            )
              break;
            await page.clock.fastForward(250);
          }
          await expect(hint).toContainText(
            layout.touch
              ? 'Animal nearby. Hold SCAN to scan, or use PHOTO for a photo.'
              : 'Animal nearby. Hold G to scan, or use P for a photo.',
          );
          await expect(hint).toBeVisible();
          await expect(page.locator(GUIDANCE.scan)).toBeHidden();
          expect(
            await page.evaluate(() =>
              (window.__game as unknown as Probe).onboard.hints.hasSeen('creature'),
            ),
          ).toBe(true);
          await screenshot(page, `${site}-${name}`);
          await separate(page, [...hud, GUIDANCE.any, ...controls]);
          // The clock was paused before navigation, so only these frames spend its lifetime.
          for (let frame = 0; frame < 60; frame++) await page.clock.fastForward(250);
          await expect(hint).toBeHidden();
        });
      }
    });
  }
});

freshTest.describe('catalog tutorial and reload', () => {
  const test = freshTest;
  interface Game {
    discovery: Discovery;
    sub: Submarine;
    rig: CameraRig;
    props: { loaded: boolean };
    terrain: { sampleHeight(x: number, z: number): number };
  }

  const shots = '.cache/codex/shots/hud-touch/catalog';
  const selectors = [
    '.sonar',
    '.objectives-panel',
    '.hud-readouts',
    '.guidance-slot',
    '.tc-stick',
    '.tc-slider',
    '.tc-btn-scan',
    '.tc-btn-lights',
    '.tc-btn-sonar',
    '.tc-btn-photo',
    '.tc-btn-pause',
    '.tc-btn-boost',
    '.hud-journal',
    '.hud-reset-camera',
  ];

  async function layout(page: Page, phase: string): Promise<void> {
    // Layout settles in the next real rendering step (not on the fake clock). Wait for
    // one so a measurement taken right after a content change sees the settled grid.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const observer = new ResizeObserver(() => {
            observer.disconnect();
            resolve();
          });
          observer.observe(document.body);
        }),
    );
    // Read the entire composed HUD together, including transient reward notices.
    const issues = await page.evaluate((selectors) => {
      const boxes = selectors.flatMap((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element?.checkVisibility()) return [];
        return [{ selector, box: element.getBoundingClientRect() }];
      });
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
            issues.push(`${a.selector} overlaps ${b.selector}: ${JSON.stringify([a.box, b.box])}`);
        }
      }
      return issues;
    }, selectors);
    expect.soft(issues, phase).toEqual([]);
  }

  async function ready(page: Page): Promise<void> {
    await clockFramesUntil(page, () => {
      const g = window.__game as unknown as Game;
      return window.__gameReady === true && g.discovery.loaded && g.props.loaded;
    });
    // Let the first frames publish the real altitude: an unstepped sub reads as on
    // the seabed, and the urgent SEABED PROXIMITY warning would own the slot.
    await page.clock.runFor(50);
    await page.evaluate(() => {
      (window.__game as unknown as Game).sub.step = () => {};
    });
    await page.clock.runFor(34);
  }

  async function away(page: Page): Promise<void> {
    // Procedural wildlife and sample targets spawn around the sub wherever it is
    // (deep coral at Hudson Canyon and Kamaʻehuakanaloa) a frame after it moves, so
    // a fixed offset can land in range of one. Try several until none is in range.
    const offsets = [
      [10000, 0],
      [0, 10000],
      [-10000, 0],
      [0, -10000],
      [20000, 7000],
      [-20000, 7000],
      [7000, -20000],
      [-7000, 20000],
    ];
    const base = await page.evaluate(() => {
      const p = (window.__game as unknown as Game).sub.position;
      return { x: p.x, y: p.y, z: p.z };
    });
    for (const [dx, dz] of offsets) {
      await page.evaluate(
        ([base, dx, dz]) => {
          const g = window.__game as unknown as Game;
          // Hold well clear of the unknown terrain out there: the seabed warning is urgent and
          // would own the slot, which is not what this test is about.
          const x = base.x + dx;
          const z = base.z + dz;
          const ground = g.terrain.sampleHeight(x, z);
          g.sub.position.set(x, Math.min(-3, Math.max(base.y, ground + 60)), z);
          g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          // Advance the completion banner without spending wall time or reward lifetime.
          g.discovery.update(0, 10, g.sub.position, g.sub.getForward(), { scan: false });
        },
        [base, dx, dz] as const,
      );
      await page.clock.runFor(34);
      // A place with a contact in range, or whose terrain raises an urgent warning, is no good.
      const unsuitable = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        return (
          g.discovery.scanner.view.nearestInRange ||
          document.querySelector('.guidance-slot')?.getAttribute('data-kind') === 'urgent'
        );
      });
      if (!unsuitable) break;
    }
  }

  for (const viewport of [
    { width: 844, height: 390, touch: true },
    { width: 667, height: 375, touch: true },
    { width: 390, height: 844, touch: true },
    { width: 1024, height: 768, touch: true },
    { width: 1280, height: 720, touch: true },
    { width: 1280, height: 720, touch: false },
  ]) {
    const tag = `${viewport.width}x${viewport.height}-${viewport.touch ? 'touch' : 'keyboard'}`;
    test.describe(tag, () => {
      test.use({ viewport, hasTouch: viewport.touch, isMobile: viewport.touch });
      for (const site of sites.landmarks) {
        // Regression guard: touch HUD controls overlapped contact/reward guidance and early scans lost tutorial progress.
        test(`${site}: tutorial, contact, reward, chip and reload`, async ({ page }) => {
          await pauseClockBeforeNavigation(page);
          await page.addInitScript(() => {
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
              JSON.stringify({
                version: 2,
                reduceMotion: true,
                graphicsTier: 'low',
              }),
            );
          });
          await page.goto(
            `/?mission=${site}&skipBriefing=1&tier=low${viewport.touch ? '&touch=1' : ''}`,
          );
          await ready(page);
          const card = page.locator(GUIDANCE.tutorial);
          const chip = page.locator(GUIDANCE.objective);
          // The tutorial never shares the screen with a scan card: one slot, one message.
          if (await page.locator(GUIDANCE.scan).isVisible()) await expect(card).toBeHidden();
          else await expect(card).toHaveAttribute('data-step', 'move');
          await layout(page, 'opening');

          const poi = await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            const id = g.discovery.scanner.view.objectiveId;
            const target = g.discovery.pois.find((p) => p.id === id);
            if (!target) throw new Error(`Missing opening objective ${id}`);
            const pose = g.discovery.spawnPose(target.id)!;
            g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
            return { id: target.id, position: { ...target.position }, from: { ...g.sub.position } };
          });
          const aim = scanAim(poi.from, poi.position, Math.PI / 2);
          await page.evaluate((aim) => {
            const g = window.__game as unknown as Game;
            g.sub.yaw = aim.yaw;
            g.sub.pitch = aim.pitch;
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          }, aim);
          await page.clock.runFor(34);
          await expect(page.locator(GUIDANCE.scan)).toBeVisible();
          await expect(chip).toBeHidden();
          await layout(page, 'contact in range');

          // Complete a real scan before its tutorial step: the tutorial must
          // retain it without advancing movement, and the reward stays on screen.
          if (viewport.touch) {
            const cdp = await page.context().newCDPSession(page);
            const button = (await page.locator('.tc-btn-scan').boundingBox())!;
            try {
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [
                  { x: button.x + button.width / 2, y: button.y + button.height / 2, id: 1 },
                ],
              });
              await completeScan(page, poi.id);
            } finally {
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
              await cdp.detach();
            }
          } else await scanWithKeyboard(page, poi.id);
          await page.clock.runFor(34);
          // The tutorial defers while the scan card is up, and the early scan is kept for its step.
          await expect(card).toBeHidden();
          await expect(page.locator(GUIDANCE.discovery)).toContainText('NEW ENTRY');
          await layout(page, 'early scan reward');
          await away(page);
          await expect(page.locator(GUIDANCE.discovery)).toBeHidden();
          for (const step of ['move', 'depth']) {
            await expect(card).toHaveAttribute('data-step', step);
            await expect(card).toBeVisible();
            await layout(page, `reward and tutorial ${step}`);
            if (viewport.touch) await page.locator('.guidance-skip').tap();
            else await page.locator('.guidance-skip').click();
            await page.clock.runFor(34);
          }
          // The remembered scan finishes the last step, so the tutorial ends here.
          await expect(card).toBeHidden();
          await reviewScreenshot(page, { path: `${shots}/${site}-${tag}-reward.png` });
          expect(
            await page.evaluate(
              () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone,
            ),
          ).toBe(true);
          await layout(page, 'finished tutorial and reward');

          await away(page);
          await expect(page.locator(GUIDANCE.scan)).toBeHidden();
          // Phones keep the standing objective line; desktop has the objectives panel.
          if (viewport.touch) await expect(chip).toBeVisible();
          else await expect(chip).toBeHidden();
          await layout(page, 'out of range with the standing objective');
          await reviewScreenshot(page, { path: `${shots}/${site}-${tag}-chip.png` });

          // Re-enter range, without a tutorial hiding the logged-contact card.
          await page.evaluate((poi) => {
            const g = window.__game as unknown as Game;
            g.sub.position.set(poi.from.x, poi.from.y, poi.from.z);
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          }, poi);
          await page.clock.runFor(500);
          // An unscanned contact in range outranks the logged one (Scanner), so the
          // slot may name either; the logged-contact text itself is pinned in d-scan.
          await expect(page.locator(GUIDANCE.any)).toBeVisible();
          await expect(card).toBeHidden();
          await layout(page, 'return to scanned contact');

          await page.reload();
          await ready(page);
          await expect(card).toBeHidden();
          await layout(page, 'reload remembers tutorial completion');
        });
      }
    });
  }
});

freshTest.describe('boost and Journal actions', () => {
  const test = experiencedTest;
  interface Game {
    input: Input;
    touch: TouchControls;
    journal: Journal;
    discovery: { loaded: boolean };
    props: { loaded: boolean };
    missionRouter: { endDive(): void };
  }
  const shots = '.cache/codex/shots/hud-touch/controls';

  async function boot(page: Page, touch: boolean): Promise<void> {
    await pauseClockBeforeNavigation(page);
    await page.goto(`/?mission=titanic&skipBriefing=1&tier=low${touch ? '&touch=1' : ''}`);
    await clockFramesUntil(page, () => {
      const g = window.__game as unknown as Game;
      return window.__gameReady === true && g.discovery.loaded && g.props.loaded;
    });
    await page.clock.fastForward(50);
  }

  async function layout(page: Page): Promise<void> {
    const issues = await page.evaluate(() => {
      const elements = [
        ...document.querySelectorAll<HTMLElement>(
          '.tc-stick, .tc-slider, .tc-btn, .hud-journal, .sonar, .hud-readouts, ' +
            '.objectives-panel, .guidance-slot, .hud-reset-camera',
        ),
      ].filter((el) => el.checkVisibility());
      const boxes = elements.map((el) => ({ name: el.className, r: el.getBoundingClientRect() }));
      const issues: string[] = [];
      for (const { name, r } of boxes) {
        if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)
          issues.push(`${name} offscreen: ${JSON.stringify(r)}`);
      }
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        for (const b of boxes.slice(i + 1)) {
          if (
            a.r.left < b.r.right &&
            b.r.left < a.r.right &&
            a.r.top < b.r.bottom &&
            b.r.top < a.r.bottom
          )
            issues.push(`${a.name} overlaps ${b.name}: ${JSON.stringify([a.r, b.r])}`);
        }
      }
      for (const el of elements.filter((el) => el.matches('.tc-btn, .hud-journal'))) {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!el.contains(hit)) issues.push(`${el.className} cannot receive a tap`);
        if (
          document.documentElement.classList.contains('is-touch') &&
          (r.width < 48 || r.height < 48)
        )
          issues.push(`${el.className} below 48px`);
      }
      return issues;
    });
    expect(issues).toEqual([]);
  }

  for (const v of [
    { width: 390, height: 844, name: 'portrait', touch: true },
    { width: 844, height: 390, name: 'landscape', touch: true },
    { width: 667, height: 375, name: 'landscape-small', touch: true },
    { width: 1024, height: 768, name: 'tablet', touch: true },
    { width: 1280, height: 720, name: 'desktop', touch: false },
  ]) {
    test.describe(v.name, () => {
      test.use({ viewport: v, hasTouch: v.touch, isMobile: v.touch });
      // Regression guard: touch Boost/Journal targets collided and the boost latch survived pause, depletion or dive end.
      test('separates every button, opens Journal through the action, and toggles Boost', async ({
        page,
      }) => {
        await boot(page, v.touch);
        await layout(page);
        await reviewScreenshot(page, { path: `${shots}/${v.name}.png` });
        const journal = page.locator('.hud-journal');
        await expect(journal).toHaveAttribute('title', 'Journal (J)');
        if (v.touch) {
          const boost = page.locator('.tc-btn-boost');
          const slider = (await page.locator('.tc-slider').boundingBox())!;
          const dock = (await boost.boundingBox())!;
          if (v.width < v.height) {
            expect(slider.x - dock.x - dock.width).toBeGreaterThanOrEqual(8);
            expect(slider.x - dock.x - dock.width).toBeLessThanOrEqual(20);
            expect(dock.y).toBeGreaterThanOrEqual(slider.y);
            expect(dock.y + dock.height).toBeLessThanOrEqual(slider.y + slider.height);
          } else {
            expect(Math.abs(slider.x - dock.x)).toBeLessThanOrEqual(1);
            expect(slider.y - dock.y - dock.height).toBeGreaterThanOrEqual(8);
            expect(slider.y - dock.y - dock.height).toBeLessThanOrEqual(16);
          }
          await expect(boost).toHaveAttribute('aria-pressed', 'false');
          await boost.tap();
          await page.clock.fastForward(50);
          await expect(boost).toHaveAttribute('aria-pressed', 'true');
          await expect(boost).toHaveClass(/is-active/);
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).input.state.boost),
          ).toBe(true);
          await reviewScreenshot(page, { path: `${shots}/${v.name}-boost-on.png` });
          await boost.tap();
          await page.clock.fastForward(50);
          await expect(boost).toHaveAttribute('aria-pressed', 'false');
          await reviewScreenshot(page, { path: `${shots}/${v.name}-boost-off.png` });
          await boost.tap();
          await page.clock.fastForward(50);
          await journal.tap();
        } else await journal.click();
        await page.clock.fastForward(50);
        await page.clock.fastForward(50);
        expect(await page.evaluate(() => (window.__game as unknown as Game).journal.isOpen)).toBe(
          true,
        );
        expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe(
          false,
        );
        await page.evaluate(() => (window.__game as unknown as Game).journal.close());
        await page.clock.fastForward(50);
        await layout(page);
        if (v.touch) {
          await expect(page.locator('.tc-btn-boost')).toHaveAttribute('aria-pressed', 'false');
          await page.locator('.tc-btn-boost').tap();
          await page.clock.fastForward(50);
          await page.locator('.tc-btn-pause').tap();
          await page.clock.fastForward(50);
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost),
          ).toBe(false);
          await expect(page.locator('.pause-menu')).toBeVisible();
          await expect(
            page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }),
          ).toBeVisible();
        } else {
          await page.keyboard.down('Shift');
          await page.clock.fastForward(50);
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).input.state.boost),
          ).toBe(true);
          await page.keyboard.up('Shift');
          await page.clock.fastForward(50);
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).input.state.boost),
          ).toBe(false);
        }
      });
    });
  }

  test.describe('touch boost reset', () => {
    test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    // Regression guard: touch Boost/Journal targets collided and the boost latch survived pause, depletion or dive end.
    test('meter depletion clears the latch and recovery requires another tap', async ({ page }) => {
      await boot(page, true);
      const boost = page.locator('.tc-btn-boost');
      await boost.tap();
      await page.clock.fastForward(50);
      await expect(boost).toHaveAttribute('aria-pressed', 'true');
      // Each rendered frame permits at most eight fixed steps. Advance until
      // the real progress system rejects boost rather than counting wall time.
      await clockFramesUntil(page, () => !(window.__game as unknown as Game).input.touchBoost, 250);
      await expect(boost).toHaveAttribute('aria-pressed', 'false');
      expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe(
        false,
      );
      for (let frame = 0; frame < 12; frame++) await page.clock.fastForward(250);
      await expect(boost).toHaveAttribute('aria-pressed', 'false');
      await boost.tap();
      await page.clock.fastForward(50);
      await expect(boost).toHaveAttribute('aria-pressed', 'true');
    });
    // Regression guard: touch Boost/Journal targets collided and the boost latch survived pause, depletion or dive end.
    test('hidden page and dive end clear the latch', async ({ page }) => {
      await boot(page, true);
      const boost = page.locator('.tc-btn-boost');
      await boost.tap();
      await page.clock.fastForward(50);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect(boost).toHaveAttribute('aria-pressed', 'false');
      await page.evaluate(() => {
        delete (document as unknown as { hidden?: boolean }).hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await boost.tap();
      await page.clock.fastForward(50);
      await page.evaluate(() => (window.__game as unknown as Game).missionRouter.endDive());
      await page.clock.fastForward(50);
      expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe(
        false,
      );
      await expect(page.locator('.tc-root')).toBeHidden();
    });
  });
});

freshTest.describe('surface mode HUD', () => {
  const test = freshTest;
  interface Game {
    discovery: Discovery;
    save: Save;
    sub: Submarine;
    props: Props;
    explore: { ready: boolean };
    config: { submarine: { hullRadius: number } };
  }

  const panels = [
    '.sonar',
    '.objectives-panel',
    '.hud-readouts',
    '.guidance-slot',
    '.hud-reset-camera',
    '.tc-stick',
    '.tc-slider',
    '.tc-buttons',
    '.tc-btn-pause',
    '.tc-rotate-hint',
  ];

  async function bounds(page: Page) {
    return page.evaluate(
      (selectors) =>
        selectors.flatMap((selector) => {
          const e = document.querySelector<HTMLElement>(selector);
          if (!e?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return [];
          const r = e.getBoundingClientRect();
          if (!r.width || !r.height) return [];
          return [
            {
              selector,
              text: e.innerText,
              ...r.toJSON(),
              clips: e.scrollWidth > e.clientWidth + 1,
            },
          ];
        }),
      panels,
    );
  }

  for (const layout of [
    { width: 1280, height: 800, touch: false },
    { width: 390, height: 844, touch: true },
    // The original surface failure was at this short-landscape breakpoint.
    { width: 844, height: 390, touch: true },
  ]) {
    test.describe(`Surface ${layout.width}x${layout.height}`, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: layout.touch,
        isMobile: layout.touch,
        deviceScaleFactor: 1,
        storageState: { cookies: [], origins: [] },
        serviceWorkers: 'block',
      });

      for (const mode of ['arcade', 'realistic'] as const) {
        // Regression guard: Blue Hole surface guidance and HUD overlapped on short landscape or large-mode telemetry.
        test(`${mode}: Blue Hole Surface HUD, scan card and hints stay separate`, async ({
          page,
        }, testInfo) => {
          test.setTimeout(180_000);
          const errors: string[] = [];
          page.on('pageerror', (e) => errors.push(e.message));
          page.on('console', (e) => {
            if (e.type() === 'error') errors.push(e.text());
          });
          await pauseClockBeforeNavigation(page);
          await page.addInitScript((gameplayMode) => {
            localStorage.setItem(
              'subexplorer.settings.v3',
              JSON.stringify({ version: 2, gameplayMode, reduceMotion: true }),
            );
          }, mode);
          await page.goto('/?mission=great-blue-hole&tier=low&dynres=0&tutorial=0&lifeSeed=42', {
            waitUntil: 'domcontentloaded',
          });
          await clockFramesUntil(page, () => {
            const g = window.__game as unknown as Game | undefined;
            return !!(
              window.__gameReady &&
              g?.discovery.loaded &&
              g.props.loaded &&
              g.explore.ready
            );
          });
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode),
          ).toBe(mode);
          await openBriefingAdvanced(page);
          await page.locator('.briefing input[data-gameplay="startPosition"]').check();
          if (layout.touch) await page.locator('.briefing-begin').tap();
          else await page.locator('.briefing-begin').click();
          await expect(page.locator('.briefing')).toBeHidden();
          await page.evaluate(() => document.fonts.ready.then(() => {}));
          // Render a stable Surface state; timers cannot expire a toast during capture.
          await page.clock.runFor(100);
          const surface = await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            return {
              y: g.sub.position.y,
              radius: g.config.submarine.hullRadius,
              start: g.save.get().gameplay.startPosition,
            };
          });
          expect(surface.start).toBe('surface');
          expect(surface.y).toBeGreaterThan(-20);
          expect(surface.y).toBeLessThanOrEqual(-surface.radius + 1);
          // Touch layouts carry the objective in the guidance slot, not a panel.
          for (const selector of [
            '.sonar',
            ...(layout.touch ? [] : ['.objectives-panel']),
            '.hud-readouts',
            ...(layout.touch ? ['.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause'] : []),
          ])
            await expect(page.locator(selector)).toBeVisible();
          if (mode === 'realistic') {
            await expect(page.locator('.hud-power')).toBeVisible();
            await expect(page.locator('.hud-current')).toBeVisible();
          }
          const auditSurface = async (name: string) => {
            const boxes = await bounds(page);
            // Save evidence before assertions: a persistent collision must be reviewable.
            const screenshot = testInfo.outputPath(`${name}.png`);
            await reviewScreenshot(page, { path: screenshot });
            const diagnostics = testInfo.outputPath(`${name}.json`);
            await writeFile(
              diagnostics,
              JSON.stringify(
                {
                  layout,
                  mode,
                  surface,
                  currentY: await page.evaluate(
                    () => (window.__game as unknown as Game).sub.position.y,
                  ),
                  boxes,
                  errors,
                },
                null,
                2,
              ),
            );
            if (renderReview)
              await testInfo.attach(name, { path: screenshot, contentType: 'image/png' });
            await testInfo.attach(`${name}-bounds`, {
              path: diagnostics,
              contentType: 'application/json',
            });
            expect.soft(errors).toEqual([]);
            for (const b of boxes) {
              expect.soft(b.left, `${b.selector} left`).toBeGreaterThanOrEqual(0);
              expect.soft(b.top, `${b.selector} top`).toBeGreaterThanOrEqual(0);
              expect.soft(b.right, `${b.selector} right`).toBeLessThanOrEqual(layout.width);
              expect.soft(b.bottom, `${b.selector} bottom`).toBeLessThanOrEqual(layout.height);
              expect.soft(b.clips, `${b.selector} clips text`).toBe(false);
            }
            for (let i = 0; i < boxes.length; i++)
              for (const b of boxes.slice(i + 1)) {
                const a = boxes[i];
                expect
                  .soft(
                    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
                    `${a.selector} overlaps ${b.selector}: ${JSON.stringify([a, b])}`,
                  )
                  .toBe(false);
              }
          };
          await auditSurface('surface');

          // Separate component stress case: the live repro above has no injected
          // scan or hint state. Complete the real tutorial through its button to
          // produce its real toast, then render an authored contact's completion
          // card without claiming a scan occurred at the surface.
          await page.evaluate(() => {
            // The completion note shares the slot with contextual hints. This
            // fixture owns completion; animal hints have separate live coverage
            // in the animal-guidance and first-minute capabilities.
            localStorage.setItem(
              'subexplorer.onboard.v1',
              JSON.stringify({ version: 1, seenHints: ['creature'] }),
            );
          });
          await page.goto('/?mission=great-blue-hole&tier=low&dynres=0&tutorial=1&lifeSeed=42', {
            waitUntil: 'domcontentloaded',
          });
          await clockFramesUntil(page, () => {
            const g = window.__game as unknown as Game | undefined;
            return !!(
              window.__gameReady &&
              g?.discovery.loaded &&
              g.props.loaded &&
              g.explore.ready
            );
          });
          await openBriefingAdvanced(page);
          await page.locator('.briefing input[data-gameplay="startPosition"]').check();
          if (layout.touch) await page.locator('.briefing-begin').tap();
          else await page.locator('.briefing-begin').click();
          await page.clock.runFor(100);
          await dismissTutorial(page, layout.touch, true);
          await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            const contact = g.discovery.pois[0];
            if (!contact) throw new Error('No authored contact for the Surface stress case');
            g.discovery.overlay.showComplete(contact.name, true, { scan: 'G', guide: 'J' });
          });
          await page.clock.runFor(100);
          await expect(page.locator(GUIDANCE.tutorial)).toBeHidden();
          await expect(page.locator(GUIDANCE.discovery)).toBeVisible();
          // The "Nice work" note waits behind the result instead of stacking with it.
          await expect(page.locator(GUIDANCE.any)).toHaveCount(1);
          expect(
            await page.evaluate(() => (window.__game as unknown as Game).sub.position.y),
          ).toBeGreaterThan(-20);
          await auditSurface('surface-card-and-toast');
        });
      }
    });
  }
});
