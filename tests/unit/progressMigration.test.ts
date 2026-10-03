import type { FetchJson } from '../../src/game/ContentPath.js';
import { expect, it } from 'vitest';
import { Progress } from '../../src/game/Progress.js';
import { creditPreviousDives } from '../../src/game/ProgressMigration.js';
import { ProgressSave } from '../../src/core/Save.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';

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
  expect(progress.points).toBe(205);
  expect(progress.bonus).toBe(false);
  expect(progress.divePoints).toBe(0);
});

it('retroactively credits objectives, completion, photos and best stars once, before hull gating', async () => {
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
  expect(progress.points).toBe(330);
  expect(progress.hull.id).toBe('B');
  expect(progress.rating('first')).toBe(3);
  expect(progress.rating('second')).toBe(2);
  expect(progress.divePoints).toBe(0);
  expect(progress.bonus).toBe(false);
  await creditPreviousDives(progress, discoveries, [{ siteId: 'first', poiId: 'a' }], fetchJson);
  expect(progress.points).toBe(330);
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
  expect(progress.points).toBe(10);
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
  expect(reloaded.points).toBe(10);
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
  expect(progress.points).toBe(20);
  expect(progress.legacyCredited).toBe(false);
  discoveries.record('modern', 'a');
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
  expect(restored.points).toBe(110); // old 100 RP plus the modern POI, without a modern rating
  expect(restored.rating('old')).toBe(2);
  expect(restored.rating('modern')).toBe(0);
  expect(restored.legacyCredited).toBe(true);
  await creditPreviousDives(new Progress(new ProgressSave(storage)), discoveries, [], async () => {
    throw new Error('must not fetch');
  });
  expect(new Progress(new ProgressSave(storage)).points).toBe(110);
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
  expect(progress.points).toBe(10);
  expect(progress.legacyCredited).toBe(true);
});
