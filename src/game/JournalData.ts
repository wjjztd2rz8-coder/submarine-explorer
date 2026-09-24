/**
 * The Journal's content model (D-FLOW, plan/PHASE-D-CONTRACTS.md §4): one
 * site per mission folder, each with entries for the site, its POIs and its
 * survey species, derived from `landmarks.json`, `guide.json`, `pois.json`
 * and `species.json`. Pure TS apart from the loaders; the DOM lives in
 * `ui/Journal.ts`.
 *
 * Unlocks read the discovery store (`subexplorer.discoveries.v1`, unchanged):
 * - a site unlocks when any of its POIs has been scanned;
 * - a POI entry unlocks when a POI that points at it has been scanned;
 * - a site-level guide entry (no POI points at it) unlocks with the site;
 * - a species unlocks only through a documented linkage: a POI entry whose
 *   text names the species. Species with no linkage stay spoiler-only until a
 *   future encounter system.
 */

import { contentUrl, fetchContentJson, isSafeLandmarkId, type FetchJson } from './ContentPath.js';
import {
  buildGuideEntries,
  entryIdForPoi,
  loadGuide,
  safeUrl,
  type GuideDoc,
  type GuideEntry,
  type GuidePoi,
  type GuideSource,
} from './Guide.js';
import { MISSION_INDEX_URL, parseMissionIndex } from './Mission.js';
import { loadPois, type PoiDef } from './Pois.js';
import { loadSpecies, type SpeciesDoc, type SpeciesRecord } from './Species.js';
import { publicUrl } from '../util/publicUrl.js';

export type JournalEntryKind = 'site' | 'poi' | 'species';

export interface JournalEntry {
  /** Unique across the Journal: `<site>/<kind>/<id>`. */
  key: string;
  siteId: string;
  kind: JournalEntryKind;
  /** Guide entry id, or the scientific name for a species. */
  id: string;
  title: string;
  guide?: GuideEntry;
  species?: SpeciesRecord;
  /** POIs whose scan unlocks this entry (POI entries only). */
  poiIds: string[];
  /** Species only: POI entries whose text names this species. */
  linkedEntryIds: string[];
  /** A POI entry for a recreated object (`reconstruction: true` in pois.json). */
  recreation: boolean;
}

/** What `landmarks.json` says about a site. */
export interface CatalogueInfo {
  name: string;
  region: string;
  depthM: number | null;
  summary: string;
  facts: string[];
  links: GuideSource[];
}

export interface JournalSite {
  id: string;
  name: string;
  region: string;
  depthM: number | null;
  summary: string;
  facts: string[];
  /** Catalogue references for the site page. */
  links: GuideSource[];
  memorialNote?: string;
  missionTitle?: string;
  /** Site-level entries, then POI entries (file order), then species (most records first). */
  entries: JournalEntry[];
  /** Every POI id at the site: any of them scanned unlocks the site page. */
  poiIds: string[];
  species: SpeciesDoc | null;
}

/** `(landmark, poi) -> scanned before` (DiscoveryStore satisfies it). */
export interface DiscoveryReader {
  isDiscovered(landmarkId: string, poiId: string): boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '');

/** Parse `data/landmarks.json` into the site page fields, keyed by id. */
export function parseJournalCatalogue(doc: unknown): Map<string, CatalogueInfo> {
  const list = Array.isArray(doc)
    ? doc
    : isObj(doc) && Array.isArray(doc.landmarks)
      ? doc.landmarks
      : [];
  const out = new Map<string, CatalogueInfo>();
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const id = str(raw.id);
    if (!id || out.has(id)) continue;
    const depth =
      typeof raw.depth_m === 'number' && Number.isFinite(raw.depth_m) ? raw.depth_m : null;
    const links: GuideSource[] = [];
    const rawLinks = Array.isArray(raw.external_links) ? raw.external_links : [];
    for (const l of rawLinks) {
      const url = safeUrl(l);
      if (url && !links.some((x) => x.url === url)) links.push({ title: url, url });
    }
    out.set(id, {
      name: str(raw.name) || id,
      region: str(raw.region),
      depthM: depth === null ? null : Math.abs(depth),
      summary: str(raw.summary),
      facts: Array.isArray(raw.facts) ? raw.facts.map(str).filter(Boolean) : [],
      links,
    });
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Searchable text of a guide entry (title, paragraphs, facts). */
function entryText(e: GuideEntry): string {
  return [e.title, ...e.paragraphs, ...e.facts.map((f) => `${f.label} ${f.value}`)].join('\n');
}

export interface JournalSiteInput {
  id: string;
  catalogue?: CatalogueInfo;
  missionTitle?: string;
  guide: GuideDoc | null;
  pois: PoiDef[];
  species: SpeciesDoc | null;
}

/** Build one site's entries from its content files. */
export function buildJournalSite(input: JournalSiteInput): JournalSite {
  const { id, catalogue, guide, pois } = input;
  const guidePois: GuidePoi[] = pois.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    guideEntry: p.guide_entry ?? null,
    def: p,
  }));
  const guideEntries = buildGuideEntries(guide, guidePois);
  const siteEntries: JournalEntry[] = [];
  const poiEntries: JournalEntry[] = [];
  for (const g of guideEntries) {
    const linked = guidePois.filter((p) => entryIdForPoi(p, guideEntries) === g.id);
    const kind: JournalEntryKind = linked.length ? 'poi' : 'site';
    const entry: JournalEntry = {
      key: `${id}/${kind}/${g.id}`,
      siteId: id,
      kind,
      id: g.id,
      title: g.title,
      guide: g,
      poiIds: linked.map((p) => p.id),
      linkedEntryIds: [],
      recreation: linked.some((p) => p.def.reconstruction === true),
    };
    (kind === 'poi' ? poiEntries : siteEntries).push(entry);
  }
  const speciesEntries: JournalEntry[] = (input.species?.species ?? []).map((rec) => {
    const re = new RegExp(`(^|[^A-Za-z])${escapeRe(rec.scientificName)}([^A-Za-z]|$)`, 'i');
    return {
      key: `${id}/species/${rec.scientificName}`,
      siteId: id,
      kind: 'species',
      id: rec.scientificName,
      title: rec.commonName ?? rec.scientificName,
      species: rec,
      poiIds: [],
      linkedEntryIds: poiEntries
        .filter((e) => e.guide && re.test(entryText(e.guide)))
        .map((e) => e.id),
      recreation: false,
    };
  });
  const site: JournalSite = {
    id,
    name: guide?.title ?? catalogue?.name ?? input.missionTitle ?? id,
    region: catalogue?.region ?? '',
    depthM: catalogue?.depthM ?? null,
    summary: catalogue?.summary ?? '',
    facts: catalogue?.facts ?? [],
    links: catalogue?.links ?? [],
    entries: [...siteEntries, ...poiEntries, ...speciesEntries],
    poiIds: pois.map((p) => p.id),
    species: input.species,
  };
  if (guide?.memorial_note) site.memorialNote = guide.memorial_note;
  if (input.missionTitle) site.missionTitle = input.missionTitle;
  return site;
}

