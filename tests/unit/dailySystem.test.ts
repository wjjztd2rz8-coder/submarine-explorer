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

function setup(lowLight = false) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T23:59:59Z'));
  vi.stubGlobal('window', {
    setInterval,
    clearInterval,
    location: { href: '' },
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
    hud: { setCurrentMode: vi.fn() },
    headlights: { setPreset },
    shellBaseHref: () => 'http://localhost/',
    expose: vi.fn(),
  } as unknown as GameContext;
  const purchases = createProgressSystem();
  purchases.init?.(ctx);
  const offPurchase = () => purchases.dispose?.();
  const system = createDailySystem();
  system.start?.(ctx);
  return { ctx, system, offPurchase, setPreset };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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
    ctx.save.setGameplayMode('arcade');
    expect(setPreset).toHaveBeenLastCalledWith(ctx.config.lightPresets.realistic);
    expect(ctx.progress.buy('light-range')).toBe(true);
    expect(setPreset).toHaveBeenLastCalledWith(ctx.config.lightPresets.realistic);
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
