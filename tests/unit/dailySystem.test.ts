import { afterEach, expect, it, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { ProgressSave, Save } from '../../src/core/Save.js';
import { createDailySystem } from '../../src/app/systems/daily.js';
import type { GameContext } from '../../src/app/context.js';
import { dailyDive, dailyRatingKey } from '../../src/game/Daily.js';
import { DailySave } from '../../src/game/DailySave.js';
import { Progress } from '../../src/game/Progress.js';
import { EventBus } from '../../src/core/EventBus.js';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import { createRovSystem } from '../../src/app/systems/rov.js';
import { Scene, SpotLight, PointLight, Vector3 } from 'three';
import { shellUrl } from '../../src/util/navigation.js';
import { Home } from '../../src/ui/Home.js';

vi.mock('../../src/ui/RovHUD.js', () => ({
  RovHUD: class {
    update() {}
  },
}));

function setup(lowLight = false, href = 'http://localhost/', includeDeep = false) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T23:59:59Z'));
  vi.stubGlobal('window', {
    setInterval,
    clearInterval,
    location: { href },
  });
  const config = makeConfig();
  const save = new Save({ config, storage: null });
  const progress = new Progress(new ProgressSave(null));
  progress.award('primary', 'funding');
  progress.award('primary', 'more-funding');
  progress.award('rating', 'funding/1');
  const setPreset = vi.fn();
  const ctx = {
    config,
    save,
    progress,
    settings: save.get(),
    route: null,
    bus: new EventBus(),
    sub: { applyProfiles: vi.fn() },
    sonar: { setSensorRange: vi.fn() },
    discovery: { pois: [] },
    baseScanRadii: new Map(),
    baseHintRangeFactor: config.scan.hintRangeFactor,
    missionSummaries: [
      { id: 'shallow', tile: 'shallow', title: 'Shallow', depthM: 125 },
      ...(includeDeep ? [{ id: 'deep', tile: 'deep', title: 'Deep', depthM: 3800 }] : []),
    ],
    index: [{ id: 'shallow' }, ...(includeDeep ? [{ id: 'deep' }] : [])],
    daily: lowLight ? { ...dailyDive('2026-10-01', ['shallow'])!, modifier: 'low-light' } : null,
    dailySave: new DailySave(null),
    home: { setDaily: vi.fn() },
    presets: { setCurrentMode: vi.fn() },
    hud: { setCurrentMode: vi.fn(), root: { querySelector: () => null } },
    headlights: { setPreset },
    terrain: {
      widthM: 10000,
      depthM: 10000,
      sampleHeight: () => -500,
      getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
    },
    scene: new Scene(),
    tier: 'low',
    rig: { chaseRadius: 100 },
    shellBaseHref: () => shellUrl(window.location.href),
    expose: vi.fn(),
  } as unknown as GameContext;
  const purchases = createProgressSystem();
  purchases.init?.(ctx);
  const rovSystem = createRovSystem();
  rovSystem.init?.(ctx);
  const offPurchase = () => {
    purchases.dispose?.();
    rovSystem.dispose?.();
    ctx.rovVisual.dispose();
  };
  const system = createDailySystem();
  system.start?.(ctx);
  return { ctx, system, offPurchase, setPreset };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('removes an inaccessible Daily launch and restores the same card after mode changes', () => {
  const { ctx, system, offPurchase } = setup(false, 'http://localhost/', true);
  system.dispose?.();
  // Only a deep site's tile is downloaded; Realistic has no eligible Daily.
  ctx.index = ctx.index.filter((tile) => tile.id === 'deep');
  class HomeElement extends EventTarget {
    children: HomeElement[] = [];
    className = '';
    hidden = false;
    onclick: (() => void) | null = null;
    setAttribute() {}
    append(...children: HomeElement[]) {
      this.children.push(...children);
    }
    replaceChildren(...children: HomeElement[]) {
      this.children = children;
    }
  }
  vi.stubGlobal('document', {
    body: new HomeElement(),
    createElement: () => new HomeElement(),
  });
  ctx.home = new Home({
    continueDive: vi.fn(),
    journal: vi.fn(),
    settings: vi.fn(),
    controls: vi.fn(),
  });
  const root = ctx.home.root as unknown as HomeElement;
  // root > panel > body > menu (F-TITLE-D structure).
  const card = root.children[0].children[1].children[0].children.find(
    (el) => el.className === 'daily-card',
  )!;
  try {
    system.start?.(ctx);
    expect(card.hidden).toBe(false);
    expect(card.onclick).toBeTypeOf('function');
    ctx.save.setGameplayMode('realistic');
    expect(card.hidden).toBe(true);
    expect(card.onclick).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(card.hidden).toBe(true);
    ctx.save.setGameplayMode('custom');
    expect(card.hidden).toBe(false);
    card.onclick?.();
    const url = new URL(window.location.href);
    expect(url.searchParams.get('mission')).toBe('deep');
    expect(url.searchParams.get('daily')).toBe('2026-10-02');
    ctx.save.setGameplayMode('realistic');
    expect(card.hidden).toBe(true);
    // Returning within the same UTC day must also replace the cleared callback.
    ctx.save.setGameplayMode('arcade');
    expect(card.hidden).toBe(false);
    expect(card.onclick).toBeTypeOf('function');
    system.dispose?.();
    const launch = card.onclick;
    ctx.save.setGameplayMode('realistic');
    expect(card.hidden).toBe(false);
    expect(card.onclick).toBe(launch);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    system.dispose?.();
    offPurchase();
  }
});
it('keeps forced touch layout when the Daily card reboots into a mission under a project base', () => {
  const { ctx, system, offPurchase } = setup(
    false,
    'http://localhost/submarine-explorer/?touch=1&tier=low&tile=old&poi=bow',
  );
  try {
    vi.mocked(ctx.home.setDaily).mock.calls[0][4]();
    const url = new URL(window.location.href);
    expect(url.pathname).toBe('/submarine-explorer/');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      mission: 'shallow',
      tier: 'low',
      touch: '1',
      daily: '2026-10-01',
    });
  } finally {
    system.dispose?.();
    offPurchase();
  }
});
it('rolls the home card over at midnight without mutating the active daily dive and disposes refresh', () => {
  const { ctx, system, offPurchase } = setup(true);
  try {
    const original = structuredClone(ctx.daily);
    vi.advanceTimersByTime(1000);
    const card = vi.mocked(ctx.home.setDaily);
    expect(card).toHaveBeenCalledTimes(2);
    card.mock.calls[1][4]();
    expect(new URL(window.location.href).searchParams.get('daily')).toBe('2026-10-02');
    expect(ctx.daily).toEqual(original);
    system.dispose?.();
    expect(vi.getTimerCount()).toBe(0);
    card.mockClear();
    expect(ctx.progress.buy('light-range')).toBe(true);
    ctx.save.setGameplayMode('realistic');
    expect(card).not.toHaveBeenCalled();
  } finally {
    system.dispose?.();
    offPurchase();
  }
});
it('refreshes Daily access immediately on both mode changes without altering the loaded dive', () => {
  const { ctx, system, offPurchase } = setup(true, 'http://localhost/', true);
  try {
    const active = structuredClone(ctx.daily);
    const card = vi.mocked(ctx.home.setDaily);
    expect(card).toHaveBeenLastCalledWith('Deep', expect.any(String), 0, 0, expect.any(Function));
    card.mockClear();
    ctx.save.setGameplayMode('realistic');
    expect(card).toHaveBeenLastCalledWith(
      'Shallow',
      expect.any(String),
      0,
      0,
      expect.any(Function),
    );
    ctx.save.setGameplayMode('arcade');
    expect(card).toHaveBeenLastCalledWith('Deep', expect.any(String), 0, 0, expect.any(Function));
    card.mock.calls.at(-1)![4]();
    expect(new URL(window.location.href).searchParams.get('mission')).toBe('deep');
    expect(ctx.daily).toEqual(active);
    system.dispose?.();
    card.mockClear();
    ctx.save.setGameplayMode('realistic');
    expect(card).not.toHaveBeenCalled();
  } finally {
    system.dispose?.();
    offPurchase();
  }
});
it('preserves Daily Low light after live settings and purchases and unsubscribes enforcement', () => {
  const { ctx, system, offPurchase, setPreset } = setup(true);
  try {
    const spots: SpotLight[] = [];
    const fills: PointLight[] = [];
    ctx.rovVisual.group.traverse((object) => {
      if (object instanceof SpotLight) spots.push(object);
      if (object instanceof PointLight) fills.push(object);
    });
    const checkRov = () => {
      const preset = ctx.config.lightPresets.realistic;
      expect(spots).toHaveLength(2);
      for (const spot of spots) {
        expect(spot.intensity).toBeCloseTo(
          preset.intensity * preset.workLight!.intensityFactor * ctx.config.rov.spotIntensityFactor,
        );
        expect(spot.distance).toBe(preset.distance * ctx.config.rov.spotDistanceFactor);
      }
      expect(fills[0].intensity).toBeCloseTo(
        3 *
          Math.max(
            ctx.config.rov.fillMinIntensity,
            preset.fillIntensity *
              preset.workLight!.fillIntensityFactor *
              ctx.config.rov.fillIntensityFactor,
          ),
      );
    };
    checkRov();
    ctx.save.setGameplayMode('realistic');
    checkRov();
    ctx.save.setGameplayMode('arcade');
    expect(setPreset).toHaveBeenLastCalledWith(ctx.config.lightPresets.realistic);
    checkRov();
    expect(ctx.rov.deploy(new Vector3(0, -400, 0), 0)).toBe(true);
    expect(ctx.rov.position.toArray().every(Number.isFinite)).toBe(true);
    expect(ctx.progress.buy('light-range')).toBe(true);
    expect(setPreset).toHaveBeenLastCalledWith(ctx.config.lightPresets.realistic);
    checkRov();
    expect(ctx.save.get().gameplay.lights).toBe('enhanced');
    system.dispose?.();
    setPreset.mockClear();
    ctx.save.setGameplayMode('realistic');
    expect(setPreset).not.toHaveBeenCalled();
    ctx.save.setGameplayMode('arcade');
    expect(ctx.progress.buy('light-beam')).toBe(true);
    expect(setPreset).toHaveBeenCalledTimes(1);
    expect(setPreset).toHaveBeenLastCalledWith(ctx.config.lightPresets.enhanced);
  } finally {
    system.dispose?.();
    offPurchase();
  }
});

