// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * f-mission-pacing: consecutive required (primary) objectives, in mission
 * order, must be close enough that the next target is exploration rather than
 * transit. The mission opens at the first primary (see heroMissionSpawn), so
 * only target-to-target gaps are measured.
 */
const MAX_GAP_M = 1500;
/** Known debt: sites not yet re-paced. Each cap may only shrink. */
const KNOWN_LONG_GAPS: Record<string, number> = {
  'challenger-deep': 4200,
  'hudson-canyon': 2900,
  'hunga-tonga-caldera': 3400,
};

interface Poi {
  id: string;
  lat: number;
  lon: number;
}
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const distanceM = (a: Poi, b: Poi): number => {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6371000;
};

const root = 'data/landmarks';
const sites: string[] = readdirSync(root).filter(
  (d: string) => !d.startsWith('_') && existsSync(`${root}/${d}/mission.json`),
);

describe('mission pacing: required-target gaps', () => {
  it('finds the shipped sites', () => {
    expect(sites.length).toBeGreaterThanOrEqual(13);
  });
  for (const site of sites) {
    it(`${site}: consecutive required targets stay within range`, () => {
      const mission = json(`${root}/${site}/mission.json`);
      const pois = new Map<string, Poi>(
        json(`${root}/${site}/pois.json`).pois.map((p: Poi) => [p.id, p]),
      );
      const required = mission.objectives
        .filter((o: { primary: boolean }) => o.primary)
        .map((o: { poi: string }) => pois.get(o.poi));
      expect(required.every(Boolean)).toBe(true);
      let worst = 0;
      for (let i = 1; i < required.length; i++)
        worst = Math.max(worst, distanceM(required[i - 1], required[i]));
      expect(worst).toBeLessThanOrEqual(KNOWN_LONG_GAPS[site] ?? MAX_GAP_M);
      if (KNOWN_LONG_GAPS[site]) expect(worst).toBeGreaterThan(MAX_GAP_M);
    });
  }
});
