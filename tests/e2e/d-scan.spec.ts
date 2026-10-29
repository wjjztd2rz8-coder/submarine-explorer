import { completeScan, scanWithKeyboard, advanceScan } from './helpers/scan.js';
import { expect, test, type Page } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import type { MissionRouter } from '../../src/game/MissionRouter.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Discovery } from '../../src/game/Discovery.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

const shots = '.cache/codex/shots/d-scan';
const scanUrl = '/?tile=titanic&landmark=_test&poi=test-bow';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => {
      const g = window.__game as { discovery?: { loaded: boolean; spawnedAt: string | null } };
      return (
        g.discovery?.loaded &&
        (!new URLSearchParams(location.search).has('poi') || g.discovery.spawnedAt)
      );
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function screenshot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}

for (const [dive, url] of [
  ['mission', '/?mission=titanic&skipBriefing=1&tutorial=0'],
  ['free dive', '/?tile=titanic&landmark=titanic&tutorial=0'],
] as const) {
  test(`Titanic ${dive} resolves the Arcade scan floor after mission caps`, async ({ page }) => {
    // Guards the actual loaded reach: raw POI radii alone miss the mission cap.
    await boot(page, url);
    await page.waitForFunction(
      () => (window.__game as { props: { loaded: boolean } }).props.loaded,
    );
    const result = await page.evaluate(() => {
      const game = window.__game as { discovery: Discovery };
      const scanner = game.discovery.scanner;
      const bow = game.discovery.pois.find((p) => p.id === 'titanic-bow')!;
      const radii = game.discovery.pois.map((p) => p.radius);
      scanner.resetDive();
      scanner.setObjective(bow.id);
      const forward = bow.position.clone().set(0, 0, -1);
      const probe = (distance: number) => {
        scanner.update(
          0.1,
          bow.position.clone().addScaledVector(forward, -distance),
          forward,
          distance <= 100,
        );
        return {
          radius: scanner.view.objectiveRadius,
          inRange: scanner.view.objectiveInRange,
          scanning: scanner.isScanning,
        };
      };
      return { radii, outside: probe(101), boundary: probe(100) };
    });
    expect(result.radii.every((radius) => radius >= 100)).toBe(true);
    expect(result.outside).toEqual({ radius: 100, inRange: false, scanning: false });
    expect(result.boundary).toEqual({ radius: 100, inRange: true, scanning: true });
  });
}

test('scanned contacts stay marked and cannot be rescanned until a new dive', async ({ page }) => {
  await boot(page, scanUrl);
  await expect(page.locator('.guidance-slot .guidance-hint')).toHaveText(/HOLD G TO SCAN/);
  await scanWithKeyboard(page, 'test-bow');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window.__game as {
            sonar: {
              markers: Array<{ poiId: string; icon: string; scanned: boolean; visible: boolean }>;
            };
          }
        ).sonar.markers.find((m) => m.poiId === 'test-bow'),
      ),
    )
    .toMatchObject({ icon: '✓', scanned: true, visible: true });
  await expect(page.locator('.d-scan-world-marker[data-poi="test-bow"]')).toHaveClass(/is-scanned/);
  await screenshot(page, 'scanned-marker');
  await screenshot(page, 'scanned');
  await page.waitForFunction(
    () =>
      (window.__game as { discovery: { overlay: { slot: { kind: string | null } } } }).discovery
        .overlay.slot.kind !== 'discovery',
  );
  await expect(page.locator('.guidance-slot .guidance-hint')).toHaveText('Logged · Journal');
  await screenshot(page, 'already-logged-prompt');
  await page.keyboard.down('g');
  await advanceScan(page, 3.6);
  await page.keyboard.up('g');
  expect(
    await page.evaluate(() => {
      const g = window.__game as {
        scanner: { view: { completed: number }; isScanned(l: string, p: string): boolean };
        discoveries: { get(l: string, p: string): { count: number } | null };
      };
      return [
        g.scanner.view.completed,
        g.discoveries.get('_test', 'test-bow')?.count,
        g.scanner.isScanned('_test', 'test-bow'),
      ];
    }),
  ).toEqual([1, 1, true]);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () =>
      (window.__game as { discovery?: { spawnedAt: string | null } }).discovery?.spawnedAt ===
      'test-bow',
  );
  await expect(page.locator('.guidance-slot .guidance-hint')).toHaveText(/HOLD G TO SCAN/);
  await scanWithKeyboard(page, 'test-bow');
  expect(
    await page.evaluate(() => {
      const g = window.__game as {
        scanner: { view: { lastCompleteFirstTime: boolean } };
        discoveries: { get(l: string, p: string): { count: number } | null };
      };
      return [g.scanner.view.lastCompleteFirstTime, g.discoveries.get('_test', 'test-bow')?.count];
    }),
  ).toEqual([false, 2]);
});

