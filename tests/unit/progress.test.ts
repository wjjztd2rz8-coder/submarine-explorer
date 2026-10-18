import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { defaultSettings } from '../../src/core/Save.js';
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { PROGRESS_CONFIG, EQUIPMENT } from '../../src/core/config/progress.js';
import {
  ProgressSave,
  PROGRESS_STORAGE_KEY,
  migrateProgress,
  type SettingsStorage,
} from '../../src/core/Save.js';
import { Progress, diveStars, requiredHull } from '../../src/game/Progress.js';

function storage(): SettingsStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}
function researcher(points = 0) {
  const store = storage();
  store.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 1, points, lifetime: points }));
  return { progress: new Progress(new ProgressSave(store)), store };
}

describe('research rewards and save migration', () => {
  it.each([
    { site: 'old' },
    { site: 'old', keys: null, bonus: false },
    { site: 'old', keys: ['old/a'], bonus: 'false' },
  ])('retains intact pending evidence after a corrupt same-site record %j', (damaged) => {
    const store = storage();
    const evidence = { site: 'old', keys: ['old/a'], bonus: false };
    store.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 2, legacyPending: [damaged, evidence] }),
    );
    for (let reload = 0; reload < 3; reload++) {
      const save = new ProgressSave(store);
      expect(save.get().legacyPending).toEqual([evidence]);
      save.save(save.get());
    }
  });

  it('round-trips mixed pending shapes without merging later or foreign evidence', () => {
    const store = storage();
    store.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        legacyPending: [
          null,
          false,
          3,
          [],
          {},
          'bad/site',
          'retired',
          'retired',
          { site: 'old', keys: ['old/a', 'other/b', 42, null, 'old/a'], bonus: true },
          { site: 'old', keys: ['old/b'], bonus: false },
          { site: 'empty', keys: [], bonus: false },
        ],
        ratings: { retired: 1 },
        cosmeticGrants: ['paint:orange'],
      }),
    );
    for (let reload = 0; reload < 3; reload++) {
      const save = new ProgressSave(store);
      const snapshot = save.get();
      expect(snapshot.legacyPending).toEqual([
        'retired',
        { site: 'old', keys: ['old/a'], bonus: true },
        { site: 'empty', keys: [], bonus: false },
      ]);
      expect(snapshot.ratings).toEqual({ retired: 1 });
      expect(snapshot.cosmeticGrants).toEqual(['paint:orange']);
      const copy = save.get();
      copy.legacyPending!.length = 0;
      expect(save.get()).toEqual(snapshot);
      save.save(snapshot);
    }
  });

  it('credits old discoveries once across reloads without changing discoveries', () => {
    const store = storage();
    const discovery = JSON.stringify({ version: 1, discovered: { 'site/poi': true } });
    store.setItem('subexplorer.discoveries.v1', discovery);
    const progress = new Progress(new ProgressSave(store), ['site/poi', 'site/poi']);
    expect(progress.points).toBe(0);
    expect(progress.divePoints).toBe(0);
    expect(new Progress(new ProgressSave(store), ['site/poi']).points).toBe(0);
    expect(store.getItem('subexplorer.discoveries.v1')).toBe(discovery);
  });
  it('separates reward kinds and pays no repeat scans, objectives or subjects', () => {
    const { progress } = researcher();
    expect(progress.award('poi', 'site/bow')).toBe(1);
    expect(progress.award('objective', 'site/bow')).toBe(1);
    expect(progress.award('photo', 'site/bow')).toBe(1);
    expect(progress.award('species', 'octopus')).toBe(1);
    expect(progress.award('poi', 'site/bow')).toBe(0);
    expect(progress.award('species', 'octopus')).toBe(0);
    expect(progress.points).toBe(0);
    expect(progress.bonus).toBe(true);
  });
  it('sanitizes old and malformed records and protects future versions', () => {
    expect(
      migrateProgress({ rp: 60.8, upgrades: { battery: 100, oxygen: -2 }, ratings: { site: 4 } }),
    ).toMatchObject({
      points: 60,
      lifetime: 285,
      upgrades: { battery: 3, oxygen: 0 },
      ratings: { site: 3 },
    });
    expect(migrateProgress({ points: Infinity, lifetime: NaN }).points).toBe(0);
    const store = storage();
    const future = JSON.stringify({ version: 9, points: 900 });
    store.setItem(PROGRESS_STORAGE_KEY, future);
    const progress = new Progress(new ProgressSave(store), ['site/old']);
    expect(progress.award('poi', 'site/new')).toBe(0);
    expect(progress.selectCosmetic('paint', 'stock')).toBe(false);
    progress.finish('site', [{ primary: true, complete: true }]);
    expect(store.getItem(PROGRESS_STORAGE_KEY)).toBe(future);
    expect(progress.rating('site')).toBe(0);
  });
  it('works with inaccessible storage and keeps snapshots isolated', () => {
    const store: SettingsStorage = {
      getItem: () => {
        throw new Error('privacy');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    const progress = new Progress(new ProgressSave(store));
    progress.award('poi', 'site/poi');
    const copy = progress.snapshot();
    copy.points = 999;
    expect(progress.points).toBe(0);
  });
});

