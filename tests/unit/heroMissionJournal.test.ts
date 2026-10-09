// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { isEntryUnlocked, loadJournalSite } from '../../src/game/JournalData.js';
import { parseMission } from '../../src/game/Mission.js';

it.each([
  ['great-blue-hole', 'stalactites', 'the-hole', 'stalactite gallery'],
  ['monterey-canyon', 'canyon-wall', 'canyon-wall', 'north wall'],
])(
  '%s Journal resolves the new first primary and names it in its mission summary',
  async (site, objective, entryId, subject) => {
    const mission = parseMission(
      JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8')),
      site,
    )!;
    const journal = await loadJournalSite(site, new Map(), async (url) => {
      try {
        const text = readFileSync(url.replace(/^\//, ''), 'utf8');
        return { ok: true, text: async () => text };
      } catch {
        return { ok: false, status: 404, text: async () => '' };
      }
    });
    const first = mission.objectives.find((o) => o.primary)!;
    expect(first.id).toBe(objective);
    expect(journal.briefing!.summary).toContain(subject);
    const entry = journal.entries.find((e) => e.id === entryId)!;
    expect(entry.poiIds).toContain(first.poi);
    const store = new DiscoveryStore(null);
    expect(isEntryUnlocked(journal, entry, store)).toBe(false);
    store.record(site, first.poi);
    expect(isEntryUnlocked(journal, entry, store)).toBe(true);
  },
);
