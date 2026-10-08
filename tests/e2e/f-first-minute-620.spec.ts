import { expectObjectiveGuidance } from './helpers/phoneHud.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };
import type { Discovery } from '../../src/game/Discovery.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Mission } from '../../src/game/Mission.js';
import { processedFrames } from './helpers/hudTips.js';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const round = env.FIRSTMIN_ROUND ?? 'after';
const audit = env.FIRSTMIN_AUDIT === '1';
const rounds = env.ROUNDS === '2' ? 2 : 1;
const shots = `.cache/codex/shots/620/${round}`;
type Game = {
  discovery: Discovery;
  sub: Submarine;
  mission: Mission;
  onboard: { tutorial: { index: number } };
};

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(() => (window.__game as unknown as Game).discovery.loaded);
}

async function hold(
  page: Page,
  touch: boolean,
  selector: string,
  key: string,
  ms: number,
): Promise<void> {
  if (!touch) {
    await page.keyboard.down(key);
    try {
      if (ms > 0) await page.waitForTimeout(ms);
      else
        await page.waitForFunction(
          () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved,
        );
      await processedFrames(page);
    } finally {
      await page.keyboard.up(key);
    }
    return;
  }
  const box = (await page.locator(selector).boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    if (selector === '.tc-stick')
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height * 0.1 }],
      });
    if (ms > 0) await page.waitForTimeout(ms);
    else
      await page.waitForFunction(
        () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved,
      );
    await processedFrames(page);
  } finally {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  }
}

