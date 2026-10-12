/**
 * What the Journal's "About this site" disclosure lists: the mission briefing's
 * and the catalogue's facts merged without repeats, and the briefing's hazards
 * without the hull-rating line (the dive meta already states it).
 */

import type { JournalSite } from '../game/JournalData.js';

export interface AboutLists {
  /** The mission overview, when the page's summary is something else. */
  overview: string;
  facts: string[];
  hazards: string[];
}

/** A sentence that only restates the hull's rated depth. */
const HULL_RATING = /\bhull\b[^.]*\b(rated|rating)\b|\brated depth\b|\bhull warning\b/i;

/** Split on sentence ends, not on the "." of "6.5 km" or a number's comma (no lookbehind: older iOS). */
const sentences = (text: string): string[] =>
  text.replace(/([.!?])\s+(?=[A-Z])/g, '$1\u0000').split('\u0000');

/** The line without its hull-rating sentences; '' when nothing else is left. */
export function withoutHullRating(text: string): string {
  return sentences(text)
    .filter((s) => !HULL_RATING.test(s))
    .join(' ')
    .trim();
}

const STOP = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'was',
  'were',
  'with',
]);

function words(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().split(/[^a-z0-9]+/)) if (w && !STOP.has(w)) out.add(w);
  return out;
}

/** True when one line says what the other says (most of the shorter one's words are shared). */
function sameFact(a: Set<string>, b: Set<string>): boolean {
  const small = a.size <= b.size ? a : b;
  const large = small === a ? b : a;
  if (small.size < 4) return false;
  let shared = 0;
  for (const w of small) if (large.has(w)) shared++;
  return shared / small.size >= 0.7;
}

/** The lines in order, skipping blanks and any that repeat an earlier line. */
export function uniqueLines(lines: readonly string[]): string[] {
  const kept: string[] = [];
  const keptWords: Array<Set<string>> = [];
  for (const raw of lines) {
    const line = raw.trim().replace(/\s+/g, ' ');
    if (!line) continue;
    const w = words(line);
    if (keptWords.some((k) => sameFact(k, w))) continue;
    kept.push(line);
    keptWords.push(w);
  }
  return kept;
}

/**
 * The site's facts (briefing first, as it is the verified overview) and hazards.
 * `catalogue` includes the catalogue facts, which stay hidden until the site opens;
 * `shown` is the summary the page already shows, so the overview is not said twice.
 */
export function aboutLists(site: JournalSite, catalogue: boolean, shown = ''): AboutLists {
  const strip = (items: readonly string[]): string[] =>
    items.map(withoutHullRating).filter(Boolean);
  const facts = strip([...(site.briefing?.facts ?? []), ...(catalogue ? site.facts : [])]);
  const hazards = strip(site.briefing?.hazards ?? []);
  const overview = site.briefing?.summary ?? '';
  const repeat = uniqueLines([shown, overview]).length < (shown.trim() ? 2 : 1);
  return {
    overview: repeat ? '' : overview,
    facts: uniqueLines(facts),
    hazards: uniqueLines(hazards),
  };
}

/** The terrain data credit for a tile source, or null when none is owed. */
export interface DataCredit {
  label: string;
  links: ReadonlyArray<readonly [text: string, href: string]>;
}

export function dataCreditFor(source: string | undefined): DataCredit | null {
  if (source !== 'GMRT') return null;
  return {
    label: 'Seabed data',
    links: [
      ['GMRT Synthesis', 'https://www.gmrt.org/'],
      ['Ryan et al. (2009)', 'https://doi.org/10.1029/2008GC002332'],
      ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
    ],
  };
}
