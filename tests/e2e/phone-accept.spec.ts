import { expect, test, type Locator, type Page } from '@playwright/test';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { homeReady } from './helpers/home.js';
import { expectHudClear } from './helpers/phoneHud.js';
import { completeScan } from './helpers/scan.js';
import { journalEntries, openJournalSite } from './helpers/journal.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { AnchoredEvents, EventContact } from '../../src/game/Events.js';
import type { Scene } from 'three';

type Game = {
  sub: Submarine;
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
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test.describe(`on-screen journey ${viewport.width}x${viewport.height}`, () => {
    // Both sizes use native touch: desktop mouse/keyboard input hides the on-screen dock.
    test.use({
      viewport,
      hasTouch: true,
      isMobile: viewport.width < viewport.height,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });

    test('Home to first objective to debrief without teleporting', async ({ page }, info) => {
      // Regression guard: pose-assisted scan tests miss blocked approaches and covered exits.
      // Only readiness uses game probes; all piloting decisions read visible guidance.
      test.setTimeout(600_000); // Software rendering may take longer than the simulated dive.
      await pauseClockBeforeNavigation(page);
      const errors: string[] = [];
      const checkpoints: unknown[] = [];
      const actions: unknown[] = [];
      let phase = 'Home';
      let diveMs = 0;
      page.on('pageerror', (error) => errors.push(error.message));

      const record = async (name: string): Promise<void> => {
        const state = await page.evaluate(
          (controls) => ({
            url: location.href,
            text: document.body.innerText,
            controls: Array.from(document.querySelectorAll<HTMLElement>(controls))
              .filter((element) => element.checkVisibility({ checkVisibilityCSS: true }))
              .map((element) => {
                const r = element.getBoundingClientRect();
                const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                return {
                  label: element.getAttribute('aria-label') || element.innerText,
                  rect: r.toJSON(),
                  offscreen: r.x < 0 || r.y < 0 || r.right > innerWidth || r.bottom > innerHeight,
                  coveredBy: hit && element.contains(hit) ? null : (hit?.outerHTML ?? 'no hit'),
                };
              }),
          }),
          `${touchControls}, button`,
        );
        checkpoints.push({ name, phase, diveMs, ...state });
        const path = info.outputPath(`${checkpoints.length}-${name}.png`);
        await page.screenshot({ path });
        await info.attach(name, { path, contentType: 'image/png' });
      };
      const frames = async (count: number): Promise<void> => {
        for (let i = 0; i < count; i++) {
          diveMs += 100;
          expect(diveMs, `five-minute budget at ${phase}`).toBeLessThanOrEqual(300_000);
          // Render the normal loop, including physics and scanner time. A 100 ms
          // frame stays below the engine's eight-physics-step backlog limit.
          await page.clock.fastForward(100);
        }
      };
      const tap = async (target: Locator): Promise<void> => {
        await reachable(target);
        await target.tap();
      };
      const session = await page.context().newCDPSession(page);
      const gesture = async (
        target: Locator,
        dx: number,
        dy: number,
        count: number,
        done?: () => Promise<boolean>,
      ): Promise<void> => {
        await reachable(target);
        const r = (await target.boundingBox())!;
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        try {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x + dx * r.width, y: y + dy * r.height }],
          });
          for (let i = 0; i < count; i++) {
            await frames(1);
            if (await done?.()) break;
          }
        } finally {
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        }
        await frames(1);
      };

      try {
        await page.goto('/?tier=low&touch=1', { waitUntil: 'domcontentloaded' });
        await homeReady(page, true);
        await record('home');
        phase = 'pick site';
        await tap(page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }));
        const expand = page.getByRole('button', { name: 'Show all sites', exact: true });
        if (await expand.isVisible()) {
          await tap(expand);
          await page.clock.fastForward(300);
          await expect(page.locator('.home-sites-grab')).toHaveAttribute('aria-expanded', 'true');
        }
        const site = page.locator('.home-sites [data-mission="titanic"]');
        await record('site-picker');
        await tap(site);
        await expect(page).toHaveURL((url) => url.searchParams.get('mission') === 'titanic');
        const params = new URL(page.url()).searchParams;
        for (const key of ['poi', 'at', 'depth', 'skipBriefing', 'debrief'])
          expect(params.has(key), `ordinary mission URL has no ${key} probe`).toBe(false);
        phase = 'briefing';
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as Game;
          return !!(window.__gameReady && g.discovery?.loaded && g.props.loaded);
        });
        const briefing = page.getByRole('dialog', { name: 'Mission briefing' });
        await expect(briefing.locator('.briefing-objectives li').first()).toContainText(
          'Scan the bow',
        );
        await record('briefing');
        await tap(briefing.locator('.briefing-begin'));
        await frames(2);
        await expect(briefing).toBeHidden();
        phase = 'first objective approach';
        await record('opening');
        await expectHudClear(page, 'unassisted mission opening');
        for (const control of await page.locator(touchControls).all()) await reachable(control);
        const waypoint = page.locator('.d-scan-edge-info');
        await expect(waypoint).toBeVisible();
        expect(
          parseFloat(await waypoint.innerText()),
          'opening leaves a real transit',
        ).toBeGreaterThan(100);

        const guidance = page.locator('.guidance-slot');
        const stick = page.locator('.tc-stick');
        const slider = page.locator('.tc-slider');
        const ready = async (): Promise<boolean> =>
          (await guidance.isVisible()) &&
          /Bow section/i.test(await guidance.innerText()) &&
          /HOLD SCAN TO SCAN/i.test(await guidance.innerText());
        for (let attempt = 0; attempt < 400 && !(await ready()); attempt++) {
          await expect(guidance).toBeVisible();
          const text = await guidance.innerText();
          const step = await guidance.getAttribute('data-step');
          const turn = text.match(/TURN (\d+)° (PORT|STARBOARD)/i);
          actions.push({ diveMs, step, text });
          if (step === 'move') await gesture(stick, 0, -0.4, 12);
          else if (step === 'depth') await gesture(slider, 0, -0.4, 10);
          else if (step === 'scan') {
            // The scan lesson masks the objective's steering cue until a scan
            // finishes. Use its visible Skip control to reveal that cue.
            await tap(guidance.getByRole('button', { name: 'Skip', exact: true }));
            await frames(1);
          } else if (turn) await gesture(stick, (turn[2] === 'PORT' ? -1 : 1) * 0.35, 0, 5);
          else if (/RISE TOWARD TARGET/i.test(text)) await gesture(slider, 0, -0.4, 5);
          else if (/SINK TOWARD TARGET|DIVE DEEPER/i.test(text)) await gesture(slider, 0, 0.4, 5);
          else if (/Get closer to scan/i.test(text)) await gesture(stick, 0, -0.4, 10);
          else await frames(5); // Let a temporary wildlife/hazard message expire.
        }
        expect(await ready(), 'visible guidance must lead to a scannable bow').toBe(true);
        await record('in-range');
        await expectHudClear(page, 'unassisted approach reaches scan range');

        phase = 'scan first objective';
        const result = page.locator('.guidance-kicker');
        await gesture(page.locator('.tc-btn-scan'), 0, 0, 80, async () =>
          /New Journal entry/i.test(await result.innerText()),
        );
        await expect(result).toHaveText('New Journal entry');
        await expect(page.locator('.guidance-name')).toHaveText('Bow section');
        await expect(page.locator('.d-scan-world-marker[data-poi="titanic-bow"]')).toHaveClass(
          /is-scanned/,
        );
        await record('first-objective');
        await expectHudClear(page, 'first objective result');

        phase = 'surface and debrief';
        await tap(page.getByRole('button', { name: 'Pause', exact: true }));
        await record('pause');
        await tap(page.getByRole('button', { name: 'Surface and debrief', exact: true }));
        const debrief = page.locator('.mission-debrief');
        await expect(debrief).toBeVisible();
        await expect(debrief.locator('[data-field="objectives"]')).toHaveText(
          '1 of 2 primary objectives',
        );
        await expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('1');
        await expect(debrief.locator('.debrief-highlight')).toHaveText('Scanned Bow section.');
        await record('debrief');

        phase = 'debrief exit';
        await tap(debrief.getByRole('button', { name: 'More', exact: true }));
        await tap(debrief.getByRole('button', { name: 'Home', exact: true }));
        await homeReady(page, true);
        await reachable(page.locator('.home-primary'));
        await record('returned-home');
        expect(errors).toEqual([]);
        phase = 'complete';
      } finally {
        await session.detach();
        if (!page.isClosed())
          await record('last-state').catch((error: unknown) => {
            checkpoints.push({ phase, diagnosticError: String(error) });
          });
        await info.attach('journey.json', {
          body: JSON.stringify({ viewport, phase, diveMs, errors, actions, checkpoints }, null, 2),
          contentType: 'application/json',
        });
      }
    });
  });
}

/** Measure before tapping: Playwright's automatic scroll must not conceal a clipped exit. */
async function reachable(target: Locator): Promise<void> {
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport({ ratio: 1 });
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
  const button = page.locator('.tc-btn-scan');
  await reachable(button);
  const r = (await button.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }],
    });
    await completeScan(page, id);
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  }
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
        await expect(tile).toBeInViewport({ ratio: 1 });
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
