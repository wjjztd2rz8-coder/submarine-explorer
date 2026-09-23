/**
 * Survey species list: `data/landmarks/<id>/species.json`
 * (plan/PHASE-C-CONTRACTS.md §3). Produced by `tools/obis_export.py` from OBIS
 * occurrence records inside the tile bbox; the field guide's SPECIES tab
 * renders it. The file name can be overridden by `mission.json.species_file`.
 *
 * Untrusted and optional like every content file: a missing, HTML (SPA
 * fallback) or malformed file yields an empty list, never a throw. Species
 * placement in the game is invented, so the disclaimer is always shown even
 * when a file's own `note` forgets to say so.
 */

import { contentUrl, fetchContentJson, isSafeLandmarkId, type FetchJson } from './ContentPath.js';
import { safeUrl } from './Guide.js';

export interface SpeciesRecord {
  scientificName: string;
  commonName?: string;
  aphiaID?: number;
  /** OBIS occurrence records aggregated under this name. */
  records: number;
  /** [shallowest, deepest] positive metres, when the records carry depth. */
  depthRange_m?: [number, number];
  group?: string;
}

export interface SpeciesDoc {
  version: number;
  landmark: string;
  source: string;
  source_url?: string;
  fetched_at?: string;
  depth_filter_m?: [number, number];
  note: string;
  /** Sorted by record count, most first. */
  species: SpeciesRecord[];
}

/** Appended when a file's note does not already say placement is invented. */
export const SPECIES_DISCLAIMER =
  'Occurrence records from the survey area; placement of animals in the game is invented.';

/** Home page used when a file has no (safe) `source_url`. */
export const OBIS_HOME_URL = 'https://obis.org/';

export type SpeciesWarn = (message: string) => void;
const defaultWarn: SpeciesWarn = (m) => console.warn(`[species] ${m}`);

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

function range(v: unknown): [number, number] | undefined {
  if (!Array.isArray(v) || v.length !== 2 || !isNum(v[0]) || !isNum(v[1])) return undefined;
  const a = Math.abs(v[0]);
  const b = Math.abs(v[1]);
  return a <= b ? [a, b] : [b, a];
}

/** An empty list for a landmark (missing file). */
export function emptySpecies(landmarkId: string): SpeciesDoc {
  return {
    version: 1,
    landmark: landmarkId,
    source: 'OBIS',
    note: SPECIES_DISCLAIMER,
    species: [],
  };
}

/** The note shown under the list: the file's own, plus the disclaimer if it lacks one. */
export function speciesNote(note: string | undefined): string {
  if (!note) return SPECIES_DISCLAIMER;
  return /invented/i.test(note) ? note : `${note} ${SPECIES_DISCLAIMER}`;
}

/**
 * Validate a parsed species.json. Malformed species rows are dropped (warned
 * once per file, not per row); duplicates by scientific name keep the first.
 */
export function parseSpecies(
  doc: unknown,
  landmarkId: string,
  warn: SpeciesWarn = defaultWarn,
): SpeciesDoc {
  if (!isObj(doc)) {
    warn(`${landmarkId}: species.json is not an object; showing no species`);
    return emptySpecies(landmarkId);
  }
  const rows = Array.isArray(doc.species) ? doc.species : [];
  const species: SpeciesRecord[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const raw of rows) {
    const name = isObj(raw) ? str(raw.scientificName) : undefined;
    if (!isObj(raw) || !name) {
      dropped++;
      continue;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    const rec: SpeciesRecord = {
      scientificName: name,
      records: isNum(raw.records) && raw.records > 0 ? Math.round(raw.records) : 0,
    };
    const common = str(raw.commonName);
    if (common) rec.commonName = common;
    if (isNum(raw.aphiaID) && raw.aphiaID > 0) rec.aphiaID = Math.round(raw.aphiaID);
    const depth = range(raw.depthRange_m);
    if (depth) rec.depthRange_m = depth;
    const group = str(raw.group);
    if (group) rec.group = group;
    species.push(rec);
  }
  if (dropped) warn(`${landmarkId}: ${dropped} species row(s) without a scientificName skipped`);
  species.sort((a, b) => b.records - a.records || a.scientificName.localeCompare(b.scientificName));

  const out: SpeciesDoc = {
    version: isNum(doc.version) ? doc.version : 1,
    landmark: str(doc.landmark) ?? landmarkId,
    source: str(doc.source) ?? 'OBIS',
    note: speciesNote(str(doc.note)),
    species,
  };
  const url = safeUrl(doc.source_url);
  if (url) out.source_url = url;
  const fetched = str(doc.fetched_at);
  if (fetched) out.fetched_at = fetched;
  const filter = range(doc.depth_filter_m);
  if (filter) out.depth_filter_m = filter;
  return out;
}

/** A species file name from mission.json: a plain `*.json` in the same folder. */
export function safeSpeciesFile(v: unknown): string | null {
  const s = str(v);
  if (!s || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,63}\.json$/.test(s) || s.includes('..')) return null;
  return s;
}

/**
 * Load a landmark's species list. Reads `mission.json.species_file` when the
 * landmark has a mission (default `species.json`). Never throws; a missing
 * file is an empty list.
 */
export async function loadSpecies(
  landmarkId: string,
  fetchFn?: FetchJson,
  warn: SpeciesWarn = defaultWarn,
): Promise<SpeciesDoc> {
  if (!isSafeLandmarkId(landmarkId)) return emptySpecies(landmarkId);
  const mission = await fetchContentJson(contentUrl(landmarkId, 'mission.json'), fetchFn);
  let file = 'species.json';
  if (isObj(mission) && mission.species_file !== undefined) {
    const f = safeSpeciesFile(mission.species_file);
    if (f) file = f;
    else
      warn(
        `${landmarkId}: mission.json species_file is not a plain .json name; using species.json`,
      );
  }
  const doc = await fetchContentJson(contentUrl(landmarkId, file), fetchFn);
  return doc === null ? emptySpecies(landmarkId) : parseSpecies(doc, landmarkId, warn);
}

/** OBIS taxon page for a record, when it carries an AphiaID. */
export function obisTaxonUrl(rec: SpeciesRecord): string | undefined {
  return rec.aphiaID ? `https://obis.org/taxon/${rec.aphiaID}` : undefined;
}

export function formatDepthRange(r: [number, number] | undefined): string {
  if (!r) return '—';
  const f = (m: number): string => Math.round(m).toLocaleString('en-US');
  return r[0] === r[1] ? `${f(r[0])} m` : `${f(r[0])}–${f(r[1])} m`;
}
