import { Submarine } from '../../src/sub/Submarine.js';
import { Power } from '../../src/game/Power.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { modesSystem } from '../../src/app/systems/modes.js';
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
import { Scene, Vector3 } from 'three';
import { shellUrl } from '../../src/util/navigation.js';
import { Home } from '../../src/ui/Home.js';

function setup(lowLight = false, href = 'http://localhost/', includeDeep = false) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T23:59:59Z'));
  vi.stubGlobal('window', {
    setInterval,
    clearInterval,
    location: { href },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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
    sub: { setConfig: vi.fn() },
    power: { setConfig: vi.fn(), setEnabled: vi.fn() },
    waypoints: { setVisualHints: vi.fn() },
    sonar: { setSensorRange: vi.fn() },
    discovery: { pois: [], ready: Promise.resolve(), scanner: { setConfig: vi.fn() } },
    baseScanRadii: new Map(),
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
    rig: { chaseRadius: 100, setConfig: vi.fn() },
    shellBaseHref: () => shellUrl(window.location.href),
    expose: vi.fn(),
  } as unknown as GameContext;
  ctx.effective = resolveEffective(ctx.settings, ctx.settings.gameplayMode, ctx.daily, config);
  modesSystem.init?.(ctx);
  modesSystem.start?.(ctx);
  const purchases = createProgressSystem();
  purchases.init?.(ctx);
  const offPurchase = () => {
    purchases.dispose?.();
    modesSystem.dispose?.();
  };
  const system = createDailySystem();
  system.start?.(ctx);
  return { ctx, system, offPurchase, setPreset };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('keeps the downloaded deep Daily accessible across mode changes and releases its refresh', () => {
  const { ctx, system, offPurchase } = setup(false, 'http://localhost/', true);
  system.dispose?.();
  // Only a deep site's tile is downloaded; every mode can launch it.
  ctx.index = ctx.index.filter((tile) => tile.id === 'deep');
  class HomeElement extends EventTarget {
    children: HomeElement[] = [];
    className = '';
    hidden = false;
    onclick: (() => void) | null = null;
    setAttribute() {}
    remove() {}
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
    dive: vi.fn(),
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
    expect(card.hidden).toBe(false);
    expect(card.onclick).toBeTypeOf('function');
    vi.advanceTimersByTime(1000);
    expect(card.hidden).toBe(false);
    ctx.save.setGameplayMode('custom');
    expect(card.hidden).toBe(false);
    card.onclick?.();
    const url = new URL(window.location.href);
    expect(url.searchParams.get('mission')).toBe('deep');
    expect(url.searchParams.get('daily')).toBe('2026-10-02');
    ctx.save.setGameplayMode('realistic');
    expect(card.hidden).toBe(false);
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
    ctx.home.dispose();
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
    expect(ctx.progress.selectCosmetic('paint', 'stock')).toBe(true);
    ctx.save.setGameplayMode('realistic');
    expect(card).not.toHaveBeenCalled();
  } finally {
    system.dispose?.();
    offPurchase();
  }
});
it('keeps Daily selection through mode changes without altering the loaded dive', () => {
  const { ctx, system, offPurchase } = setup(true, 'http://localhost/', true);
  try {
    const active = structuredClone(ctx.daily);
    const card = vi.mocked(ctx.home.setDaily);
    expect(card).toHaveBeenLastCalledWith('Deep', expect.any(String), 0, 0, expect.any(Function));
    card.mockClear();
    ctx.save.setGameplayMode('realistic');
    expect(card).not.toHaveBeenCalled();
    ctx.save.setGameplayMode('arcade');
    expect(card).not.toHaveBeenCalled();
    // Advancing the clock deliberately chooses tomorrow's site, independently of mode.
    vi.advanceTimersByTime(1000);
    expect(card).toHaveBeenLastCalledWith(
      'Shallow',
      expect.any(String),
      0,
      0,
      expect.any(Function),
    );
    card.mock.calls.at(-1)![4]();
    expect(new URL(window.location.href).searchParams.get('mission')).toBe('shallow');
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
it('preserves Daily Low light after live settings and cosmetic choices and unsubscribes enforcement', () => {
  const { ctx, system, offPurchase, setPreset } = setup(true);
  try {
    ctx.save.setGameplayMode('realistic');
    ctx.save.setGameplayMode('arcade');
    expect(setPreset).toHaveBeenLastCalledWith(ctx.effective.light);
    expect(ctx.effective.light.intensity).toBe(ctx.config.lightPresets.realistic.intensity);
    expect(ctx.progress.selectCosmetic('paint', 'stock')).toBe(true);
    expect(setPreset).toHaveBeenLastCalledWith(ctx.effective.light);
    expect(ctx.effective.light.intensity).toBe(ctx.config.lightPresets.realistic.intensity);
    expect(ctx.save.get().gameplayBaseMode).toBe('arcade');
    system.dispose?.();
    modesSystem.dispose?.();
    setPreset.mockClear();
    ctx.save.setGameplayMode('realistic');
    expect(setPreset).not.toHaveBeenCalled();
    ctx.save.setGameplayMode('arcade');
    expect(ctx.progress.selectCosmetic('paint', 'stock')).toBe(true);
    expect(setPreset).not.toHaveBeenCalled();
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
    expect(rating).toEqual({ stars: 2, best: 2, points: 0 });
    expect(ctx.progress.points - initial).toBe(0);
    ctx.bus.emit('mission:restart', { missionId: 'shallow' });
    ctx.bus.emit('mission:primaryComplete', { missionId: 'shallow', completed: 1, total: 1 });
    ctx.progress.finish(key, [{ primary: true, complete: true }]);
    expect(ctx.progress.points - initial).toBe(0);
    ctx.daily = null;
    ctx.bus.emit('mission:primaryComplete', { missionId: 'shallow', completed: 2, total: 2 });
    expect(ctx.progress.points - initial).toBe(0);
    expect(ctx.progress.snapshot().awarded).toContain('primary:shallow');
  } finally {
    system.dispose?.();
    offPurchase();
  }
});

it('imports an existing earned Daily streak on startup without granting new cosmetics or losing it after reset', () => {
  const { ctx, system, offPurchase } = setup();
  try {
    system.dispose?.();
    for (const date of ['2026-09-29', '2026-09-30', '2026-10-01']) ctx.dailySave.complete(date);
    const points = ctx.progress.points;
    system.start?.(ctx);
    expect(ctx.progress.selectCosmetic('paint', 'silver')).toBe(false);
    expect(ctx.progress.selectCosmetic('trim', 'blue')).toBe(false);
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

it.each(['calm', 'strong-currents', 'low-light'] as const)(
  '%s: live settings and cosmetic choices preserve the loaded hull, pose, supplies and T speed without compounding',
  (modifier) => {
    const { ctx, system, offPurchase, setPreset } = setup(true);
    try {
      ctx.daily!.modifier = modifier;
      ctx.effective = resolveEffective(ctx.save.get(), 'arcade', ctx.daily, ctx.config);
      const pristine = structuredClone(ctx.config);
      const sub = new Submarine(ctx.effective.submarine, {
        sampleHeight: () => -1000,
        getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
      });
      ctx.sub = sub;
      sub.setHullClass('A');
      sub.reset(10, -120, 20, 0.7);
      sub.setSimSpeed(3);
      const power = new Power(ctx.effective.power, true);
      power.setLevels(0.7, 0.6);
      ctx.power = power;
      ctx.discovery.pois = [{ id: 'target', radius: 100 }] as GameContext['discovery']['pois'];
      ctx.baseScanRadii.set('target', 100);
      for (let i = 0; i < 10; i++) {
        ctx.save.setGameplayMode('realistic');
        ctx.save.setGameplayOption('currents', 'realistic');
        ctx.save.setGameplayMode('arcade');
        ctx.save.setGameplayOption('batteryOxygen', true);
        expect(ctx.effective.currentMode).toBe(modifier === 'strong-currents' ? 'strong' : 'off');
        expect(ctx.discovery.pois[0].radius).toBe(240);
        expect(sub.position.toArray()).toEqual([10, -120, 20]);
        expect(sub.yaw).toBe(0.7);
        expect(sub.getState().hullClass).toBe('A');
        expect(sub.getState().ratedDepth).toBe(ctx.config.submarine.hullClasses.A.ratedDepth);
        expect(sub.simSpeed).toBe(3);
        expect(power.state.battery).toBe(0.7);
        expect(power.state.oxygen).toBe(0.6);
      }
      expect(ctx.progress.selectCosmetic('paint', 'stock')).toBe(true);
      const expectedLight =
        ctx.config.lightPresets[modifier === 'low-light' ? 'realistic' : 'enhanced'];
      expect(setPreset).toHaveBeenLastCalledWith({
        ...expectedLight,
        distance: expectedLight.distance * 1.3,
        angleDeg: expectedLight.angleDeg + 8,
      });
      ctx.save.setGameplayMode('realistic');
      ctx.save.setGameplayMode('arcade');
      expect(ctx.effective.light.distance).toBeCloseTo(expectedLight.distance * 1.3);
      expect(ctx.config).toEqual(pristine);
      expect(sub.simSpeed).toBe(3);
      expect(sub.getState().hullClass).toBe('A');
      expect(ctx.save.get().gameplay.currents).toBe('off');
      expect(ctx.save.get().gameplayBaseMode).toBe('arcade');
    } finally {
      system.dispose?.();
      offPurchase();
    }
  },
);
