import { dismissTutorial } from './helpers/tutorial.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import type { Life } from '../../src/world/life/Life.js';
import type { HintEngine } from '../../src/game/Hints.js';
import type { ScanOverlay } from '../../src/ui/ScanOverlay.js';
import type { PerspectiveCamera, Vector3 } from 'three';
import { GUIDANCE } from './helpers/guidance.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

const shots = '.cache/codex/shots/550-f-toast-placement';

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
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height,
        `${a.selector} overlaps ${b.selector}`,
      ).toBe(false);
    }
  }
}

async function screenshot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
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
      test(`${site}: the animal hint waits for the scan card, then clears the HUD`, async ({
        page,
      }) => {
        await pauseClockBeforeNavigation(page);
        await page.addInitScript((scale) => {
          localStorage.setItem(
            'subexplorer.settings.v3',
            JSON.stringify({ version: 2, uiScale: scale, reduceMotion: true, graphicsTier: 'low' }),
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
            window.__gameReady === true && !!game.life && game.discovery.loaded && game.props.loaded
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
        // Once the contact is out of the way the hint takes the same slot, clear of the HUD.
        await page.evaluate(() => {
          (window.__game as unknown as Probe).discovery.overlay.setSuppressed(true);
        });
        for (let frame = 0; frame < 40; frame++) {
          if (await hint.textContent().then((text) => text?.includes('Animal nearby.'))) break;
          await page.clock.fastForward(250);
        }
        await expect(hint).toContainText(
          layout.touch
            ? 'Animal nearby. Hold SCAN to scan, or use PHOTO for a photo.'
            : 'Animal nearby. Hold G to scan, or use P for a photo.',
        );
        await screenshot(page, `${site}-${name}`);
        await separate(page, [...hud, GUIDANCE.any, ...controls]);
        // The clock was paused before navigation, so only these frames spend its lifetime.
        for (let frame = 0; frame < 60; frame++) await page.clock.fastForward(250);
        await expect(hint).toBeHidden();
      });
    }
  });
}
