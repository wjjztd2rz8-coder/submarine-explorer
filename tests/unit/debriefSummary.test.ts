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
it('lists distinct scans this dive including species, reads the newest picture, and prefers a primary fact', () => {
  const store = new DiscoveryStore(null);
  store.record('titanic', 'bow');
  const model = debriefModel(
    stats,
    site,
    store,
    [{ siteId: 'titanic', poiId: 'bow', image: 'newest' } as Photo],
    ['bow'],
  );
  expect(model.finds.map((f) => f.name)).toEqual(['Stern', 'Bow', 'Jelly']);
  expect(model.finds[1].image).toBe('newest');
  expect(model.finds[0].image).toBeUndefined();
  expect(model.fact).toBe('The bow is preserved.');
  expect(model.progress).toBe('Found 1 of 2 at Titanic');
  expect(model.title).toBe('Dive complete');
});
it('handles empty, incomplete and aborted dives without inventing facts', () => {
  const model = debriefModel({ ...stats, discoveries: [], objectives: { completed: 0, total: 2 } });
  expect(model.title).toBe('Dive ended');
  expect(model.finds).toEqual([]);
  expect(model.fact).toBeNull();
  expect(debriefModel({ ...stats, subtitle: 'Hull failure' }).title).toBe('Dive complete');
});
it('bounds a long first sentence and never includes a second one', () => {
  const long = structuredClone(site);
  long.entries.find((e) => e.id === 'bow')!.guide!.paragraphs = [
    'A'.repeat(250) + '. Another fact.',
  ];
  expect(debriefModel(stats, long, undefined, [], ['bow']).fact).toHaveLength(198);
});
it('prioritizes the next site or the chooser ahead of replay and exploring', () => {
  const actions = ['dive-again', 'keep-exploring', 'journal', 'dive-sites', 'next-dive'].map(
    (id) => ({ id, label: id, run() {} }),
  );
  expect(primaryDebriefAction(actions)?.id).toBe('next-dive');
  expect(primaryDebriefAction(actions.slice(0, -1))?.id).toBe('dive-sites');
});
