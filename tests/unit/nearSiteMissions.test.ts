// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { parseMission } from '../../src/game/Mission.js';
import { missionStartPose } from '../../src/game/MissionRouter.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';

const index = JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')) as {
  landmarks: string[];
};

describe('all mission near-site starts', () => {
  for (const id of index.landmarks) {
    it(`${id}: first primary is safely reachable within 60 s at Arcade cruise`, () => {
      const def = parseMission(
        JSON.parse(readFileSync(`data/landmarks/${id}/mission.json`, 'utf8')),
        id,
      )!;
      const meta = JSON.parse(readFileSync(`data/tiles/${def.tile}/meta.json`, 'utf8')) as TileMeta;
      const bytes = readFileSync(`data/tiles/${def.tile}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const at = (col: number, row: number): number =>
        heights[
          Math.max(0, Math.min(meta.rows - 1, row)) * meta.cols +
            Math.max(0, Math.min(meta.cols - 1, col))
        ]!;
      const seabed = {
        sampleHeight(x: number, z: number): number {
          const fx = (x + ((meta.cols - 1) * meta.cellsize_m_x) / 2) / meta.cellsize_m_x;
          const fz = (z + ((meta.rows - 1) * meta.cellsize_m_y) / 2) / meta.cellsize_m_y;
          const c = Math.floor(fx),
            r = Math.floor(fz),
            tx = fx - c,
            tz = fz - r;
          return (
            (at(c, r) * (1 - tx) + at(c + 1, r) * tx) * (1 - tz) +
            (at(c, r + 1) * (1 - tx) + at(c + 1, r + 1) * tx) * tz
          );
        },
      };
      const pois = placePois(
        parsePois(JSON.parse(readFileSync(`data/landmarks/${def.landmark}/pois.json`, 'utf8'))),
        meta,
        seabed,
        DEFAULT_CONFIG.scan,
        def.landmark,
      );
      const primary = def.objectives.find((o) => o.primary && pois.some((p) => p.id === o.poi))!;
      expect(primary, `${id}: missing primary POI`).toBeDefined();
      const target = pois.find((p) => p.id === primary.poi)!.position;
      const pose = missionStartPose(def, 'near-site', pois, meta, seabed, DEFAULT_CONFIG);
      if (id === 'great-blue-hole') {
        // Its first primary is at a surveyed 4 m reef flat: the hull cannot
        // fit there, so the existing outer-slope surface pose is intentional.
        const surface = missionStartPose(def, 'surface', pois, meta, seabed, DEFAULT_CONFIG);
        expect(pose).toEqual(surface);
        expect(Math.hypot(pose.x - target.x, pose.z - target.z)).toBeGreaterThan(600);
        return;
      }
      const nw = latLonToWorld(meta, meta.bbox.north, meta.bbox.west);
      const se = latLonToWorld(meta, meta.bbox.south, meta.bbox.east);
      const range = Math.hypot(pose.x - target.x, pose.z - target.z);
      const altitude = pose.y - seabed.sampleHeight(pose.x, pose.z);
      const minAltitude =
        DEFAULT_CONFIG.submarine.hullRadius +
        DEFAULT_CONFIG.submarine.seabedClearance +
        DEFAULT_CONFIG.mission.spawnClearanceM;
      const crush =
        DEFAULT_CONFIG.submarine.hullClasses[def.hull_class ?? 'B']?.crushDepth ??
        DEFAULT_CONFIG.submarine.crushDepth;
      expect(pose.x, `${id}: west/east edge`).toBeGreaterThanOrEqual(nw.x);
      expect(pose.x, `${id}: west/east edge`).toBeLessThanOrEqual(se.x);
      expect(pose.z, `${id}: north/south edge`).toBeGreaterThanOrEqual(nw.z);
      expect(pose.z, `${id}: north/south edge`).toBeLessThanOrEqual(se.z);
      expect(altitude, `${id}: seabed clearance`).toBeGreaterThanOrEqual(minAltitude - 0.01);
      expect(pose.y, `${id}: hull rating`).toBeGreaterThanOrEqual(
        crush + DEFAULT_CONFIG.submarine.hullRadius,
      );
      expect(range, `${id}: horizontal distance`).toBeGreaterThanOrEqual(349.9);
      expect(range, `${id}: horizontal distance`).toBeLessThanOrEqual(600.01);
      const travelSeconds = Math.max(range / 12, Math.abs(pose.y - target.y) / 8);
      expect(
        travelSeconds,
        `${id}: ${travelSeconds.toFixed(1)} s straight approach`,
      ).toBeLessThanOrEqual(60);
    });
  }
});
