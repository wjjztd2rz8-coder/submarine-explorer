import { describe, expect, it } from 'vitest';
import fixtureDoc from '../../data/landmarks/_test/species.json';
import type { FetchJson } from '../../src/game/ContentPath.js';
import {
  emptySpecies,
  formatDepthRange,
  loadSpecies,
  obisTaxonUrl,
  parseSpecies,
  safeSpeciesFile,
  SPECIES_DISCLAIMER,
  speciesNote,
} from '../../src/game/Species.js';

/** A fake fetch serving a URL -> body map; anything else gets the SPA fallback HTML. */
function fakeFetch(files: Record<string, string>): { fetch: FetchJson; urls: string[] } {
  const urls: string[] = [];
  const fetch: FetchJson = async (url) => {
    urls.push(url);
    const body = files[url];
    return { ok: true, text: async () => body ?? '<!doctype html><html></html>' };
  };
  return { fetch, urls };
}

const fixture = JSON.stringify(fixtureDoc);

describe('parseSpecies', () => {
  it('parses the contracts §3 shape, sorts by records and drops nameless rows (warned once)', () => {
    const warns: string[] = [];
    const doc = parseSpecies(
      {
        version: 1,
        landmark: 'lost-city',
        source: 'OBIS',
        source_url: 'https://api.obis.org/v3/occurrence?x=1',
        fetched_at: '2026-09-22T00:00:00Z',
        depth_filter_m: [1000, 600],
        note: 'Occurrence records within the tile bbox; placement in the game is invented.',
        species: [
          { scientificName: 'B minor', records: 2 },
          {
            scientificName: 'Bathymodiolus azoricus',
            commonName: 'vent mussel',
            aphiaID: 137180,
            records: 42,
            depthRange_m: [900, 750],
            group: 'mollusc',
          },
          { scientificName: 'B minor', records: 99 },
          { commonName: 'nameless' },
          'junk',
        ],
      },
      'lost-city',
      (m) => warns.push(m),
    );
    expect(doc.species.map((s) => s.scientificName)).toEqual(['Bathymodiolus azoricus', 'B minor']);
    expect(doc.species[0]).toEqual({
      scientificName: 'Bathymodiolus azoricus',
      commonName: 'vent mussel',
      aphiaID: 137180,
      records: 42,
      depthRange_m: [750, 900],
      group: 'mollusc',
    });
    expect(doc.species[1].records).toBe(2); // duplicate name keeps the first
    expect(doc.depth_filter_m).toEqual([600, 1000]);
    expect(doc.source_url).toBe('https://api.obis.org/v3/occurrence?x=1');
    expect(doc.note).toMatch(/invented/);
    expect(warns).toHaveLength(1);
  });

  it('rejects unsafe source URLs and always carries the disclaimer', () => {
    const doc = parseSpecies(
      { source_url: 'javascript:alert(1)', note: 'From OBIS.', species: [] },
      'x',
      () => {},
    );
    expect(doc.source_url).toBeUndefined();
    expect(doc.note).toBe(`From OBIS. ${SPECIES_DISCLAIMER}`);
    expect(speciesNote(undefined)).toBe(SPECIES_DISCLAIMER);
  });

  it('a non-object document is an empty list', () => {
    expect(parseSpecies([1, 2], 'x', () => {})).toEqual(emptySpecies('x'));
  });

  it('parses the _test e2e fixture', () => {
    const doc = parseSpecies(JSON.parse(fixture), '_test', () => {});
    expect(doc.species.map((s) => s.scientificName)).toEqual([
      'Coryphaenoides armatus',
      'Halomonas titanicae',
    ]);
  });
});

describe('loadSpecies', () => {
  it('missing file (SPA fallback HTML) -> empty, no throw', async () => {
    const { fetch } = fakeFetch({});
    const doc = await loadSpecies('nowhere', fetch, () => {});
    expect(doc.species).toEqual([]);
    expect(doc.note).toBe(SPECIES_DISCLAIMER);
  });

  it('malformed JSON -> empty, no throw', async () => {
    const { fetch } = fakeFetch({ '/data/landmarks/bad/species.json': '{ "species": [ oops' });
    expect((await loadSpecies('bad', fetch, () => {})).species).toEqual([]);
  });

  it('reads the default species.json', async () => {
    const { fetch, urls } = fakeFetch({ '/data/landmarks/_test/species.json': fixture });
    const doc = await loadSpecies('_test', fetch, () => {});
    expect(doc.species).toHaveLength(2);
    expect(urls).toContain('/data/landmarks/_test/species.json');
  });

  it('honours mission.json species_file, and ignores an unsafe one', async () => {
    const { fetch, urls } = fakeFetch({
      '/data/landmarks/v/mission.json': JSON.stringify({ species_file: 'obis-2026.json' }),
      '/data/landmarks/v/obis-2026.json': fixture,
    });
    expect((await loadSpecies('v', fetch, () => {})).species).toHaveLength(2);
    expect(urls).toContain('/data/landmarks/v/obis-2026.json');

    const warns: string[] = [];
    const evil = fakeFetch({
      '/data/landmarks/e/mission.json': JSON.stringify({ species_file: '../../secret.json' }),
    });
    await loadSpecies('e', evil.fetch, (m) => warns.push(m));
    expect(evil.urls).toContain('/data/landmarks/e/species.json');
    expect(warns).toHaveLength(1);
  });

  it('an unsafe landmark id is never fetched', async () => {
    const { fetch, urls } = fakeFetch({});
    await loadSpecies('../x', fetch, () => {});
    expect(urls).toEqual([]);
  });
});

describe('helpers', () => {
  it('safeSpeciesFile', () => {
    expect(safeSpeciesFile('species.json')).toBe('species.json');
    expect(safeSpeciesFile('a/b.json')).toBeNull();
    expect(safeSpeciesFile('..json')).toBeNull();
    expect(safeSpeciesFile('x.txt')).toBeNull();
    expect(safeSpeciesFile(3)).toBeNull();
  });

  it('formatting and OBIS taxon links', () => {
    expect(formatDepthRange([750, 900])).toBe('750–900 m');
    expect(formatDepthRange([3800, 3800])).toBe('3,800 m');
    expect(formatDepthRange(undefined)).toBe('—');
    expect(obisTaxonUrl({ scientificName: 'x', records: 1, aphiaID: 5 })).toBe(
      'https://obis.org/taxon/5',
    );
    expect(obisTaxonUrl({ scientificName: 'x', records: 1 })).toBeUndefined();
  });
});
