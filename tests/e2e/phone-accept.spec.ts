import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { homeReady, openSiteList } from './helpers/home.js';
import { expectHudClear, expectObjectiveGuidance } from './helpers/phoneHud.js';
import { completeScan } from './helpers/scan.js';
import { journalEntries, openJournalSite } from './helpers/journal.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { MissionRouter } from '../../src/game/MissionRouter.js';
import type { Save } from '../../src/core/Save.js';
import type { AnchoredEvents, EventContact } from '../../src/game/Events.js';
import type { Scene } from 'three';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };

type Game = {
  sub: Submarine;
  missionRouter: MissionRouter;
  save: Save;
  rig: CameraRig;
  discovery: Discovery;
  props: { loaded: boolean };
  perf: { tier: string };
  scene: Scene;
  explore: { ready: boolean; events: AnchoredEvents; eventContacts: EventContact[] };
};

const keyNames = /\b(Space|Enter|Esc|Escape|Ctrl|Shift|WASD)\b|\bpress [A-Z]\b/i;
const touchControls = [
  '.tc-stick',
  '.tc-slider',
  '.tc-btn-scan',
  '.tc-btn-lights',
  '.tc-btn-sonar',
  '.tc-btn-photo',
  '.tc-btn-pause',
  '.hud-journal',
];

