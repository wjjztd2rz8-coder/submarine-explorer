import { describe, expect, it } from 'vitest';
import type { DebriefStats } from '../../src/game/Objectives.js';
import { summarizeDive } from '../../src/ui/Debrief.js';

const empty: DebriefStats = {
  elapsedS: 60,
  distanceM: 100,
  maxDepthM: 4000,
  discoveries: [],
  newEntries: [],
};
const scanned: DebriefStats = {
  ...empty,
  discoveries: [
    { poiId: 'bow', name: 'Bow section' },
    { poiId: 'stern', name: 'Stern section' },
  ],
  newEntries: [{ id: 'bow', title: 'The bow' }],
  objectives: { completed: 1, total: 4 },
};

describe('compact dive summary', () => {
  it('gives an unscanned dive a warm highlight and a concrete scan instruction', () => {
    expect(summarizeDive(empty)).toEqual({
      highlight: 'The site is waiting for your first scan.',
      next: 'Face a target and hold Scan.',
      kind: null,
    });
  });
  it('names the latest discovery despite earlier scans and new Journal entries', () => {
    expect(summarizeDive(scanned, { stars: 0, points: 40, best: 0 })).toEqual({
      highlight: 'Scanned Stern section.',
      next: 'Keep exploring to finish the primary objectives.',
      kind: 'discoveries',
    });
  });
  it.each([
    ['life:coral', 'Golden coral'],
    ['secret:frame', 'Buried steel frame'],
    ['sample:mud', 'Sediment core'],
  ])('can name a most recent %s discovery after a mission scan', (poiId, name) => {
    expect(
      summarizeDive({
        ...scanned,
        discoveries: [...scanned.discoveries, { poiId, name }],
      }).highlight,
    ).toBe(`Scanned ${name}.`);
  });
  it.each([
    [1, 'Finish the optional objectives for 2 stars; some are a long transit away.'],
    [2, 'Take a photo or scan a species for 3 stars.'],
    [3, 'Try another dive site.'],
  ])('suggests the next step for a %s-star dive', (stars, next) => {
    expect(summarizeDive(scanned, { stars, points: 80, best: stars }).next).toBe(next);
    // Existing objectives can carry over to a return dive with no fresh scans.
    expect(summarizeDive(empty, { stars, points: 0, best: stars }).next).toBe(next);
  });
  it('uses the Journal as the next step on a free dive with a scan', () => {
    expect(summarizeDive({ ...scanned, objectives: undefined }).next).toBe(
      'Open the Journal to read your finds.',
    );
  });
  it.each([
    ['secrets', 'Found Hidden marker.'],
    ['events', 'Witnessed Hidden marker.'],
    ['samples', 'Found Hidden marker.'],
  ] as const)('highlights an exploration %s when there are no scans', (kind, highlight) => {
    const result = summarizeDive(empty, undefined, {
      found: 1,
      total: 3,
      secrets: [],
      samples: [],
      events: [],
      [kind]: ['Hidden marker', 'Another find'],
    });
    expect(result.highlight).toBe(highlight);
    expect(result.kind).toBe(kind);
  });
  it('keeps an aborted dive cause and gives one recovery suggestion', () => {
    expect(
      summarizeDive({
        ...scanned,
        subtitle: 'Hull failure at 1,180 m · emergency ascent completed · 1 of 4 objectives · 0:05',
      }),
    ).toEqual({
      highlight: 'Hull failure at 1,180 m.',
      next: 'Try a shallower route or a stronger hull.',
      kind: null,
    });
    expect(
      summarizeDive({ ...empty, subtitle: 'Supplies exhausted · safe ascent completed' }),
    ).toEqual({
      highlight: 'Supplies exhausted · safe ascent completed.',
      next: 'Refill supplies before diving again.',
      kind: null,
    });
  });
});
