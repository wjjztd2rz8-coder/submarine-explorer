// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { siteIds } from '../content.js';

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

describe('guide facts', () => {
  it('finds the shipped sites', () => {
    expect(siteIds.length).toBeGreaterThan(0);
  });

  for (const site of siteIds) {
    it(`${site}: no two entries share a fact`, () => {
      const guide = JSON.parse(readFileSync(`data/landmarks/${site}/guide.json`, 'utf8')) as {
        entries: { id: string; fact?: string }[];
      };
      const seen = new Map<string, string>();
      const repeats: string[] = [];
      for (const e of guide.entries) {
        if (!e.fact) continue;
        const key = norm(e.fact);
        const first = seen.get(key);
        if (first) repeats.push(`${first} = ${e.id}`);
        else seen.set(key, e.id);
      }
      expect(repeats).toEqual([]);
    });

    it(`${site}: no two points of interest resolve to the same fact`, () => {
      const guide = JSON.parse(readFileSync(`data/landmarks/${site}/guide.json`, 'utf8')) as {
        entries: { id: string; fact?: string }[];
      };
      const pois = JSON.parse(readFileSync(`data/landmarks/${site}/pois.json`, 'utf8')) as {
        pois: { id: string; guide_entry: string }[];
      };
      const facts = new Map(guide.entries.map((e) => [e.id, e.fact ? norm(e.fact) : '']));
      const seen = new Map<string, string>();
      const repeats: string[] = [];
      for (const p of pois.pois) {
        const key = facts.get(p.guide_entry);
        if (!key) continue;
        const first = seen.get(key);
        if (first) repeats.push(`${first} = ${p.id}`);
        else seen.set(key, p.id);
      }
      expect(repeats).toEqual([]);
    });
  }
});
