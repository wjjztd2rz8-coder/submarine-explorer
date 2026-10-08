/** D-FLOW: the Journal's content model and unlock rules (plan/PHASE-D-CONTRACTS.md §4). */

import { describe, expect, it } from 'vitest';
import { DiscoveryStore, DISCOVERY_STORAGE_KEY } from '../../src/game/DiscoveryStore.js';
import { parseGuide } from '../../src/game/Guide.js';
import {
  buildJournalSite,
  isEntryUnlocked,
  isSiteUnlocked,
  loadJournalSites,
  parseJournalCatalogue,
  siteProgress,
  type DiscoveryReader,
} from '../../src/game/JournalData.js';
import { debriefText } from '../../src/game/MissionRouter.js';
import { parsePois } from '../../src/game/Pois.js';
import { parseSpecies } from '../../src/game/Species.js';
import type { FetchJson } from '../../src/game/ContentPath.js';

const quiet = (): void => {};

const GUIDE = parseGuide(
  {
    version: 1,
    landmark: 'reef',
    memorial_note: 'Remember.',
    entries: [
      { id: 'overview', title: 'The reef', paragraphs: ['A reef.'] },
      { id: 'wreck', title: 'The wreck', paragraphs: ['Steel.'] },
      {
        id: 'mound',
        title: 'Coral mound',
        paragraphs: ['Built by Desmophyllum pertusum over millennia.'],
      },
    ],
  },
  'reef',
);
const POIS = parsePois(
  {
    version: 1,
    landmark: 'reef',
    pois: [
      {
        id: 'reef-wreck',
        name: 'Wreck',
        lat: 1,
        lon: 1,
        depth_m: 50,
        kind: 'wreck',
        guide_entry: 'wreck',
        reconstruction: true,
      },
      {
        id: 'reef-mound',
        name: 'Mound',
        lat: 1,
        lon: 1,
        depth_m: 60,
        kind: 'biology',
        guide_entry: 'mound',
      },
      { id: 'reef-rock', name: 'Rock', lat: 1, lon: 1, depth_m: 60, kind: 'geology' },
    ],
  },
  quiet,
);
const SPECIES = parseSpecies(
  {
    version: 1,
    landmark: 'reef',
    source: 'OBIS',
    note: 'x',
    species: [
      { scientificName: 'Desmophyllum pertusum', records: 9 },
      { scientificName: 'Lophelia', records: 3 },
      { scientificName: 'Solitaria nowhere', commonName: 'lonely', records: 1 },
    ],
  },
  'reef',
  quiet,
);

function site() {
  return buildJournalSite({
    id: 'reef',
    catalogue: {
      name: 'Reef',
      region: 'Somewhere',
      depthM: 55,
      summary: 'A reef.',
      facts: [],
      links: [],
    },
    guide: GUIDE,
    pois: POIS,
    species: SPECIES,
  });
}

function reader(keys: string[]): DiscoveryReader {
  const set = new Set(keys);
  return { isDiscovered: (l, p) => set.has(`${l}/${p}`) };
}