test('visual hints show an objective waypoint and obey the saved toggle', async ({ page }) => {
  await boot(page, '/?mission=titanic&skipBriefing=1&poi=titanic-bow');
  await expect(page.locator('.d-scan-edge')).toBeVisible();
  await expect(page.locator('.d-scan-edge')).toContainText(/m · [↑↓]\d+ m/);
  await screenshot(page, 'waypoint-onscreen');
  await screenshot(page, 'waypoint');
  await page.evaluate(() => {
    const g = window.__game as {
      sub: {
        position: { x: number; y: number; z: number };
        reset(x: number, y: number, z: number, yaw: number): void;
      };
      rig: { snap(p: { x: number; y: number; z: number }, yaw: number, pitch: number): void };
    };
    const p = g.sub.position;
    g.sub.reset(p.x, p.y, p.z, Math.PI);
    g.rig.snap(g.sub.position, Math.PI, 0);
  });
  await expect(page.locator('.d-scan-edge')).not.toHaveClass(/is-onscreen/);
  await screenshot(page, 'waypoint-offscreen-arrow');
  await page.evaluate(() => {
    const g = window.__game as { save: { setGameplayOption(k: 'visualHints', v: boolean): void } };
    g.save.setGameplayOption('visualHints', false);
  });
  await expect(page.locator('.d-scan-waypoints')).toHaveAttribute('data-hints', 'false');
  await expect(page.locator('.d-scan-edge')).toBeHidden();
  await screenshot(page, 'hints-off');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await expect(page.locator('.d-scan-waypoints')).toHaveAttribute('data-hints', 'false');
});

type MissionGame = {
  discovery: Discovery;
  missionRouter: MissionRouter;
  sub: Submarine;
  props: { loaded: boolean };
};

