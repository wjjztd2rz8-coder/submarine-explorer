import { missionSpawnShot, renderReview, reviewScreenshot } from './helpers/render.js';
import { expect, test as freshTest, type Page } from '@playwright/test';
import { test as experiencedTest } from './helpers/unlocked.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, writeFile } from 'node:fs/promises';
import { type Submarine } from '../../src/sub/Submarine.js';
import { type CameraRig } from '../../src/sub/CameraRig.js';
import { type Props } from '../../src/world/Props.js';
import { type SubMesh } from '../../src/sub/SubMesh.js';
import {
  type FogExp2,
  type InstancedMesh,
  type Mesh,
  type Points,
  type Scene,
  type ShaderMaterial,
} from 'three';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { type Save } from '../../src/core/Save.js';
import { type Atmosphere } from '../../src/render/Atmosphere.js';
import { type Terrain } from '../../src/world/Terrain.js';
import { type PresetSystem } from '../../src/world/presets/Presets.js';
import { DEFAULT_CAMERA } from '../../src/core/config/camera.js';
import { type Discovery } from '../../src/game/Discovery.js';
import { type Mission } from '../../src/game/Mission.js';
import { type Headlights } from '../../src/render/Headlights.js';
import { siteData, missionApproachRanges as MISSION_APPROACH_M } from './helpers/site.js';
import { type Scanner } from '../../src/game/Scanner.js';
import { type PerfStats } from '../../src/app/systems/quality.js';
import { waitForFrames } from './helpers/frames.js';
import { type GameConfig } from '../../src/core/Config.js';
import type * as THREE from 'three';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };
import { HERO_SITES } from '../../src/game/Cosmetics.js';
// @ts-expect-error The existing golden URL builder is JavaScript.
import { goldenUrl } from '../../tools/golden-options.mjs';

freshTest.describe('non-hero mission spawn Low portrait capture', () => {
  freshTest.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block',
  });

  for (const site of catalog.landmarks.filter((id) => !HERO_SITES.some((hero) => hero === id))) {
    // Regression guard: ordinary runs omitted non-hero mission-spawn evidence and its golden entry.
    freshTest(
      `${site}: persists spawn PNG and golden manifest`,
      async ({ page, baseURL }, info) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await pauseClockBeforeNavigation(page);
        await page.goto(
          goldenUrl(baseURL!, site, { mode: 'mission', tier: 'low' }, 'portrait').href,
          {
            waitUntil: 'domcontentloaded',
          },
        );
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as {
            props: { loaded: boolean };
            discovery: { loaded: boolean };
            mission: Mission | null;
            appState: string;
          };
          return !!(
            window.__gameReady &&
            g.props.loaded &&
            g.discovery.loaded &&
            g.mission &&
            g.appState === 'dive'
          );
        });
        await page.clock.runFor(34);
        await page.evaluate(() => document.fonts.ready.then(() => {}));
        await expect(page.locator('.briefing')).toBeHidden();
        await missionSpawnShot(page, site, info.outputPath('golden'));
        expect(errors).toEqual([]);
      },
    );
  }
});

freshTest.describe('vent framing over real time', () => {
  const test = experiencedTest;
  const shots = '.cache/codex/shots/opening-framing/vent';
  interface BeebeGame {
    sub: Submarine;
    rig: CameraRig;
    props: Props;
    discovery: { loaded: boolean };
  }

  for (const view of [
    { name: 'desktop-high', width: 1600, height: 900, tier: 'high' },
    { name: 'portrait-high', width: 390, height: 844, tier: 'high' },
    { name: 'portrait-low', width: 390, height: 844, tier: 'low' },
  ]) {
    // Regression guard: Beebe opening cropped its vent tip or lost the mineral apron and talus.
    test(`Beebe opening and ten seconds: ${view.name}`, async ({ page }) => {
      test.setTimeout(180_000);
      await mkdir(shots, { recursive: true });
      await page.setViewportSize({ width: view.width, height: view.height });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(
        `/?tile=beebe-vent-field&skipBriefing=1&tutorial=0&tier=${view.tier}${view.width < view.height ? '&touch=1' : ''}`,
      );
      await page.waitForFunction(() => {
        const game = window.__game as unknown as BeebeGame | undefined;
        return window.__gameReady && game?.props.loaded && game.discovery.loaded;
      });
      for (const second of [0, 10]) {
        if (second) await page.waitForTimeout(second * 1000);
        const framing = await page.evaluate(() => {
          const game = window.__game as unknown as BeebeGame;
          const hero = game.props.placed.find((p) => p.def.id === 'beebe-chimney-1')!;
          hero.root.updateMatrixWorld(true);
          game.rig.camera.updateMatrixWorld(true);
          const tip = game.sub.position.clone().set(0, Number(hero.full.userData.ventTop), 0);
          hero.root.localToWorld(tip);
          tip.project(game.rig.camera);
          return {
            tip: tip.toArray(),
            chase: game.rig.mode,
            failedProps: game.props.stats.failed,
            apron: Boolean(hero.full.getObjectByName('beebe-mineral-seabed')),
            rubble: Boolean(hero.full.getObjectByName('beebe-seabed-talus')),
          };
        });
        expect(framing.chase).toBe('chase');
        expect(framing.failedProps).toBe(0);
        expect(framing.apron).toBe(true);
        expect(framing.rubble).toBe(true);
        expect(framing.tip[0]).toBeLessThan(-0.1);
        expect(Math.abs(framing.tip[0]!)).toBeLessThan(0.9);
        expect(Math.abs(framing.tip[1]!)).toBeLessThan(0.9);
        await reviewScreenshot(page, {
          path: `${shots}/beebe-${view.name}-${second}s.png`,
          timeout: 60_000,
        });
      }
      expect(errors).toEqual([]);
    });
  }
});

freshTest.describe('level portrait hull framing', () => {
  const test = freshTest;
  interface Probe {
    sub: Submarine;
    rig: CameraRig;
    subMesh: SubMesh;
    props: Props;
    discovery: { loaded: boolean };
  }
  const shots = '.cache/codex/shots/opening-framing/portrait';

  test.describe('portrait openings', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    for (const site of [
      'challenger-deep',
      'endurance',
      'hunga-tonga-caldera',
      'axial-seamount-ashes',
    ]) {
      // Regression guard: portrait openings cropped the visible hull and showed premature near-hull guidance.
      test(`${site}: level framed opening stays quiet at its starting depth`, async ({ page }) => {
        await pauseClockBeforeNavigation(page);
        await page.addInitScript(() => {
          localStorage.setItem(
            'subexplorer.onboard.v1',
            JSON.stringify({
              version: 1,
              tutorialDone: true,
              seenHints: ['battery-low', 'creature'],
            }),
          );
        });
        await page.goto(`/?tile=${site}&tier=low&touch=1&tutorial=0&lifeSeed=42&dynres=0`, {
          waitUntil: 'domcontentloaded',
        });
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as Probe;
          return window.__gameReady === true && g.props.loaded && g.discovery.loaded;
        });
        await page.evaluate(() => {
          (window.__game as unknown as Probe).sub.step = () => {};
        });
        await page.clock.fastForward(250);
        const opening = await page.evaluate((site) => {
          const g = window.__game as unknown as Probe;
          g.rig.camera.updateMatrixWorld(true);
          let challengerFrame = null;
          if (site === 'challenger-deep') {
            // Measure every visible hull vertex, including instances, so the
            // lateral framing cannot hide a clipped hull or an occluded lander.
            const width = window.innerWidth;
            const height = window.innerHeight;
            const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
            const depth = { near: Infinity, far: -Infinity };
            const point = g.sub.position.clone();
            g.subMesh.group.updateMatrixWorld(true);
            g.subMesh.group.traverseVisible((object) => {
              const mesh = object as Mesh;
              if (!mesh.isMesh) return;
              const vertices = mesh.geometry.getAttribute('position');
              const instances = mesh as InstancedMesh;
              const matrix = mesh.matrixWorld.clone();
              const world = matrix.clone();
              for (let i = 0; i < (instances.isInstancedMesh ? instances.count : 1); i++) {
                if (instances.isInstancedMesh) instances.getMatrixAt(i, matrix);
                else matrix.identity();
                world.multiplyMatrices(mesh.matrixWorld, matrix);
                for (let j = 0; j < vertices.count; j++) {
                  point.fromBufferAttribute(vertices, j).applyMatrix4(world).project(g.rig.camera);
                  const x = ((point.x + 1) * width) / 2;
                  const y = ((1 - point.y) * height) / 2;
                  bounds.left = Math.min(bounds.left, x);
                  bounds.right = Math.max(bounds.right, x);
                  bounds.top = Math.min(bounds.top, y);
                  bounds.bottom = Math.max(bounds.bottom, y);
                  depth.near = Math.min(depth.near, point.z);
                  depth.far = Math.max(depth.far, point.z);
                }
              }
            });
            const hero = g.props.placed.find((p) => p.def.id === 'leggo-lander-marker')!;
            hero.root.updateMatrixWorld(true);
            const heroNdc = hero.root
              .localToWorld(hero.localBounds.getCenter(point))
              .project(g.rig.camera);
            challengerFrame = {
              bounds,
              depth,
              heroX: ((heroNdc.x + 1) * width) / 2,
              heroZ: heroNdc.z,
            };
          }
          return {
            challengerFrame,
            pitch: g.sub.pitch,
            roll: g.sub.roll,
            hullNdc: g.sub.position.clone().project(g.rig.camera).toArray(),
          };
        }, site);
        expect(opening.pitch).toBe(0);
        expect(opening.roll).toBe(0);
        if (site === 'challenger-deep') {
          // The composed camera puts the hull to the right, leaving
          // at least 12 px between the lander's centre and the hull's screen span.
          const frame = opening.challengerFrame!;
          expect(frame.bounds.left).toBeGreaterThan(12);
          expect(frame.bounds.right).toBeLessThan(390 - 12);
          expect(frame.bounds.top).toBeGreaterThan(211);
          expect(frame.bounds.bottom).toBeLessThan(844 * 0.79);
          expect(frame.depth.near).toBeGreaterThan(-1);
          expect(frame.depth.far).toBeLessThan(1);
          expect(frame.heroX).toBeGreaterThan(12);
          expect(frame.heroX).toBeLessThan(390 - 12);
          expect(frame.heroZ).toBeGreaterThan(-1);
          expect(frame.heroZ).toBeLessThan(1);
          expect(
            frame.heroX < frame.bounds.left - 12 || frame.heroX > frame.bounds.right + 12,
          ).toBe(true);
        } else {
          expect(opening.hullNdc[0]).toBeCloseTo(0, 6);
        }
        await expect(page.locator('.guidance-slot')).toBeVisible();
        await expect(page.locator('.guidance-slot[data-kind="urgent"]')).toBeHidden();
        await mkdir(shots, { recursive: true });
        await reviewScreenshot(page, { path: `${shots}/${site}-portrait-opening.png` });
        for (let i = 0; i < 81; i++) await page.clock.fastForward(250);
        await expect(page.locator('.guidance-slot[data-kind="urgent"]')).toBeHidden();
        expect(
          await page.evaluate(
            () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).seenHints,
          ),
        ).not.toContain('near-hull');
      });
    }
  });
});

