// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/EventBus.js';
import { Mission, parseMission } from '../../src/game/Mission.js';
import type { TileMeta } from '../../src/util/types.js';

/**
 * f-mission-pacing: consecutive required (primary) objectives, in mission
 * order, must be close enough that the next target is exploration rather than
 * transit. The mission opens at the first primary (see heroMissionSpawn), so
 * only target-to-target gaps are measured.
 */
const MAX_GAP_M = 1500;

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
      expect(required.length).toBeGreaterThanOrEqual(2);
      expect(required.every(Boolean)).toBe(true);
      let worst = 0;
      for (let i = 1; i < required.length; i++)
        worst = Math.max(worst, distanceM(required[i - 1], required[i]));
      expect(worst).toBeLessThanOrEqual(MAX_GAP_M);
    });
  }
});

// Check the authored depth claims against actual survey cells, and exercise
// mission completion so making the remote target optional cannot hide a broken route.
describe('1220 terrain surveys', () => {
  for (const [site, added, optional, depthM] of [
    ['challenger-deep', 'eastern-floor', 'north-wall', 10919.8],
    ['hunga-tonga-caldera', 'flank-transect', 'caldera-floor', 292.9],
    ['hudson-canyon', 'wall-transect', 'wall', 976.7],
  ] as const) {
    it(`${site}: nearby required survey sits on real bathymetry and completes the route`, () => {
      const def = parseMission(json(`${root}/${site}/mission.json`), site)!;
      const required = def.objectives.filter((o) => o.primary);
      expect(required).toHaveLength(2);
      expect(required[1].id).toBe(added);
      expect(def.objectives.find((o) => o.id === optional)?.primary).toBe(false);
      const pois = json(`${root}/${site}/pois.json`).pois;
      const first = pois.find((p: Poi) => p.id === required[0].poi);
      const target = pois.find((p: Poi) => p.id === required[1].poi);
      expect(distanceM(first, target)).toBeLessThanOrEqual(1000);
      expect(target.snap_to_seabed).toBe(true);
      expect(target.reconstruction).toBe(false);
      expect(
        pois.find((p: Poi) => p.id === def.objectives.find((o) => o.id === optional)!.poi).primary,
      ).toBe(false);

      const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
      expect(meta.source).toBe('GMRT');
      const col = (target.lon - meta.bbox.west) / meta.cellsize_deg - 0.5;
      const row = (meta.bbox.north - target.lat) / meta.cellsize_deg - 0.5;
      expect(col).toBeCloseTo(Math.round(col), 6);
      expect(row).toBeCloseTo(Math.round(row), 6);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(meta.cols);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(meta.rows);
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const elevation = bytes.readFloatLE((Math.round(row) * meta.cols + Math.round(col)) * 4);
      expect(Math.abs(-elevation - depthM)).toBeLessThan(0.1);
      const guide = json(`${root}/${site}/guide.json`).entries.find(
        (e: { id: string }) => e.id === target.guide_entry,
      );
      expect(guide.reconstruction).toBe(false);
      expect(guide.facts).toContainEqual({
        label: 'Depth here (this tile)',
        value: `${depthM.toLocaleString('en-US', { minimumFractionDigits: 1 })} m`,
      });

      const bus = new EventBus();
      const mission = new Mission({ def, bus });
      try {
        mission.resolve(pois.map((p: Poi) => p.id));
        mission.start(site);
        for (const objective of required)
          bus.emit('scan:complete', { poiId: objective.poi, landmarkId: site, firstTime: true });
        expect(mission.primaryComplete).toBe(true);
        expect(mission.allComplete).toBe(false);
        expect(mission.state).toBe('primaries-complete');
        expect(mission.end()).toBe(true);
        expect(mission.emitted.filter((e) => e.name === 'mission:complete')).toHaveLength(1);
      } finally {
        mission.dispose();
      }
    });
  }
});
