import type { FetchJson } from '../../src/game/ContentPath.js';
import { expect, it } from 'vitest';
import { Progress } from '../../src/game/Progress.js';
import { creditPreviousDives } from '../../src/game/ProgressMigration.js';
import { ProgressSave } from '../../src/core/Save.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';

it.each([
  ['great-blue-hole', ['great-blue-hole-outer-dropoff', 'great-blue-hole-western-dropoff'], 2],
  ['monterey-canyon', ['monterey-canyon-head', 'monterey-canyon-upper-channel'], 1],
  ['great-blue-hole', ['great-blue-hole-stalactites', 'great-blue-hole-outer-dropoff'], 1],
  ['monterey-canyon', ['monterey-canyon-wall', 'monterey-canyon-upper-channel'], 1],
  ['challenger-deep', ['cd-leggo-amphipod-site', 'cd-north-wall'], 1],
  [
    'challenger-deep',
    ['cd-leggo-amphipod-site', 'cd-north-wall', 'cd-central-basin', 'cd-axis-sill'],
    2,
  ],
  ['hunga-tonga-caldera', ['hunga-tonga-caldera-floor', 'hunga-tonga-rim-wall'], 2],
  ['hudson-canyon', ['hc-canyon-wall', 'hc-coral-ledge'], 2],
] as const)(
  'preserves legacy discoveries and earned route credit for %s: %j',
  async (site, pois, stars) => {
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
    const original = new DiscoveryStore(storage);
    for (const poi of pois) original.record(site, poi);
    const saved = original.snapshot();
    const discoveries = new DiscoveryStore(storage);
    const progress = new Progress(new ProgressSave(storage));
    const fetchJson: FetchJson = async () => ({
      ok: true,
      text: async () => readFileSync(`data/landmarks/${site}/mission.json`, 'utf8'),
    });
    await creditPreviousDives(progress, discoveries, [], fetchJson);
    expect(progress.rating(site)).toBe(stars);
    for (const poi of pois) {
      expect(discoveries.isDiscovered(site, poi)).toBe(true);
      expect(progress.snapshot().awarded).toContain(`poi:${site}/${poi}`);
    }
    if (!new Set<string>(pois).has('great-blue-hole-stalactites'))
      expect(progress.snapshot().awarded).not.toContain('objective:great-blue-hole/stalactites');
    for (const objective of ['eastern-floor', 'flank-transect', 'wall-transect'])
      expect(progress.snapshot().awarded).not.toContain(`objective:${site}/${objective}`);
    const earned = progress.snapshot();
    const reloaded = new Progress(new ProgressSave(storage));
    await creditPreviousDives(reloaded, new DiscoveryStore(storage), [], fetchJson);
    expect(reloaded.snapshot()).toEqual(earned);
    expect(new DiscoveryStore(storage).snapshot()).toEqual(saved);
  },
);

it.each([
  ['challenger-deep', 'cd-leggo-amphipod-site'],
  ['hunga-tonga-caldera', 'hunga-tonga-caldera-floor'],
  ['hudson-canyon', 'hc-canyon-wall'],
])('does not credit an unfinished old route at %s', async (site, poi) => {
  const discoveries = new DiscoveryStore(null);
  discoveries.record(site, poi);
  const progress = new Progress(new ProgressSave(null));
  await creditPreviousDives(progress, discoveries, [], async () => ({
    ok: true,
    text: async () => readFileSync(`data/landmarks/${site}/mission.json`, 'utf8'),
  }));
  expect(progress.rating(site)).toBe(0);
  expect(progress.snapshot().awarded).not.toContain(`primary:${site}`);
  expect(progress.divePoints).toBe(0);
});

it.each(['animal', 'photo'])(
  'does not grant a legacy bonus for an empty %s subject',
  async (kind) => {
    const discoveries = new DiscoveryStore(null);
    discoveries.record('legacy', 'a');
    if (kind === 'animal') discoveries.record('legacy', 'life:');
    const progress = new Progress(new ProgressSave(null));
    await creditPreviousDives(
      progress,
      discoveries,
      kind === 'photo' ? [{ siteId: 'legacy', poiId: '' }] : [],
      async () => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            version: 1,
            landmark: 'legacy',
            tile: 'legacy',
            title: 'Legacy',
            spawn: { lat: 0, lon: 0 },
            objectives: [{ id: 'a', poi: 'a', primary: true }],
            completion: 'all_primary',
          }),
      }),
    );
    expect(progress.rating('legacy')).toBe(2);
    expect(progress.snapshot().awarded).not.toContain('rating:legacy/3');
    expect(progress.points).toBe(0);
    expect(progress.bonus).toBe(false);
    expect(progress.divePoints).toBe(0);
  },
);

