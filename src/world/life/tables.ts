/**
 * Spawn tables and Journal text: `data/life/life.json`. Loading is optional
 * and never throws (a missing or malformed file means no animals); rows that
 * name an unknown species or carry impossible numbers are dropped.
 *
 * The selection helpers here are pure so tests can pin them down:
 *  - {@link bandOverlap} / {@link inBand}: depth bands (positive metres);
 *  - {@link buildEntries}: a site's table resolved against the catalogue;
 *  - {@link pickActiveSpecies}: which species may be on screen at a depth,
 *    capped by the tier's draw-call budget, charismatic species first.
 */

import { fetchContentJson, type FetchJson } from '../../game/ContentPath.js';
import { publicUrl } from '../../util/publicUrl.js';
import { SPECIES_BY_ID } from './catalogue.js';
import type {
  LifeDoc,
  LifeJournalEntry,
  RareRule,
  SiteTable,
  SpawnEntry,
  SpeciesDef,
} from './types.js';

export const LIFE_DOC_URL = publicUrl('/data/life/life.json');

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function band(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2 || !isNum(v[0]) || !isNum(v[1])) return null;
  const a = Math.max(0, Math.min(v[0], v[1]));
  const b = Math.max(v[0], v[1]);
  return b > 0 ? [a, b] : null;
}

function countRange(v: unknown, fallback: [number, number]): [number, number] {
  const b = band(v);
  if (!b) return fallback;
  return [Math.max(1, Math.round(b[0])), Math.max(1, Math.round(b[1]))];
}

/** A resolved spawn row: the table entry plus its catalogue species. */
export interface SpawnRow {
  /** Index in the site's table (a stable key for group bookkeeping). */
  index: number;
  entry: SpawnEntry;
  def: SpeciesDef;
}

export function parseLifeDoc(raw: unknown): LifeDoc {
  const doc: LifeDoc = { version: 1, species: {}, sites: {} };
  if (!isObj(raw)) return doc;
  const species = isObj(raw.species) ? raw.species : {};
  for (const [id, v] of Object.entries(species)) {
    if (!isObj(v) || !SPECIES_BY_ID.has(id)) continue;
    const text = str(v.text);
    if (!text) continue;
    const entry: LifeJournalEntry = {
      text,
      sourceTitle: str(v.sourceTitle) || 'Source',
      sourceUrl: str(v.sourceUrl),
    };
    if (isObj(v.facts)) {
      const facts: Record<string, string> = {};
      for (const [k, val] of Object.entries(v.facts)) if (str(val)) facts[k] = str(val);
      if (Object.keys(facts).length) entry.facts = facts;
    }
    doc.species[id] = entry;
  }
  const sites = isObj(raw.sites) ? raw.sites : {};
  for (const [siteId, v] of Object.entries(sites)) {
    if (!isObj(v)) continue;
    const spawns: SpawnEntry[] = [];
    for (const row of Array.isArray(v.spawns) ? v.spawns : []) {
      if (!isObj(row)) continue;
      const id = str(row.species);
      const depth = band(row.depth);
      if (!SPECIES_BY_ID.has(id) || !depth || !isNum(row.weight) || row.weight <= 0) continue;
      const e: SpawnEntry = {
        species: id,
        weight: row.weight,
        depth,
        group: countRange(row.group, [1, 1]),
      };
      if (row.star === true) e.star = true;
      spawns.push(e);
    }
    const table: SiteTable = { spawns };
    if (isObj(v.rare)) {
      const r = v.rare;
      const id = str(r.species);
      const depth = band(r.depth);
      if (SPECIES_BY_ID.has(id) && depth && isNum(r.chancePerMin) && r.chancePerMin > 0) {
        const rule: RareRule = {
          species: id,
          depth,
          chancePerMin: r.chancePerMin,
          cooldownS: isNum(r.cooldownS) ? Math.max(30, r.cooldownS) : 300,
          pass: r.pass === 'overhead' ? 'overhead' : 'level',
        };
        if (r.group !== undefined) rule.group = countRange(r.group, [1, 1]);
        table.rare = rule;
      }
    }
    doc.sites[siteId] = table;
  }
  return doc;
}