for (const viewport of [
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
  { width: 1280, height: 800, touch: false },
]) {
  test.describe(`first minute acceptance ${viewport.width}x${viewport.height}`, () => {
    const touch = viewport.touch;
    test.use({
      viewport,
      hasTouch: touch,
      isMobile: touch,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });
    test.beforeEach(async ({ page }) => {
      await pauseClockBeforeNavigation(page);
      // Unlock the catalogue, but leave the tutorial, discoveries and default mode fresh.
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
            version: 3,
            graphicsTier: 'low',
            reduceMotion: true,
          }),
        );
      });
    });
    test.afterEach(async ({ page }, info) => {
      // Teardown has a fresh test budget; a stalled renderer must not spend it on evidence.
      if (info.status === 'timedOut') return;
      await page.screenshot({ path: info.outputPath('last-state.png'), timeout: 5_000 });
    });
    for (const site of catalog.landmarks) {
      test(`${site}: guidance reaches first scan within sixty seconds and debrief exits`, async ({
        page,
      }, info) => {
        // Regression guard: idle or pose-assisted checks miss unreachable first targets,
        // covered guidance, frozen input and debrief exits that strand the player.
        // Keep the configured per-test budget, including shorter diagnostic CLI timeouts.
        const act = (target: Locator): Promise<void> => (touch ? target.tap() : target.click());
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const shot = async (name: string): Promise<void> => {
          const path = info.outputPath(`${name}.png`);
          await page.screenshot({ path });
          await info.attach(name, { path, contentType: 'image/png' });
        };
        await page.goto(`/?tier=low${touch ? '&touch=1' : ''}`, { waitUntil: 'domcontentloaded' });
        await homeReady(page, true);
        await reachable(page.locator('.home-primary'));
        const sites = page.locator('.home-menu').getByRole('button', { name: 'Dive sites' });
        await reachable(sites);
        await shot('home');
        await act(sites);
        const sheet = page.locator('.home-sites');
        await reachable(sheet.getByRole('button', { name: 'Back to menu' }));
        if (viewport.width < viewport.height) {
          await expect(sheet.locator('.home-sites-grab')).toHaveAttribute('aria-expanded', 'false');
          expect((await sheet.boundingBox())!.height, 'picker starts at half height').toBeCloseTo(
            viewport.height / 2,
            0,
          );
        }
        await shot('site-picker');
        await openSiteList(page, touch, true);
        const choice = sheet.locator(`[data-mission="${site}"]`);
        // Scrolling the list is deliberate; reachability is measured before tapping.
        await choice.evaluate((element) => element.scrollIntoView({ block: 'nearest' }));
        await reachable(choice);
        await act(choice);
        await expect(page).toHaveURL((url) => url.searchParams.get('mission') === site);
        for (const key of ['poi', 'at', 'depth', 'skipBriefing', 'debrief'])
          expect(
            new URL(page.url()).searchParams.has(key),
            `ordinary mission URL has no ${key} probe`,
          ).toBe(false);
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as Game;
          return !!(window.__gameReady && g.discovery?.loaded && g.props.loaded);
        });
        const briefing = page.getByRole('dialog', { name: 'Mission briefing' });
        await expect(briefing).toBeVisible();
        if (touch) await expect(briefing).not.toContainText(keyNames, { useInnerText: true });
        for (const objective of await briefing.locator('.briefing-objectives li').all())
          await expect(objective).toBeInViewport({ ratio: 1 });
        await reachable(briefing.locator('.briefing-begin'));
        await shot('briefing');
        await act(briefing.locator('.briefing-begin'));
        await page.clock.runFor(50);
        await expect(briefing).toBeHidden();

        const settings = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          return { mode: g.save.get().gameplayMode, tier: g.perf.tier };
        });
        expect(settings).toEqual({ mode: 'arcade', tier: 'low' });
        const first = await firstMinute(page, touch, info);
        await shot('first-minute');
        await expect(page.locator('.hud-journal')).toBeVisible();
        await reachable(page.locator('.hud-journal'));
        const surfaceDive = async (): Promise<void> => {
          if (touch) await act(page.locator('.tc-btn-pause'));
          else await page.keyboard.press('Escape');
          await act(
            page.locator('.pause-menu').getByRole('button', {
              name: 'Surface and debrief',
              exact: true,
            }),
          );
        };
        if (touch) await act(page.locator('.tc-btn-pause'));
        else await page.keyboard.press('Escape');
        const pause = page.locator('.pause-menu');
        await expect(pause).toBeVisible();
        const surface = pause.getByRole('button', { name: 'Surface and debrief', exact: true });
        await reachable(surface);
        const actionsBox = (await pause.locator('.pause-actions').boundingBox())!;
        const surfaceBox = (await surface.boundingBox())!;
        expect(surfaceBox.x).toBeCloseTo(actionsBox.x, 0);
        expect(surfaceBox.width, 'Surface spans the full pause grid').toBeCloseTo(
          actionsBox.width,
          0,
        );
        await shot('pause');
        await act(surface);
        const debrief = page.locator('.mission-debrief');
        await expect(debrief).toBeVisible();
        await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('1');
        await expect(debrief.locator('.debrief-highlight')).toContainText(first.name);
        const primaryTotal = await page.evaluate(
          () =>
            (window.__game as unknown as Game).missionRouter.mission.def.objectives.filter(
              (o) => o.primary,
            ).length,
        );
        await expect(debrief.locator('[data-field="objectives"]')).toHaveText(
          `1 of ${primaryTotal} primary objectives`,
        );
        await reachable(debrief.getByRole('button', { name: 'Keep exploring', exact: true }));
        await act(debrief.getByRole('button', { name: 'Keep exploring', exact: true }));
        await page.clock.fastForward(100);
        await expect(debrief).toBeHidden();
        await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(0);
        // Closing the first debrief must restore actual input, not only hide its panel.
        const before = await page.evaluate(() => (window.__game as unknown as Game).sub.yaw);
        await pilotCommand(page, touch, 'starboard', async () => {
          for (let i = 0; i < 10; i++) await page.clock.fastForward(100);
        });
        const after = await page.evaluate(() => (window.__game as unknown as Game).sub.yaw);
        expect(Math.abs(after - before), 'debrief close restores piloting').toBeGreaterThan(0.01);
        await surfaceDive();
        await expect(debrief).toBeVisible();
        const more = debrief.getByRole('button', { name: 'More options', exact: true });
        await reachable(more);
        await shot('debrief');
        await act(more);
        for (const button of await debrief.getByRole('button').all()) {
          // Short landscape debriefs intentionally scroll inside their panel.
          await button.evaluate((element) => element.scrollIntoView({ block: 'nearest' }));
          await reachable(button);
        }
        const home = debrief.getByRole('button', { name: 'Home', exact: true });
        await home.evaluate((element) => element.scrollIntoView({ block: 'nearest' }));
        await act(home);
        await homeReady(page, true);
        await reachable(page.locator('.home-primary'));
        expect(errors).toEqual([]);
      });
    }
  });
}

const pilotKeys = {
  ahead: 'w',
  port: 'a',
  starboard: 'd',
  rise: 'Space',
  sink: 'ControlLeft',
  'pitch-up': 'r',
  'pitch-down': 'f',
  scan: 'g',
};
type PilotCommand = keyof typeof pilotKeys | null;