it('credits a legacy animal scan as a bonus only for its completed site', async () => {
  const discoveries = new DiscoveryStore(null);
  for (const site of ['with-life', 'without-life']) discoveries.record(site, 'a');
  discoveries.record('with-life', 'life:ray');
  const progress = new Progress(new ProgressSave(null));
  await creditPreviousDives(progress, discoveries, [], async (url) => {
    const site = url.split('/').at(-2)!;
    return {
      ok: true,
      text: async () =>
        JSON.stringify({
          version: 1,
          landmark: site,
          tile: site,
          title: site,
          spawn: { lat: 0, lon: 0 },
          objectives: [{ id: 'a', poi: 'a', primary: true }],
          completion: 'all_primary',
        }),
    };
  });
  expect(progress.rating('with-life')).toBe(3);
  expect(progress.rating('without-life')).toBe(2);
  expect(progress.snapshot().awarded).toContain('species:ray');
  expect(progress.snapshot().awarded).not.toContain('poi:with-life/life:ray');
  expect(progress.points).toBe(0);
  expect(progress.bonus).toBe(false);
  expect(progress.divePoints).toBe(0);
});

it('retroactively credits objectives, completion, photos and best stars once, without gating hulls', async () => {
  const discoveries = new DiscoveryStore(null);
  for (const site of ['first', 'second', 'third']) {
    discoveries.record(site, 'a');
    discoveries.record(site, 'b');
  }
  const original = discoveries.snapshot();
  const progress = new Progress(new ProgressSave(null));
  const fetchJson: FetchJson = async (url: string) => {
    const site = url.split('/').at(-2)!;
    const doc = {
      version: 1,
      landmark: site,
      tile: site,
      title: site,
      hull_class: 'A',
      spawn: { lat: 0, lon: 0, depth_m: 5 },
      briefing: { summary: 'Dive', facts: [], hazards: [], depth_m: 700 },
      objectives: [
        { id: 'a', poi: 'a', primary: true },
        { id: 'b', poi: 'b', primary: false },
      ],
      completion: 'all_primary',
    };
    return { ok: true, text: async () => JSON.stringify(doc) };
  };
  await creditPreviousDives(progress, discoveries, [{ siteId: 'first', poiId: 'a' }], fetchJson);
  expect(progress.points).toBe(0);
  expect(progress.hullFor(3800)).toBe('B');
  expect(progress.rating('first')).toBe(3);
  expect(progress.rating('second')).toBe(2);
  expect(progress.divePoints).toBe(0);
  expect(progress.bonus).toBe(false);
  await creditPreviousDives(progress, discoveries, [{ siteId: 'first', poiId: 'a' }], fetchJson);
  expect(progress.points).toBe(0);
  expect(discoveries.snapshot()).toEqual(original);
});

it('keeps discoveries credited when their old content pack is unavailable', async () => {
  const discoveries = new DiscoveryStore(null);
  discoveries.record('missing', 'a');
  const progress = new Progress(new ProgressSave(null));
  await creditPreviousDives(progress, discoveries, [], async () => ({
    ok: false,
    text: async () => '',
  }));
  expect(progress.points).toBe(0);
  expect(progress.rating('missing')).toBe(0);
});

it('does not retroactively rate modern discoveries spread across dives or made before an abort', async () => {
  const discoveries = new DiscoveryStore(null);
  const values = new Map<string, string>();
  const save = new ProgressSave({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  });
  const progress = new Progress(save);
  await creditPreviousDives(progress, discoveries, []);
  expect(progress.legacyCredited).toBe(true);
  discoveries.record('modern', 'a');
  progress.award('poi', 'modern/a');
  progress.finish('modern', [{ primary: true, complete: true }], true);
  const reloaded = new Progress(new ProgressSave(save.storage));
  let fetched = false;
  await creditPreviousDives(reloaded, discoveries, [], async () => {
    fetched = true;
    return {
      ok: true,
      text: async () =>
        JSON.stringify({
          version: 1,
          landmark: 'modern',
          tile: 'modern',
          title: 'Modern',
          spawn: { lat: 0, lon: 0 },
          objectives: [{ id: 'a', poi: 'a', primary: true }],
          completion: 'all_primary',
        }),
    };
  });
  expect(fetched).toBe(false);
  expect(reloaded.rating('modern')).toBe(0);
  expect(reloaded.points).toBe(0);
});

