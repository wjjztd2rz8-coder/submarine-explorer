import type { FetchJson } from '../../src/game/ContentPath.js';
import { expect, it } from 'vitest';
import { Progress } from '../../src/game/Progress.js';
import { creditPreviousDives } from '../../src/game/ProgressMigration.js';
import { ProgressSave } from '../../src/core/Save.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';

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