it('awards one dated Daily primary reward and preserves ordinary mission rewards through mode edits', () => {
  const { ctx, system, offPurchase } = setup(true);
  try {
    const key = dailyRatingKey(ctx.daily!);
    const initial = ctx.progress.points;
    ctx.bus.emit('mission:started', { missionId: 'shallow', tileId: 'shallow' });
    ctx.save.setGameplayMode('realistic');
    ctx.bus.emit('mission:primaryComplete', { missionId: 'shallow', completed: 1, total: 1 });
    expect(ctx.progress.snapshot().awarded).toContain(`primary:${key}`);
    expect(ctx.progress.snapshot().awarded).not.toContain('primary:shallow');
    ctx.save.setGameplayMode('arcade');
    const rating = ctx.progress.finish(key, [{ primary: true, complete: true }]);
    expect(rating).toEqual({ stars: 2, best: 2, points: 70 });
    expect(ctx.progress.points - initial).toBe(70);
    ctx.bus.emit('mission:restart', { missionId: 'shallow' });
    ctx.bus.emit('mission:primaryComplete', { missionId: 'shallow', completed: 1, total: 1 });
    ctx.progress.finish(key, [{ primary: true, complete: true }]);
    expect(ctx.progress.points - initial).toBe(70);
    ctx.daily = null;
    ctx.bus.emit('mission:primaryComplete', { missionId: 'shallow', completed: 2, total: 2 });
    expect(ctx.progress.points - initial).toBe(100);
    expect(ctx.progress.snapshot().awarded).toContain('primary:shallow');
  } finally {
    system.dispose?.();
    offPurchase();
  }
});

it('imports an existing earned Daily streak on startup without spending RP or losing it after reset', () => {
  const { ctx, system, offPurchase } = setup();
  try {
    system.dispose?.();
    for (const date of ['2026-09-29', '2026-09-30', '2026-10-01']) ctx.dailySave.complete(date);
    const points = ctx.progress.points;
    system.start?.(ctx);
    expect(ctx.progress.selectCosmetic('paint', 'silver')).toBe(true);
    expect(ctx.progress.selectCosmetic('trim', 'blue')).toBe(true);
    expect(ctx.progress.points).toBe(points);
    expect(ctx.progress.snapshot().dailyBestStreak).toBe(3);
    ctx.dailySave.complete('2026-10-03');
    ctx.progress.recordDailyStreak(ctx.dailySave.get().streak);
    expect(ctx.progress.snapshot().dailyBestStreak).toBe(3);
  } finally {
    system.dispose?.();
    offPurchase();
  }
});
