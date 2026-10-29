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
const touchControls = '.tc-stick, .tc-slider, .tc-btn, .hud-journal, .hud-reset-camera';

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
      for (const control of await page.locator(touchControls).all()) await reachable(control);
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
      await expect(banner).toBeVisible();
      await banner.locator('.is-keep').tap();
      await page.locator('.hud-journal').tap();
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
          JSON.stringify({ version: 1, lifetime: 150 }),
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
      for (const label of ['Sub paint', 'Lamp trim', 'Sub decal', 'Photo frame']) {
        const group = sub.getByRole('group', { name: label, exact: true });
        await group.scrollIntoViewIfNeeded();
        await expect(group).toBeInViewport({ ratio: 1 });
        await reachable(group.getByRole('button', { name: 'Stock', exact: true }));
      }
      await expect(sub.locator('.ss-panel')).not.toContainText(/Journal|upgrade|purchase/i);
      const red = sub.getByRole('button', { name: 'Red', exact: true });
      await red.scrollIntoViewIfNeeded();
      await reachable(red);
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
      await reachable(help.getByRole('button', { name: 'Close', exact: true }));
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
      for (const control of await page.locator(touchControls).all()) await reachable(control);
      await expectHudClear(page, 'anchored event');
    });
  });
}
