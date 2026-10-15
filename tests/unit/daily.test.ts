import { describe, expect, it, vi } from 'vitest';
import {
  dailyDive,
  dailyMission,
  dailyRatingKey,
  utcDate,
  validDailyDate,
} from '../../src/game/Daily.js';
import {
  completeDaily,
  DailySave,
  DAILY_STORAGE_KEY,
  dailyStreak,
} from '../../src/game/DailySave.js';
import { createDailySystem, unlockedDailySites } from '../../src/app/systems/daily.js';
import { Progress } from '../../src/game/Progress.js';
import { PROGRESS_STORAGE_KEY, ProgressSave } from '../../src/core/Save.js';
import type { MissionDef } from '../../src/game/Mission.js';

import type { ShellContext } from '../../src/app/context.js';
import secretSample from '../fixtures/legacy-save-secret-sample.json';

const sites = ['titanic', 'great-blue-hole', 'monterey-canyon'];
describe('Daily dive', () => {
  it('is deterministic across list order, duplicates and UTC time zones', () => {
    const date = utcDate(new Date('2026-09-30T20:00:00-05:00'));
    expect(date).toBe('2026-10-01');
    expect(dailyDive(date, sites)).toEqual(dailyDive(date, [...sites].reverse().concat(sites)));
    expect(dailyDive(date, sites)).toEqual(dailyDive(date, sites));
    expect(dailyDive(date, sites)!.modifier).toBe(dailyDive(date, ['great-blue-hole'])!.modifier);
    expect(dailyDive(date, sites)!.start).toEqual(dailyDive(date, ['great-blue-hole'])!.start);
    expect(dailyRatingKey(dailyDive(date, sites)!)).toMatch(/^daily-2026-10-01$/);
  });
  it('varies dates and restricts every pick to unlocked sites, including fresh saves', () => {
    const picks = Array.from({ length: 28 }, (_, i) =>
      dailyDive(`2026-10-${String(i + 1).padStart(2, '0')}`, sites)!,
    );
    expect(new Set(picks.map((d) => JSON.stringify(d.start))).size).toBe(28);
    expect(new Set(picks.map((d) => d.modifier)).size).toBe(3);
    for (const d of picks) {
      expect(sites).toContain(d.site);
      expect(d.start.headingDeg).toBeGreaterThanOrEqual(0);
      expect(d.start.headingDeg).toBeLessThan(360);
      expect(Math.abs(d.start.x)).toBeLessThanOrEqual(35);
      expect(Math.abs(d.start.z)).toBeLessThanOrEqual(35);
    }
    expect(dailyDive('2026-10-01', ['great-blue-hole'])!.site).toBe('great-blue-hole');
    expect(dailyDive('2026-10-01', [])).toBeNull();
  });
  it('rejects invalid dates and unavailable or locked missions', () => {
    for (const date of ['2026-02-30', '2026-1-1', 'not-a-date', '']) {
      expect(validDailyDate(date)).toBe(false);
      expect(dailyDive(date, sites)).toBeNull();
    }
    expect(
      unlockedDailySites(
        [
          { id: 'shallow', tile: 'shallow', depthM: 125, title: '', summary: '' },
          { id: 'deep', tile: 'deep', depthM: 4000, title: '', summary: '' },
          { id: 'missing', tile: 'missing', depthM: 50, title: '', summary: '' },
        ],
        [{ id: 'shallow' }, { id: 'deep' }] as never,
      ),
    ).toEqual(['shallow', 'deep']);
  });
  it('focus selects existing objectives, preserves a primary and leaves the source unchanged', () => {
    const def = {
      title: 'Survey',
      briefing: { summary: 'Explore.' },
      objectives: [
        { id: 'a', primary: true },
        { id: 'b', primary: true },
        { id: 'c', primary: false },
      ],
    } as MissionDef;
    const dive = { ...dailyDive('2026-10-01', sites)!, variant: 'focus' as const };
    const result = dailyMission(def, dive);
    expect(result).toEqual(dailyMission(def, dive));
    expect(result.objectives).toHaveLength(2);
    expect(result.objectives.filter((o) => o.primary)).toHaveLength(1);
    expect(
      result.objectives.every((o) => def.objectives.some((source) => source.id === o.id)),
    ).toBe(true);
    expect(def.objectives).toHaveLength(3);
    expect(def.title).toBe('Survey');
  });
});
describe('Daily streak save', () => {
  it.each([
    ['2026-03-07T20:00:00-06:00', '2026-03-08T20:00:00-05:00'],
    ['2026-10-31T20:00:00-05:00', '2026-11-01T20:00:00-06:00'],
    ['2024-02-28T12:00:00Z', '2024-02-29T12:00:00Z'],
    ['2024-02-29T12:00:00Z', '2024-03-01T12:00:00Z'],
    ['2026-12-31T23:59:59Z', '2027-01-01T00:00:00Z'],
  ])('counts UTC days across DST and calendar boundaries: %s to %s', (first, second) => {
    const date = utcDate(new Date(first));
    const nextDate = utcDate(new Date(second));
    const one = completeDaily({ version: 1, lastCompletedDate: null, streak: 0 }, date);
    const two = completeDaily(one, nextDate);
    expect(two.streak).toBe(2);
    expect(dailyStreak(one, nextDate)).toBe(1);
    expect(completeDaily(two, date)).toEqual(two);
    expect(completeDaily(two, nextDate)).toEqual(two);
  });

  it('keeps a maximum saved streak readable after completing the next day', () => {
    const map = new Map<string, string>([
      [
        DAILY_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          lastCompletedDate: '2026-10-01',
          streak: Number.MAX_SAFE_INTEGER,
        }),
      ],
    ]);
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
    };
    const save = new DailySave(storage);
    save.complete('2026-10-02');
    expect(new DailySave(storage).get()).toEqual({
      version: 1,
      lastCompletedDate: '2026-10-02',
      streak: Number.MAX_SAFE_INTEGER,
    });
  });
  it('counts consecutive UTC dates once and resets after a gap', () => {
    const one = completeDaily({ version: 1, lastCompletedDate: null, streak: 0 }, '2026-09-30');
    const two = completeDaily(one, '2026-10-01');
    expect(two.streak).toBe(2);
    expect(completeDaily(two, '2026-10-01')).toEqual(two);
    expect(completeDaily(two, '2026-09-29')).toEqual(two);
    expect(completeDaily(two, '2026-10-03').streak).toBe(1);
    expect(dailyStreak(two, '2026-10-02')).toBe(2);
    expect(dailyStreak(two, '2026-10-03')).toBe(0);
  });
  it('round trips independently and guards malformed, denied and future saves', () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
    };
    new DailySave(storage).complete('2026-10-01');
    expect(new DailySave(storage).get()).toEqual({
      version: 1,
      lastCompletedDate: '2026-10-01',
      streak: 1,
    });
    expect([...map.keys()]).toEqual([DAILY_STORAGE_KEY]);
    map.set(DAILY_STORAGE_KEY, '{');
    expect(new DailySave(storage).get().streak).toBe(0);
    map.set(DAILY_STORAGE_KEY, '{"version":99}');
    new DailySave(storage).complete('2026-10-01');
    expect(map.get(DAILY_STORAGE_KEY)).toBe('{"version":99}');
    expect(() => new DailySave(null).complete('2026-10-01')).not.toThrow();
    expect(() =>
      new DailySave({
        ...storage,
        getItem: () => {
          throw new Error();
        },
        setItem: () => {
          throw new Error();
        },
      }).complete('2026-10-01'),
    ).not.toThrow();
  });
});

