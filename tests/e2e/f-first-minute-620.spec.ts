import { pauseClockBeforeNavigation, clockFramesUntil, withClockFrames } from './helpers/clock.js';
import { reviewShot } from './helpers/render.js';
import { expectCompactPhoneHud, expectObjectiveGuidance } from './helpers/phoneHud.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };
import type { Discovery } from '../../src/game/Discovery.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Mission } from '../../src/game/Mission.js';
import { finishAnimations, processedFrames } from './helpers/hudTips.js';
import { GUIDANCE } from './helpers/guidance.js';
import { homeReady, openSiteList, swipeSiteList } from './helpers/home.js';
import { diveReady } from './helpers/dive.js';
import { readGoldenBuild } from '../../tools/golden-build.mjs';

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
  onboard: { tutorial: { index: number; active: boolean } };
};

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
    if (selector === '.tc-stick' || selector === '.tc-slider')
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
    { name: 'landscape', width: 844, height: 390, touch: true },
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
      for (const site of [...catalog.landmarks, 'globe']) {
        test(`first minute ${site}`, async ({ page }) => {
          // Regression guard: Home has no dive runtime; both picker paths must reach coaching.
          test.skip(!audit, 'Opt-in real 60-second capture: FIRSTMIN_AUDIT=1.');
          test.setTimeout(900_000);
          const dir = `${shots}/round-${pass}/${layout.name}/${site}`;
          await mkdir(dir, { recursive: true });
          const errors: string[] = [];
          const records: unknown[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const shot = async (name: string, duringDive = false): Promise<void> => {
            const path = `${dir}/${name}.png`;
            await page.screenshot({ path });
            records.push({
              path,
              url: page.url(),
              ...(await page.evaluate(() => {
                const g = window.__game as unknown as Partial<Game> & { appState: string };
                const selectors = [
                  '.home-panel',
                  '.home-sites',
                  '.home-sites-scroll',
                  '.briefing-panel',
                  '.guidance-slot',
                  '.objectives-panel',
                  '.obj-item.is-current',
                  '.hud-readouts',
                  '.tc-stick',
                  '.tc-slider',
                  '.tc-buttons',
                ];
                return {
                  appState: g.appState,
                  visibleText: document.body.innerText,
                  missionId: g.mission?.id,
                  elapsedS: g.discovery?.stats.elapsedS,
                  tutorialStep: g.onboard?.tutorial.index,
                  scan: g.discovery?.scanner.view,
                  position: g.sub?.position,
                  objectives: g.mission?.objectives,
                  panels: selectors.flatMap((selector) => {
                    const element = document.querySelector<HTMLElement>(selector);
                    if (!element?.checkVisibility()) return [];
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
            await writeFile(
              `${dir}/manifest.json`,
              JSON.stringify({ build, errors, records }, null, 2),
            );
            if (layout.touch) {
              expect(await page.locator('body').innerText()).not.toMatch(
                /\b(Space|Enter|Esc|Ctrl|Shift|WASD|press)\b/i,
              );
              if (duringDive) await expectCompactPhoneHud(page);
            }
          };
          await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
          await homeReady(page);
          const build = readGoldenBuild(await page.content());
          await shot('home');
          const sites = page
            .locator('.home-menu')
            .getByRole('button', { name: 'Dive sites', exact: true });
          if (layout.touch) await sites.tap();
          else await sites.click();
          let selectedSite = site;
          if (site === 'globe') {
            await page.waitForFunction(
              () =>
                (window.__game as { homeGlobe: { textureReady: boolean } }).homeGlobe.textureReady,
            );
            const visiblePin = page
              .locator('.globe.is-embedded .globe-pin.is-mission:not(.is-clustered):not(.is-back)')
              .first();
            await expect(visiblePin).toBeVisible();
            selectedSite = (await visiblePin.getAttribute('data-landmark'))!;
            const pin = page.locator(
              `.globe.is-embedded .globe-pin[data-landmark="${selectedSite}"]`,
            );
            if (layout.touch) {
              await pin.tap();
              await expect(pin.locator('.globe-pin-label')).toBeVisible();
              await expect(page.locator('.home-screen')).toBeVisible();
              await shot('pin-preview');
            }
            await shot('site-picker');
            if (layout.touch) await pin.tap();
            else await pin.click();
          } else {
            if (layout.touch && (await page.locator('.home-sites-grab').isVisible())) {
              await swipeSiteList(page);
              await finishAnimations(page, '.home-sites');
            } else await openSiteList(page, layout.touch);
            const choice = page.locator(`.home-sites [data-mission="${site}"]`);
            await expect(choice).toBeEnabled();
            await choice.scrollIntoViewIfNeeded();
            await shot('site-picker');
            if (layout.touch) await choice.tap();
            else await choice.click();
          }
          await page.waitForURL((url) => url.searchParams.get('mission') === selectedSite);
          await diveReady(page);
          await expect(page.locator('.briefing')).toBeVisible();
          await shot('briefing');
          const begin = page.locator('.briefing-begin');
          await begin.scrollIntoViewIfNeeded();
          if (layout.touch) await begin.tap();
          else await begin.click();
          await expect(page.locator('.briefing')).toBeHidden();
          await shot('00s', true);
          for (const seconds of [10, 20, 30, 40, 50, 60]) {
            await page.waitForFunction(
              (seconds) => (window.__game as unknown as Game).discovery.stats.elapsedS >= seconds,
              seconds,
              { timeout: 120_000 },
            );
            await shot(`${seconds}s`, true);
            // Read the rendered prompt and use native input; no pose/clock/physics changes.
            if (seconds === 10) await hold(page, layout.touch, '.tc-stick', 'KeyW', 1500);
            if (
              seconds === 20 &&
              (await page.locator('.guidance-slot[data-step="depth"]').isVisible())
            )
              await hold(page, layout.touch, '.tc-slider', 'Space', 1200);
            if (
              seconds === 30 &&
              /\bhold\b/i.test((await page.locator('.guidance-slot').innerText()) ?? '')
            )
              await hold(page, layout.touch, '.tc-btn-scan', 'KeyG', 4500);
          }
          expect(errors).toEqual([]);
          if (round !== 'before') {
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

    test('Controls stays reachable from Pause while the tutorial is up', async ({ page }) => {
      await page.clock.install();
      await page.goto('/?mission=titanic&skipBriefing=1&tier=low');
      await diveReady(page);
      await expectObjectiveGuidance(page, layout.touch);
      expect(
        await page.evaluate(
          () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved,
        ),
      ).toBe(false);
      // Pausing is not tutorial completion or a change of gameplay defaults.
      expect(
        await page.evaluate(() => (window.__game as unknown as Game).onboard.tutorial.active),
      ).toBe(true);
      if (layout.touch) await page.locator('.tc-btn-pause').tap();
      else await page.keyboard.press('Escape');
      const controls = page
        .locator('.pause-menu')
        .getByRole('button', { name: layout.touch ? 'How to play' : 'Controls', exact: true });
      if (layout.touch) await controls.tap();
      else await controls.click();
      await expect(
        page.getByRole('dialog', { name: layout.touch ? 'How to play' : 'Controls guide' }),
      ).toBeVisible();
    });

    test('an animal in range is named by the scan card, with no separate tip', async ({ page }) => {
      await pauseClockBeforeNavigation(page);
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.onboard.v1',
          JSON.stringify({
            version: 1,
            tutorialDone: true,
            seenHints: ['battery-low', 'near-hull', 'scan-target'],
          }),
        );
      });
      await page.goto('/?mission=great-blue-hole&skipBriefing=1&tier=low&lifeSeed=3');
      await clockFramesUntil(
        page,
        () => window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded,
      );
      await clockFramesUntil(page, () => !!(window.__game as { life: unknown }).life);
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
      // An animal in range is announced by the scan card itself, so the separate
      // "Animal nearby" tip stays out of the slot (it would only repeat the card).
      await clockFramesUntil(
        page,
        () =>
          document
            .querySelector('.guidance-slot[data-kind="scan"]')
            ?.textContent?.includes('Lobate comb jelly') === true,
        250,
      );
      await expect(page.locator(GUIDANCE.scan)).toBeVisible();
      await expect(page.locator(GUIDANCE.hint)).toBeHidden();
      await reviewShot(page, `${layout.name}-animal-hint`);
      await withClockFrames(page, () => hold(page, layout.touch, '.tc-stick', 'KeyW', 0));
      await page.clock.fastForward(250);
      await expect(page.locator(GUIDANCE.hint)).toBeHidden();
      await page.clock.fastForward(250);
      await expectObjectiveGuidance(page, layout.touch);
      await reviewShot(page, `${layout.name}-after-move`);
    });
  });
}