/** Hold real input while normal frames run; never inject a pose, target or scan result. */
async function pilotCommand(
  page: Page,
  touch: boolean,
  command: PilotCommand,
  frames: () => Promise<void>,
): Promise<void> {
  if (command === null) return frames();
  const key = pilotKeys[command];
  if (!touch) {
    await page.keyboard.down(key);
    try {
      await frames();
    } finally {
      await page.keyboard.up(key);
    }
    return;
  }
  const target = page.locator(
    command === 'scan'
      ? '.tc-btn-scan'
      : command === 'rise' || command === 'sink'
        ? '.tc-slider'
        : '.tc-stick',
  );
  await reachable(target);
  const r = (await target.boundingBox())!;
  const x = r.x + r.width / 2;
  const y = r.y + r.height / 2;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    if (command !== 'scan')
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: x + (command === 'starboard' ? 1 : command === 'port' ? -1 : 0) * r.width * 0.4,
            y:
              y -
              (command === 'sink' ? -1 : command === 'rise' || command === 'ahead' ? 1 : 0) *
                r.height *
                0.4,
          },
        ],
      });
    await frames();
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  }
}

/** Follow the one visible guidance surface; the scanner's own check proves arrival. */
async function firstMinute(
  page: Page,
  touch: boolean,
  info: TestInfo,
): Promise<{ id: string; name: string }> {
  const state = () =>
    page.evaluate(() => {
      const g = window.__game as unknown as Game;
      return { elapsed: g.missionRouter.mission.elapsedS, view: { ...g.discovery.scanner.view } };
    });
  const initial = await state();
  const first = { id: initial.view.objectiveId!, name: initial.view.objectiveName };
  expect(first.id, 'the opening has a primary scan objective').toBeTruthy();
  expect(initial.view.objectiveDistance, 'opening leaves a real transit').toBeGreaterThan(100);
  if (touch) await reachableTouchControls(page);
  let completedAt: number | null = null;
  const trace: unknown[] = [];
  try {
    for (let tick = 0; tick <= 120; tick++) {
      const { elapsed, view } = await state();
      const guidance = page.locator('.guidance-slot');
      await expect(guidance).toBeVisible();
      await expectObjectiveGuidance(page, touch);
      const text = await guidance.innerText();
      await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(0);
      if (tick % 2 === 0) {
        await expect(page.locator('.sonar')).toBeVisible();
        await expectHudClear(page, `first minute ${elapsed.toFixed(1)}s`);
      }
      if (tick === 120) break;
      let command: PilotCommand = null;
      if (completedAt === null) {
        const turn = text.match(/TURN (\d+)° (PORT|STARBOARD)/i);
        const step = await guidance.getAttribute('data-step');
        if (step === 'scan') {
          // The optional lesson can mask steering; reveal the standing objective through Skip.
          const skip = guidance.getByRole('button', { name: 'Skip', exact: true });
          await reachable(skip);
          if (touch) await skip.tap();
          else await skip.click();
        } else if (/^Hold SCAN$|^Hold G$|SCANNING/im.test(text)) {
          expect(
            view.candidateId ?? view.activeId,
            'the game scan check accepts the first objective',
          ).toBe(first.id);
          command = 'scan';
        } else if (turn) command = turn[2] === 'STARBOARD' ? 'starboard' : 'port';
        else if (step === 'move' || /Get closer to scan/i.test(text)) command = 'ahead';
        else if (step === 'depth' || /RISE TOWARD TARGET/i.test(text)) command = 'rise';
        else if (/SINK TOWARD TARGET|DIVE DEEPER/i.test(text)) command = 'sink';
        else if (/PITCH TOWARD TARGET/i.test(text)) {
          // Desktop's marker supplies the vertical direction; use the same live guidance check.
          command = view.objectiveVertDeg > 0 ? 'pitch-up' : 'pitch-down';
        }
      }
      trace.push({ elapsed, text, command, view });
      let frames = 0;
      await pilotCommand(page, touch, command, async () => {
        // A 100 ms frame preserves every physics step; a large fastForward drops them.
        while (frames < 5) {
          await page.clock.fastForward(100);
          frames++;
          // Release before the next frame can start scanning a nearby second objective.
          if (command === 'scan') {
            const current = await state();
            if (current.view.lastCompleteId === first.id) {
              completedAt = current.elapsed;
              await expect(page.locator('.guidance-kicker')).toHaveText('New Journal entry');
              await expect(page.locator('.guidance-name')).toHaveText(first.name);
              await expect(
                page.locator(`.d-scan-world-marker[data-poi="${first.id}"]`),
              ).toHaveClass(/is-scanned/);
              break;
            }
          }
        }
      });
      while (frames++ < 5) await page.clock.fastForward(100);
    }
    expect((await state()).elapsed - initial.elapsed, 'a full unfrozen game minute').toBeCloseTo(
      60,
      1,
    );
    expect(
      completedAt,
      'guidance alone reaches and scans the first objective within the minute',
    ).not.toBeNull();
    expect(completedAt!).toBeLessThanOrEqual(initial.elapsed + 60);
    if (touch) await reachableTouchControls(page);
    return first;
  } finally {
    await info.attach('first-minute-guidance.json', {
      body: JSON.stringify({ first, completedAt, trace }, null, 2),
      contentType: 'application/json',
    });
  }
}