it('stores best stars today in the unchanged progress schema and round trips', () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  const progress = new Progress(new ProgressSave(storage));
  const key = dailyRatingKey(dailyDive('2026-10-01', sites)!);
  progress.finish(key, [{ primary: true, complete: true }]);
  expect(new Progress(new ProgressSave(storage)).rating(key)).toBe(2);
  expect(new Progress(new ProgressSave(storage)).rating('daily-2026-10-02')).toBe(0);
});

describe('Daily boot synchronization', () => {
  it.each([0, 1, 2, 12])(
    'retains the larger of saved best %s and the independent Daily streak through reload',
    (best) => {
      const records = structuredClone(secretSample.records);
      // Recreate the pre-22e1cf2 mismatch too, without changing the archived fixture.
      records['subexplorer.progress.v1'].dailyBestStreak = best;
      const map = new Map(
        Object.entries(records).map(([key, value]) => [key, JSON.stringify(value)]),
      );
      const storage = {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => {
          map.set(key, value);
        },
        removeItem: (key: string) => {
          map.delete(key);
        },
      };
      const progress = new Progress(new ProgressSave(storage));
      const before = progress.snapshot();
      const dailySave = new DailySave(storage);
      const system = createDailySystem();
      vi.useFakeTimers();
      vi.stubGlobal('window', { setInterval, clearInterval });
      try {
        system.start!({
          progress,
          dailySave,
          missionSummaries: [],
          index: [],
          home: { clearDaily: vi.fn() },
          save: { onChange: () => () => {} },
          expose: vi.fn(),
          daily: null,
        } as unknown as ShellContext);
        const expected = { ...before, dailyBestStreak: Math.max(best, 2) };
        expect(progress.snapshot()).toEqual(expected);
        expect(new Progress(new ProgressSave(storage)).snapshot()).toEqual(expected);
        expect(progress.selectCosmetic('paint', 'stock')).toBe(true);
        const edited = { ...expected, cosmetics: { ...expected.cosmetics, paint: 'stock' } };
        expect(new Progress(new ProgressSave(storage)).snapshot()).toEqual(edited);
        expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY)!)).toEqual(edited);
        expect(dailySave.get()).toEqual(records['subexplorer.daily.v1']);
        expect(JSON.parse(storage.getItem('subexplorer.discoveries.v1')!)).toEqual(
          records['subexplorer.discoveries.v1'],
        );
      } finally {
        system.dispose!();
        expect(vi.getTimerCount()).toBe(0);
        vi.useRealTimers();
        vi.unstubAllGlobals();
      }
    },
  );
});
