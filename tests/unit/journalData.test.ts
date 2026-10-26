/** D-FLOW: the Journal's content model and unlock rules (plan/PHASE-D-CONTRACTS.md §4). */

// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus, type GameEvents } from '../../src/core/EventBus.js';
import { Scanner } from '../../src/game/Scanner.js';
import { HERO_SITES } from '../../src/game/Cosmetics.js';
import { DiscoveryStore, DISCOVERY_STORAGE_KEY } from '../../src/game/DiscoveryStore.js';
import { loadGuide, parseGuide } from '../../src/game/Guide.js';
import {
  buildJournalSite,
  isEntryUnlocked,
  isSiteUnlocked,
  journalEntryTag,
  lifeDiscoveryId,
  loadJournalSite,
  loadJournalSites,
  parseJournalCatalogue,
  siteProgress,
  wildlifeProgress,
  type DiscoveryReader,
  type JournalSite,
} from '../../src/game/JournalData.js';
import { debriefText } from '../../src/game/MissionRouter.js';
import { loadMission, parseMissionIndex } from '../../src/game/Mission.js';
import { loadPois, parsePois, type PoiDef } from '../../src/game/Pois.js';
import { loadSpecies, parseSpecies } from '../../src/game/Species.js';
import { LIFE_ID_PREFIX } from '../../src/world/life/Life.js';
import { SPECIES_BY_ID } from '../../src/world/life/catalogue.js';
import { bandOverlap, parseLifeDoc } from '../../src/world/life/tables.js';
import lifeDoc from '../../data/life/life.json';
import type { FetchJson } from '../../src/game/ContentPath.js';
import titanic from '../../data/landmarks/titanic/mission.json';
import blueHole from '../../data/landmarks/great-blue-hole/mission.json';

const quiet = (): void => {};

const HERO_CONTENT_IDS = ['titanic', 'great-blue-hole', 'beebe-vent-field', 'lost-city'] as const;
const shippedIds = parseMissionIndex(JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')));
const nonHeroIds = shippedIds.filter((id) => !HERO_SITES.some((hero) => hero === id));

const realContentFetch: FetchJson = async (url) => {
  // Read the shipped content through the same URL paths as the runtime loader.
  if (!/^\/data\/landmarks(?:\.json|\/index\.json|\/[a-z0-9-]+\/[a-z]+\.json)$/.test(url)) {
    return { ok: false, text: async () => '' };
  }
  try {
    const source = readFileSync(`.${url}`, 'utf8');
    return { ok: true, text: async () => source };
  } catch {
    return { ok: false, text: async () => '' };
  }
};

const heroContentFetch: FetchJson = async (url) =>
  url === '/data/landmarks/index.json'
    ? { ok: true, text: async () => JSON.stringify({ version: 1, landmarks: HERO_CONTENT_IDS }) }
    : realContentFetch(url);

function discoveryFixture() {
  const bytes = new Map<string, string>();
  const writes: string[] = [];
  const storage = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key);
      bytes.set(key, value);
    },
    removeItem: (key: string) => {
      writes.push(key);
      bytes.delete(key);
    },
  };
  const store = new DiscoveryStore(storage, () => new Date('2026-10-17T00:00:00Z'));
  return { bytes, writes, storage, store };
}

function scanPoi(store: DiscoveryStore, id: string, target: PoiDef, depth: number) {
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
}

