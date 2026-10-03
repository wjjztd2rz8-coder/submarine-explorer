import { afterEach, expect, it, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { ProgressSave, Save } from '../../src/core/Save.js';
import { missionSystem } from '../../src/app/systems/mission.js';
import type { GameContext } from '../../src/app/context.js';
import { dailyDive } from '../../src/game/Daily.js';
import { DailySave } from '../../src/game/DailySave.js';
import { Progress, type DiveRating } from '../../src/game/Progress.js';

const fixture = vi.hoisted(() => ({ rating: null as (() => DiveRating) | null }));
vi.mock('../../src/game/MissionRouter.js', () => ({
  MissionRouter: class {
    briefing = null;
    mission = { objectives: [{ primary: true, complete: true }], endReason: 'surface' };
    constructor(options: { rating: () => DiveRating }) {
      fixture.rating = options.rating;
    }
  },
}));

afterEach(() => {
  missionSystem.dispose?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each(['2026-10-01T23:59:59Z', '2026-10-01T19:00:01-05:00', '2026-10-02T14:00:01+14:00'])(
  'credits the seeded Daily date when completed at %s, including across UTC midnight',
  (now) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    vi.stubGlobal('document', {
      createElement: () => ({ addEventListener: vi.fn() }),
    });
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const config = makeConfig();
    const save = new Save({ config, storage });
    const ctx = {
      config,
      save,
      settings: save.get(),
      params: new URLSearchParams(),
      route: { missionId: 'shallow', def: { briefing: { hazards: [] } } },
      sub: { getState: () => ({ hullClass: 'A' }), simSpeed: 1 },
      bus: new EventBus(),
      discovery: {},
      expose: vi.fn(),
      daily: dailyDive('2026-10-01', ['shallow']),
      dailySave: new DailySave(storage),
      progress: new Progress(new ProgressSave(storage)),
    } as unknown as GameContext;
    ctx.dailySave.complete('2026-09-30');
    missionSystem.init?.(ctx);
    save.setGameplayMode('realistic');
    expect(fixture.rating!()).toMatchObject({ stars: 2 });
    expect(new DailySave(storage).get()).toMatchObject({
      lastCompletedDate: '2026-10-01',
      streak: 2,
    });
    expect(new Progress(new ProgressSave(storage)).rating('daily-2026-10-01')).toBe(2);
    expect(new Save({ config, storage }).get()).toMatchObject({
      gameplayMode: 'realistic',
      gameplay: config.settings.gameplayPresets.realistic,
    });
    save.setGameplayMode('arcade');
    fixture.rating!();
    expect(new DailySave(storage).get().streak).toBe(2);
    expect(new Save({ config, storage }).get()).toMatchObject({
      gameplayMode: 'arcade',
      gameplay: config.settings.gameplayPresets.arcade,
    });
    // Future seeds and older completions cannot change the earned streak.
    for (const date of ['2026-10-03', '2026-09-29']) {
      ctx.daily = dailyDive(date, ['shallow']);
      expect(fixture.rating!().stars).toBe(2);
      expect(new DailySave(storage).get()).toMatchObject({
        lastCompletedDate: '2026-10-01',
        streak: 2,
      });
    }
    ctx.missionRouter!.mission.endReason = 'abort';
    ctx.daily = dailyDive('2026-10-02', ['shallow']);
    expect(fixture.rating!().stars).toBe(0);
    expect(new DailySave(storage).get().lastCompletedDate).toBe('2026-10-01');
    ctx.missionRouter!.mission.endReason = 'surface';
    ctx.missionRouter!.mission.objectives[0].complete = false;
    expect(fixture.rating!().stars).toBe(0);
    expect(new DailySave(storage).get().lastCompletedDate).toBe('2026-10-01');
  },
);