describe('ratings and hull unlocks', () => {
  const primary = { primary: true, complete: true };
  const secondary = { primary: false, complete: false };
  it.each(['_test', 'Hero_Site', 'constructor', '__proto__'])(
    'persists best stars for supported content ID %s through purchases and reloads',
    (site) => {
      const { progress, store } = researcher();
      expect(progress.rating(site)).toBe(0);
      expect(progress.finish(site, [primary])).toMatchObject({ stars: 2, best: 2 });
      expect(progress.selectCosmetic('paint', 'stock')).toBe(true);
      const restored = new Progress(new ProgressSave(store));
      expect(restored.rating(site)).toBe(2);
      restored.beginDive();
      expect(restored.finish(site, [primary, secondary])).toEqual({
        stars: 1,
        best: 2,
        points: 0,
      });
      expect(new Progress(new ProgressSave(store)).rating(site)).toBe(2);
    },
  );
  it('recovers lost best stars from reward tokens without paying them again', () => {
    const { progress, store } = researcher();
    progress.award('species', 'ray');
    progress.finish('titanic', [primary]);
    progress.finish('daily-2026-10-03', [primary]);
    const saved = progress.snapshot();
    store.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        ...saved,
        ratings: { titanic: null, 'daily-2026-10-03': 1, 'lost-city': 2 },
        awarded: [...saved.awarded, 'rating:lost-city/4', 'rating:../unsafe/3'],
      }),
    );
    const restored = new Progress(new ProgressSave(store));
    expect(restored.rating('titanic')).toBe(3);
    expect(restored.rating('daily-2026-10-03')).toBe(3);
    expect(restored.rating('lost-city')).toBe(2);
    expect(restored.rating('../unsafe')).toBe(0);
    const points = restored.points;
    restored.finish('titanic', [primary]);
    restored.finish('daily-2026-10-03', [primary]);
    expect(restored.points).toBe(points);
    expect(new Progress(new ProgressSave(store)).rating('titanic')).toBe(3);
  });
  it('fits every site in Arcade and Custom while keeping Realistic depth fitting', () => {
    const { progress } = researcher();
    for (const [depth, hull] of [
      [226, 'A'],
      [3800, 'B'],
      [4960, 'B'],
      [10931, 'C'],
    ] as const) {
      for (const mode of ['arcade', 'custom', 'realistic'] as const) {
        expect(progress.canDive(depth, mode)).toBe(true);
        expect(progress.hullFor(depth, mode)).toBe(hull);
      }
      expect(progress.canDive(depth, 'realistic')).toBe(true);
      expect(progress.hullFor(depth, 'realistic')).toBe(hull);
    }
    expect(progress.points).toBe(0);
    expect(progress.lifetime).toBe(0);
  });
  it('needs primaries, then every secondary, then a bonus; aborts earn no stars', () => {
    expect(diveStars([], true)).toBe(0);
    expect(diveStars([{ ...primary, complete: false }], true)).toBe(0);
    expect(diveStars([primary, secondary], true)).toBe(1);
    expect(diveStars([primary, { ...secondary, complete: true }], false)).toBe(2);
    expect(diveStars([primary, { ...secondary, complete: true }], true)).toBe(3);
    expect(diveStars([primary], true, true)).toBe(0);
  });
  it('only pays rating improvements and preserves the best rating on return dives', () => {
    const { progress, store } = researcher();
    expect(progress.finish('site', [primary, secondary])).toEqual({
      stars: 1,
      best: 1,
      points: 0,
    });
    progress.finish('site', [primary, secondary]);
    expect(progress.points).toBe(0);
    progress.award('species', 'ray');
    progress.finish('site', [primary, { ...secondary, complete: true }]);
    expect(progress.points).toBe(0);
    progress.beginDive();
    progress.finish('site', [primary, secondary], true);
    expect(progress.rating('site')).toBe(3);
    expect(new Progress(new ProgressSave(store)).rating('site')).toBe(3);
  });
  it('fits A, B and C by depth in every mode, without research', () => {
    const { progress } = researcher();
    for (const mode of ['arcade', 'realistic', 'custom'] as const) {
      for (const [depth, hull] of [
        [226, 'A'],
        [1000, 'A'],
        [1540, 'B'],
        [6500, 'B'],
        [10931, 'C'],
      ] as const) {
        expect(progress.canDive(depth, mode)).toBe(true);
        expect(progress.hullFor(depth, mode)).toBe(hull);
        expect(requiredHull(depth).id).toBe(hull);
      }
    }
  });
});

