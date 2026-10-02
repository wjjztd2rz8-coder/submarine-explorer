import { describe, expect, it } from 'vitest';
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
import { unlockedDailySites } from '../../src/app/systems/daily.js';
import { Progress } from '../../src/game/Progress.js';
import { ProgressSave } from '../../src/core/Save.js';
import type { MissionDef } from '../../src/game/Mission.js';

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
        { canDive: (d) => d <= 1000 },
      ),
    ).toEqual(['shallow']);
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
