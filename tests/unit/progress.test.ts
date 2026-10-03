import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { PROGRESS_CONFIG, UPGRADES } from '../../src/core/config/progress.js';
import {
  ProgressSave,
  PROGRESS_STORAGE_KEY,
  migrateProgress,
  type SettingsStorage,
} from '../../src/core/Save.js';
import { Progress, applyProgress, diveStars, requiredHull } from '../../src/game/Progress.js';

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
  it('credits old discoveries once across reloads without changing discoveries', () => {
    const store = storage();
    const discovery = JSON.stringify({ version: 1, discovered: { 'site/poi': true } });
    store.setItem('subexplorer.discoveries.v1', discovery);
    const progress = new Progress(new ProgressSave(store), ['site/poi', 'site/poi']);
    expect(progress.points).toBe(10);
    expect(progress.divePoints).toBe(0);
    expect(new Progress(new ProgressSave(store), ['site/poi']).points).toBe(10);
    expect(store.getItem('subexplorer.discoveries.v1')).toBe(discovery);
  });
  it('separates reward kinds and pays no repeat scans, objectives or subjects', () => {
    const { progress } = researcher();
    expect(progress.award('poi', 'site/bow')).toBe(10);
    expect(progress.award('objective', 'site/bow')).toBe(5);
    expect(progress.award('photo', 'site/bow')).toBe(10);
    expect(progress.award('species', 'octopus')).toBe(15);
    expect(progress.award('poi', 'site/bow')).toBe(0);
    expect(progress.award('species', 'octopus')).toBe(0);
    expect(progress.points).toBe(40);
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
    expect(progress.buy('battery')).toBe(false);
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
    expect(progress.points).toBe(10);
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
      expect(progress.buy('light-range')).toBe(true);
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
  it('fits every site in Arcade and Custom while keeping Realistic research gates', () => {
    const { progress } = researcher();
    for (const [depth, hull] of [
      [226, 'A'],
      [3800, 'B'],
      [4960, 'B'],
      [10931, 'C'],
    ] as const) {
      for (const mode of ['arcade', 'custom'] as const) {
        expect(progress.canDive(depth, mode)).toBe(true);
        expect(progress.hullFor(depth, mode)).toBe(hull);
      }
      expect(progress.canDive(depth, 'realistic')).toBe(depth <= 1000);
      expect(progress.hullFor(depth, 'realistic')).toBe('A');
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
      points: 50,
    });
    progress.finish('site', [primary, secondary]);
    expect(progress.points).toBe(50);
    progress.award('species', 'ray');
    progress.finish('site', [primary, { ...secondary, complete: true }]);
    expect(progress.points).toBe(105);
    progress.beginDive();
    progress.finish('site', [primary, secondary], true);
    expect(progress.rating('site')).toBe(3);
    expect(new Progress(new ProgressSave(store)).rating('site')).toBe(3);
  });
  it('opens four actual shallow sites, B after 3–4 full dives and C near eight', () => {
    const { progress } = researcher();
    for (const depth of [226, 155, 750, 780]) expect(progress.canDive(depth)).toBe(true);
    expect(progress.canDive(1540)).toBe(false);
    for (let site = 0; site < 8; site++) {
      progress.beginDive();
      for (let poi = 0; poi < (site < 2 ? 2 : 4); poi++) {
        progress.award('poi', `${site}/${poi}`);
        progress.award('objective', `${site}/${poi}`);
      }
      progress.finish(`site-${site}`, [primary, { ...secondary, complete: true }]);
      if (site === 1) expect(progress.hull.id).toBe('A');
      if (site === 2) expect(progress.hull.id).toBe('B');
      if (site === 6) expect(progress.hull.id).toBe('B');
    }
    expect(progress.hull.id).toBe('C');
    expect(requiredHull(1000).id).toBe('A');
    expect(requiredHull(6500).id).toBe('B');
    expect(requiredHull(10931).id).toBe('C');
  });
  it('spending never delays hull unlocks and free dives use only unlocked hulls', () => {
    const { progress } = researcher(PROGRESS_CONFIG.hulls[1].threshold);
    expect(progress.buy('battery')).toBe(true);
    expect(progress.hull.id).toBe('B');
    expect(progress.hullFor(226)).toBe('A');
    expect(progress.hullFor(3800)).toBe('B');
    expect(progress.hullFor(10931)).toBe('B');
    expect(progress.canDive(10931)).toBe(false);
  });
});

