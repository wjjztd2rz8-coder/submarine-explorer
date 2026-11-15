import { expect, it } from 'vitest';
import { debriefModel, primaryDebriefAction } from '../../src/ui/Debrief.js';
import { buildJournalSite } from '../../src/game/JournalData.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import type { DebriefStats } from '../../src/game/Objectives.js';
import type { Photo } from '../../src/game/PhotoStore.js';

const site = buildJournalSite({
  id: 'titanic',
  species: null,
  guide: {
    version: 1,
    landmark: 'titanic',
    entries: [
      {
        id: 'bow',
        title: 'Bow',
        paragraphs: ['The bow is preserved. A second sentence.'],
        facts: [],
        sources: [],
        reconstruction: false,
      },
      {
        id: 'stern',
        title: 'Stern',
        paragraphs: ['The stern broke apart. More detail.'],
        facts: [],
        sources: [],
        reconstruction: false,
      },
    ],
  },
  pois: [
    { id: 'bow', name: 'Bow', guide_entry: 'bow', lat: 0, lon: 0, kind: 'wreck', primary: true },
    {
      id: 'stern',
      name: 'Stern',
      guide_entry: 'stern',
      lat: 0,
      lon: 0,
      kind: 'wreck',
      primary: false,
    },
  ],
});
const stats: DebriefStats = {
  elapsedS: 60,
  distanceM: 10,
  maxDepthM: 100,
  landmarkName: 'Titanic',
  newEntries: [],
  discoveries: [
    { poiId: 'stern', name: 'Stern' },
    { poiId: 'bow', name: 'Bow' },
    { poiId: 'life:jelly', name: 'Jelly' },
    { poiId: 'secret:box', name: 'Box' },
  ],
  objectives: { completed: 1, total: 1 },
};
it('lists landmarks before wildlife in discovery order', () => {
  const dive = {
    ...stats,
    discoveries: [
      { poiId: 'life:jelly', name: 'Jelly' },
      { poiId: 'bow', name: 'Bow' },
      { poiId: 'stern', name: 'Stern' },
    ],
  };
  expect(debriefModel(dive, site).finds.map((f) => f.name)).toEqual(['Bow', 'Stern', 'Jelly']);
});
it('lists distinct scans this dive including species, reads the newest picture, and omits facts already revealed', () => {
  const store = new DiscoveryStore(null);
  store.record('titanic', 'bow');
  const model = debriefModel(
    stats,
    site,
    store,
    [{ siteId: 'titanic', poiId: 'bow', image: 'newest', framedReveal: true } as Photo],
    ['bow'],
  );
  expect(model.finds.map((f) => f.name)).toEqual(['Stern', 'Bow', 'Jelly']);
  expect(model.finds[1].image).toBe('newest');
  expect(model.finds[0].image).toBeUndefined();
  expect(model.fact).toBeNull();
  expect(model.progress).toBe('1 more to find here');
  expect(model.title).toBe('You found 1 of 2');
});
it('handles empty, incomplete and aborted dives without inventing facts', () => {
  const model = debriefModel({ ...stats, discoveries: [], objectives: { completed: 0, total: 2 } });
  expect(model.title).toBe('Dive ended');
  expect(model.finds).toEqual([]);
  expect(model.fact).toBeNull();
  expect(
    debriefModel({ ...stats, subtitle: 'Hull failure', finds: { found: 2, total: 6 } }).title,
  ).toBe('You found 2 of 6');
});
it('chooses an unscanned find first, then an unattached guide fact, otherwise nothing', () => {
  const source = structuredClone(site);
  source.entries[0].guide!.fact = 'A fact already shown.';
  source.entries[1].guide!.fact = 'A new find fact.';
  const dive = { ...stats, discoveries: [{ poiId: 'bow', name: 'Bow' }] };
  expect(debriefModel(dive, source).fact).toBe('A new find fact.');
  source.entries[1].guide!.fact = ' A FACT   already shown. ';
  source.entries.push({
    ...source.entries[0],
    id: 'overview',
    kind: 'site',
    poiIds: [],
    guide: { ...source.entries[0].guide!, fact: 'An unseen guide fact.' },
  });
  expect(debriefModel(dive, source).fact).toBe('An unseen guide fact.');
  source.entries[2].guide!.fact = 'a fact already shown.';
  expect(debriefModel(dive, source).fact).toBeNull();
});
it('does not reuse a guide entry shared with a scanned find', () => {
  const source = structuredClone(site);
  source.entries[0].poiIds.push('stern');
  source.entries.splice(1);
  expect(
    debriefModel({ ...stats, discoveries: [{ poiId: 'bow', name: 'Bow' }] }, source).fact,
  ).toBeNull();
});
it.each([
  [6, 6, 2, 'You found everything here'],
  [4, 6, 2, '2 more to find here'],
  [2, 2, 2, 'You found everything here'],
])('reports all %s of %s finds with %s primaries', (found, total, primary, remaining) => {
  const model = debriefModel({
    ...stats,
    finds: { found, total },
    objectives: { completed: primary, total: primary },
  });
  expect(model.title).toBe(`You found ${found} of ${total}`);
  expect(model.progress).toBe(remaining);
});
it('requires a framed reveal photo and never falls back to a guide image or ordinary photo', () => {
  const source = structuredClone(site);
  source.entries[0].guide!.image = { url: 'guide.jpg' };
  const model = debriefModel(stats, source, undefined, [
    { siteId: 'titanic', poiId: 'bow', image: 'frame grab' } as Photo,
  ]);
  expect(model.finds[1].image).toBeUndefined();
});
it('prioritizes the next site or the chooser ahead of replay and exploring', () => {
  const actions = ['dive-again', 'keep-exploring', 'journal', 'dive-sites', 'next-dive'].map(
    (id) => ({ id, label: id, run() {} }),
  );
  expect(primaryDebriefAction(actions)?.id).toBe('next-dive');
  expect(primaryDebriefAction(actions.slice(0, -1))?.id).toBe('dive-sites');
});