freshTest.describe('route and mode camera poses', () => {
  const test = experiencedTest;
  interface Game {
    save: Save;
    discovery: Discovery;
    mission: Mission | null;
    sub: Submarine;
    rig: CameraRig;
    props: Props;
    terrain: Terrain;
    atmosphere: Atmosphere;
    presets: PresetSystem;
    headlights: Headlights;
  }

  for (const tier of ['low', 'medium', 'high']) {
    for (const route of ['tile', 'mission']) {
      // Regression guard: Lost City opening lost its ambient-lit seabed or applied the free-dive camera to a mission.
      test(`Lost City ${route} ${tier}: Arcade preserves its route-specific opening and ambient-lit seabed`, async ({
        page,
      }) => {
        await page.goto(`/?${route}=lost-city&tutorial=0&tier=${tier}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForFunction(() => {
          const g = window.__game as unknown as Game | undefined;
          return window.__gameReady === true && g?.props.loaded && g.presets.entered;
        });
        if (route === 'mission') {
          await page
            .locator('.briefing')
            .getByRole('button', { name: 'Begin dive', exact: true })
            .click();
          await expect(page.locator('.briefing')).toBeHidden();
        }
        await page.keyboard.press('Escape');
        await expect(page.locator('.pause-menu')).toBeVisible();
        await page.evaluate(() => (window.__game as unknown as Game).headlights.setEnabled(false));
        const opening = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          const hero = g.props.placed.find((p) => p.def.id === 'poseidon-tower')!;
          const pos = g.sub.position;
          const light = g.atmosphere.ambient;
          const luminance =
            0.2126 * light.color.r + 0.7152 * light.color.g + 0.0722 * light.color.b;
          const density = ((g.atmosphere.group.parent as Scene).fog as FogExp2).density;
          const floorProxies = [];
          for (let bearing = -1; bearing < 8; bearing++) {
            const angle = (bearing * Math.PI) / 4;
            const radius = bearing < 0 ? 0 : 40;
            const x = pos.x + radius * Math.cos(angle);
            const z = pos.z + radius * Math.sin(angle);
            const y = g.terrain.sampleHeight(x, z);
            const eye = g.rig.camera.position;
            const distance = Math.hypot(eye.x - x, eye.y - y, eye.z - z);
            floorProxies.push(
              light.intensity * luminance * Math.exp(-Math.pow(density * distance, 2)),
            );
          }
          // Pin the current free-dive eye and the independent mission approach camera.
          const localEye = g.rig.camera.position
            .clone()
            .sub(pos)
            .applyAxisAngle(pos.clone().set(0, 1, 0), g.sub.yaw);
          g.rig.camera.updateMatrixWorld(true);
          hero.root.updateMatrixWorld(true);
          const towerAxis = [];
          for (let height = 0; height <= 60; height += 5) {
            towerAxis.push(
              hero.root
                .localToWorld(pos.clone().set(0, height, 0))
                .project(g.rig.camera)
                .toArray(),
            );
          }
          const primary = g.mission?.objectives.find((o) => o.primary);
          const target = g.discovery.pois.find((p) => p.id === primary?.poiId);
          return {
            primaryRange: target?.position.distanceTo(pos),
            scanRadius: target?.radius,
            mode: g.save.get().gameplayMode,
            heroRange: Math.hypot(pos.x - hero.root.position.x, pos.z - hero.root.position.z),
            localEye: localEye.toArray(),
            towerAxis,
            chaseRadius: g.rig.chaseRadius,
            altitude: pos.y - g.terrain.sampleHeight(pos.x, pos.z),
            ambient: light.intensity,
            fill: g.presets.params.ambientFill,
            floorProxies,
            lampsOn: g.headlights.on,
          };
        });
        expect(opening.mode).toBe('arcade');
        if (route === 'tile') {
          expect(opening.heroRange).toBeGreaterThan(30);
          expect(opening.heroRange).toBeLessThanOrEqual(40);
          expect(opening.chaseRadius).toBe(66);
        } else {
          expect(opening.primaryRange).toBeCloseTo(220, 0);
          expect(opening.primaryRange!).toBeGreaterThan(opening.scanRadius!);
          expect(opening.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6);
        }
        const tuning = siteData('lost-city').opening!.freeDive!.modes!.arcade!;
        const expectedEye =
          route === 'tile'
            ? [
                tuning.chaseOffsetX!,
                DEFAULT_CAMERA.chaseOffset.y + tuning.chaseOffsetY!,
                DEFAULT_CAMERA.chaseOffset.z,
              ]
            : [0, DEFAULT_CAMERA.chaseOffset.y, DEFAULT_CAMERA.chaseOffset.z];
        const armScale = opening.chaseRadius / Math.hypot(...expectedEye);
        for (let axis = 0; axis < 3; axis++)
          expect(opening.localEye[axis]).toBeCloseTo(expectedEye[axis] * armScale, 1);
        for (const [x, y, z] of opening.towerAxis) {
          expect(Math.abs(x)).toBeLessThan(0.9);
          expect(Math.abs(y)).toBeLessThan(0.9);
          expect(z).toBeGreaterThan(-1);
          expect(z).toBeLessThan(1);
        }
        expect(opening.altitude).toBeGreaterThanOrEqual(22);
        expect(opening.fill).toBe(16);
        expect(opening.ambient).toBeGreaterThanOrEqual(16);
        expect(opening.floorProxies.every((value) => value > 2.5)).toBe(true);
        expect(opening.lampsOn).toBe(false);
      });
    }
  }

  // Regression guard: Lost City opening lost its ambient-lit seabed or applied the free-dive camera to a mission.

  test('Lost City Realistic free dive retains the vent opening and camera arm', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'subexplorer.settings.v3',
        JSON.stringify({ version: 2, gameplayMode: 'realistic', graphicsTier: 'low' }),
      ),
    );
    await page.goto('/?tile=lost-city&tutorial=0');
    await page.waitForFunction(
      () => window.__gameReady === true && (window.__game as unknown as Game).props.loaded,
    );
    await page.keyboard.press('Escape');
    const pose = await page.evaluate(() => {
      const g = window.__game as unknown as Game;
      const hero = g.props.placed.find((p) => p.def.id === 'poseidon-tower')!;
      return {
        range: Math.hypot(
          g.sub.position.x - hero.root.position.x,
          g.sub.position.z - hero.root.position.z,
        ),
        arm: g.rig.chaseRadius,
        mode: g.save.get().gameplayMode,
      };
    });
    expect(pose.mode).toBe('realistic');
    expect(pose.range).toBeGreaterThan(42);
    expect(pose.range).toBeLessThan(46);
    expect(pose.arm).toBeCloseTo(Math.hypot(38, 90), 6);
  });
});

freshTest.describe('mission preview and approach', () => {
  const test = experiencedTest;
  interface Game {
    sub: Submarine;
    scanner: Scanner;
    props: Props;
    discovery: Discovery;
    mission: Mission | null;
  }

  test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });

  async function ready(page: Page): Promise<void> {
    await clockFramesUntil(page, () => {
      const g = window.__game as unknown as Game | undefined;
      return !!(window.__gameReady && g?.props.loaded && g.discovery.loaded);
    });
    // Match golden captures: hold the actual opening while allowing render/UI
    // frames. Begin still resolves its own start pose through the real router.
    await page.evaluate(() => {
      (window.__game as unknown as Game).sub.step = () => {};
    });
    await page.clock.runFor(34);
  }

  async function pose(page: Page) {
    return page.evaluate(() => {
      const g = window.__game as unknown as Game;
      const first = g.mission?.objectives.find((o) => o.primary);
      const target = g.discovery.pois.find((p) => p.id === first?.poiId);
      return {
        position: g.sub.position.toArray(),
        yaw: g.sub.yaw,
        first: first?.id,
        range: target?.position.distanceTo(g.sub.position),
        scanRadius: target?.radius,
        objectiveDistance: g.scanner.view.objectiveDistance,
        objectiveId: g.scanner.view.objectiveId,
        failedProps: g.props.stats.failed,
      };
    });
  }

  for (const [site, first] of [
    ['titanic', 'find-bow'],
    ['great-blue-hole', 'stalactites'],
    ['monterey-canyon', 'canyon-wall'],
    ['beebe-vent-field', 'main-vents'],
    ['lost-city', 'find-poseidon'],
  ]) {
    for (const tier of ['low', 'medium', 'high']) {
      // Regression guard: mission spawn began within scan range or jumped between preview and Begin.
      test(`${site} ${tier}: mission previews and opens on an approach outside scan range`, async ({
        page,
      }, testInfo) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await pauseClockBeforeNavigation(page);
        const params = `tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42`;
        await page.goto(`/?${params}`, { waitUntil: 'domcontentloaded' });
        await ready(page);
        const free = await pose(page);
        expect(free.first).toBeUndefined();
        expect(free.failedProps).toBe(0);

        await page.goto(`/?${params}&mission=${site}`, { waitUntil: 'domcontentloaded' });
        await ready(page);
        await expect(page.locator('.briefing')).toBeVisible();
        const preview = await pose(page);
        await page.locator('.briefing-begin').click();
        await page.clock.runFor(34);
        await expect(page.locator('.briefing')).toBeHidden();
        const mission = await pose(page);
        const distance = Math.hypot(...mission.position.map((p, i) => p - free.position[i]));
        const yawDegrees =
          (Math.abs(
            Math.atan2(Math.sin(mission.yaw - free.yaw), Math.cos(mission.yaw - free.yaw)),
          ) *
            180) /
          Math.PI;
        await testInfo.attach('opening-comparison', {
          body: JSON.stringify(
            { site, tier, free, preview, mission, distance, yawDegrees },
            null,
            2,
          ),
          contentType: 'application/json',
        });
        expect(mission.failedProps).toBe(0);
        expect(mission.first).toBe(first);
        expect(mission.range).toBeDefined();
        expect(mission.range!).toBeCloseTo(MISSION_APPROACH_M[site], 1);
        expect(mission.range!).toBeGreaterThan(mission.scanRadius!);
        expect(mission.range!).toBeLessThanOrEqual(300);
        expect(distance).toBeGreaterThan(60);
        expect(mission.objectiveId).toBeTruthy();
        expect(mission.objectiveDistance).toBeCloseTo(mission.range!, 1);
        await expect(page.locator('.obj-item.is-current')).toContainText('Head to');
        expect(preview.position).toEqual(mission.position);
        expect(preview.yaw).toEqual(mission.yaw);
        expect(errors).toEqual([]);
      });
    }
  }
});

freshTest.describe('live portrait opening', () => {
  const test = freshTest;
  const shots = '.cache/codex/shots/opening-framing/live';
  const sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon'];
  // Audit panel bounds, not full-screen transparent overlay containers or their
  // nested labels. Optional panels count whenever the real UI displays them.
  const hudSelectors = [
    '.sonar',
    '.hud-readouts',
    '.guidance-slot',
    '.objectives-panel',
    '.tc-stick',
    '.tc-slider',
    '.tc-buttons',
    '.tc-btn-pause',
    '.tc-rotate-hint',
  ];
  const requiredHud = [
    '.sonar',
    '.hud-readouts',
    '.tc-stick',
    '.tc-slider',
    '.tc-buttons',
    '.tc-btn-pause',
  ];

  interface Game {
    sub: Submarine;
    subMesh: SubMesh;
    rig: CameraRig;
    save: Save;
    props: { loaded: boolean; stats: { failed: number; skipped: number } };
    discovery: { loaded: boolean };
    presets: { entered: boolean };
    explore: { ready: boolean };
    perf: { tier: string; drawCalls: number };
  }

  interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  function overlaps(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
    );
  }

  test.describe('live portrait Low opening', () => {
    test.describe.configure({ timeout: 180_000 });
    test.use({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });

    for (const site of sites) {
      // Regression guard: live portrait opening clipped hull geometry or covered it with HUD; map records uncertain bug attribution.
      test(`${site}: sub and HUD remain fully visible after 3 s`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForFunction(() => {
          const g = window.__game as unknown as Game | undefined;
          return (
            window.__gameReady &&
            g?.props.loaded &&
            g.discovery.loaded &&
            g.presets.entered &&
            g.explore.ready
          );
        });
        await page.evaluate(() => document.fonts.ready.then(() => {}));
        // Exercise the live authored opening: no teleport, camera reset, physics
        // freeze, HUD dismissal or pose overrides before the requested settle.
        await page.waitForTimeout(3_000);
        await page.evaluate(
          () =>
            new Promise<void>((done) =>
              requestAnimationFrame(() => requestAnimationFrame(() => done())),
            ),
        );

        const opening = await page.evaluate((selectors) => {
          const g = window.__game as unknown as Game;
          const canvas = document.querySelector<HTMLCanvasElement>('#viewport')!;
          const viewport = canvas.getBoundingClientRect();
          const camera = g.rig.camera;
          camera.updateMatrixWorld(true);
          const hull = g.subMesh.vehicle.root;
          hull.updateWorldMatrix(true, true);
          const projected: { x: number; y: number; z: number }[] = [];
          // Project every visible mesh's box in its own local frame. The root's
          // world AABB would overstate rotated hull corners; the cockpit is not
          // part of this chase hull. Instanced thrusters include their transforms.
          hull.traverseVisible((object) => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            const instance = mesh as InstancedMesh;
            let box;
            if (instance.isInstancedMesh) {
              instance.computeBoundingBox();
              box = instance.boundingBox;
            } else {
              mesh.geometry.computeBoundingBox();
              box = mesh.geometry.boundingBox;
            }
            if (!box || box.isEmpty()) return;
            for (const x of [box.min.x, box.max.x])
              for (const y of [box.min.y, box.max.y])
                for (const z of [box.min.z, box.max.z]) {
                  const point = g.sub.position
                    .clone()
                    .set(x, y, z)
                    .applyMatrix4(mesh.matrixWorld)
                    .project(camera);
                  projected.push({
                    x: viewport.x + ((point.x + 1) * viewport.width) / 2,
                    y: viewport.y + ((1 - point.y) * viewport.height) / 2,
                    z: point.z,
                  });
                }
          });
          if (!projected.length) throw new Error('No visible hull geometry to project');
          const left = Math.min(...projected.map((p) => p.x));
          const top = Math.min(...projected.map((p) => p.y));
          const hud = selectors.flatMap((selector) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (
              !element ||
              !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
            )
              return [];
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height) return [];
            return [{ selector, x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
          });
          return {
            mode: g.save.get().gameplayMode,
            tier: g.perf.tier,
            view: g.rig.mode,
            touch: matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0,
            viewport: { width: innerWidth, height: innerHeight },
            hullVisible: hull.visible && g.subMesh.group.visible,
            hull: {
              x: left,
              y: top,
              width: Math.max(...projected.map((p) => p.x)) - left,
              height: Math.max(...projected.map((p) => p.y)) - top,
            },
            depth: {
              min: Math.min(...projected.map((p) => p.z)),
              max: Math.max(...projected.map((p) => p.z)),
            },
            position: g.sub.position.toArray(),
            camera: camera.position.toArray(),
            props: g.props.stats,
            draws: g.perf.drawCalls,
            hud,
          };
        }, hudSelectors);

        // Persist evidence before assertions so a failed composition is reviewable.
        await mkdir(shots, { recursive: true });
        const name = `${site}-low-390x844-round-${testInfo.repeatEachIndex + 1}${testInfo.retry ? `-retry-${testInfo.retry}` : ''}`;
        const screenshot = `${shots}/${name}.png`;
        await reviewScreenshot(page, { path: screenshot, timeout: 60_000 });
        const diagnostics = `${shots}/${name}.json`;
        await writeFile(
          diagnostics,
          JSON.stringify({ site, settleMs: 3000, ...opening, errors }, null, 2),
        );
        if (renderReview)
          await testInfo.attach(name, { path: screenshot, contentType: 'image/png' });
        await testInfo.attach(`${name}-bounds`, {
          path: diagnostics,
          contentType: 'application/json',
        });

        expect.soft(errors).toEqual([]);
        expect.soft(opening.viewport).toEqual({ width: 390, height: 844 });
        expect.soft(opening.touch).toBe(true);
        expect.soft(opening.mode).toBe('arcade');
        expect.soft(opening.tier).toBe('low');
        expect.soft(opening.view).toBe('chase');
        expect.soft(opening.hullVisible).toBe(true);
        expect.soft(opening.props.failed).toBe(0);
        expect.soft(opening.props.skipped).toBe(0);
        expect.soft(opening.draws).toBeGreaterThan(0);
        expect.soft(opening.depth.min, 'hull is beyond the near plane').toBeGreaterThan(-1);
        expect.soft(opening.depth.max, 'hull is inside the far plane').toBeLessThan(1);
        expect.soft(opening.hull.width).toBeGreaterThan(0);
        expect.soft(opening.hull.height).toBeGreaterThan(0);
        for (const selector of requiredHud)
          expect
            .soft(
              opening.hud.some((panel) => panel.selector === selector),
              `${selector} is visible`,
            )
            .toBe(true);
        for (const box of [{ selector: 'sub hull', ...opening.hull }, ...opening.hud]) {
          expect.soft(box.x, `${box.selector} left`).toBeGreaterThanOrEqual(0);
          expect.soft(box.y, `${box.selector} top`).toBeGreaterThanOrEqual(0);
          expect.soft(box.x + box.width, `${box.selector} right`).toBeLessThanOrEqual(390);
          expect.soft(box.y + box.height, `${box.selector} bottom`).toBeLessThanOrEqual(844);
        }
        for (const panel of opening.hud)
          expect
            .soft(overlaps(opening.hull, panel), `sub hull overlaps ${panel.selector}`)
            .toBe(false);
        for (let i = 0; i < opening.hud.length; i++)
          for (const b of opening.hud.slice(i + 1)) {
            const a = opening.hud[i];
            expect.soft(overlaps(a, b), `${a.selector} overlaps ${b.selector}`).toBe(false);
          }
      });
    }
  });
});

freshTest.describe('settled opening render work', () => {
  const test = experiencedTest;
  interface Game {
    perf: PerfStats;
    rig: CameraRig;
    sub: Submarine;
    subMesh: SubMesh;
    props: Props;
    discovery: Discovery;
    terrain: Terrain;
    scene: Scene;
    explore: { ready: boolean };
    life: object | null;
  }

  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  // Serve the retained pre-fix build separately to compare actual renderer counters.
  const baselineURL = env.F650_BASELINE_URL;

  async function opening(page: Page, site: string, tier: string, touch: boolean, origin = '') {
    await page.goto(
      `${origin}/?tile=${site}&skipBriefing=1&tutorial=0&tier=${tier}&dynres=0&lifeSeed=42${touch ? '&touch=1' : ''}`,
    );
    await page.waitForFunction(() => {
      const g = window.__game as unknown as Game | undefined;
      return (
        window.__gameReady && g?.props.loaded && g.discovery.loaded && g.explore.ready && g.life
      );
    });
    await page.evaluate(() => {
      (window.__game as unknown as Game).sub.step = () => {};
    });
    // Renderer counters describe the latest frame, not a time average. Wait
    // for texture binding and two presented frames before sampling static work.
    await page.evaluate(
      () =>
        (window.__game as unknown as { terrain: { texturesReady: Promise<void> } }).terrain
          .texturesReady,
    );
    await waitForFrames(page, 2);
  }

  async function perf(page: Page) {
    return page.evaluate(async () => {
      const g = window.__game as unknown as Game;
      let drawCalls = 0,
        triangles = 0;
      for (let i = 0; i < 3; i++) {
        await new Promise<void>((done) => requestAnimationFrame(() => done()));
        drawCalls = Math.max(drawCalls, g.perf.drawCalls);
        triangles = Math.max(triangles, g.perf.triangles);
      }
      return { tier: g.perf.tier, drawCalls, triangles };
    });
  }

  for (const layout of [
    { width: 1600, height: 900, touch: false },
    { width: 844, height: 390, touch: true },
    { width: 360, height: 640, touch: true },
  ]) {
    test.describe(`settled openings ${layout.width}×${layout.height}`, () => {
      test.use({
        viewport: layout,
        hasTouch: layout.touch,
        isMobile: layout.touch,
        deviceScaleFactor: 1,
      });
      for (const tier of ['low', 'medium']) {
        for (const site of ['titanic', 'beebe-vent-field', 'monterey-canyon']) {
          // Regression guard: merged openings lost snow, reticle clearance or unburied boulders; map records uncertain bug attribution.
          test(`${site} ${tier}: opening intent and rendered work`, async ({ page }, info) => {
            const errors: string[] = [];
            page.on('pageerror', (error) => errors.push(error.message));
            let baseline: Awaited<ReturnType<typeof perf>> | undefined;
            if (site === 'monterey-canyon' && baselineURL) {
              await opening(page, site, tier, layout.touch, baselineURL.replace(/\/$/, ''));
              baseline = await perf(page);
              await reviewScreenshot(page, { path: info.outputPath('main-minus-3.png') });
            }
            await opening(page, site, tier, layout.touch);
            await expect(page.locator('canvas').first()).toBeVisible();
            const current = await perf(page);
            expect(current.tier).toBe(tier);
            expect(current.drawCalls).toBeGreaterThan(0);
            expect(current.triangles).toBeGreaterThan(10_000);
            await info.attach('renderer-performance', {
              body: JSON.stringify({ current, baseline: baseline ?? 'not supplied' }, null, 2),
              contentType: 'application/json',
            });
            if (baseline) {
              expect(current.drawCalls).toBeLessThanOrEqual(baseline.drawCalls);
              expect(current.triangles).toBeLessThanOrEqual(baseline.triangles);
            }
            if (site === 'titanic') {
              const snow = await page.evaluate(() => {
                const g = window.__game as unknown as Game;
                const points = g.scene.getObjectByName('marineSnow') as Points;
                const u = (points.material as ShaderMaterial).uniforms;
                return {
                  visible: points.visible,
                  count: points.geometry.getAttribute('aSeed').count,
                  opacity: u.uOpacity.value,
                  maxSize: u.uMaxSizePx.value,
                  density: u.uDensity.value,
                };
              });
              expect(snow.visible).toBe(true);
              expect(snow.count).toBe(tier === 'low' ? 300 : 1200);
              expect(snow.opacity).toBe(0.24);
              expect(snow.maxSize).toBe(3);
              expect(snow.density).toBeGreaterThan(0);
            }
            if (site === 'beebe-vent-field') {
              await expect(page.locator('.scan-reticle')).toBeVisible();
              const framing = await page.evaluate(() => {
                const g = window.__game as unknown as Game;
                const reticle = document.querySelector('.scan-reticle')!.getBoundingClientRect();
                const bounds = {
                  left: Infinity,
                  top: Infinity,
                  right: -Infinity,
                  bottom: -Infinity,
                };
                const point = g.sub.position.clone();
                const instance = g.subMesh.group.matrixWorld.clone();
                const world = instance.clone();
                g.subMesh.group.updateMatrixWorld(true);
                g.rig.camera.updateMatrixWorld(true);
                g.subMesh.group.traverseVisible((object) => {
                  const mesh = object as Mesh;
                  if (!mesh.isMesh) return;
                  const batched = mesh as InstancedMesh;
                  const vertices = mesh.geometry.getAttribute('position');
                  for (let i = 0; i < (batched.isInstancedMesh ? batched.count : 1); i++) {
                    if (batched.isInstancedMesh) batched.getMatrixAt(i, instance);
                    else instance.identity();
                    world.multiplyMatrices(mesh.matrixWorld, instance);
                    for (let j = 0; j < vertices.count; j++) {
                      point
                        .fromBufferAttribute(vertices, j)
                        .applyMatrix4(world)
                        .project(g.rig.camera);
                      const x = ((point.x + 1) * innerWidth) / 2,
                        y = ((1 - point.y) * innerHeight) / 2;
                      bounds.left = Math.min(bounds.left, x);
                      bounds.right = Math.max(bounds.right, x);
                      bounds.top = Math.min(bounds.top, y);
                      bounds.bottom = Math.max(bounds.bottom, y);
                    }
                  }
                });
                return {
                  bounds,
                  clear:
                    bounds.right <= reticle.left ||
                    bounds.left >= reticle.right ||
                    bounds.bottom <= reticle.top ||
                    bounds.top >= reticle.bottom,
                  width: innerWidth,
                  height: innerHeight,
                };
              });
              expect(framing.clear, JSON.stringify(framing)).toBe(true);
              expect(framing.bounds.left).toBeGreaterThanOrEqual(0);
              expect(framing.bounds.top).toBeGreaterThanOrEqual(0);
              expect(framing.bounds.right).toBeLessThanOrEqual(framing.width);
              expect(framing.bounds.bottom).toBeLessThanOrEqual(framing.height);
            }
            if (site === 'monterey-canyon') {
              const rocks = await page.evaluate(() => {
                const g = window.__game as unknown as Game;
                let count = 0,
                  buried = 0;
                const instance = g.subMesh.group.matrixWorld.clone(),
                  world = instance.clone(),
                  point = g.sub.position.clone();
                for (const prop of g.props.placed.filter((p) => p.def.feature === 'canyon-ledge')) {
                  prop.root.updateMatrixWorld(true);
                  prop.full.traverse((object) => {
                    const mesh = object as InstancedMesh;
                    if (!mesh.isInstancedMesh || !mesh.name.startsWith('boulders-')) return;
                    const vertices = mesh.geometry.getAttribute('position');
                    for (let i = 0; i < mesh.count; i++) {
                      mesh.getMatrixAt(i, instance);
                      world.multiplyMatrices(mesh.matrixWorld, instance);
                      let exposed = -Infinity;
                      for (let j = 0; j < vertices.count; j++) {
                        point.fromBufferAttribute(vertices, j).applyMatrix4(world);
                        exposed = Math.max(
                          exposed,
                          point.y - g.terrain.sampleHeight(point.x, point.z),
                        );
                      }
                      if (exposed <= 0.25) buried++;
                      count++;
                    }
                  });
                }
                return { count, buried };
              });
              expect(rocks.count).toBe(tier === 'low' ? 0 : 384);
              expect(rocks.buried).toBe(0);
            }
            expect(errors).toEqual([]);
            // Pixel readability is reviewed from these captures, independently of geometry assertions.
            await reviewScreenshot(page, { path: info.outputPath(`${site}-${tier}-opening.png`) });
          });
        }
      }
    });
  }
});

freshTest.describe('mesh and physics agreement', () => {
  const test = experiencedTest;
  interface Game {
    terrain: Terrain;
    sub: Submarine;
    rig: CameraRig;
    props: { loaded: boolean };
    discovery: { loaded: boolean };
  }

  for (const site of ['monterey-canyon', 'great-blue-hole']) {
    for (const tier of ['low', 'medium', 'high']) {
      // Regression guard: carved-site collision height disagreed with the rendered terrain and HUD depth.
      test(`${site} ${tier}: rendered carve and depth agree`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`/?tile=${site}&skipBriefing=1&tier=${tier}&dynres=0&lifeSeed=42`);
        await page.waitForFunction(() => {
          const g = window.__game as unknown as Game;
          return window.__gameReady && g?.props.loaded && g.discovery.loaded;
        });
        await reviewScreenshot(page, { path: testInfo.outputPath('opening.png') });
        const centre =
          site === 'monterey-canyon'
            ? { x: -3230.927430367679, z: -1358.837559250192 }
            : { x: -157.43050033975456, z: -44.80193984705082 };
        const points =
          site === 'monterey-canyon'
            ? [-300, 0, 300].map((along) => ({
                x: centre.x + 20 * Math.sin(along / 220),
                z: centre.z + along,
              }))
            : [0, 60, 112, 140].map((radius) => ({
                x: centre.x + radius * Math.cos(2.3),
                z: centre.z + radius * Math.sin(2.3),
              }));
        const measurements = [];
        for (const point of points) {
          await page.evaluate(({ x, z }) => {
            const g = window.__game as unknown as Game;
            g.sub.reset(x, g.terrain.sampleHeight(x, z) + 30, z, 0);
            g.rig.snap(g.sub.position, 0, 0);
          }, point);
          // Allow the normal render loop to select and draw the current near LOD.
          await page.waitForTimeout(250);
          const measurement = await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            const { x, z } = g.sub.position;
            let meshY = -Infinity;
            // Independent vertical intersection with the ACTIVE rendered index buffer.
            // Ignore skirts, whose triangles have zero XZ area.
            for (const object of g.terrain.group.children) {
              const mesh = object as THREE.Mesh;
              if (!mesh.isMesh) continue;
              const geometry = mesh.geometry;
              const bounds = geometry.boundingBox;
              if (
                bounds &&
                (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z)
              )
                continue;
              const p = geometry.getAttribute('position');
              const indices = geometry.getIndex()!;
              for (let i = 0; i < indices.count; i += 3) {
                const a = indices.getX(i),
                  b = indices.getX(i + 1),
                  c = indices.getX(i + 2);
                const ax = p.getX(a),
                  az = p.getZ(a),
                  bx = p.getX(b),
                  bz = p.getZ(b),
                  cx = p.getX(c),
                  cz = p.getZ(c);
                const determinant = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
                if (Math.abs(determinant) < 1e-9) continue;
                const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / determinant;
                const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / determinant;
                if (u < -1e-8 || v < -1e-8 || u + v > 1 + 1e-8) continue;
                meshY = Math.max(meshY, u * p.getY(a) + v * p.getY(b) + (1 - u - v) * p.getY(c));
              }
            }
            const state = g.sub.getState();
            const eye = g.rig.camera.position;
            return {
              x,
              z,
              meshY,
              collision: g.terrain.sampleHeight(x, z),
              survey: g.terrain.sampleDataHeight(x, z),
              depth: state.depth,
              altitude: state.altitude,
              y: state.position.y,
              cameraClearance: eye.y - g.terrain.sampleHeight(eye.x, eye.z),
            };
          });
          measurements.push(measurement);
          expect(Number.isFinite(measurement.meshY)).toBe(true);
          expect(Math.abs(measurement.collision - measurement.meshY)).toBeLessThan(0.002);
          expect(measurement.depth).toBe(measurement.y);
          expect(Math.abs(measurement.altitude - (measurement.y - measurement.meshY))).toBeLessThan(
            0.002,
          );
          expect(measurement.cameraClearance).toBeGreaterThanOrEqual(5.998);
        }
        const central = measurements[site === 'monterey-canyon' ? 1 : 0];
        const expected = site === 'monterey-canyon' ? -860 : -125;
        expect(Math.abs(central.survey - expected)).toBeLessThan(0.1);
        expect(Math.abs(central.meshY - expected)).toBeLessThan(site === 'monterey-canyon' ? 5 : 2);
        await testInfo.attach('carve-measurements', {
          body: JSON.stringify(measurements, null, 2),
          contentType: 'application/json',
        });
        await reviewScreenshot(page, { path: testInfo.outputPath('inspection.png') });
        expect(errors).toEqual([]);
      });
    }
  }
});

freshTest.describe('camera terrain and solid tip clearance', () => {
  const test = experiencedTest;
  interface Game {
    props: Props;
    terrain: Terrain;
    sub: Submarine;
    rig: CameraRig;
    discovery: { loaded: boolean };
    presets: { entered: boolean };
    perf: PerfStats;
  }

  for (const viewport of [
    { name: 'desktop', width: 1600, height: 900, touch: false },
    { name: 'portrait', width: 390, height: 844, touch: true },
    { name: 'landscape', width: 844, height: 390, touch: true },
  ]) {
    test.describe(`${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.touch,
        isMobile: viewport.touch,
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
        storageState: { cookies: [], origins: [] },
      });
      for (const site of ['endurance', 'lost-city']) {
        for (const tier of ['low', 'high']) {
          // Regression guard: merged opening camera/near plane or solid tower tip failed clearance; map records uncertain bug attribution.
          test(`${site} ${tier}: merged opening clears terrain and tower-tip HUD`, async ({
            page,
          }, testInfo) => {
            const errors: string[] = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await pauseClockBeforeNavigation(page);
            await page.goto(
              `/?tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42${viewport.touch ? '&touch=1' : ''}`,
              {
                waitUntil: 'domcontentloaded',
              },
            );
            await clockFramesUntil(page, () => {
              const g = window.__game as unknown as Game;
              return !!(
                window.__gameReady &&
                g.props.loaded &&
                g.discovery.loaded &&
                g.presets.entered
              );
            });
            await page.evaluate(() => {
              (window.__game as unknown as Game).sub.step = () => {};
            });
            await page.clock.fastForward(50);
            const opening = await page.evaluate((siteId) => {
              const g = window.__game as unknown as Game;
              const camera = g.rig.camera;
              camera.updateMatrixWorld(true);
              const nearClearances: number[] = [];
              for (const x of [-1, 0, 1])
                for (const y of [-1, 0, 1]) {
                  const p = g.sub.position.clone().set(x, y, -1).unproject(camera);
                  nearClearances.push(p.y - g.terrain.sampleHeight(p.x, p.z));
                }
              let tip: { x: number; y: number; z: number } | null = null;
              if (siteId === 'lost-city') {
                const hero = g.props.placed.find((p) => p.def.id === 'poseidon-tower')!;
                const solid = hero.full.children[0] as Mesh;
                solid.updateWorldMatrix(true, false);
                const vertices = solid.geometry.getAttribute('position');
                let topY = -Infinity;
                const top = g.sub.position.clone();
                for (let i = 0; i < vertices.count; i++) {
                  const point = g.sub.position
                    .clone()
                    .fromBufferAttribute(vertices, i)
                    .applyMatrix4(solid.matrixWorld);
                  if (point.y > topY) {
                    topY = point.y;
                    top.copy(point);
                  }
                }
                top.project(camera);
                tip = {
                  x: ((top.x + 1) * innerWidth) / 2,
                  y: ((1 - top.y) * innerHeight) / 2,
                  z: top.z,
                };
              }
              const panel = document.querySelector<HTMLElement>('.guidance-slot')!;
              const card = panel.getBoundingClientRect();
              return {
                tip,
                card: {
                  left: card.left,
                  right: card.right,
                  top: card.top,
                  bottom: card.bottom,
                  visible: panel.checkVisibility(),
                },
                nearClearances,
                eyeClearance:
                  camera.position.y - g.terrain.sampleHeight(camera.position.x, camera.position.z),
                radius: g.rig.chaseRadius,
                calls: g.perf.drawCalls,
                triangles: g.perf.triangles,
                props: { ...g.props.stats },
              };
            }, site);
            await reviewScreenshot(page, {
              path: testInfo.outputPath(`${site}-${tier}-${viewport.name}.png`),
            });
            await testInfo.attach('opening-probe', {
              body: JSON.stringify(opening, null, 2),
              contentType: 'application/json',
            });
            expect(errors).toEqual([]);
            expect(opening.props.failed).toBe(0);
            // The camera distance is the site's authored opening arm, not a fixed number; endurance tunes it per V-endurance.
            expect(opening.radius).toBe(
              site === 'endurance' ? siteData('endurance').opening!.reframe!.chaseRadius! : 66,
            );
            expect(opening.radius).toBeGreaterThanOrEqual(35);
            expect(opening.radius).toBeLessThanOrEqual(180);
            expect(opening.eyeClearance).toBeGreaterThanOrEqual(6 - 1e-8);
            expect(Math.min(...opening.nearClearances)).toBeGreaterThan(0);
            if (tier === 'low') {
              expect(opening.calls).toBeGreaterThan(0);
              expect(opening.triangles).toBeGreaterThan(10_000);
              expect(opening.calls).toBeLessThanOrEqual(1500);
              expect(opening.triangles).toBeLessThanOrEqual(1_500_000);
            }
            if (opening.tip) {
              const { tip, card } = opening;
              expect(card.visible).toBe(true);
              expect(tip.z).toBeGreaterThan(-1);
              expect(tip.z).toBeLessThan(1);
              expect(tip.x).toBeGreaterThan(0);
              expect(tip.x).toBeLessThan(viewport.width);
              expect(tip.y).toBeGreaterThan(0);
              expect(tip.y).toBeLessThan(viewport.height);
              const gap = 8;
              expect(
                tip.x < card.left - gap ||
                  tip.x > card.right + gap ||
                  tip.y < card.top - gap ||
                  tip.y > card.bottom + gap,
                'actual carbonate tip clears the scan card by at least 8 CSS pixels',
              ).toBe(true);
            }
          });
        }
      }
    });
  }
});

freshTest.describe('catalog underwater and approach poses', () => {
  const test = experiencedTest;
  const shots = '.cache/codex/shots/opening-framing/underwater';
  interface Game {
    sub: Submarine;
    rig: CameraRig;
    props: Props;
    save: Save;
    config: GameConfig;
    terrain: { sampleHeight(x: number, z: number): number };
    discovery: { loaded: boolean };
    atmosphere: Atmosphere;
  }
  const sites = [
    { id: 'great-blue-hole', hero: 'karst-grotto', detail: true },
    { id: 'hunga-tonga-caldera', hero: 'caldera-tuff-wall', detail: true },
    { id: 'titanic', hero: 'bow-hull', detail: true },
    { id: 'lost-city', hero: 'poseidon-tower', detail: true },
    { id: 'endurance', hero: 'main-hull', detail: true },
    { id: 'beebe-vent-field', hero: 'beebe-chimney-1', detail: true },
    { id: 'blake-plateau-corals', hero: 'lophelia-mound', detail: true },
    { id: 'challenger-deep', hero: 'leggo-lander-marker', detail: false },
    { id: 'monterey-canyon', hero: 'canyon-wall-ledge', detail: false },
    { id: 'hudson-canyon', hero: 'coral-ledge-mound', detail: false },
    { id: 'axial-seamount-ashes', hero: 'mushroom-chimney', detail: false },
    { id: 'kamaehuakanaloa', detail: false },
    { id: 'bismarck', hero: 'main-hull', detail: false },
  ];

  async function settle(page: Page): Promise<void> {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let frames = 0;
          const next = (): void => {
            if (++frames >= 8) resolve();
            else requestAnimationFrame(next);
          };
          requestAnimationFrame(next);
        }),
    );
  }

  async function assertUnderwater(page: Page): Promise<void> {
    const eye = await page.evaluate(() => {
      const g = window.__game as unknown as Game;
      const p = g.rig.camera.position;
      return {
        sub: g.sub.position.y,
        mode: g.rig.mode,
        y: p.y,
        floor: g.terrain.sampleHeight(p.x, p.z) + g.config.camera.terrainClearance,
      };
    });
    expect(eye.sub).toBeLessThan(0);
    expect(eye.mode).toBe('chase');
    expect(eye.y).toBeLessThanOrEqual(-2 + 1e-6);
    expect(eye.y).toBeGreaterThanOrEqual(eye.floor - 1e-6);
  }

  test.describe('composed openings and underwater approaches', () => {
    test.describe.configure({ timeout: 180_000 });
    test.use({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      storageState: { cookies: [], origins: [] },
    });

    for (const site of sites) {
      const authored = siteData(site.id).opening!;
      const heroId = site.hero ?? authored.reframe?.aimHero ?? authored.freeDive!.hero;
      // Regression guard: opening faced away from its hero or put the hull/camera through props, terrain or water surface.
      test(`${site.id}: underwater free-dive opening${site.detail ? ' and 15 m detail' : ''}`, async ({
        page,
      }) => {
        await mkdir(shots, { recursive: true });
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto(`/?tile=${site.id}&skipBriefing=1`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
          const g = window.__game as unknown as Game | undefined;
          return window.__gameReady && g?.props.loaded && g.discovery.loaded;
        });
        await settle(page);
        await assertUnderwater(page);
        const opening = await page.evaluate((heroId) => {
          const g = window.__game as unknown as Game;
          const hero = g.props.placed.find((p) => p.def.id === heroId)!;
          const centre = hero.root.localToWorld(hero.localBounds.getCenter(g.sub.position.clone()));
          const toHero = centre.clone().sub(g.sub.position).setY(0).normalize();
          const body = hero.full.children.find((child) => 'isMesh' in child) as Mesh;
          body.geometry.computeBoundingBox();
          const screen = body
            .localToWorld(body.geometry.boundingBox!.getCenter(g.sub.position.clone()))
            .project(g.rig.camera);
          return {
            subjectScreen: screen.toArray(),
            facing: g.sub.getForward(g.sub.position.clone()).dot(toHero),
            cameraCollision: g.props.collide(
              g.rig.camera.position.clone(),
              1,
              g.sub.position.clone(),
            ),
            illumination:
              g.atmosphere.ambient.intensity *
              (0.2126 * g.atmosphere.ambient.color.r +
                0.7152 * g.atmosphere.ambient.color.g +
                0.0722 * g.atmosphere.ambient.color.b),
            collision: g.props.collide(
              g.sub.position.clone(),
              g.config.submarine.hullRadius,
              g.sub.position.clone(),
            ),
          };
        }, heroId);
        if (site.hero) expect(opening.facing).toBeGreaterThan(0.98);
        else {
          expect(opening.facing).toBeCloseTo(
            Math.cos(((authored.reframe?.yawOffset ?? 0) * Math.PI) / 180),
            3,
          );
          expect(opening.illumination).toBeGreaterThan(0.8);
          expect(Math.abs(opening.subjectScreen[0])).toBeLessThan(1);
          expect(Math.abs(opening.subjectScreen[1])).toBeLessThan(1);
          expect(opening.subjectScreen[2]).toBeGreaterThan(-1);
          expect(opening.subjectScreen[2]).toBeLessThan(1);
          expect(opening.cameraCollision).toBe(false);
        }
        expect(opening.collision).toBe(false);
        await reviewScreenshot(page, { path: `${shots}/${site.id}-spawn.png` });

        if (site.detail) {
          const approach = await page.evaluate((heroId) => {
            const g = window.__game as unknown as Game;
            const hero = g.props.placed.find((p) => p.def.id === heroId)!;
            const centre = hero.localBounds.getCenter(g.sub.position.clone());
            if (hero.def.model === 'procedural:chimney' && hero.def.dimensionsM)
              centre.y = hero.localBounds.min.y + hero.def.dimensionsM[2] * 0.55;
            const half = hero.localBounds.getSize(g.sub.position.clone()).multiplyScalar(0.5);
            const worldCentre = hero.root.localToWorld(centre.clone());
            const candidates = [];
            for (let i = 0; i < 16; i++) {
              const angle = Math.PI / 4 + (i * Math.PI) / 8;
              const dx = Math.sin(angle),
                dz = -Math.cos(angle);
              const edge = Math.min(
                half.x / Math.max(Math.abs(dx), 1e-6),
                half.z / Math.max(Math.abs(dz), 1e-6),
              );
              const target = hero.root.localToWorld(
                centre.clone().add(g.sub.position.clone().set(dx * edge, 0, dz * edge)),
              );
              const direction = target.clone().sub(worldCentre).setY(0).normalize();
              let score = 0,
                clear = true;
              for (const range of [40, 15]) {
                const p = target.clone().addScaledVector(direction, range);
                p.y = Math.max(g.terrain.sampleHeight(p.x, p.z) + 18, Math.min(-12, target.y));
                if (
                  p.y > -8 ||
                  g.props.collide(p.clone(), g.config.submarine.hullRadius, p.clone())
                )
                  clear = false;
                score += Math.abs(p.y - target.y);
              }
              if (clear) candidates.push({ target, direction, score });
            }
            candidates.sort((a, b) => a.score - b.score);
            if (!candidates.length) throw new Error(`No safe detail approach for ${heroId}`);
            const { target, direction } = candidates[0];
            return {
              target: { x: target.x, y: target.y, z: target.z },
              direction: { x: direction.x, z: direction.z },
            };
          }, heroId);
          for (const range of [40, 15]) {
            await page.evaluate(
              ({ target, direction, range }) => {
                const g = window.__game as unknown as Game;
                const x = target.x + direction.x * range,
                  z = target.z + direction.z * range;
                const y = Math.max(g.terrain.sampleHeight(x, z) + 18, Math.min(-12, target.y));
                g.sub.reset(x, y, z, Math.atan2(target.x - x, -(target.z - z)));
                g.rig.resetView();
                g.rig.snap(g.sub.position, g.sub.yaw, 0);
              },
              { ...approach, range },
            );
            await settle(page);
            await assertUnderwater(page);
            await page.evaluate((target) => {
              const g = window.__game as unknown as Game;
              g.rig.setMode('first-person');
              g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
              const eye = g.rig.camera.position;
              const cameraPitch = Math.atan2(
                target.y - eye.y,
                Math.hypot(target.x - eye.x, target.z - eye.z),
              );
              g.rig.lookElevation = (cameraPitch - g.sub.pitch) / 0.55;
              g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
            }, approach.target);
            await settle(page);
            await reviewScreenshot(page, { path: `${shots}/${site.id}-${range}m.png` });
          }
          if (site.id === 'titanic') {
            await page.evaluate(() =>
              (window.__game as unknown as Game).save.setGameplayMode('realistic'),
            );
            await settle(page);
            await reviewScreenshot(page, { path: `${shots}/${site.id}-15m-realistic.png` });
          }
        }
        expect(errors).toEqual([]);
      });
    }
  });
});