/** Measure before tapping: Playwright's automatic scroll must not conceal a clipped exit. */
async function reachable(target: Locator): Promise<void> {
  await expect(target).toBeVisible();
  // Scroll offsets snap to whole pixels, so tolerate a sub-pixel sliver of border.
  await expect(target).toBeInViewport({ ratio: 0.99 });
  expect(
    await target.evaluate((element) => {
      const r = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }),
    'touch target receives its centre tap',
  ).toBe(true);
}

/** Every phone control must be present and reachable; camera reset uses the double-tap gesture. */
async function reachableTouchControls(page: Page): Promise<void> {
  await expect(page.locator('.hud-reset-camera')).toBeHidden();
  await expect(page.locator('.tc-btn')).toHaveCount(5);
  for (const selector of touchControls) {
    const control = page.locator(selector);
    await expect(control).toHaveCount(1);
    await reachable(control);
  }
}

async function boot(page: Page, query: string): Promise<void> {
  await page.goto(`/?tier=low&touch=1&${query}`, { waitUntil: 'domcontentloaded' });
  await clockFramesUntil(page, () => {
    const g = window.__game as unknown as Game;
    return !!(window.__gameReady && g.discovery?.loaded && g.props.loaded);
  });
  expect(await page.evaluate(() => (window.__game as unknown as Game).perf.tier)).toBe('low');
}

/** Isolate range/aim from piloting feel, keeping the real scanner, HUD and touch input. */
async function faceContact(page: Page, id: string, range: number): Promise<void> {
  await page.evaluate(
    ({ id, range }) => {
      const g = window.__game as unknown as Game;
      const target = g.discovery.pois.find((p) => p.id === id)!;
      g.sub.step = () => {};
      g.sub.reset(target.position.x, target.position.y, target.position.z + range, 0);
      g.rig.snap(g.sub.position, 0, 0);
    },
    { id, range },
  );
  await page.clock.fastForward(50);
}

