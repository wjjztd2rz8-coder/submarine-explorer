/**
 * Field-guide content: `data/landmarks/<landmark>/guide.json`
 * (plan/PHASE-B-CONTRACTS.md §2.2). B2 authors it; the {@link FieldGuide}
 * overlay renders it. Untrusted and optional, like every content file.
 */

import { contentUrl, fetchContentJson, type FetchJson } from './ContentPath.js';
import { publicUrl } from '../util/publicUrl.js';
import type { Confidence } from './Pois.js';

export interface GuideFact {
  label: string;
  value: string;
}

export interface GuideSource {
  title: string;
  url?: string;
}

export interface GuideImage {
  url: string;
  credit?: string;
  license?: string;
  alt?: string;
}

export interface GuideEntry {
  id: string;
  title: string;
  paragraphs: string[];
  facts: GuideFact[];
  image?: GuideImage;
  reconstruction: boolean;
  sources: GuideSource[];
  confidence?: Confidence;
}

export interface GuideDoc {
  version: number;
  landmark: string;
  /** Optional display name for the site (B1 extension; unknown keys are ignored elsewhere). */
  title?: string;
  memorial_note?: string;
  entries: GuideEntry[];
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s !== '') : [];
}

/** Only http(s) and site-relative URLs are ever put into an href/src. */
export function safeUrl(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/') && !s.startsWith('//') && !/[\\\u0000-\u001f]/.test(s)) {
    return publicUrl(s);
  }
  return undefined;
}

function parseEntry(raw: unknown): GuideEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const facts: GuideFact[] = [];
  if (Array.isArray(o.facts)) {
    for (const f of o.facts) {
      if (typeof f !== 'object' || f === null) continue;
      const fo = f as Record<string, unknown>;
      const label = str(fo.label);
      const value = typeof fo.value === 'number' ? String(fo.value) : str(fo.value);
      if (label && value) facts.push({ label, value });
    }
  }
  const sources: GuideSource[] = [];
  if (Array.isArray(o.sources)) {
    for (const s of o.sources) {
      // Accept a bare URL string as well as { title, url }.
      if (typeof s === 'string') {
        const url = safeUrl(s);
        sources.push(url ? { title: s, url } : { title: s });
        continue;
      }
      if (typeof s !== 'object' || s === null) continue;
      const so = s as Record<string, unknown>;
      const url = safeUrl(so.url);
      const title = str(so.title) ?? url;
      if (title) sources.push(url ? { title, url } : { title });
    }
  }
  const entry: GuideEntry = {
    id,
    title: str(o.title) ?? id,
    paragraphs: strList(o.paragraphs),
    facts,
    reconstruction: o.reconstruction === true,
    sources,
  };
  if (typeof o.image === 'object' && o.image !== null) {
    const io = o.image as Record<string, unknown>;
    const url = safeUrl(io.url);
    if (url) {
      const image: GuideImage = { url };
      const credit = str(io.credit);
      const license = str(io.license);
      const alt = str(io.alt);
      if (credit) image.credit = credit;
      if (license) image.license = license;
      if (alt) image.alt = alt;
      entry.image = image;
    }
  }
  const c = o.confidence;
  if (c === 'high' || c === 'medium' || c === 'low') entry.confidence = c;
  return entry;
}

/** Validate a parsed `guide.json`. Returns null if it has no usable shape. */
export function parseGuide(doc: unknown, landmarkId: string): GuideDoc | null {
  if (typeof doc !== 'object' || doc === null) return null;
  const o = doc as Record<string, unknown>;
  if (!Array.isArray(o.entries)) return null;
  const entries: GuideEntry[] = [];
  const seen = new Set<string>();
  for (const raw of o.entries) {
    const e = parseEntry(raw);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      entries.push(e);
    }
  }
  const out: GuideDoc = {
    version: typeof o.version === 'number' ? o.version : 1,
    landmark: str(o.landmark) ?? landmarkId,
    entries,
  };
  const title = str(o.title);
  if (title) out.title = title;
  const note = str(o.memorial_note);
  if (note) out.memorial_note = note;
  return out;
}

/** Fetch and validate `guide.json`. Never throws; missing = null. */
export async function loadGuide(landmarkId: string, fetchFn?: FetchJson): Promise<GuideDoc | null> {
  const doc = await fetchContentJson(contentUrl(landmarkId, 'guide.json'), fetchFn);
  return doc === null ? null : parseGuide(doc, landmarkId);
}

/** The POI fields the guide needs (`PlacedPoi` satisfies it). */
export interface GuidePoi {
  id: string;
  name: string;
  kind: string;
  guideEntry: string | null;
  def: { reconstruction?: boolean; confidence?: Confidence; sources?: string[] };
}

/**
 * The entries the field guide lists: every `guide.json` entry, in file order,
 * then a minimal stand-in for each POI whose `guide_entry` is missing or does
 * not resolve, so every scan target still has something to unlock. Stand-ins
 * use the POI id as the entry id.
 */
export function buildGuideEntries(guide: GuideDoc | null, pois: GuidePoi[]): GuideEntry[] {
  const entries = [...(guide?.entries ?? [])];
  const ids = new Set(entries.map((e) => e.id));
  for (const p of pois) {
    if (p.guideEntry && ids.has(p.guideEntry)) continue;
    if (ids.has(p.id)) continue;
    ids.add(p.id);
    const sources: GuideSource[] = (p.def.sources ?? []).map((s) => {
      const url = safeUrl(s);
      return url ? { title: s, url } : { title: s };
    });
    const stub: GuideEntry = {
      id: p.id,
      title: p.name,
      paragraphs: [],
      facts: [{ label: 'Kind', value: p.kind }],
      reconstruction: p.def.reconstruction === true,
      sources,
    };
    if (p.def.confidence) stub.confidence = p.def.confidence;
    entries.push(stub);
  }
  return entries;
}

/** Which guide entry a POI unlocks: its `guide_entry` if it exists, else its stand-in. */
export function entryIdForPoi(poi: GuidePoi, entries: GuideEntry[]): string {
  if (poi.guideEntry && entries.some((e) => e.id === poi.guideEntry)) return poi.guideEntry;
  return poi.id;
}