freshTest.describe('Titanic first-frame light and snow', () => {
  const test = freshTest;
  interface TitanicGame {
    scene: Scene;
    atmosphere: Atmosphere;
    presets: PresetSystem;
    rig: CameraRig;
    sub: Submarine;
    terrain: Terrain;
    headlights: Headlights;
    props: { loaded: boolean };
  }

  for (const tier of ['low', 'medium', 'high']) {
    for (const route of ['tile', 'mission']) {
      // Regression guard: Titanic opening lost its fill light or permanent snow; map records uncertain bug attribution.
      test(`Titanic ${route} ${tier}: first-frame fill and permanent snow survive the merge`, async ({
        page,
      }, info) => {
        await page.addInitScript(() => {
          localStorage.setItem(
            'subexplorer.progress.v1',
            JSON.stringify({
              version: 1,
              lifetime: 900,
              points: 0,
              awarded: [],
              upgrades: {},
              ratings: {},
            }),
          );
        });
        await page.goto(`/?${route}=titanic&skipBriefing=1&tutorial=0&tier=${tier}`);
        await page.waitForFunction(() => {
          const g = window.__game as unknown as TitanicGame | undefined;
          return window.__gameReady === true && g?.props.loaded && g.presets.entered;
        });
        const opening = await page.evaluate(() => {
          const g = window.__game as unknown as TitanicGame;
          const light = g.atmosphere.ambient;
          const luminance =
            0.2126 * light.color.r + 0.7152 * light.color.g + 0.0722 * light.color.b;
          const density = (g.scene.fog as FogExp2).density;
          const pos = g.sub.position;
          const floor = [];
          for (let bearing = -1; bearing < 8; bearing++) {
            const angle = (bearing * Math.PI) / 4;
            const radius = bearing < 0 ? 0 : 40;
            const x = pos.x + radius * Math.cos(angle),
              z = pos.z + radius * Math.sin(angle);
            const y = g.terrain.sampleHeight(x, z);
            const eye = g.rig.camera.position;
            const distance = Math.hypot(eye.x - x, eye.y - y, eye.z - z);
            floor.push(light.intensity * luminance * Math.exp(-Math.pow(density * distance, 2)));
          }
          const snow = g.scene.getObjectByName('marineSnow') as Points;
          const material = snow.material as ShaderMaterial;
          return {
            ambient: light.intensity,
            fill: g.presets.params.ambientFill,
            floor,
            snowCount: snow.geometry.getAttribute('aSeed').count,
            snowVisible: snow.visible,
            opacity: material.opacity,
            density: material.uniforms.uDensity!.value as number,
            foregroundAlpha: material.uniforms.uForegroundAlpha!.value as number,
            maxSize: material.uniforms.uMaxSizePx!.value as number,
          };
        });
        // These are lighting proxies, not screenshot luminance. Screenshots are
        // retained for visual inspection of the real rendered spawn and far field.
        expect(opening.fill).toBeGreaterThanOrEqual(24);
        expect(opening.ambient).toBeGreaterThanOrEqual(24);
        expect(opening.floor.every((value) => value >= 0.1)).toBe(true);
        expect(opening.snowCount).toBe(tier === 'low' ? 300 : tier === 'medium' ? 1200 : 3000);
        expect(opening.snowVisible).toBe(true);
        expect(opening.opacity).toBeGreaterThan(0);
        expect(opening.density).toBeGreaterThan(0);
        expect(opening.foregroundAlpha).toBeGreaterThan(0);
        expect(opening.maxSize).toBe(3);
        await reviewScreenshot(page, { path: info.outputPath('titanic-spawn.png') });
        await page.evaluate(() =>
          (window.__game as unknown as TitanicGame).headlights.setEnabled(false),
        );
        await waitForFrames(page, 3);
        await reviewScreenshot(page, { path: info.outputPath('titanic-without-lamps.png') });
      });
    }
  }
});

