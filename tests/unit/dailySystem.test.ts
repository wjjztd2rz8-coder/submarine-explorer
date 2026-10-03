import { afterEach, expect, it, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { ProgressSave, Save } from '../../src/core/Save.js';
import { createDailySystem } from '../../src/app/systems/daily.js';
import type { GameContext } from '../../src/app/context.js';
import { dailyDive } from '../../src/game/Daily.js';
import { DailySave } from '../../src/game/DailySave.js';
import { Progress } from '../../src/game/Progress.js';
import { EventBus } from '../../src/core/EventBus.js';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import { createRovSystem } from '../../src/app/systems/rov.js';
import { Scene, SpotLight, PointLight, Vector3 } from 'three';
import { shellUrl } from '../../src/util/navigation.js';

vi.mock('../../src/ui/RovHUD.js', () => ({
  RovHUD: class {
    update() {}
  },
}));

function setup(lowLight = false, href = 'http://localhost/') {
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
    missionSummaries: [{ id: 'shallow', tile: 'shallow', title: 'Shallow', depthM: 125 }],
    index: [{ id: 'shallow' }],
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