for (let pass = 1; pass <= rounds; pass++) {
  for (const layout of [
    { name: 'desktop', width: 1280, height: 800, touch: false },
    { name: 'touch', width: 390, height: 844, touch: true },
  ]) {
    test.describe(`620 round ${pass} ${layout.name}`, () => {
      test.use({
        viewport: { width: layout.width, height: layout.height },
        hasTouch: layout.touch,
        isMobile: layout.touch,
        deviceScaleFactor: 1,
        storageState: { cookies: [], origins: [] },
        serviceWorkers: 'block',
      });
      for (const site of catalog.landmarks) {
        test(`first minute ${site}`, async ({ page }) => {
          test.skip(!audit, 'Opt-in real 60-second capture: FIRSTMIN_AUDIT=1.');
          test.setTimeout(900_000);
          const dir = `${shots}/round-${pass}/${layout.name}/${site}`;
          await mkdir(dir, { recursive: true });
          const errors: string[] = [];
          const records: unknown[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const shot = async (name: string): Promise<void> => {
            const path = `${dir}/${name}.png`;
            await page.screenshot({ path });
            records.push({
              path,
              ...(await page.evaluate(() => {
                const g = window.__game as unknown as Game;
                const selectors = [
                  '.onboard-card',
                  '.onboard-hint',
                  '.hud-control-tips',
                  '.scan-panel',
                  '.objectives-panel',
                  '.obj-item.is-current',
                  '.hud-readouts',
                  '.tc-stick',
                  '.tc-slider',
                  '.tc-buttons',
                ];
                return {
                  elapsedS: g.discovery.stats.elapsedS,
                  tutorialStep: g.onboard.tutorial.index,
                  scan: g.discovery.scanner.view,
                  position: g.sub.position,
                  objectives: g.mission?.objectives,
                  panels: selectors.flatMap((selector) => {
                    const element = document.querySelector<HTMLElement>(selector);
                    if (!element?.getClientRects().length) return [];
                    return [
                      {
                        selector,
                        text: element.innerText,
                        rect: element.getBoundingClientRect().toJSON(),
                      },
                    ];
                  }),
                };
              })),
            });
            await writeFile(`${dir}/manifest.json`, JSON.stringify({ errors, records }, null, 2));
          };
          await page.goto('/', { waitUntil: 'domcontentloaded' });
          await ready(page);
          await expect(page.locator('.home-screen')).toBeVisible();
          await shot('home');
          const sites = page
            .locator('.home-menu')
            .getByRole('button', { name: 'Dive sites', exact: true });
          if (layout.touch) await sites.tap();
          else await sites.click();
          const choice = page.locator(`.home-sites [data-mission="${site}"]`);
          await expect(choice).toBeEnabled();
          await choice.scrollIntoViewIfNeeded();
          if (layout.touch) await choice.tap();
          else await choice.click();
          await ready(page);
          await expect(page.locator('.briefing')).toBeVisible();
          await shot('briefing');
          const begin = page.locator('.briefing-begin');
          await begin.scrollIntoViewIfNeeded();
          if (layout.touch) await begin.tap();
          else await begin.click();
          await expect(page.locator('.briefing')).toBeHidden();
          await shot('00s');
          for (const seconds of [10, 20, 30, 40, 50, 60]) {
            await page.waitForFunction(
              (seconds) => (window.__game as unknown as Game).discovery.stats.elapsedS >= seconds,
              seconds,
              { timeout: 120_000 },
            );
            await shot(`${seconds}s`);
            // Read the rendered prompt and use native input; no pose/clock/physics changes.
            if (seconds === 10) await hold(page, layout.touch, '.tc-stick', 'KeyW', 1500);
            if (
              seconds === 20 &&
              ((await page.locator('.scan-hint').textContent()) ?? '').includes('HOLD')
            )
              await hold(page, layout.touch, '.tc-btn-scan', 'KeyG', 4500);
          }
          expect(errors).toEqual([]);
          if (round !== 'before') {
            await expect(page.locator('.hud-control-tips')).toBeHidden();
            await expectObjectiveGuidance(page, layout.touch);
          }
        });
      }
    });
  }
}

for (const layout of [
  { name: 'desktop', width: 1280, height: 800, touch: false },
  { name: 'portrait', width: 390, height: 844, touch: true },
  { name: 'landscape', width: 844, height: 390, touch: true },
]) {
  test.describe(`620 guidance ${layout.name}`, () => {
    test.skip(round === 'before', 'Baseline captures do not include the fixed guidance hooks.');
    test.use({
      viewport: { width: layout.width, height: layout.height },
      hasTouch: layout.touch,
      isMobile: layout.touch,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });

    test('idle guidance expires at twelve seconds and Controls remains available', async ({
      page,
    }) => {
      await page.clock.install();
      await page.goto('/?mission=titanic&skipBriefing=1&tier=low');
      await ready(page);
      const tips = page.locator('.hud-control-tips');
      if (!layout.touch) await expect(tips).toBeVisible();
      await expectObjectiveGuidance(page, layout.touch);
      const remaining = await page.evaluate(() => {
        const g = window.__game as { cameraTips: { until: number; moved: boolean } };
        return { ms: g.cameraTips.until - performance.now(), moved: g.cameraTips.moved };
      });
      expect(remaining.moved).toBe(false);
      expect(remaining.ms).toBeGreaterThan(0);
      expect(remaining.ms).toBeLessThanOrEqual(12_000);
      await page.clock.fastForward(remaining.ms + 100);
      await expect(tips).toBeHidden();
      expect(
        await page.evaluate(
          () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved,
        ),
      ).toBe(false);
      // Expiry is not tutorial completion or a change of gameplay defaults.
      await expect(page.locator('.onboard-card')).toBeVisible();
      if (layout.touch) await page.locator('.tc-btn-pause').tap();
      else await page.keyboard.press('Escape');
      const controls = page
        .locator('.pause-menu')
        .getByRole('button', { name: 'Controls', exact: true });
      if (layout.touch) await controls.tap();
      else await controls.click();
      await expect(page.getByRole('dialog', { name: 'Controls guide' })).toBeVisible();
    });

    test('animal hint and strip fade on the first actual move; scan stays separate', async ({
      page,
    }) => {
      await page.clock.install();
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.onboard.v1',
          JSON.stringify({
            version: 1,
            tutorialDone: true,
            seenHints: ['battery-low', 'near-hull', 'scan-target', 'rov'],
          }),
        );
      });
      await page.goto('/?mission=great-blue-hole&skipBriefing=1&tier=low&lifeSeed=3');
      await ready(page);
      await page.waitForFunction(() => !!(window.__game as { life: unknown }).life);
      const spawned = await page.evaluate(() => {
        const g = window.__game as unknown as {
          sub: Submarine;
          life: import('../../src/world/life/Life.js').Life;
          rig: { camera: import('three').PerspectiveCamera };
        };
        const position = {
          ...g.sub.position,
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
        g.life.sim.clear();
        const animal = g.life.sim.spawnNear('comb-jelly', position, 9, 1);
        g.life.update(0, position, g.rig.camera, window.innerHeight, 0);
        g.life.enabled = false;
        return animal !== null;
      });
      expect(spawned).toBe(true);
      const hint = page.locator('.onboard-hint');
      await expect(hint).toContainText('Animal nearby');
      await expect(hint).toBeVisible();
      // Long completion names exercise the same flow as long scan targets.
      await page.evaluate(() =>
        (window.__game as unknown as Game).discovery.overlay.showComplete(
          'A long contact name ABCDEFGHIJKLMNOPQRSTUVWXYZ with a wrapped second line',
          true,
          { scan: 'G', guide: 'J' },
        ),
      );
      const target = (await page.locator('.scan-panel').boundingBox())!;
      const toast = (await hint.boundingBox())!;
      expect(toast.y).toBeGreaterThanOrEqual(target.y + target.height + 7);
      expect(toast.x).toBeCloseTo(target.x, 0);
      await mkdir(`${shots}/checks`, { recursive: true });
      await page.screenshot({ path: `${shots}/checks/${layout.name}-wrapped-toast.png` });
      await hold(page, layout.touch, '.tc-stick', 'KeyW', 0);
      await expect(hint).toBeHidden();
      await expect(page.locator('.hud-control-tips')).toBeHidden();
      await expect(page.locator('.scan-panel')).toBeVisible();
      await expectObjectiveGuidance(page, layout.touch);
      await page.screenshot({ path: `${shots}/checks/${layout.name}-after-move.png` });
    });
  });
}