async function holdScan(page: Page, id: string): Promise<void> {
  await pilotCommand(page, true, 'scan', () => completeScan(page, id));
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test.describe(`phone acceptance ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });
    test.beforeEach(async ({ page }) => {
      await pauseClockBeforeNavigation(page);
      // Seed preferences only; scans and Journal discoveries start empty.
      await page.addInitScript(() => {
        if (!localStorage.getItem('subexplorer.settings.v3'))
          localStorage.setItem(
            'subexplorer.settings.v3',
            JSON.stringify({ version: 2, graphicsTier: 'low', gameplayMode: 'arcade' }),
          );
      });
    });
    test.afterEach(async ({ page }, info) => {
      // Keep evidence in ordinary runs, including immediately after an assertion failure.
      await page.screenshot({ path: info.outputPath('phone.png') });
    });

    test('Home names the next site and launches that destination', async ({ page }) => {
      await page.goto('/?tier=low&touch=1');
      await homeReady(page, true);
      const primary = page.locator('.home-primary');
      await expect(primary).toHaveAccessibleName('Dive: Titanic dive');
      await reachable(primary);
      await page.evaluate(() =>
        localStorage.setItem(
          'subexplorer.lastSite.v1',
          JSON.stringify({ missionId: 'great-blue-hole' }),
        ),
      );
      await page.reload();
      await homeReady(page, true);
      await expect(primary).toHaveAccessibleName('Dive: Great Blue Hole: Lighthouse Reef');
      await expect(page.locator('.home-scene-caption')).toHaveText(
        'Great Blue Hole: Lighthouse Reef · Next dive',
      );
      await reachable(primary);
      await primary.tap();
      await expect(page).toHaveURL((url) => url.searchParams.get('mission') === 'great-blue-hole');
    });

    test('Settings keeps Close visible while Aa cycles and persists at 150 percent', async ({
      page,
    }) => {
      await page.goto('/?tier=low&touch=1');
      await homeReady(page, true);
      const opener = page.locator('.home-menu').getByRole('button', { name: 'Settings' });
      await reachable(opener);
      await opener.tap();
      const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
      await expect(settings).toContainText('This dive uses low');
      const close = settings.locator('.settings-close');
      await reachable(close);
      const aa = settings.getByRole('button', { name: 'Aa: cycle UI scale' });
      for (let scale = 105; scale <= 150; scale += 5) {
        await aa.tap();
        await expect(settings.locator('.settings-scale-value')).toHaveText(`${scale}%`);
        await reachable(close);
      }
      await expect(settings).not.toContainText(keyNames, { useInnerText: true });
      await close.tap();
      await page.reload();
      await homeReady(page, true);
      await reachable(page.locator('.home-primary'));
      await reachable(opener);
      await opener.tap();
      await expect(settings.locator('.settings-scale-value')).toHaveText('150%');
      await aa.tap();
      await expect(settings.locator('.settings-scale-value')).toHaveText('80%');
      await reachable(close);
      await close.tap();
      await expect(settings).toBeHidden();
    });

    test('briefing and opening HUD fit at large scale with no boost or key names', async ({
      page,
    }, info) => {
      await page.addInitScript(() => {
        const key = 'subexplorer.settings.v3';
        localStorage.setItem(
          key,
          JSON.stringify({ ...JSON.parse(localStorage.getItem(key)!), uiScale: 150 }),
        );
      });
      await boot(page, 'mission=titanic');
      const briefing = page.getByRole('dialog', { name: 'Mission briefing' });
      await expect(briefing).toBeVisible();
      await expect(briefing).not.toContainText(keyNames, { useInnerText: true });
      for (const objective of await briefing.locator('.briefing-objectives li').all())
        await expect(objective).toBeInViewport({ ratio: 1 });
      await reachable(briefing.locator('.briefing-begin'));
      await page.screenshot({ path: info.outputPath('briefing.png') });
      await briefing.locator('.briefing-begin').tap();
      await page.clock.fastForward(50);
      await expect(page.locator('.tc-root')).toBeVisible();
      await expect(page.locator('.tc-btn-boost')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /boost/i })).toHaveCount(0);
      await expect(page.locator('.hud')).not.toContainText(keyNames, { useInnerText: true });
      await expect(page.locator('.guidance-slot')).toBeVisible();
      await reachableTouchControls(page);
      await expectHudClear(page, 'opening at 150%');
      // Keep the idle-coaching regression while the catalogue matrix tests active piloting.
      for (let frame = 0; frame < 210; frame++) await page.clock.fastForward(100);
      await expect(page.locator('.guidance-slot')).toHaveAttribute('data-step', 'move');
      await expect(page.locator('.guidance-name')).toHaveText(/Marker \d+ m ahead/);
      await expectHudClear(page, 'idle coaching at 150%');
    });

    test('Arcade scan reaches 100 m and records two primaries in Journal and debrief', async ({
      page,
    }) => {
      await boot(page, 'mission=titanic&skipBriefing=1&tutorial=0');
      const radii = await page.evaluate(() =>
        (window.__game as unknown as Game).discovery.pois.map((p) => p.radius),
      );
      expect(radii.length).toBeGreaterThan(0);
      expect(radii.every((radius) => radius >= 100)).toBe(true);
      await faceContact(page, 'titanic-bow', 101);
      await expect(page.locator('.guidance-hint')).toContainText(/Get closer to scan · 101 m/);
      await expectHudClear(page, 'out of scan range');
      for (const [id, name] of [
        ['titanic-bow', 'Bow section'],
        ['titanic-stern', 'Stern section'],
      ]) {
        await faceContact(page, id, 100);
        expect(
          await page.evaluate(() => {
            const v = (window.__game as unknown as Game).discovery.scanner.view;
            return {
              radius: v.objectiveRadius,
              inRange: v.objectiveInRange,
              candidate: v.candidateId,
            };
          }),
        ).toEqual({ radius: 100, inRange: true, candidate: id });
        await holdScan(page, id);
        await page.clock.fastForward(50);
        await expect(page.locator('.guidance-kicker')).toHaveText('New Journal entry');
        await expect(page.locator('.guidance-name')).toHaveText(name);
        await expectHudClear(page, `scan result ${id}`);
      }
      const banner = page.locator('.obj-banner');
      await expect(banner).toBeHidden();
      // Completion waits for play time; locator polling cannot advance a paused clock.
      await clockFramesUntil(
        page,
        () => !document.querySelector<HTMLElement>('.obj-banner')!.hidden,
        250,
      );
      await expect(banner).toBeVisible();
      await banner.locator('.is-keep').tap();
      await page.locator('.hud-journal').tap();
      await clockFramesUntil(page, () => (window.__game as unknown as Game).discovery.guide.isOpen);
      const journal = page.locator('.journal');
      await expect(journal).toBeVisible();
      await openJournalSite(page, 'titanic');
      await expect(await journalEntries(page, 'titanic/poi/')).toHaveCount(2);
      expect(
        await journal
          .locator('.jr-panel')
          .evaluate((panel) => getComputedStyle(panel).backgroundColor),
      ).toMatch(/^rgb\(/); // An opaque panel prevents the underlying HUD from ghosting through.
      await reachable(journal.locator('.jr-close'));
      await journal.locator('.jr-close').tap();
      await clockFramesUntil(page, () => !document.querySelector<HTMLElement>('.tc-root')!.hidden);
      await page.locator('.tc-btn-pause').tap();
      await page.locator('.pause-surface').tap();
      const debrief = page.locator('.mission-debrief');
      await expect(debrief).toBeVisible();
      await expect(debrief.locator('[data-field="objectives"]')).toHaveText(
        '2 of 2 primary objectives',
      );
    });

    test('Your sub exposes four reachable groups and retains an unlocked swatch', async ({
      page,
    }) => {
      await page.addInitScript(() =>
        localStorage.setItem(
          'subexplorer.progress.v1',
          JSON.stringify({
            version: 2,
            awarded: [
              'poi:titanic/titanic-bow',
              'poi:titanic/titanic-stern',
              'poi:titanic/titanic-boilers',
            ],
          }),
        ),
      );
      await page.goto('/?tier=low&touch=1');
      await homeReady(page, true);
      const opener = page
        .locator('.home-menu')
        .getByRole('button', { name: 'Your sub', exact: true });
      await reachable(opener);
      await opener.tap();
      const sub = page.getByRole('dialog', { name: 'Your sub', exact: true });
      await expect(sub.locator('canvas')).toBeVisible();
      expect(
        await sub.locator('.ss-panel').evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
      ).toBe(true);
      if (viewport.width < viewport.height)
        for (const region of await sub.locator('.ss-stage, .ss-group').all())
          await expect(region).toBeInViewport({ ratio: 1 });
      for (const [label, defaultName] of [
        ['Sub paint', 'Stock'],
        ['Lamp trim', 'Stock'],
        ['Sub decal', 'Stock'],
        ['Photo frame', 'None'],
      ]) {
        const group = sub.getByRole('group', { name: label, exact: true });
        await group.scrollIntoViewIfNeeded();
        await expect(group).toBeInViewport({ ratio: 1 });
        await reachable(group.getByRole('button', { name: defaultName, exact: true }));
      }
      await expect(sub.locator('.ss-panel')).not.toContainText(/Journal|upgrade|purchase/i);
      const red = sub.getByRole('button', { name: 'Red', exact: true });
      await red.scrollIntoViewIfNeeded();
      await reachable(red);
      await expect(red).toBeEnabled();
      await red.tap();
      await expect(red).toHaveAttribute('aria-pressed', 'true');
      const back = sub.getByRole('button', { name: 'Back', exact: true });
      await reachable(back);
      await back.tap();
      await opener.tap();
      await expect(red).toHaveAttribute('aria-pressed', 'true');
      await reachable(back);
      await back.tap();
      await page.locator('.home-menu').getByRole('button', { name: 'Journal', exact: true }).tap();
      await expect(page.locator('.journal [data-cosmetic]')).toHaveCount(0);
    });

    test('touch help and photo gestures name no keyboard keys or boost', async ({ page }) => {
      await boot(page, 'mission=titanic&skipBriefing=1&tutorial=0');
      await page.locator('.tc-btn-pause').tap();
      const pause = page.getByRole('dialog', { name: 'Pause menu' });
      await expect(pause).not.toContainText(keyNames, { useInnerText: true });
      await pause.getByRole('button', { name: 'How to play', exact: true }).tap();
      const help = page.getByRole('dialog', { name: 'How to play' });
      await expect(help).not.toContainText(keyNames, { useInnerText: true });
      await expect(help).not.toContainText(/boost/i);
      await expect(help.locator('.how-to-tile')).toHaveCount(9);
      const close = help.getByRole('button', { name: 'Close', exact: true });
      await reachable(close);
      // The article scrolls independently of its exit, even on a short landscape screen.
      for (const tile of [
        help.locator('.how-to-tile').last(),
        help.locator('.how-to-tile').first(),
      ]) {
        await tile.scrollIntoViewIfNeeded();
        await expect(tile).toBeInViewport({ ratio: 0.99 });
        await reachable(close);
      }
      await help.getByRole('button', { name: 'Close', exact: true }).tap();
      await pause.getByRole('button', { name: 'Resume', exact: true }).tap();
      await page.locator('.tc-btn-photo').tap();
      await page.clock.fastForward(50);
      const photo = page.locator('.photo-mode');
      await expect(photo).not.toContainText(keyNames, { useInnerText: true });
      await expect(photo.locator('.photo-mode-tips')).toHaveText('Drag to orbit · pinch to zoom');
      await reachable(photo.locator('.photo-mode-capture'));
      // Regression: switching back to touch left the open viewfinder's keyboard hints visible.
      await page.keyboard.press('Tab');
      await page.clock.fastForward(50);
      await expect(photo.locator('.photo-mode-capture')).toContainText('Space');
      await page.locator('#viewport').tap({
        position: { x: viewport.width / 2, y: viewport.height / 2 },
      });
      await page.clock.fastForward(50);
      await expect(photo).not.toContainText(keyNames, { useInnerText: true });
      await expect(photo.locator('.photo-mode-capture')).toHaveText('Capture');
      await expect(photo.locator('.photo-mode-tips')).toHaveText('Drag to orbit · pinch to zoom');
    });

    test('an optional event starts on arrival at its subject and clears touch controls', async ({
      page,
    }) => {
      await boot(page, 'tile=beebe-vent-field&tutorial=0');
      await clockFramesUntil(page, () => (window.__game as unknown as Game).explore.ready);
      const move = async (range: number): Promise<void> => {
        await page.evaluate((range) => {
          const g = window.__game as unknown as Game;
          const contact = g.explore.eventContacts.find((c) => c.kind === 'plume')!;
          g.sub.step = () => {};
          g.sub.reset(contact.position.x, contact.position.y + 12, contact.position.z + range, 0);
          g.rig.snap(g.sub.position, 0, 0);
        }, range);
        await page.clock.fastForward(50);
      };
      await move(80);
      expect(
        await page.evaluate(() => (window.__game as unknown as Game).explore.events.active),
      ).toBeNull();
      await move(35);
      const event = await page.evaluate(() => {
        const g = window.__game as unknown as Game;
        const active = g.explore.events.active!;
        const object = g.scene.getObjectByName('exploreEvent')!;
        const projected = active.contact.position.clone().project(g.rig.camera);
        const x = ((projected.x + 1) / 2) * innerWidth;
        const y = ((1 - projected.y) / 2) * innerHeight;
        return {
          kind: active.kind,
          distance: object.position.distanceTo(active.contact.position),
          visible: object.visible,
          inView:
            Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1,
          covered: [
            ...document.querySelectorAll<HTMLElement>(
              '.tc-stick, .tc-slider, .tc-btn, .hud-journal, .hud-reset-camera',
            ),
          ]
            .filter((el) => el.checkVisibility())
            .some((el) => {
              const r = el.getBoundingClientRect();
              return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            }),
        };
      });
      expect(event).toEqual({
        kind: 'plume',
        distance: 0,
        visible: true,
        inView: true,
        covered: false,
      });
      await reachableTouchControls(page);
      await expectHudClear(page, 'anchored event');
    });
  });
}
