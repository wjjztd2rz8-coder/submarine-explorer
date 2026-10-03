import { afterEach, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Scene, Vector3 } from 'three';
import type { Page } from '@playwright/test';
import { advanceScan, completeScan, scanWithKeyboard } from '../e2e/helpers/scan.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Time } from '../../src/core/Time.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Scanner, type ScanTarget } from '../../src/game/Scanner.js';
import { Life } from '../../src/world/life/Life.js';

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const bus = new EventBus();
  const store = new DiscoveryStore(null);
  const scanner = new Scanner(DEFAULT_CONFIG.scan, bus, store);
  const target: ScanTarget = {
    id: 'bow',
    name: 'Bow',
    landmarkId: 'test',
    position: new Vector3(0, -120, -9),
    radius: 12,
    scanSeconds: 2,
  };
  scanner.setTargets([target]);
  const state = { scan: true };
  const game = {
    appState: 'dive',
    photoMode: { active: false },
    globe: { isOpen: false },
    settings: { isOpen: false },
    missionRouter: null,
    input: { sample: () => state },
    sub: { position: new Vector3(0, -120, 0), getForward: () => new Vector3(0, 0, -1) },
    rov: { deployed: false, position: new Vector3(0, -120, 0), forward: new Vector3(0, 0, -1) },
    config: { rov: { scanRangeFactor: 2 } },
    discovery: {
      scanner,
      pois: [target],
      guide: { isOpen: false },
      debrief: { isOpen: false },
      update: (dt: number, _real: number, p: Vector3, f: Vector3, input: { scan: boolean }) =>
        scanner.update(dt, p, f, input.scan),
    },
  };
  vi.stubGlobal('window', { __game: game });
  const up = vi.fn(async () => {
    state.scan = false;
  });
  const page = {
    evaluate: async (fn: (arg: unknown) => unknown, arg: unknown) => fn(arg),
    keyboard: {
      down: vi.fn(async () => {
        state.scan = true;
      }),
      up,
    },
  } as unknown as Page;
  return { game, page, scanner, store, bus, target, state, up };
}

it('completes a real wildlife target after a low-fps held scan falls short', async () => {
  const { game, page, scanner, store, bus } = setup();
  const life = new Life({
    tier: 'low',
    table: undefined,
    env: { groundAt: () => -700 },
    scene: new Scene(),
    landmarkId: 'monterey-canyon',
    seed: 3,
  });
  try {
    const sub = {
      x: 0,
      y: -120,
      z: 0,
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
    life.sim.spawnNear('comb-jelly', sub, 9, 1);
    scanner.setTargets([]);
    game.discovery.pois = [];
    scanner.setExtraTargets(life.targets);
    const time = new Time();
    const camera = new PerspectiveCamera();
    time.tick(0);
    // Ten frames over the original 20-second wait: control/geometry remain valid.
    for (let frame = 1; frame <= 10; frame++) {
      const steps = time.tick(frame * 2000);
      life.update(time.frameDelta, sub, camera, 800, 0);
      scanner.update(steps * time.fixedDelta, game.sub.position, game.sub.getForward(), true);
    }
    expect(scanner.view).toMatchObject({
      completed: 0,
      phase: 'scanning',
      candidateId: 'life:comb-jelly',
      nearestInRange: true,
      nearestFacing: true,
    });
    expect(scanner.view.progress).toBeCloseTo(2 / 3);
    const complete = vi.fn();
    bus.on('scan:complete', complete);
    await completeScan(page, 'life:comb-jelly');
    expect(scanner.view.lastCompleteId).toBe('life:comb-jelly');
    expect(store.isDiscovered('monterey-canyon', 'life:comb-jelly')).toBe(true);
    expect(complete).toHaveBeenCalledExactlyOnceWith({
      poiId: 'life:comb-jelly',
      landmarkId: 'monterey-canyon',
      firstTime: true,
    });
  } finally {
    life.dispose();
  }
});

it('supports partial progress and never rescans when held past completion', async () => {
  const { page, scanner, store, bus } = setup();
  const complete = vi.fn();
  bus.on('scan:complete', complete);
  await advanceScan(page, 0.6);
  expect(scanner.view.progress).toBeCloseTo(0.3);
  await completeScan(page, 'bow');
  // A rendered frame completing between the partial and complete calls is harmless.
  await completeScan(page, 'bow');
  await advanceScan(page, 3.6);
  expect(scanner.view.completed).toBe(1);
  expect(store.get('test', 'bow')?.count).toBe(1);
  expect(complete).toHaveBeenCalledTimes(1);
});

it('requires held input and real candidate geometry instead of awarding completion', async () => {
  const { page, scanner, state, target } = setup();
  state.scan = false;
  await expect(completeScan(page, 'bow')).rejects.toThrow('real scan control must be held');
  state.scan = true;
  target.position.set(0, -120, -100);
  await expect(completeScan(page, 'bow')).rejects.toThrow('Expected scan candidate bow, got null');
  target.position.set(0, -120, -9);
  await expect(completeScan(page, 'another')).rejects.toThrow('Expected scan candidate another');
  expect(scanner.view.completed).toBe(0);
});

it('preserves freeze gates and releases the keyboard on failure', async () => {
  const { game, page, scanner, up } = setup();
  game.photoMode.active = true;
  await expect(scanWithKeyboard(page, 'bow')).rejects.toThrow('dive is frozen');
  expect(scanner.view.completed).toBe(0);
  expect(up).toHaveBeenCalledExactlyOnceWith('g');
});

it('does not advance scans under Settings, the globe, or the Journal', async () => {
  const { game, page, scanner } = setup();
  for (const modal of [game.settings, game.globe, game.discovery.guide]) {
    modal.isOpen = true;
    await expect(completeScan(page, 'bow')).rejects.toThrow('dive is frozen');
    modal.isOpen = false;
  }
  expect(scanner.view.completed).toBe(0);
});

it('uses the deployed ROV pose/range and restores POI radii even on failure', async () => {
  const { game, page, scanner, target } = setup();
  game.rov.deployed = true;
  game.sub.position.set(100, -120, 0);
  target.position.set(0, -120, -18);
  await expect(completeScan(page, 'wrong')).rejects.toThrow('Expected scan candidate wrong');
  expect(target.radius).toBe(12);
  await completeScan(page, 'bow');
  expect(scanner.view.completed).toBe(1);
  expect(target.radius).toBe(12);
});
