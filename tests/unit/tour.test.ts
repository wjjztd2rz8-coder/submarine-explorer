import { expect, it } from 'vitest';
import { nextSite, nextSiteAfter, TOUR_ORDER } from '../../src/game/Tour.js';

it('starts the 13 distinct sites with the prescribed introduction', () => {
  expect(new Set(TOUR_ORDER).size).toBe(13);
  expect(TOUR_ORDER.slice(0, 5)).toEqual([
    'titanic',
    'lost-city',
    'great-blue-hole',
    'beebe-vent-field',
    'monterey-canyon',
  ]);
  expect(nextSite({ ratings: {} })).toBe('titanic');
});
it('skips completed primaries, wraps and handles an unknown starting site', () => {
  const progress = { ratings: { titanic: 1, 'great-blue-hole': 3 } };
  expect(nextSite(progress)).toBe('lost-city');
  expect(nextSiteAfter('lost-city', progress)).toBe('beebe-vent-field');
  expect(nextSiteAfter('hunga-tonga-caldera', progress)).toBe('lost-city');
  expect(nextSiteAfter('missing', progress)).toBe('lost-city');
});
it('returns the current site only after a full circuit, and null for a completed tour', () => {
  const ratings = Object.fromEntries(TOUR_ORDER.map((id) => [id, 1]));
  expect(nextSite({ ratings })).toBeNull();
  expect(nextSiteAfter('titanic', { ratings })).toBeNull();
  ratings.titanic = 0;
  expect(nextSiteAfter('titanic', { ratings })).toBe('titanic');
});

it('recognizes primaries earned before surfacing and ignores daily ratings', () => {
  expect(nextSite({ ratings: {}, awarded: ['primary:titanic'] })).toBe('lost-city');
  expect(nextSite({ ratings: { 'daily:titanic': 3 } })).toBe('titanic');
});

it('covers the shipped catalogue and counts only its fixed Journal finds', async () => {
  // @ts-expect-error Node types are intentionally absent from the browser tsconfig.
  const { readFileSync } = await import('node:fs');
  const { loadJournalSites } = await import('../../src/game/JournalData.js');
  const { siteFinds } = await import('../../src/game/Tour.js');
  const sites = await loadJournalSites([], async (url) => {
    try {
      const body = readFileSync(`.${url}`, 'utf8');
      return { ok: true, text: async () => body };
    } catch {
      return { ok: false, text: async () => '' };
    }
  });
  expect(new Set(sites.map((s) => s.id))).toEqual(new Set(TOUR_ORDER));
  expect(sites.reduce((n, s) => n + siteFinds(s, { isDiscovered: () => false }).total, 0)).toBe(52);
});
