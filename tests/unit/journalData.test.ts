/** D-FLOW: the Journal's content model and unlock rules (plan/PHASE-D-CONTRACTS.md §4). */

// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Scanner } from '../../src/game/Scanner.js';
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
import { parseLifeDoc } from '../../src/world/life/tables.js';
import lifeDoc from '../../data/life/life.json';
import type { FetchJson } from '../../src/game/ContentPath.js';
import titanic from '../../data/landmarks/titanic/mission.json';
import blueHole from '../../data/landmarks/great-blue-hole/mission.json';

const quiet = (): void => {};

const HERO_CONTENT_IDS = ['titanic', 'great-blue-hole', 'beebe-vent-field', 'lost-city'] as const;

const realContentFetch: FetchJson = async (url) => {
  if (url === '/data/landmarks/index.json') {
    return {
      ok: true,
      text: async () => JSON.stringify({ version: 1, landmarks: HERO_CONTENT_IDS }),
    };
  }
  // Read the shipped content through the same URL paths as the runtime loader.
  if (!/^\/data\/landmarks(?:\.json|\/[a-z0-9-]+\/[a-z]+\.json)$/.test(url)) {
    return { ok: false, text: async () => '' };
  }
  try {
    const source = readFileSync(`.${url}`, 'utf8');
    return { ok: true, text: async () => source };
  } catch {
    return { ok: false, text: async () => '' };
  }
};

it.each(HERO_CONTENT_IDS)(
  '%s: an authored POI scan survives reload and unlocks only its Journal target',
  async (id) => {
    const sites = await loadJournalSites([], realContentFetch);
    expect(sites.map((site) => site.id)).toEqual(HERO_CONTENT_IDS);
    const current = sites.find((site) => site.id === id)!;
    const defs = parsePois(
      JSON.parse(readFileSync(`data/landmarks/${id}/pois.json`, 'utf8')),
      quiet,
    );
    expect(defs.length).toBeGreaterThan(1);
    const target = defs[0]!;
    const entry = current.entries.find(
      (item) => item.kind === 'poi' && item.poiIds.includes(target.id),
    );
    expect(entry, 'the authored scan must map to a Journal entry').toBeDefined();
    const otherDef = defs.find((def) => !entry!.poiIds.includes(def.id));
    expect(otherDef, 'the site must contain another authored Journal target').toBeDefined();
    const otherTarget = current.entries.find(
      (item) => item.kind === 'poi' && item.poiIds.includes(otherDef!.id),
    );
    expect(otherTarget, 'the site must contain another locked target').toBeDefined();

    const bytes = new Map<string, string>();
    const storage = {
      getItem: (key: string) => bytes.get(key) ?? null,
      setItem: (key: string, value: string) => {
        bytes.set(key, value);
      },
      removeItem: (key: string) => {
        bytes.delete(key);
      },
    };
    const store = new DiscoveryStore(storage, () => new Date('2026-10-17T00:00:00Z'));
    expect(sites.every((site) => !isSiteUnlocked(site, store))).toBe(true);
    const depth = Math.max(target.depth_m ?? 100, target.min_depth_m ?? 0);
    const scanner = new Scanner(DEFAULT_CONFIG.scan, new EventBus(), store);
    scanner.setTargets([
      {
        id: target.id,
        name: target.name,
        landmarkId: id,
        position: new Vector3(0, -depth, -10),
        radius: target.radius_m ?? DEFAULT_CONFIG.scan.closeRangeM,
        minDepthM: target.min_depth_m,
        scanSeconds: target.scan_seconds ?? DEFAULT_CONFIG.scan.defaultSeconds,
      },
    ]);
    scanner.update(
      target.scan_seconds ?? DEFAULT_CONFIG.scan.defaultSeconds,
      new Vector3(0, -depth, 0),
      new Vector3(0, 0, -1),
      true,
    );
    expect(scanner.view.lastCompleteId).toBe(target.id);
    expect(scanner.view.lastCompleteFirstTime).toBe(true);
    expect(store.keys()).toEqual([`${id}/${target.id}`]);

    const archived = bytes.get(DISCOVERY_STORAGE_KEY);
    expect(archived).toBeDefined();
    const reloaded = new DiscoveryStore(storage);
    expect(reloaded.get(id, target.id)).toEqual({ at: '2026-10-17T00:00:00.000Z', count: 1 });
    expect(isSiteUnlocked(current, reloaded)).toBe(true);
    expect(isEntryUnlocked(current, entry!, reloaded)).toBe(true);
    expect(isEntryUnlocked(current, otherTarget!, reloaded)).toBe(false);
    for (const site of sites.filter((site) => site.id !== id)) {
      expect(isSiteUnlocked(site, reloaded)).toBe(false);
      expect(site.entries.every((item) => !isEntryUnlocked(site, item, reloaded))).toBe(true);
    }
    // Journal reads and store migration must leave the saved document byte-for-byte intact.
    expect(bytes.get(DISCOVERY_STORAGE_KEY)).toBe(archived);
  },
);