let docPromise: Promise<LifeDoc> | null = null;

/** Fetch and parse `life.json` once per page. Never rejects. */
export function loadLifeDoc(fetchFn?: FetchJson): Promise<LifeDoc> {
  if (fetchFn) return fetchContentJson(LIFE_DOC_URL, fetchFn).then(parseLifeDoc);
  docPromise ??= fetchContentJson(LIFE_DOC_URL).then(parseLifeDoc);
  return docPromise;
}

/** Overlap of two positive-metre bands, or null when disjoint. */
export function bandOverlap(
  a: readonly [number, number],
  b: readonly [number, number],
): [number, number] | null {
  const lo = Math.max(a[0], b[0]);
  const hi = Math.min(a[1], b[1]);
  return lo <= hi ? [lo, hi] : null;
}

export const inBand = (depth: number, b: readonly [number, number], margin = 0): boolean =>
  depth >= b[0] - margin && depth <= b[1] + margin;

/** The band an entry may use: its own, inside the species' own. */
export function entryBand(row: SpawnRow): [number, number] | null {
  return bandOverlap(row.entry.depth, row.def.depth);
}

/** A site's table resolved against the catalogue (unknown species dropped). */
export function buildEntries(table: SiteTable | undefined): SpawnRow[] {
  const rows: SpawnRow[] = [];
  (table?.spawns ?? []).forEach((entry, index) => {
    const def = SPECIES_BY_ID.get(entry.species);
    if (def && !def.rare) rows.push({ index, entry, def });
  });
  return rows;
}

/** True for animals that live on or close to the seabed rather than in open water. */
export function isBedBound(def: SpeciesDef): boolean {
  return (
    def.archetype === 'hover' ||
    def.archetype === 'swarm' ||
    (def.archetype === 'cephalopod' && def.altitude !== undefined)
  );
}

/** True for animals placed by stable grid cell (rooted or very slow crawlers). */
export function isCellBound(def: SpeciesDef): boolean {
  return def.archetype === 'sessile' || def.archetype === 'crawler';
}

/** Priority: charismatic first, then the more abundant, then table order. */
export function priority(row: SpawnRow): number {
  return (row.entry.star ? 100 : 0) + row.entry.weight - row.index * 1e-3;
}

/**
 * Which species may appear when the sub is at `depthM` (positive metres)
 * and animals up to `reachM` above or below it are in view. Rows whose
 * band does not come within reach are out; then the budget keeps the first
 * `maxSpecies` by priority, with species that are already on screen always
 * kept (so a fish never vanishes because a new neighbour outranks it).
 */
export function pickActiveSpecies(
  rows: readonly SpawnRow[],
  depthM: number,
  reachM: number,
  maxSpecies: number,
  live: ReadonlySet<string> = new Set(),
): SpawnRow[] {
  const reach = rows.filter((r) => {
    const b = entryBand(r);
    return b !== null && inBand(depthM, b, reachM);
  });
  reach.sort((a, b) => priority(b) - priority(a));
  const out: SpawnRow[] = [];
  const seen = new Set<string>();
  for (const r of reach) {
    if (live.has(r.def.id) && !seen.has(r.def.id)) {
      out.push(r);
      seen.add(r.def.id);
    }
  }
  for (const r of reach) {
    if (seen.has(r.def.id)) continue;
    if (seen.size >= maxSpecies) break;
    out.push(r);
    seen.add(r.def.id);
  }
  return out;
}

/**
 * Per-cell chance that a patch of this entry roots in a grid cell. `weight`
 * is the number of patches wanted inside the spawn disc, so the chance is
 * that share of the disc's cells.
 */
export function cellChance(weight: number, density: number, cell: number, radius: number): number {
  return clampUnit((weight * density * cell * cell) / (Math.PI * radius * radius));
}

const clampUnit = (v: number): number => Math.min(1, Math.max(0, v));