/** A site unlocks when any of its POIs has been scanned. */
export function isSiteUnlocked(site: JournalSite, store: DiscoveryReader): boolean {
  return site.poiIds.some((p) => store.isDiscovered(site.id, p));
}

export function isEntryUnlocked(
  site: JournalSite,
  entry: JournalEntry,
  store: DiscoveryReader,
): boolean {
  if (entry.kind === 'site') return isSiteUnlocked(site, store);
  if (entry.kind === 'poi') return entry.poiIds.some((p) => store.isDiscovered(site.id, p));
  return entry.linkedEntryIds.some((id) => {
    const e = site.entries.find((x) => x.kind === 'poi' && x.id === id);
    return !!e && e.poiIds.some((p) => store.isDiscovered(site.id, p));
  });
}

export interface SiteProgress {
  /** Site and POI entries logged / total. */
  logged: number;
  total: number;
  /** Species identified / total. */
  species: number;
  speciesTotal: number;
}

export function siteProgress(site: JournalSite, store: DiscoveryReader): SiteProgress {
  const out: SiteProgress = { logged: 0, total: 0, species: 0, speciesTotal: 0 };
  for (const e of site.entries) {
    const open = isEntryUnlocked(site, e, store);
    if (e.kind === 'species') {
      out.speciesTotal++;
      if (open) out.species++;
    } else {
      out.total++;
      if (open) out.logged++;
    }
  }
  return out;
}

/** Fetch one site's content. Never throws; missing files are empty. */
export async function loadJournalSite(
  id: string,
  catalogue: Map<string, CatalogueInfo>,
  fetchFn?: FetchJson,
): Promise<JournalSite> {
  const quiet = (): void => {};
  const [guide, pois, species, mission] = await Promise.all([
    loadGuide(id, fetchFn),
    loadPois(id, fetchFn, quiet),
    loadSpecies(id, fetchFn, quiet),
    fetchContentJson(contentUrl(id, 'mission.json'), fetchFn),
  ]);
  const input: JournalSiteInput = { id, guide, pois, species };
  const info = catalogue.get(id);
  if (info) input.catalogue = info;
  const title = isObj(mission) ? str(mission.title) : '';
  if (title) input.missionTitle = title;
  return buildJournalSite(input);
}

/** URL of the landmark catalogue. */
export const JOURNAL_CATALOGUE_URL = publicUrl('/data/landmarks.json');

/**
 * Every site with a mission (index.json order), plus `extraIds` (the current
 * dive's content folder when it is not listed, e.g. the `_test` fixture).
 */
export async function loadJournalSites(
  extraIds: readonly string[] = [],
  fetchFn?: FetchJson,
): Promise<JournalSite[]> {
  const [catDoc, indexDoc] = await Promise.all([
    fetchContentJson(JOURNAL_CATALOGUE_URL, fetchFn),
    fetchContentJson(MISSION_INDEX_URL, fetchFn),
  ]);
  const catalogue = parseJournalCatalogue(catDoc);
  const ids = parseMissionIndex(indexDoc);
  for (const id of extraIds) if (isSafeLandmarkId(id) && !ids.includes(id)) ids.push(id);
  return Promise.all(ids.map((id) => loadJournalSite(id, catalogue, fetchFn)));
}