freshTest.describe('rendered horizon readback', () => {
  const test = freshTest;
  interface Game {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    sub: Submarine;
    props: { loaded: boolean; stats: { failed: number } };
    discovery: { loaded: boolean };
    presets: { entered: boolean };
    perf: { tier: string };
  }

  for (const site of ['titanic', 'endurance']) {
    for (const tier of ['low', 'high']) {
      for (const [layout, width, height] of [
        ['desktop', 1600, 900],
        ['portrait', 390, 844],
      ] as const) {
        // Regression guard: wreck opening lost its horizon or rendered black behind the bright HUD; map records uncertain bug attribution.
        test(`${site} ${tier} ${layout}: horizon and opening remain readable`, async ({
          page,
        }, info) => {
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
          });
          // Start each layout before navigation so portrait gets its authored pose.
          await page.setViewportSize({ width, height });
          await pauseClockBeforeNavigation(page);
          await page.goto(
            `/?tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42${layout === 'portrait' ? '&touch=1' : ''}`,
            { waitUntil: 'domcontentloaded' },
          );
          await clockFramesUntil(page, () => {
            const g = window.__game as unknown as Game;
            return !!(
              window.__gameReady &&
              g.props.loaded &&
              g.discovery.loaded &&
              g.presets.entered
            );
          });
          await page.evaluate(() => {
            (window.__game as unknown as Game).sub.step = () => {};
          });
          await page.clock.runFor(34);
          const probe = await page.evaluate((site) => {
            const g = window.__game as unknown as Game;
            const dome = g.scene.getObjectByName(`${site}Horizon`) as THREE.Mesh<
              THREE.SphereGeometry,
              THREE.MeshBasicMaterial
            >;
            const canvas = g.renderer.domElement.getBoundingClientRect();
            return {
              visible: dome.visible,
              vertices: dome.geometry.getAttribute('position').count,
              tier: g.perf.tier,
              failed: g.props.stats.failed,
              canvas: { width: canvas.width, height: canvas.height },
              wreckHaze: !!g.scene.getObjectByName('wreckHaze'),
            };
          }, site);
          expect(probe.visible).toBe(true);
          expect(probe.vertices).toBe(561);
          expect(probe.tier).toBe(tier);
          expect(probe.failed).toBe(0);
          expect(probe.canvas).toEqual({ width, height });
          if (tier === 'low') expect(probe.wreckHaze).toBe(false);
          const png = await page.screenshot({
            path: info.outputPath(`${site}-${tier}-${layout}.png`),
          });
          const mean = await page.evaluate(async (b64) => {
            const img = new Image();
            img.src = `data:image/png;base64,${b64}`;
            await img.decode();
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d')!;
            // Sample the scene between the top HUD and bottom controls; bright
            // overlays must not let an otherwise black canvas pass this check.
            ctx.drawImage(
              img,
              img.width * 0.28,
              img.height * 0.3,
              img.width * 0.44,
              img.height * 0.4,
              0,
              0,
              100,
              100,
            );
            const pixels = ctx.getImageData(0, 0, 100, 100).data;
            let sum = 0;
            for (let i = 0; i < pixels.length; i += 4)
              sum += Math.max(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!);
            return sum / 10000;
          }, png.toString('base64'));
          expect(mean).toBeGreaterThan(10);
          expect(errors).toEqual([]);
        });
      }
    }
  }
});

