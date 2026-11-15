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
it('offers the site chooser when only the current site is unfinished', () => {
  const ratings = Object.fromEntries(TOUR_ORDER.map((id) => [id, 1]));
  expect(nextSite({ ratings })).toBeNull();
  expect(nextSiteAfter('titanic', { ratings })).toBeNull();
  ratings.titanic = 0;
  expect(nextSiteAfter('titanic', { ratings })).toBeNull();
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
  expect(sites.reduce((n, s) => n + siteFinds(s, { isDiscovered: () => false }).total, 0)).toBe(64);
});

it.each(TOUR_ORDER)('never routes the debrief back into the same site: %s', (current) => {
  const ratings = Object.fromEntries(TOUR_ORDER.map((id) => [id, id === current ? 0 : 1]));
  expect(nextSiteAfter(current, { ratings })).toBeNull();
  const next = nextSiteAfter(current, { ratings: {} });
  expect(TOUR_ORDER).toContain(next);
  expect(next).not.toBe(current);
});

const guides = import.meta.glob<{ entries: { fact?: string }[] }>(
  '../../data/landmarks/*/guide.json',
  { eager: true, import: 'default' },
);
it('gives every site a short plain hook that is not a card fact', async () => {
  const { SITE_HOOKS, siteHook } = await import('../../src/game/Tour.js');
  const banned = /[?!]|did you know|discover|explore|journey|secrets|wonders|illustrative/i;
  for (const id of TOUR_ORDER) {
    const hook = siteHook(id)!;
    expect(hook, id).toBeTruthy();
    expect(hook.length, id).toBeLessThanOrEqual(100);
    expect(hook.endsWith('.'), id).toBe(true);
    expect(banned.test(hook), id).toBe(false);
    const guide = guides[`../../data/landmarks/${id}/guide.json`];
    const facts = guide.entries.map((e: { fact?: string }) => e.fact);
    expect(facts, id).not.toContain(hook);
  }
  expect(Object.keys(SITE_HOOKS).sort()).toEqual([...TOUR_ORDER].sort());
  expect(siteHook('nowhere')).toBeNull();
});
