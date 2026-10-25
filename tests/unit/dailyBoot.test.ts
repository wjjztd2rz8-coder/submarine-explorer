import { afterEach, expect, it, vi } from 'vitest';
import * as Daily from '../../src/game/Daily.js';
import { makeConfig } from '../../src/core/Config.js';
import {
  ProgressSave,
  Save,
  SETTINGS_STORAGE_KEY,
  type GameplayMode,
} from '../../src/core/Save.js';
import { Progress } from '../../src/game/Progress.js';
import { Box3, Group, Scene, Vector3 } from 'three';
import { EventBus } from '../../src/core/EventBus.js';
import type { GameContext } from '../../src/app/context.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { modesSystem } from '../../src/app/systems/modes.js';
import { propsSystem } from '../../src/app/systems/props.js';
import { Props, type PlacedProp } from '../../src/world/Props.js';
import lostCityMeta from '../../data/tiles/lost-city/meta.json';

const fixtures = vi.hoisted(() => ({
  routes: [] as string[],
  load: vi.fn(),
  deep: false,
  def: {
    title: 'Shallow',
    briefing: { summary: 'Explore.' },
    objectives: [{ id: 'a', primary: true }],
  },
}));
vi.mock('../../src/game/Mission.js', () => ({
  loadMissionSummaries: async () => {
    // Catalogue fetching straddles UTC midnight.
    vi.setSystemTime(new Date('2026-10-02T00:00:01Z'));
    return [
      { id: 'shallow', tile: 'shallow', depthM: 125 },
      ...(fixtures.deep ? [{ id: 'deep', tile: 'deep', depthM: 3800 }] : []),
    ];
  },
}));
vi.mock('../../src/app/systems/progress.js', () => ({
  loadSavedProgress: async () => new Progress(new ProgressSave(null)),
}));
vi.mock('../../src/game/MissionRouter.js', () => ({
  chooseTileId: () => 'shallow',
  resolveMissionRoute: async (params: URLSearchParams) => {
    fixtures.routes.push(params.toString());
    return { tileId: 'shallow', def: structuredClone(fixtures.def) };
  },
}));
vi.mock('three', async (original) => ({
  ...(await original<typeof import('three')>()),
  WebGLRenderer: vi.fn(function () {
    return { getContext: () => null, setPixelRatio() {}, setSize() {} };
  }),
}));
vi.mock('../../src/world/TileLoader.js', () => ({
  TileLoader: class {
    async loadIndex() {
      return [{ id: 'shallow' }, { id: 'deep' }];
    }
    async load() {
      fixtures.load();
      throw new Error('Gameplay tile loading must wait for the startup boundary');
    }
  },
}));
import { boot } from '../../src/app/boot.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fixtures.routes = [];
  fixtures.load.mockClear();
  fixtures.deep = false;
});
it.each(['arcade', 'realistic'] as const)(
  'resolves Daily using the reloaded %s mode before catalogue loading',
  async (mode) => {
    fixtures.deep = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T23:59:59Z'));
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
    };
    new Save({ config: makeConfig(), storage }).setGameplayMode(mode);
    const saved = storage.getItem(SETTINGS_STORAGE_KEY);
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      location: { search: '?mission=shallow&daily=2026-10-01', href: 'http://localhost/' },
    });
    vi.stubGlobal('document', {
      body: { dataset: {}, appendChild: vi.fn() },
      createElement: () => ({ querySelector: () => ({ textContent: '' }) }),
      getElementById: () => ({}),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const dive = vi.spyOn(Daily, 'dailyDive');
    const ctx = await boot();
    expect(ctx?.daily?.date).toBe('2026-10-01');
    expect(fixtures.load).not.toHaveBeenCalled();
    expect(dive).toHaveBeenCalledWith('2026-10-01', ['shallow', 'deep']);
    expect(fixtures.routes.at(-1)).toBe('mission=deep');
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBe(saved);
  },
);
it('keeps the requested daily date when loading crosses UTC midnight', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T23:59:59Z'));
  vi.stubGlobal('window', {
    location: { search: '?mission=shallow&daily=2026-10-01', href: 'http://localhost/' },
  });
  vi.stubGlobal('document', {
    body: { dataset: {}, appendChild: vi.fn() },
    createElement: () => ({ querySelector: () => ({ textContent: '' }) }),
    getElementById: () => ({}),
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const dive = vi.spyOn(Daily, 'dailyDive');
  const ctx = await boot();
  expect(ctx?.daily?.date).toBe('2026-10-01');
  expect(fixtures.load).not.toHaveBeenCalled();
  expect(fixtures.routes).toEqual(['mission=shallow&daily=2026-10-01', 'mission=shallow']);
  expect(dive).toHaveBeenCalledWith('2026-10-01', ['shallow']);
});

// Control only optional IO and prop geometry; keep the shipped opening overrides,
// live mode application, submarine, camera and opening solver.
async function placeLostCity(bootMode: GameplayMode, selectedMode = bootMode) {
  const config = makeConfig();
  const save = new Save({ config, storage: null });
  save.setGameplayMode(bootMode);
  const settings = save.get();
  const effective = resolveEffective(settings, bootMode, null, config);
  const terrain = {
    sampleHeight: () => -800,
    getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
  };
  const root = new Group();
  root.position.y = -800;
  const hero = {
    def: { id: 'poseidon-tower', model: 'synthetic', clearsGround: false },
    root,
    localBounds: new Box3(new Vector3(-5, 0, -5), new Vector3(5, 30, 5)),
  } as PlacedProp;
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  vi.spyOn(Props.prototype, 'load').mockImplementation(async function (this: Props) {
    await pending;
    this.placed.push(hero);
    return { ...this.stats, landmarkId: 'lost-city', count: 1, procedural: 1 };
  });
  vi.spyOn(Props.prototype, 'collide').mockReturnValue(false);
  vi.spyOn(Props.prototype, 'dispose').mockImplementation(() => {});
  vi.spyOn(Props.prototype, 'debugString').mockReturnValue('synthetic hero');
  vi.spyOn(console, 'info').mockImplementation(() => {});
  const sub = new Submarine(effective.submarine, terrain);
  sub.setHullClass('B');
  sub.reset(0, -750, 0);
  const rig = new CameraRig(effective.camera, 16 / 9, terrain);
  const ctx = {
    app: { state: 'dive' },
    config,
    save,
    settings,
    effective,
    daily: null,
    meta: lostCityMeta,
    terrain,
    sub,
    rig,
    scene: new Scene(),
    tier: 'low',
    route: null,
    spawnDepth: null,
    params: new URLSearchParams('tile=lost-city'),
    contentLandmark: 'lost-city',
    bus: new EventBus(),
    canvas: {},
    expose() {},
    discovery: { ready: Promise.resolve(), pois: [], scanner: { setConfig() {} } },
    power: { setConfig() {}, setEnabled() {} },
    headlights: { setPreset() {} },
    sonar: { setSensorRange() {} },
    presets: { setCurrentMode() {} },
    hud: { setCurrentMode() {} },
  } as unknown as GameContext;
  const loaded = new Promise<void>((resolve) => ctx.bus.on('props:loaded', () => resolve()));
  const pose = () => ({
    position: sub.position.toArray(),
    yaw: sub.yaw,
    pitch: sub.pitch,
    range: Math.hypot(sub.position.x, sub.position.z),
    radius: rig.chaseRadius,
    cameraPosition: rig.camera.position.toArray(),
    cameraQuaternion: rig.camera.quaternion.toArray(),
  });
  try {
    modesSystem.init!(ctx);
    modesSystem.start!(ctx);
    propsSystem.init!(ctx);
    ctx.app.state = 'pause'; // Settings can change while optional props are pending.
    save.setGameplayMode(selectedMode);
    expect(ctx.effective).toEqual(resolveEffective(save.get(), selectedMode, null, config));
    finish();
    await loaded;
    const placed = pose();
    // Zoom/reset exercises the installed chase defaults, including its offsets.
    rig.chaseRadius *= 0.5;
    rig.resetView();
    rig.snap(sub.position, sub.yaw, sub.pitch);
    expect(pose()).toEqual(placed);
    save.setGameplayMode(selectedMode === 'arcade' ? 'realistic' : 'arcade');
    expect(pose()).toEqual(placed); // A settled dive must not teleport on a later switch.
    return placed;
  } finally {
    propsSystem.dispose?.();
    modesSystem.dispose?.();
    vi.restoreAllMocks();
  }
}

it.each([
  ['arcade', 'realistic'],
  ['realistic', 'arcade'],
] as const)(
  'late free-dive placement after %s → %s matches a fresh boot in the selected mode',
  async (before, selected) => {
    const actual = await placeLostCity(before, selected);
    const fresh = await placeLostCity(selected);
    expect(fresh.range).toBeCloseTo(selected === 'arcade' ? 38 : 44, 8);
    expect(fresh.radius).toBeCloseTo(selected === 'arcade' ? 66 : Math.hypot(38, 90), 8);
    expect(actual).toEqual(fresh);
  },
);