freshTest.describe('settled landscape light and budget', () => {
  const test = freshTest;
  interface Game {
    save: Save;
    perf: PerfStats;
    atmosphere: Atmosphere;
    rig: CameraRig;
    sub: Submarine;
    props: Props;
    terrain: Terrain;
    presets: PresetSystem;
    discovery: { loaded: boolean };
    explore: { ready: boolean };
    life: object | null;
  }

  test.use({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    storageState: { cookies: [], origins: [] },
  });

  // Capture the normal player view. Ambient/fog floors detect missing lighting;
  // visual review of the attachments must still judge terrain and plume readability.
  for (const site of [
    { id: 'lost-city', hero: 'poseidon-tower', minAmbient: 12, minFloor: 2.5 },
    { id: 'beebe-vent-field', hero: 'beebe-chimney-1', minAmbient: 6, minFloor: 0.1 },
  ]) {
    // Regression guard: landscape Low opening lost lighting or exceeded rendered-work bounds; map records uncertain bug attribution.
    test(`${site.id}: Low opening at 844×390 retains lighting and renders without console errors`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(`/?tile=${site.id}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(() => {
        const g = window.__game as unknown as Game | undefined;
        return (
          window.__gameReady &&
          g?.props.loaded &&
          g.presets.entered &&
          g.discovery.loaded &&
          g.explore.ready &&
          g.life
        );
      });
      const opening = await page.evaluate(async (heroId) => {
        const g = window.__game as unknown as Game;
        g.sub.step = () => {};
        for (let i = 0; i < 30; i++)
          await new Promise<void>((done) => requestAnimationFrame(() => done()));
        const hero = g.props.placed.find((p) => p.def.id === heroId);
        if (!hero) throw new Error(`Missing hero: ${heroId}`);
        const light = g.atmosphere.ambient;
        const luminance = 0.2126 * light.color.r + 0.7152 * light.color.g + 0.0722 * light.color.b;
        const density = ((g.atmosphere.group.parent as Scene).fog as FogExp2).density;
        const floorProxies = [];
        for (let bearing = -1; bearing < 8; bearing++) {
          const angle = (bearing * Math.PI) / 4;
          const radius = bearing < 0 ? 0 : 40;
          const x = g.sub.position.x + radius * Math.cos(angle);
          const z = g.sub.position.z + radius * Math.sin(angle);
          const eye = g.rig.camera.position;
          const distance = Math.hypot(eye.x - x, eye.y - g.terrain.sampleHeight(x, z), eye.z - z);
          floorProxies.push(
            light.intensity * luminance * Math.exp(-Math.pow(density * distance, 2)),
          );
        }
        return {
          mode: g.save.get().gameplayMode,
          tier: g.perf.tier,
          ambient: light.intensity,
          floorProxies,
          props: { ...g.props.stats },
          draws: g.perf.drawCalls,
          triangles: g.perf.triangles,
        };
      }, site.hero);
      expect(opening.mode).toBe('arcade');
      expect(opening.tier).toBe('low');
      expect(opening.props.failed).toBe(0);
      expect(opening.props.skipped).toBe(0);
      expect(opening.props.full).toBeGreaterThan(0);
      expect(opening.ambient).toBeGreaterThanOrEqual(site.minAmbient);
      for (const floor of opening.floorProxies) expect(floor).toBeGreaterThanOrEqual(site.minFloor);
      expect(opening.draws).toBeGreaterThan(0);
      expect(opening.draws).toBeLessThanOrEqual(1500);
      expect(opening.triangles).toBeGreaterThan(10_000);
      expect(opening.triangles).toBeLessThanOrEqual(1_500_000);
      await page.evaluate(() => document.fonts.ready.then(() => {}));
      // The list reporter does not persist inline attachment bodies. Keep files
      // in the test output so the orchestrator's captures can be visually reviewed.
      const screenshot = testInfo.outputPath(`${site.id}-low-844x390.png`);
      await reviewScreenshot(page, { path: screenshot, timeout: 60_000 });
      if (renderReview)
        await testInfo.attach(`${site.id}-low-844x390`, {
          path: screenshot,
          contentType: 'image/png',
        });
      const diagnostics = testInfo.outputPath(`${site.id}-opening.json`);
      await writeFile(diagnostics, JSON.stringify(opening, null, 2));
      await testInfo.attach(`${site.id}-opening`, {
        path: diagnostics,
        contentType: 'application/json',
      });
      expect(errors).toEqual([]);
    });
  }
});