describe('fixed full equipment', () => {
  it('resolves the complete kit without a research input, compounding or changing defaults', () => {
    const base = structuredClone(makeConfig());
    const original = structuredClone(base);
    const settings = defaultSettings(base);
    const fresh = resolveEffective(settings, 'arcade', null, base);
    expect(fresh.light.distance).toBeCloseTo(
      base.lightPresets.enhanced.distance * EQUIPMENT.lightRange,
    );
    expect(fresh.light.angleDeg).toBe(base.lightPresets.enhanced.angleDeg + EQUIPMENT.beamDegrees);
    expect(fresh.sensor.sonarPoiRange).toBeCloseTo(
      base.sensorPresets.extended.sonarPoiRange * EQUIPMENT.sonarRange,
    );
    expect(fresh.sensor.scanRadiusMultiplier).toBeCloseTo(
      base.sensorPresets.extended.scanRadiusMultiplier * EQUIPMENT.scanDetail,
    );
    expect(fresh.power.oxygenHours).toBeCloseTo(base.power.oxygenHours * EQUIPMENT.oxygen);
    expect(fresh.power.batteryIdleHours).toBeCloseTo(
      base.power.batteryIdleHours * EQUIPMENT.battery,
    );
    expect(fresh.power.boostCostMultiplier).toBeCloseTo(
      base.power.boostCostMultiplier / EQUIPMENT.boostEfficiency,
    );
    expect(fresh.boostSeconds).toBe(PROGRESS_CONFIG.boostSeconds);
    expect(fresh.submarine.maxSpeed).toBeCloseTo(
      base.speedProfiles.fast.maxSpeed * EQUIPMENT.thrust,
    );
    expect(fresh.submarine.yawRate).toBeCloseTo(base.speedProfiles.fast.yawRate * EQUIPMENT.turn);
    expect(fresh.submarine.reverseAccel).toBeCloseTo(
      base.speedProfiles.fast.reverseAccel * EQUIPMENT.reverse,
    );
    expect(resolveEffective(settings, 'arcade', null, base)).toEqual(fresh);
    expect(base).toEqual(original);
  });
});

it('recovers damaged balances from reward tokens and purchased levels without duplicate rewards', () => {
  const { store } = researcher();
  const original = {
    version: 1,
    points: 60,
    lifetime: 100,
    upgrades: { battery: 1 },
    ratings: { site: 2 },
    legacyCredited: true,
    awarded: [
      'poi:site/a',
      'objective:site/a',
      'poi:site/b',
      'objective:site/b',
      'primary:site',
      'rating:site/1',
      'rating:site/2',
    ],
  };
  for (const damage of [
    { points: 'corrupt', lifetime: 'corrupt' },
    { points: 0, lifetime: 0 },
    { points: 'corrupt' },
    { lifetime: 'corrupt' },
  ]) {
    store.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ ...original, ...damage }));
    const restored = new Progress(new ProgressSave(store));
    expect(restored.points).toBe(60);
    expect(restored.lifetime).toBe(100);
    expect(restored.snapshot().upgrades.battery).toBe(1);
    expect(restored.rating('site')).toBe(2);
    expect(restored.legacyCredited).toBe(true);
    expect(restored.snapshot().awarded).toEqual(original.awarded);
    for (const id of ['a', 'b']) {
      expect(restored.award('poi', `site/${id}`)).toBe(0);
      expect(restored.award('objective', `site/${id}`)).toBe(0);
    }
    restored.finish('site', [
      { primary: true, complete: true },
      { primary: false, complete: true },
    ]);
    expect(new Progress(new ProgressSave(store)).points).toBe(60);
  }
});

it('restores typed discoveries and global species identity when research is missing', () => {
  const progress = new Progress(new ProgressSave(null), [
    'site/life:comb-jelly',
    'other/life:comb-jelly',
    'site/secret:arch',
    'site/sample:sediment',
  ]);
  expect(progress.points).toBe(0);
  expect(progress.snapshot().awarded).toEqual([
    'species:comb-jelly',
    'secret:site/arch',
    'sample:site/sediment',
  ]);
  expect(progress.award('species', 'comb-jelly')).toBe(0);
  expect(progress.award('secret', 'site/arch')).toBe(0);
  expect(progress.award('sample', 'site/sediment')).toBe(0);
});