it.each([titanic, blueHole])(
  'retains every verified briefing bullet in the Journal ($landmark)',
  async (mission) => {
    const fetchFn: FetchJson = async (url) => ({
      ok: url.endsWith('/mission.json') || url.endsWith('/index.json'),
      text: async () =>
        JSON.stringify(url.endsWith('/mission.json') ? mission : { landmarks: [mission.landmark] }),
    });
    const [site] = await loadJournalSites([], fetchFn);
    expect(site.briefing).toEqual(mission.briefing);
    expect(isSiteUnlocked(site, { isDiscovered: () => false })).toBe(false);
  },
);

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
  it('retains one unlocked entry and its first timestamp after new-dive rescans', () => {
    const s = site();
    const storage = new Map<string, string>();
    let now = new Date('2026-10-01T12:00:00Z');
    const store = new DiscoveryStore(
      {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
        removeItem: (key) => {
          storage.delete(key);
        },
      },
      () => now,
    );
    const scanner = new Scanner(DEFAULT_CONFIG.scan, new EventBus(), store);
    scanner.setTargets([
      {
        id: 'reef-wreck',
        name: 'Wreck',
        landmarkId: 'reef',
        position: new Vector3(0, 0, -50),
        radius: 100,
        scanSeconds: 2,
      },
    ]);
    const scan = () => scanner.update(2, new Vector3(), new Vector3(0, 0, -1), true);
    const unlocked = () => s.entries.filter((e) => isEntryUnlocked(s, e, store)).map((e) => e.key);
    expect(unlocked()).toEqual([]);
    scan();
    const first = store.get('reef', 'reef-wreck');
    expect(first).toEqual({ at: now.toISOString(), count: 1 });
    expect(unlocked()).toEqual(['reef/site/overview', 'reef/poi/wreck']);
    scan();
    expect(store.get('reef', 'reef-wreck')).toEqual(first);
    scanner.resetDive();
    now = new Date('2026-10-02T12:00:00Z');
    expect(unlocked()).toEqual(['reef/site/overview', 'reef/poi/wreck']);
    scan();
    expect(scanner.view.lastCompleteFirstTime).toBe(false);
    expect(store.get('reef', 'reef-wreck')).toEqual({ at: first!.at, count: 2 });
    expect(store.stats.scans).toBe(2);
    expect(unlocked()).toEqual(['reef/site/overview', 'reef/poi/wreck']);
    expect(
      new DiscoveryStore({
        getItem: (key) => storage.get(key) ?? null,
        setItem: () => {},
        removeItem: () => {},
      }).snapshot(),
    ).toEqual(store.snapshot());
  });

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
  it('distinguishes primaries done from every objective done without claiming all stars', () => {
    const c = { completed: 3, total: 4 };
    expect(debriefText('surface', true, c, 75)).toEqual({
      title: 'Primaries complete',
      subtitle: 'All primary objectives · 3 of 4 objectives · 1:15',
    });
    expect(debriefText('all', true, { completed: 4, total: 4 }, 75)).toEqual({
      title: 'All objectives complete',
      subtitle: 'Every objective · 4 of 4 objectives · 1:15',
    });
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
    expect(debriefText('abort', true, c, 5, -1180).title).toBe('Dive aborted');
    expect(debriefText('abort', true, { completed: 4, total: 4 }, 5, 0, 'power').title).toBe(
      'Dive aborted',
    );
  });
});

it('loads samples and secrets as Journal finds while preserving their discovery keys and mission counts', () => {
  const site = buildJournalSite({
    id: 'reef',
    guide: null,
    pois: [],
    species: null,
    secrets: [{ id: 'arch', name: 'Arch', kind: 'rock', lat: 0, lon: 0, text: 'A hidden arch.' }],
    samples: [{ id: 'mud', name: 'Sediment', lat: 0, lon: 0 }],
  });
  const store = new DiscoveryStore(null);
  expect(site.entries.map((entry) => entry.kind)).toEqual(['secret', 'secret']);
  expect(site.entries.map((entry) => entry.poiIds)).toEqual([['secret:arch'], ['sample:mud']]);
  for (const entry of site.entries) expect(isEntryUnlocked(site, entry, store)).toBe(false);
  store.record('reef', 'sample:mud');
  expect(isEntryUnlocked(site, site.entries[1], store)).toBe(true);
  expect(isSiteUnlocked(site, store)).toBe(true);
  expect(siteProgress(site, store)).toEqual({ logged: 0, total: 0, species: 0, speciesTotal: 0 });
  expect(new DiscoveryStore(null).keys()).toEqual([]);
});

it('opens a site and its overview when wildlife is the first scan, including after reload', () => {
  const site = buildJournalSite({
    id: 'monterey-canyon',
    guide: GUIDE,
    pois: [],
    species: null,
    life: parseLifeDoc(lifeDoc),
  });
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
  const store = new DiscoveryStore(storage);
  const animal = site.entries.find((entry) => entry.kind === 'life')!;
  expect(animal).toBeDefined();
  expect(isSiteUnlocked(site, store)).toBe(false);
  store.record(site.id, `life:${animal.id}`);
  for (const saved of [store, new DiscoveryStore(storage)]) {
    expect(isEntryUnlocked(site, animal, saved)).toBe(true);
    expect(isSiteUnlocked(site, saved)).toBe(true);
    expect(isEntryUnlocked(site, site.entries[0], saved)).toBe(true);
  }
  expect(isSiteUnlocked(site, reader([`other/life:${animal.id}`]))).toBe(false);
});