it('retries failed legacy content across reload without rating discoveries from later dives', async () => {
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
  const discoveries = new DiscoveryStore(null);
  discoveries.record('old', 'a');
  discoveries.record('old', 'b');
  const progress = new Progress(new ProgressSave(storage));
  await creditPreviousDives(progress, discoveries, [], async () => {
    throw new Error('offline');
  });
  expect(progress.points).toBe(0);
  expect(progress.legacyCredited).toBe(false);
  discoveries.record('modern', 'a');
  progress.award('photo', 'titanic/bow');
  progress.finish('titanic', [{ primary: true, complete: true }]);
  expect(progress.rating('titanic')).toBe(3);
  expect(progress.selectCosmetic('paint', 'orange')).toBe(false);
  const restored = new Progress(new ProgressSave(storage));
  const urls: string[] = [];
  await creditPreviousDives(restored, discoveries, [], async (url) => {
    urls.push(url);
    return {
      ok: true,
      text: async () =>
        JSON.stringify({
          version: 1,
          landmark: 'old',
          tile: 'old',
          title: 'Old',
          spawn: { lat: 0, lon: 0 },
          completion: 'all_primary',
          objectives: [
            { id: 'a', poi: 'a', primary: true },
            { id: 'b', poi: 'b', primary: false },
          ],
        }),
    };
  });
  expect(urls).toHaveLength(1);
  expect(urls[0]).toContain('/old/');
  expect(restored.points).toBe(0); // Retry only credits legacy ratings; neither old nor modern POIs earn currency.
  expect(restored.rating('old')).toBe(2);
  expect(restored.rating('modern')).toBe(0);
  expect(restored.rating('titanic')).toBe(3);
  // A retry must not reinterpret stars earned after the legacy boundary as old cosmetics.
  expect(restored.selectCosmetic('paint', 'orange')).toBe(false);
  expect(restored.legacyCredited).toBe(true);
  await creditPreviousDives(new Progress(new ProgressSave(storage)), discoveries, [], async () => {
    throw new Error('must not fetch');
  });
  expect(new Progress(new ProgressSave(storage)).points).toBe(0);
});

it('finishes migration for genuinely absent optional missions', async () => {
  const discoveries = new DiscoveryStore(null);
  discoveries.record('free-dive', 'a');
  const progress = new Progress(new ProgressSave(null));
  await creditPreviousDives(progress, discoveries, [], async () => ({
    ok: false,
    status: 404,
    text: async () => '',
  }));
  expect(progress.points).toBe(0);
  expect(progress.legacyCredited).toBe(true);
});

it.each(['constructor', '__proto__', 'toString'])(
  'migrates a valid site id %s without treating inherited properties as old routes',
  async (site) => {
    const discoveries = new DiscoveryStore(null);
    discoveries.record(site, 'a');
    const original = discoveries.snapshot();
    const progress = new Progress(new ProgressSave(null));
    const fetchJson: FetchJson = async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          version: 1,
          landmark: site,
          tile: site,
          title: site,
          spawn: { lat: 0, lon: 0 },
          objectives: [{ id: 'a', poi: 'a', primary: true }],
          completion: 'all_primary',
        }),
    });
    await expect(
      creditPreviousDives(progress, discoveries, [], fetchJson),
    ).resolves.toBeUndefined();
    expect(progress.rating(site)).toBe(2);
    expect(progress.legacyCredited).toBe(true);
    expect(progress.points).toBe(0);
    expect(progress.divePoints).toBe(0);
    expect(discoveries.snapshot()).toEqual(original);
    const earned = progress.snapshot();
    await creditPreviousDives(progress, discoveries, [], fetchJson);
    expect(progress.snapshot()).toEqual(earned);
  },
);