for (const layout of [
  { width: 1280, height: 720, touch: false },
  { width: 844, height: 390, touch: true },
  { width: 390, height: 844, touch: true },
]) {
  test.describe(`current target at ${layout.width}x${layout.height}`, () => {
    test.use({ viewport: layout, hasTouch: layout.touch, isMobile: layout.touch });

    test('opening guidance and phone directions follow the primary beside optional wildlife', async ({
      page,
    }) => {
      // Regression guard: a nearby fish replaced the primary name while phone directions still led to the gallery.
      await pauseClockBeforeNavigation(page);
      await page.goto('/?mission=great-blue-hole&skipBriefing=1&tier=low&tutorial=0', {
        waitUntil: 'domcontentloaded',
      });
      await clockFramesUntil(page, () => {
        const g = window.__game as unknown as MissionGame;
        return window.__gameReady === true && g.discovery.loaded && g.props.loaded;
      });
      await page.evaluate(() => {
        const g = window.__game as unknown as MissionGame;
        g.discovery.scanner.setExtraTargets([
          {
            id: 'life:guidance-fish',
            name: 'French grunt',
            landmarkId: 'great-blue-hole',
            position: g.sub.position.clone().addScaledVector(g.sub.getForward(), 5),
            radius: 20,
            scanSeconds: 2,
          },
        ]);
      });
      await page.clock.fastForward(17);
      const target = await page.evaluate(() => {
        const g = window.__game as unknown as MissionGame;
        const v = g.discovery.scanner.view;
        const objective = g.missionRouter.mission.objectives.find((o) => o.primary && !o.complete)!;
        const turn = v.objectiveTurnDeg;
        const near = `Get closer to scan · ${v.objectiveDistance.toFixed(0)} m`;
        return {
          candidate: v.candidateId,
          id: v.objectiveId,
          primary: objective.poiId,
          name: v.objectiveName,
          inRange: v.objectiveInRange,
          hint:
            document.documentElement.classList.contains('is-touch') && Math.abs(turn) >= 10
              ? `${near} · TURN ${Math.abs(turn).toFixed(0)}° ${turn >= 0 ? 'STARBOARD' : 'PORT'}`
              : near,
        };
      });
      expect(target.candidate).toBe('life:guidance-fish');
      expect(target.id).toBe(target.primary);
      expect(target.name).toBe('Stalactite gallery');
      expect(target.inRange).toBe(false);
      await expect(page.locator('.guidance-slot .guidance-name')).toHaveText(target.name);
      await expect(page.locator('.guidance-slot .guidance-hint')).toHaveText(target.hint);
      await expect(page.locator('.guidance-slot')).not.toContainText('French grunt');
    });

    for (const site of ['titanic', 'great-blue-hole']) {
      test(`completion advances navigation and direction in the same frame: ${site}`, async ({
        page,
      }) => {
        // Regression guard: objectives advanced while the completion frame still navigated to the scanned contact.
        await pauseClockBeforeNavigation(page);
        await page.goto(`/?mission=${site}&skipBriefing=1&tier=low&tutorial=0`, {
          waitUntil: 'domcontentloaded',
        });
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as MissionGame;
          return window.__gameReady === true && g.discovery.loaded && g.props.loaded;
        });
        const scanned = await page.evaluate(() => {
          const g = window.__game as unknown as MissionGame;
          const objective = g.missionRouter.mission.objectives.find(
            (o) => o.primary && !o.complete,
          )!;
          const poi = g.discovery.pois.find((p) => p.id === objective.poiId)!;
          g.sub.reset(poi.position.x, poi.position.y, poi.position.z + 5, 0);
          return { id: poi.id, name: poi.name };
        });
        if (layout.touch) {
          const button = page.locator('.tc-btn-scan');
          await expect(button).toBeVisible();
          const box = (await button.boundingBox())!;
          const session = await page.context().newCDPSession(page);
          try {
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
            });
            await completeScan(page, scanned.id);
          } finally {
            await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await session.detach();
          }
        } else await scanWithKeyboard(page, scanned.id);
        // The clock is paused. Read synchronously before permitting any following frame.
        const completed = await page.evaluate(() => {
          const g = window.__game as unknown as MissionGame;
          const objective = g.missionRouter.mission.objectives.find(
            (o) => o.primary && !o.complete,
          )!;
          const next = g.discovery.pois.find((p) => p.id === objective.poiId)!;
          return {
            last: g.discovery.scanner.view.lastCompleteId,
            target: g.discovery.scanner.view.objectiveId,
            name: g.discovery.scanner.view.objectiveName,
            next: { id: next.id, name: next.name },
            current: document.querySelector('.obj-item.is-current')?.getAttribute('data-objective'),
            objective: objective.id,
            nav: document.querySelector('.obj-nav-target')?.textContent,
            detail: document.querySelector('.guidance-hint')?.textContent,
            reward: document.querySelector('.guidance-name')?.textContent,
            waypoint: document.querySelector('.d-scan-edge-name')?.textContent,
            waypointVisible: document.querySelector('.d-scan-edge-name')?.checkVisibility(),
          };
        });
        expect(completed.last).toBe(scanned.id);
        expect(completed.target).toBe(completed.next.id);
        expect(completed.name).toBe(completed.next.name);
        expect(completed.current).toBe(completed.objective);
        expect(completed.nav).toBe(`→ ${completed.next.name.toUpperCase()}`);
        expect(completed.reward).toBe(scanned.name);
        expect(completed.waypoint).toBe(completed.next.name);
        if (layout.touch) {
          expect(completed.waypointVisible).toBe(true);
          expect(completed.detail).toContain(`${completed.next.name} ·`);
        }
      });
    }
  });
}
