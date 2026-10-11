import { expect, test, type Page } from '@playwright/test';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import sites from '../../data/landmarks/index.json' with { type: 'json' };
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { completeScan, scanWithKeyboard } from './helpers/scan.js';
import { scanAim } from './helpers/scanAim.js';

interface Game {
  discovery: Discovery;
  sub: Submarine;
  rig: CameraRig;
  props: { loaded: boolean };
}

const shots = '.cache/codex/shots/1390-f-bughunt-hud-touch-overlap';
const selectors = [
  '.sonar',
  '.objectives-panel',
  '.hud-readouts',
  '.scan-panel',
  '.scan-objective-chip',
  '.onboard-card',
  '.onboard-hint',
  '.hud-notice',
  '.tc-stick',
  '.tc-slider',
  '.tc-buttons',
  '.tc-btn-pause',
  '.hud-control-tips',
  '.hud-reset-camera',
];

async function layout(page: Page, phase: string): Promise<void> {
  // The objectives panel republishes --obj-panel-bottom from a ResizeObserver, which
  // runs in the next real rendering step (not on the fake clock). Wait for one
  // so a measurement taken right after a content change sees the settled layout.
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
        g.sub.position.set(base.x + dx, base.y, base.z + dz);
        g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
        // Advance the completion banner without spending wall time or reward lifetime.
        g.discovery.update(0, 10, g.sub.position, g.sub.getForward(), { scan: false });
      },
      [base, dx, dz] as const,
    );
    await page.clock.runFor(34);
    const inRange = await page.evaluate(
      () => (window.__game as unknown as Game).discovery.scanner.view.nearestInRange,
    );
    if (!inRange) break;
  }
}

for (const viewport of [
  { width: 844, height: 390, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 1280, height: 720, touch: true },
  { width: 1280, height: 720, touch: false },
]) {
  const tag = `${viewport.width}x${viewport.height}-${viewport.touch ? 'touch' : 'keyboard'}`;
  test.describe(tag, () => {
    test.use({ viewport, hasTouch: viewport.touch, isMobile: viewport.touch });
    for (const site of sites.landmarks) {
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
            'subexplorer.settings.v2',
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
        const card = page.locator('.onboard-card');
        const chip = page.locator('.scan-objective-chip');
        await expect(card).toHaveAttribute('data-step', 'move');
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
        await expect(page.locator('.scan-panel')).toBeVisible();
        await expect(chip).toBeHidden();
        await layout(page, 'contact in range');

        // Complete a real scan before its tutorial step: f-tutorial-order must
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
        await expect(card).toHaveAttribute('data-step', 'move');
        await expect(page.locator('.hud-notice')).toContainText('New discovery');
        await layout(page, 'early scan reward');
        for (const step of ['move', 'depth', 'lights']) {
          await expect(card).toHaveAttribute('data-step', step);
          await layout(page, `reward and tutorial ${step}`);
          if (viewport.touch) await page.locator('.onboard-skip-step').tap();
          else await page.locator('.onboard-skip-step').click();
          await page.clock.runFor(34);
        }
        await expect(card).toHaveAttribute('data-step', 'journal');
        await expect(page.locator('.hud-notice')).toBeVisible();
        await layout(page, 'collapsed journal and reward');
        await page.screenshot({ path: `${shots}/${site}-${tag}-reward.png` });
        await away(page);
        await expect(page.locator('.scan-panel')).toBeHidden();
        if (viewport.touch) await expect(chip).toBeVisible();
        await layout(page, 'journal strip with objective chip and reward');
        await page.screenshot({ path: `${shots}/${site}-${tag}-journal-chip.png` });
        if (viewport.touch) await page.locator('.onboard-skip-step').tap();
        else await page.locator('.onboard-skip-step').click();
        await page.clock.runFor(34);
        await expect(card).toBeHidden();
        expect(
          await page.evaluate(
            () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone,
          ),
        ).toBe(true);
        await layout(page, 'finished tutorial and reward');

        await away(page);
        await expect(page.locator('.scan-panel')).toBeHidden();
        if (viewport.touch) {
          await expect(chip).toBeVisible();
          expect((await chip.boundingBox())!.height).toBeLessThanOrEqual(28);
        } else await expect(chip).toBeHidden();
        await layout(page, 'out of range chip with hint and reward');
        await page.screenshot({ path: `${shots}/${site}-${tag}-chip.png` });

        // Re-enter range while the chip is visible, without a tutorial hiding it.
        await page.evaluate((poi) => {
          const g = window.__game as unknown as Game;
          g.sub.position.set(poi.from.x, poi.from.y, poi.from.z);
          g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
        }, poi);
        await page.clock.runFor(34);
        await expect(page.locator('.scan-panel')).toBeVisible();
        await expect(chip).toBeHidden();
        await layout(page, 'return to scanned contact');

        await page.reload();
        await ready(page);
        await expect(card).toBeHidden();
        await layout(page, 'reload remembers tutorial completion');
      });
    }
  });
}