describe('Journal content model', () => {
  it('builds site, POI and species entries in order', () => {
    const s = site();
    expect(s.name).toBe('Reef');
    expect(s.memorialNote).toBe('Remember.');
    expect(s.entries.map((e) => e.key)).toEqual([
      'reef/site/overview',
      'reef/poi/wreck',
      'reef/poi/mound',
      'reef/poi/reef-rock', // a POI without a guide entry gets a stand-in
      'reef/species/Desmophyllum pertusum',
      'reef/species/Lophelia',
      'reef/species/Solitaria nowhere',
    ]);
    const wreck = s.entries.find((e) => e.id === 'wreck')!;
    expect(wreck.recreation).toBe(true);
    expect(s.entries.find((e) => e.id === 'mound')!.recreation).toBe(false);
    // Linkage is the species name in a POI entry's text; "Lophelia" is not named.
    expect(s.entries.find((e) => e.id === 'Desmophyllum pertusum')!.linkedEntryIds).toEqual([
      'mound',
    ]);
    expect(s.entries.find((e) => e.id === 'Lophelia')!.linkedEntryIds).toEqual([]);
    expect(s.entries.find((e) => e.id === 'Solitaria nowhere')!.title).toBe('lonely');
  });

  it('unlocks the site on any scan, POIs by their scan, species only by linkage', () => {
    const s = site();
    const entry = (id: string) => s.entries.find((e) => e.id === id)!;
    const none = reader([]);
    expect(isSiteUnlocked(s, none)).toBe(false);
    expect(s.entries.some((e) => isEntryUnlocked(s, e, none))).toBe(false);

    const rock = reader(['reef/reef-rock']);
    expect(isSiteUnlocked(s, rock)).toBe(true);
    expect(isEntryUnlocked(s, entry('overview'), rock)).toBe(true);
    expect(isEntryUnlocked(s, entry('wreck'), rock)).toBe(false);
    expect(isEntryUnlocked(s, entry('Desmophyllum pertusum'), rock)).toBe(false);

    const mound = reader(['reef/reef-mound']);
    expect(isEntryUnlocked(s, entry('mound'), mound)).toBe(true);
    expect(isEntryUnlocked(s, entry('Desmophyllum pertusum'), mound)).toBe(true);
    expect(isEntryUnlocked(s, entry('Lophelia'), mound)).toBe(false);
    // Another site's scan unlocks nothing here.
    expect(isSiteUnlocked(s, reader(['other/reef-mound']))).toBe(false);

    expect(siteProgress(s, mound)).toEqual({ logged: 2, total: 4, species: 1, speciesTotal: 3 });
  });

  it('reads discovery v1 without rewriting it', () => {
    const raw = JSON.stringify({
      version: 1,
      discovered: { 'reef/reef-wreck': { at: '2026-01-01T00:00:00.000Z', count: 3 } },
      stats: { scans: 3, firstAt: '2026-01-01T00:00:00.000Z' },
    });
    const writes: string[] = [];
    const storage = {
      getItem: (k: string) => (k === DISCOVERY_STORAGE_KEY ? raw : null),
      setItem: (k: string) => writes.push(k),
      removeItem: (k: string) => writes.push(`rm ${k}`),
    };
    const store = new DiscoveryStore(storage);
    const s = site();
    expect(
      isEntryUnlocked(
        s,
        s.entries.find((e) => e.id === 'wreck')!,
        store,
      ),
    ).toBe(true);
    siteProgress(s, store);
    expect(writes).toEqual([]);
  });

  it('parses the catalogue and loads every indexed site plus extras', async () => {
    const cat = parseJournalCatalogue({
      landmarks: [
        {
          id: 'reef',
          name: 'Reef',
          depth_m: -55,
          region: 'Sea',
          summary: 'S',
          facts: ['f', 3],
          external_links: ['https://example.org/a', 'javascript:alert(1)'],
        },
        { name: 'no id' },
      ],
    });
    expect([...cat.keys()]).toEqual(['reef']);
    expect(cat.get('reef')).toMatchObject({ depthM: 55, facts: ['f'] });
    expect(cat.get('reef')!.links).toEqual([
      { title: 'https://example.org/a', url: 'https://example.org/a' },
    ]);

    const files: Record<string, unknown> = {
      '/data/landmarks.json': { landmarks: [{ id: 'reef', name: 'Reef' }] },
      '/data/landmarks/index.json': { version: 1, landmarks: ['reef'] },
      '/data/landmarks/reef/mission.json': { title: 'Reef dive' },
      '/data/landmarks/reef/pois.json': { version: 1, pois: [] },
    };
    const fetchFn: FetchJson = async (url) => {
      const doc = files[url];
      return { ok: doc !== undefined, text: async () => JSON.stringify(doc ?? null) };
    };
    const sites = await loadJournalSites(['_test', 'reef', '../bad'], fetchFn);
    expect(sites.map((x) => x.id)).toEqual(['reef', '_test']);
    expect(sites[0]!.missionTitle).toBe('Reef dive');
    expect(sites[1]!.entries).toEqual([]);
  });
});

describe('debrief wording', () => {
  it('says Mission complete only when the primaries are done', () => {
    const c = { completed: 3, total: 4 };
    expect(debriefText('surface', true, c, 75)).toEqual({
      title: 'Mission complete',
      subtitle: 'All primary objectives · 3 of 4 objectives · 1:15',
    });
    expect(debriefText('all', true, { completed: 4, total: 4 }, 75).subtitle).toBe(
      'Every objective · 4 of 4 objectives · 1:15',
    );
    expect(debriefText('surface', false, { completed: 1, total: 4 }, 5)).toEqual({
      title: 'Back at the surface',
      subtitle: 'You found 1 of 4 — the rest are still down there. · 1 of 4 objectives · 0:05',
    });
    const none = debriefText('surface', false, { completed: 0, total: 4 }, 5);
    expect(none.title).toBe('Back at the surface');
    expect(none.subtitle).toMatch(/^Nothing logged this time/);
    expect(none.subtitle).not.toMatch(/fail|unfinished|ended/i);
    expect(debriefText('abort', false, { completed: 1, total: 4 }, 5, -1180)).toEqual({
      title: 'Dive aborted',
      subtitle: 'Hull failure at 1,180 m · emergency ascent completed · 1 of 4 objectives · 0:05',
    });
  });
});