it.each(HERO_CONTENT_IDS)(
  '%s: an authored POI scan survives reload and unlocks only its Journal target',
  async (id) => {
    const sites = await loadJournalSites([], heroContentFetch);
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

    const { bytes, storage, store } = discoveryFixture();
    expect(sites.every((site) => !isSiteUnlocked(site, store))).toBe(true);
    const depth = Math.max(target.depth_m ?? 100, target.min_depth_m ?? 0);
    scanPoi(store, id, target, depth);

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

it.each(nonHeroIds)(
  '%s: first primary scan unlocks its shipped Journal entry through reload without leaking sites',
  async (id) => {
    expect(shippedIds).toHaveLength(13);
    expect(nonHeroIds).toHaveLength(8);
    const sites = await loadJournalSites([], realContentFetch);
    expect(sites.map((site) => site.id)).toEqual(shippedIds);
    const current = sites.find((site) => site.id === id)!;
    const mission = await loadMission(id, realContentFetch);
    expect(mission).not.toBeNull();
    expect(mission!.landmark).toBe(id);
    const first = mission!.objectives.find((objective) => objective.primary)!;
    expect(first, 'the mission must have a primary scan').toBeDefined();
    const defs = parsePois(
      JSON.parse(readFileSync(`data/landmarks/${id}/pois.json`, 'utf8')),
      quiet,
    );
    const target = defs.find((poi) => poi.id === first.poi)!;
    expect(target, `${id}/${first.id}: authored POI ${first.poi}`).toBeDefined();
    const guide = parseGuide(
      JSON.parse(readFileSync(`data/landmarks/${id}/guide.json`, 'utf8')),
      id,
    )!;
    // These shipped primaries all have authored links; a generated stand-in would hide a break.
    const authored = guide.entries.find((entry) => entry.id === target.guide_entry)!;
    expect(authored, `${target.id}: authored guide entry ${target.guide_entry}`).toBeDefined();
    const entry = current.entries.find((item) => item.key === `${id}/poi/${authored.id}`)!;
    expect(entry).toBeDefined();
    expect(entry.poiIds).toContain(target.id);
    expect(entry.guide).toEqual(authored);
    expect(entry.recreation).toBe(authored.reconstruction);
    expect(journalEntryTag(entry)).toBe(authored.reconstruction ? 'Recreation' : null);

    const { bytes, writes, storage, store } = discoveryFixture();
    expect(sites.every((site) => !isSiteUnlocked(site, store))).toBe(true);
    expect(current.entries.every((item) => !isEntryUnlocked(current, item, store))).toBe(true);
    // Same authored IDs and names under another namespace are a collision control,
    // not an additional shipped POI or a navigation/terrain placement fixture.
    const collision = buildJournalSite({
      id: sites.find((site) => site.id !== id)!.id,
      guide,
      pois: defs,
      species: null,
    });
    const depth = Math.max(
      target.depth_m ?? mission!.briefing.depth_m ?? 100,
      target.min_depth_m ?? 0,
    );
    scanPoi(store, id, target, depth);
    const archived = bytes.get(DISCOVERY_STORAGE_KEY);
    expect(archived).toBeDefined();
    const savedWrites = [...writes];

    // Reload content as well as storage so the full index participates in both reads.
    const reloadedSites = await loadJournalSites([], realContentFetch);
    const reloaded = new DiscoveryStore(storage);
    for (const [loadedSites, saved] of [
      [sites, store],
      [reloadedSites, reloaded],
    ] as const) {
      const site = loadedSites.find((site) => site.id === id)!;
      const linked = site.entries.find((item) => item.key === entry.key)!;
      expect(saved.keys()).toEqual([`${id}/${target.id}`]);
      expect(saved.get(id, target.id)).toEqual({ at: '2026-10-17T00:00:00.000Z', count: 1 });
      expect(isSiteUnlocked(site, saved)).toBe(true);
      expect(isEntryUnlocked(site, linked, saved)).toBe(true);
      expect(linked).toEqual(entry);
      // Grouped POIs legitimately share one entry; only independent entries must stay locked.
      for (const item of site.entries.filter((item) => item.kind === 'poi')) {
        expect(isEntryUnlocked(site, item, saved), item.key).toBe(item.poiIds.includes(target.id));
      }
      for (const other of loadedSites.filter((site) => site.id !== id)) {
        expect(isSiteUnlocked(other, saved), other.id).toBe(false);
        expect(other.entries.every((item) => !isEntryUnlocked(other, item, saved))).toBe(true);
        siteProgress(other, saved);
      }
      expect(isSiteUnlocked(collision, saved)).toBe(false);
      expect(collision.entries.every((item) => !isEntryUnlocked(collision, item, saved))).toBe(
        true,
      );
      siteProgress(site, saved);
    }
    expect(bytes.get(DISCOVERY_STORAGE_KEY)).toBe(archived);
    expect(writes).toEqual(savedWrites);
  },
);

describe('shipped wildlife scan-to-Journal linkage', () => {
  const life = parseLifeDoc(lifeDoc);
  const rows = shippedIds.flatMap((siteId) => {
    const table = life.sites[siteId]!;
    // A rare swarm of a common species shares its existing per-species discovery.
    return [...new Set([...table.spawns.map((row) => row.species), table.rare!.species])].map(
      (speciesId) => ({ siteId, speciesId }),
    );
  });
  let sites: JournalSite[];

  beforeAll(async () => {
    const catalogue = parseJournalCatalogue(
      JSON.parse(readFileSync('data/landmarks.json', 'utf8')),
    );
    sites = await Promise.all(
      shippedIds.map(async (id) => {
        const [guide, pois, species] = await Promise.all([
          loadGuide(id, realContentFetch),
          loadPois(id, realContentFetch, quiet),
          loadSpecies(id, realContentFetch, quiet),
        ]);
        // loadJournalSite deliberately omits life with a custom fetch fixture.
        return buildJournalSite({ id, catalogue: catalogue.get(id), guide, pois, species, life });
      }),
    );
  });

  it.each(rows)(
    '$siteId / $speciesId: first scan retains its wildlife entry, overview and isolated counters',
    ({ siteId, speciesId }) => {
      const site = sites.find((item) => item.id === siteId)!;
      const wildlife = site.entries.filter((entry) => entry.kind === 'life');
      const expectedIds = rows.filter((row) => row.siteId === siteId).map((row) => row.speciesId);
      expect(wildlife.map((entry) => entry.key)).toEqual(
        expectedIds.map((id) => `${siteId}/life/${id}`),
      );
      const entry = wildlife.find((item) => item.id === speciesId)!;
      const def = SPECIES_BY_ID.get(speciesId)!;
      const table = life.sites[siteId]!;
      const common = table.spawns.find((row) => row.species === speciesId);
      const source = common ?? table.rare!;
      const band = bandOverlap(source.depth, def.depth);
      expect(band).not.toBeNull();
      const depth = (band![0] + band![1]) / 2;
      expect(entry.title).toBe(def.common);
      expect(entry.life).toEqual({ def, info: life.species[speciesId], rare: !common });
      expect(entry.poiIds).toEqual([]);
      expect(entry.linkedEntryIds).toEqual([]);
      expect(journalEntryTag(entry)).toBe('Game addition');
      const overviews = site.entries.filter((item) => item.kind === 'site');
      expect(overviews.length).toBeGreaterThan(0);
      expect(wildlife.some((item) => item.id !== speciesId)).toBe(true);

      const { bytes, writes, storage, store } = discoveryFixture();
      expect(sites.every((item) => !isSiteUnlocked(item, store))).toBe(true);
      expect(site.entries.every((item) => !isEntryUnlocked(site, item, store))).toBe(true);
      expect(wildlifeProgress(site, store)).toEqual({ scanned: 0, total: expectedIds.length });
      const before = siteProgress(site, store);
      const bus = new EventBus();
      const completions: GameEvents['scan:complete'][] = [];
      bus.on('scan:complete', (event) => completions.push(event));
      const scanner = new Scanner(DEFAULT_CONFIG.scan, bus, store);
      // Life emits one live contact per species. Catalogue range is conservative:
      // Life can also extend it by the animal's body length and the mode floor.
      const target = {
        id: LIFE_ID_PREFIX + speciesId,
        name: def.common,
        landmarkId: siteId,
        position: new Vector3(0, -depth, -Math.min(5, def.scanRadius / 2)),
        radius: def.scanRadius,
        scanSeconds: def.scanSeconds,
      };
      expect(target.id).toBe(lifeDiscoveryId(speciesId));
      scanner.setExtraTargets([target]);
      const scan = () =>
        scanner.update(def.scanSeconds, new Vector3(0, -depth, 0), new Vector3(0, 0, -1), true);
      scan();
      expect(scanner.view.lastCompleteId).toBe(target.id);
      expect(completions).toEqual([{ poiId: target.id, landmarkId: siteId, firstTime: true }]);
      const first = { at: '2026-10-17T00:00:00.000Z', count: 1 };
      expect(JSON.parse(bytes.get(DISCOVERY_STORAGE_KEY)!)).toMatchObject({
        discovered: { [`${siteId}/${target.id}`]: first },
        stats: { scans: 1 },
      });
      const archived = bytes.get(DISCOVERY_STORAGE_KEY);
      const savedWrites = [...writes];
      expect(savedWrites).toEqual([DISCOVERY_STORAGE_KEY]);
      for (const saved of [store, new DiscoveryStore(storage)]) {
        expect(saved.keys()).toEqual([`${siteId}/${target.id}`]);
        expect(saved.get(siteId, target.id)).toEqual(first);
        expect(saved.stats.scans).toBe(1);
        expect(isSiteUnlocked(site, saved)).toBe(true);
        for (const item of site.entries) {
          // Survey records require a scanned POI naming them; wildlife does not supply that link.
          expect(isEntryUnlocked(site, item, saved), item.key).toBe(
            item.kind === 'site' || item.key === entry.key,
          );
        }
        expect(wildlifeProgress(site, saved)).toEqual({ scanned: 1, total: expectedIds.length });
        expect(siteProgress(site, saved)).toEqual({ ...before, logged: overviews.length });
        for (const other of sites.filter((item) => item.id !== siteId)) {
          expect(isSiteUnlocked(other, saved), other.id).toBe(false);
          expect(other.entries.every((item) => !isEntryUnlocked(other, item, saved))).toBe(true);
          expect(wildlifeProgress(other, saved).scanned).toBe(0);
        }
      }
      expect(bytes.get(DISCOVERY_STORAGE_KEY)).toBe(archived);
      expect(writes).toEqual(savedWrites);
      // Another individual of this species cannot add a second discovery in this dive.
      scan();
      expect(completions).toHaveLength(1);
      expect(writes).toEqual(savedWrites);
      scanner.resetDive();
      scan();
      expect(completions.at(-1)).toEqual({
        poiId: target.id,
        landmarkId: siteId,
        firstTime: false,
      });
      const reloaded = new DiscoveryStore(storage);
      expect(reloaded.keys()).toEqual([`${siteId}/${target.id}`]);
      expect(reloaded.get(siteId, target.id)).toEqual({ ...first, count: 2 });
      expect(reloaded.stats.scans).toBe(2);
      expect(wildlifeProgress(site, reloaded)).toEqual({ scanned: 1, total: expectedIds.length });
    },
  );
});

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
  it.each([
    {
      label: 'old duplicate list',
      raw: {
        version: 0,
        discoveries: ['reef/reef-mound', 'reef/reef-mound', 'retired-site/reef-wreck', null],
      },
    },
    {
      label: 'partial mixed fields',
      raw: {
        version: 1,
        discovered: { 'reef/removed-poi': true, 'reef/reef-rock': null },
        discoveries: ['reef/reef-mound', 'retired-site/reef-wreck'],
      },
    },
  ])(
    'loads a $label without losing Journal unlocks or opening unrelated entries',
    async ({ raw }) => {
      const { storage, bytes, writes } = discoveryFixture();
      const original = JSON.stringify(raw);
      storage.setItem(DISCOVERY_STORAGE_KEY, original);
      const store = new DiscoveryStore(storage);
      const requests: string[] = [];
      const fetchFn: FetchJson = async (url) => {
        requests.push(url);
        if (url === '/data/landmarks/index.json')
          return {
            ok: true,
            text: async () => JSON.stringify({ landmarks: ['reef', 'reef', 'neighbor'] }),
          };
        if (url.endsWith('/guide.json'))
          return { ok: true, text: async () => JSON.stringify(GUIDE) };
        if (url.endsWith('/pois.json'))
          return { ok: true, text: async () => JSON.stringify({ pois: POIS }) };
        if (url.endsWith('/species.json'))
          return { ok: true, text: async () => JSON.stringify(SPECIES) };
        return { ok: false, text: async () => '' };
      };
      const sites = await loadJournalSites([], fetchFn);
      expect(sites.map((site) => site.id)).toEqual(['reef', 'neighbor']);
      expect(requests.every((url) => !url.includes('retired-site'))).toBe(true);
      const reef = sites[0];
      const mound = reef.entries.find((entry) => entry.id === 'mound')!;
      const wreck = reef.entries.find((entry) => entry.id === 'wreck')!;
      expect(isSiteUnlocked(reef, store)).toBe(true);
      expect(isEntryUnlocked(reef, mound, store)).toBe(true);
      expect(isEntryUnlocked(reef, wreck, store)).toBe(false);
      expect(isSiteUnlocked(sites[1], store)).toBe(false);
      expect(siteProgress(reef, store)).toEqual({
        logged: 2,
        total: 4,
        species: 1,
        speciesTotal: 3,
      });
      expect(bytes.get(DISCOVERY_STORAGE_KEY)).toBe(original);
      expect(writes).toEqual([DISCOVERY_STORAGE_KEY]);

      const retired = store.get('retired-site', 'reef-wreck');
      expect(store.record('reef', 'reef-wreck').firstTime).toBe(true);
      const saved = bytes.get(DISCOVERY_STORAGE_KEY);
      const reloaded = new DiscoveryStore(storage);
      const loadedSites = await loadJournalSites([], fetchFn);
      expect(isEntryUnlocked(loadedSites[0], wreck, reloaded)).toBe(true);
      expect(isEntryUnlocked(loadedSites[0], mound, reloaded)).toBe(true);
      expect(siteProgress(loadedSites[0], reloaded)).toEqual({
        logged: 3,
        total: 4,
        species: 1,
        speciesTotal: 3,
      });
      expect(isSiteUnlocked(loadedSites[1], reloaded)).toBe(false);
      expect(reloaded.get('retired-site', 'reef-wreck')).toEqual(retired);
      expect(reloaded.get('reef', 'reef-mound')?.count).toBe(1);
      expect(bytes.get(DISCOVERY_STORAGE_KEY)).toBe(saved);
      expect(writes).toEqual([DISCOVERY_STORAGE_KEY, DISCOVERY_STORAGE_KEY]);
    },
  );

  it('retains neighboring content when a guide body fails and restores authored grouping on a fresh load', async () => {
    const guide = {
      ...GUIDE,
      title: 'Authored reef',
      entries: [
        GUIDE!.entries[0],
        { ...GUIDE!.entries[1], paragraphs: ['Steel hosts Desmophyllum pertusum.'] },
      ],
    };
    const pois = POIS.map((poi) =>
      poi.id === 'reef-mound' ? { ...poi, guide_entry: 'wreck' } : poi,
    );
    const catalogue = parseJournalCatalogue({
      landmarks: [
        { id: 'reef', name: 'Reef', region: 'Sea', depth_m: 55, summary: 'A reef.' },
        { id: 'neighbor', name: 'Neighbor', region: 'Sea', depth_m: 60 },
      ],
    });
    const files: Record<string, unknown> = {};
    for (const id of ['reef', 'neighbor']) {
      files[`/data/landmarks/${id}/guide.json`] = { ...guide, landmark: id };
      files[`/data/landmarks/${id}/pois.json`] = { pois };
      files[`/data/landmarks/${id}/species.json`] = { ...SPECIES, landmark: id };
      files[`/data/landmarks/${id}/mission.json`] = {
        title: `${id} dive`,
        spawn: { lat: 1, lon: 1, depth_m: 5 },
        briefing: { summary: 'Explore the reef.', facts: ['A reef.'], hazards: [] },
        objectives: [{ id: 'scan-wreck', poi: 'reef-wreck', primary: true }],
      };
      files[`/data/secrets/${id}.json`] = {
        version: 1,
        secrets: [
          { id: 'arch', name: 'Arch', kind: 'rock', lat: 1, lon: 1, text: 'A hidden arch.' },
        ],
        samples: [{ id: 'mud', name: 'Sediment', lat: 1, lon: 1 }],
      };
    }
    let rejectGuide!: (reason: Error) => void;
    const guideBody = new Promise<never>((_, reject) => {
      rejectGuide = reject;
    });
    let guideUnavailable = true;
    const requests: string[] = [];
    const fetchFn: FetchJson = async (url) => {
      requests.push(url);
      if (guideUnavailable && url === '/data/landmarks/reef/guide.json') {
        return { ok: true, text: () => guideBody };
      }
      return { ok: url in files, text: async () => JSON.stringify(files[url]) };
    };
    const pending = loadJournalSite('reef', catalogue, fetchFn);
    // A separate site's real loader can finish while the failing guide is still pending.
    const neighbor = await loadJournalSite('neighbor', catalogue, fetchFn);
    expect(neighbor.id).toBe('neighbor');
    expect(neighbor.entries.find((entry) => entry.id === 'wreck')?.poiIds).toEqual([
      'reef-wreck',
      'reef-mound',
    ]);
    expect(neighbor.entries.find((entry) => entry.id === 'wreck')?.guide).toEqual(guide.entries[1]);
    rejectGuide(new Error('guide response body interrupted'));
    const fallback = await pending;
    expect(fallback).toMatchObject({
      id: 'reef',
      name: 'Reef',
      region: 'Sea',
      depthM: 55,
      summary: 'A reef.',
      missionTitle: 'reef dive',
      briefing: { summary: 'Explore the reef.', facts: ['A reef.'], hazards: [] },
      poiIds: ['reef-wreck', 'reef-mound', 'reef-rock'],
      species: SPECIES,
    });
    const standIns = fallback.entries.filter((entry) => entry.kind === 'poi');
    expect(standIns.map((entry) => entry.key)).toEqual([
      'reef/poi/reef-wreck',
      'reef/poi/reef-mound',
      'reef/poi/reef-rock',
    ]);
    expect(standIns[0]).toMatchObject({
      siteId: 'reef',
      title: 'Wreck',
      poiIds: ['reef-wreck'],
      recreation: true,
      guide: { paragraphs: [], facts: [{ label: 'Kind', value: 'wreck' }] },
    });
    expect(fallback.entries.filter((entry) => entry.kind === 'species')).toHaveLength(3);
    expect(
      fallback.entries.filter((entry) => entry.kind === 'secret').map((entry) => entry.key),
    ).toEqual(['reef/secret/arch', 'reef/sample/mud']);
    const { store, storage, bytes, writes } = discoveryFixture();
    expect(isSiteUnlocked(fallback, store)).toBe(false);
    expect(fallback.entries.every((entry) => !isEntryUnlocked(fallback, entry, store))).toBe(true);
    const neighborDiscovery = reader(['neighbor/reef-wreck']);
    expect(isSiteUnlocked(neighbor, neighborDiscovery)).toBe(true);
    expect(isSiteUnlocked(fallback, neighborDiscovery)).toBe(false);
    store.record('reef', 'reef-wreck');
    const savedBytes = bytes.get(DISCOVERY_STORAGE_KEY);
    const savedWrites = [...writes];
    const saved = new DiscoveryStore(storage);
    expect(saved.keys()).toEqual(['reef/reef-wreck']);
    expect(isSiteUnlocked(fallback, saved)).toBe(true);
    expect(fallback.entries.filter((entry) => isEntryUnlocked(fallback, entry, saved))).toEqual([
      standIns[0],
    ]);
    expect(isSiteUnlocked(neighbor, saved)).toBe(false);
    expect(neighbor.entries.every((entry) => !isEntryUnlocked(neighbor, entry, saved))).toBe(true);

    guideUnavailable = false;
    const recovered = await loadJournalSite('reef', catalogue, fetchFn);
    expect(recovered).toMatchObject({
      id: 'reef',
      name: 'Authored reef',
      region: fallback.region,
      depthM: fallback.depthM,
      poiIds: fallback.poiIds,
      species: fallback.species,
      briefing: fallback.briefing,
    });
    const authored = recovered.entries.find((entry) => entry.key === 'reef/poi/wreck')!;
    expect(authored).toMatchObject({
      siteId: 'reef',
      poiIds: ['reef-wreck', 'reef-mound'],
      recreation: true,
      guide: guide.entries[1],
    });
    expect(
      recovered.entries.filter((entry) => entry.kind === 'poi').map((entry) => entry.key),
    ).toEqual(['reef/poi/wreck', 'reef/poi/reef-rock']);
    expect(
      recovered.entries
        .filter((entry) => isEntryUnlocked(recovered, entry, saved))
        .map((entry) => entry.key),
    ).toEqual(['reef/site/overview', 'reef/poi/wreck', 'reef/species/Desmophyllum pertusum']);
    expect(isSiteUnlocked(neighbor, saved)).toBe(false);
    expect(bytes.get(DISCOVERY_STORAGE_KEY)).toBe(savedBytes);
    expect(writes).toEqual(savedWrites);
    const siteRequests = (id: string) => [
      `/data/landmarks/${id}/guide.json`,
      `/data/landmarks/${id}/pois.json`,
      `/data/landmarks/${id}/species.json`,
      `/data/landmarks/${id}/mission.json`,
      `/data/secrets/${id}.json`,
    ];
    expect([...new Set(requests)].sort()).toEqual(
      [...siteRequests('reef'), ...siteRequests('neighbor')].sort(),
    );
  });

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
  it.each([
    { completed: 0, total: 0 },
    { completed: 1, total: 2 },
  ])('does not claim primary completion when no primaries resolve: %j', (counts) => {
    const result = debriefText('surface', { completed: 0, total: 0 }, counts, 75);
    expect(result.title).toBe('Back at the surface');
    expect(result.subtitle).toContain(`${counts.completed} of ${counts.total} objectives · 1:15`);
  });

  it('distinguishes primaries done from every objective done without claiming all stars', () => {
    const c = { completed: 3, total: 4 };
    expect(debriefText('surface', { completed: 2, total: 2 }, c, 75)).toEqual({
      title: 'Primaries complete',
      subtitle: '2 of 2 primary objectives · 1:15',
    });
    expect(debriefText('all', { completed: 2, total: 2 }, { completed: 4, total: 4 }, 75)).toEqual({
      title: 'All objectives complete',
      subtitle: 'Every objective · 4 of 4 objectives · 1:15',
    });
    expect(
      debriefText('surface', { completed: 0, total: 2 }, { completed: 1, total: 4 }, 5),
    ).toEqual({
      title: 'Back at the surface',
      subtitle: 'You found 1 of 4 — the rest are still down there. · 1 of 4 objectives · 0:05',
    });
    const none = debriefText('surface', { completed: 0, total: 2 }, { completed: 0, total: 4 }, 5);
    expect(none.title).toBe('Back at the surface');
    expect(none.subtitle).toMatch(/^Nothing logged this time/);
    expect(none.subtitle).not.toMatch(/fail|unfinished|ended/i);
    expect(
      debriefText('abort', { completed: 0, total: 2 }, { completed: 1, total: 4 }, 5, -1180),
    ).toEqual({
      title: 'Dive aborted',
      subtitle: 'Hull failure at 1,180 m · emergency ascent completed · 1 of 4 objectives · 0:05',
    });
    expect(debriefText('abort', { completed: 2, total: 2 }, c, 5, -1180).title).toBe(
      'Dive aborted',
    );
    expect(
      debriefText('abort', { completed: 2, total: 2 }, { completed: 4, total: 4 }, 5, 0, 'power')
        .title,
    ).toBe('Dive aborted');
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
