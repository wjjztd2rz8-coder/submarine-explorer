import { expect, it } from 'vitest';
import { homeTourModel } from '../../src/ui/Home.js';
import { buildJournalSite } from '../../src/game/JournalData.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { TOUR_ORDER } from '../../src/game/Tour.js';

const sites = TOUR_ORDER.map((id) =>
  buildJournalSite({ id, guide: null, pois: [], species: null }),
);
sites[0].name = 'Titanic';
sites[1].name = 'Lost City';
it('labels the next tour site and computes progress totals from Journal data', () => {
  const store = new DiscoveryStore(null);
  sites[0].entries.push({
    key: 'titanic/poi/bow',
    siteId: 'titanic',
    kind: 'poi',
    id: 'bow',
    title: 'Bow',
    poiIds: ['bow', 'stern'],
    linkedEntryIds: [],
    recreation: false,
  });
  store.record('titanic', 'bow');
  const model = homeTourModel({ ratings: { titanic: 1 } }, store, sites);
  expect(model.label).toBe('Dive: Lost City');
  expect(model.siteId).toBe('lost-city');
  expect(model.progress).toBe('1 of 13 sites explored · 1 of 2 discoveries');
});
it('continues only an incomplete known saved site', () => {
  const store = new DiscoveryStore(null);
  expect(homeTourModel({ ratings: {} }, store, sites, 'lost-city').label).toBe(
    'Continue: Lost City',
  );
  expect(homeTourModel({ ratings: { titanic: 1 } }, store, sites, 'titanic').siteId).toBe(
    'lost-city',
  );
  expect(homeTourModel({ ratings: {} }, store, sites, 'missing').siteId).toBe('titanic');
});
it('offers the site chooser when the tour is finished', () => {
  const model = homeTourModel(
    { ratings: Object.fromEntries(TOUR_ORDER.map((id) => [id, 1])) },
    new DiscoveryStore(null),
    sites,
    'titanic',
  );
  expect(model.label).toBe('Dive sites');
  expect(model.siteId).toBeNull();
  expect(model.progress).toMatch(/^13 of 13 sites explored/);
});