describe('upgrade purchases and effects', () => {
  it('charges each level, caps levels, prevents unaffordable purchases and persists', () => {
    const { progress, store } = researcher(1000);
    for (const cost of UPGRADES[0].costs) {
      expect(progress.cost('light-range')).toBe(cost);
      expect(progress.buy('light-range')).toBe(true);
    }
    expect(progress.points).toBe(800);
    expect(progress.buy('light-range')).toBe(false);
    expect(new Progress(new ProgressSave(store)).level('light-range')).toBe(3);
    expect(researcher().progress.buy('light-range')).toBe(false);
  });
  it('gives every upgrade a tangible bounded effect without compounding or changing defaults', () => {
    const base = structuredClone(makeConfig());
    const original = structuredClone(base);
    const config = structuredClone(base);
    const { progress } = researcher(5000);
    for (const upgrade of UPGRADES) progress.buy(upgrade.id);
    applyProgress(config, base, progress, base.settings.gameplayPresets.arcade);
    expect(config.lightPresets.enhanced.distance).toBeCloseTo(
      base.lightPresets.enhanced.distance * 1.1,
    );
    expect(config.lightPresets.enhanced.angleDeg).toBe(base.lightPresets.enhanced.angleDeg + 4);
    expect(config.sensorPresets.extended.sonarPoiRange).toBeCloseTo(
      base.sensorPresets.extended.sonarPoiRange * 1.15,
    );
    expect(config.sensorPresets.extended.scanRadiusMultiplier).toBeCloseTo(
      base.sensorPresets.extended.scanRadiusMultiplier * 1.1,
    );
    expect(config.power.oxygenHours).toBeCloseTo(base.power.oxygenHours * 1.12);
    expect(config.power.batteryIdleHours).toBeCloseTo(base.power.batteryIdleHours * 1.12);
    expect(config.power.boostCostMultiplier).toBeCloseTo(base.power.boostCostMultiplier / 1.2);
    expect(config.speedProfiles.standard.maxSpeed).toBeCloseTo(
      base.speedProfiles.standard.maxSpeed * 1.08,
    );
    expect(config.speedProfiles.standard.yawRate).toBeCloseTo(
      base.speedProfiles.standard.yawRate * 1.08,
    );
    expect(config.speedProfiles.standard.reverseAccel).toBeCloseTo(
      base.speedProfiles.standard.reverseAccel * 1.1,
    );
    const once = structuredClone(config);
    applyProgress(config, base, progress, base.settings.gameplayPresets.arcade);
    expect(config).toEqual(once);
    expect(base).toEqual(original);
  });
});

it('recovers damaged balances from reward tokens and purchased levels without duplicate rewards', () => {
  const { progress, store } = researcher();
  for (const id of ['a', 'b']) {
    progress.award('poi', `site/${id}`);
    progress.award('objective', `site/${id}`);
  }
  progress.finish('site', [
    { primary: true, complete: true },
    { primary: false, complete: true },
  ]);
  progress.completeLegacyCredit();
  expect(progress.lifetime).toBe(100);
  expect(progress.buy('battery')).toBe(true);
  const original = progress.snapshot();
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
    expect(restored.level('battery')).toBe(1);
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
  expect(progress.points).toBe(40);
  expect(progress.snapshot().awarded).toEqual([
    'species:comb-jelly',
    'secret:site/arch',
    'sample:site/sediment',
  ]);
  expect(progress.award('species', 'comb-jelly')).toBe(0);
  expect(progress.award('secret', 'site/arch')).toBe(0);
  expect(progress.award('sample', 'site/sediment')).toBe(0);
});
