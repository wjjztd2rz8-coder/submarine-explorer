// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { chooseFreeDiveHull, composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

const site = 'great-blue-hole';
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const measurements: unknown[] = [];
afterAll(() => {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.BLUEHOLE_OPENING_AUDIT === '1')
    writeFileSync(
      '.cache/bluehole-opening-measurements.json',
      JSON.stringify(measurements, null, 2) + '\n',
    );
});

describe('770 Blue Hole opening on actual terrain and procedural scenery', () => {
  for (const tier of ['low', 'medium'] as const) {
    it(`${tier}: first scan is within 110 m, ready to reward and safely framed`, async () => {
      const config = makeConfig();
      const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      const settings = spawnSettings(config);
      const hull = chooseFreeDiveHull(
        config.submarine.hullClasses,
        meta.min_m,
        config.submarine.freeDiveHullMarginM,
      )!;
      const poiDoc = json(`data/landmarks/${site}/pois.json`);
      const pois = placePois(parsePois(poiDoc), meta, terrain, config.scan, site);
      try {
        await props.load('props.json', site, async () => json(`data/landmarks/${site}/props.json`));
        expect(props.stats.failed).toBe(0);
        for (const mode of ['arcade', 'realistic', 'custom'] as const) {
          const pose = composedFreeDiveSpawn(
            site,
            meta,
            terrain,
            props,
            settings,
            hull.hull.ratedDepth,
            config.camera,
            mode,
          )!;
          expect(pose).not.toBeNull();
          const position = new Vector3(pose.x, pose.y, pose.z);
          const forward = new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
          const scanner = new Scanner(config.scan, new EventBus());
          scanner.setTargets(pois);
          scanner.update(0, position, forward, false);
          expect(scanner.view.nearestId).toBe('great-blue-hole-stalactites');
          expect(scanner.view.nearestDistance).toBeLessThanOrEqual(110);
          expect(scanner.view.nearestInRange).toBe(true);
          expect(scanner.view.candidateId).toBe(scanner.view.nearestId);
          const first = pois.find((p) => p.id === scanner.view.nearestId)!;
          const authored = poiDoc.pois.find((p: { id: string }) => p.id === first.id);
          const entry = json(`data/landmarks/${site}/guide.json`).entries.find(
            (e: { id: string }) => e.id === authored.guide_entry,
          );
          expect(authored.reconstruction).toBe(true);
          expect(entry.reconstruction).toBe(true);
          for (const aspect of [390 / 844, 844 / 390, 16 / 9]) {
            const rig = new CameraRig(config.camera, aspect, terrain);
            rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
            rig.snap(position, pose.yaw, 0);
            expect(
              rig.camera.position.y -
                terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z),
            ).toBeGreaterThanOrEqual(config.camera.terrainClearance - 1e-6);
            expect(rig.camera.position.y).toBeLessThanOrEqual(-config.camera.surfaceClearance);
            rig.camera.updateMatrixWorld();
            const screen = first.position.clone().project(rig.camera);
            expect(Math.abs(screen.x)).toBeLessThan(0.9);
            expect(Math.abs(screen.y)).toBeLessThan(0.9);
            expect(screen.z).toBeGreaterThan(-1);
            expect(screen.z).toBeLessThan(1);
          }
          expect(props.collide(position.clone(), settings.hullRadius + 4, new Vector3())).toBe(
            false,
          );
          expect(pose.y).toBeGreaterThanOrEqual(hull.hull.ratedDepth + settings.hullRadius);
          expect(pose.y - terrain.sampleHeight(pose.x, pose.z)).toBeGreaterThanOrEqual(
            settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM - 1e-6,
          );
          scanner.update(first.scanSeconds, position, forward, true);
          expect(scanner.view.completed).toBe(1);
          expect(scanner.view.lastCompleteId).toBe(first.id);
          measurements.push({
            tier,
            mode,
            firstTarget: first.id,
            distance: position.distanceTo(first.position),
            pose,
          });
        }
      } finally {
        terrain.dispose();
      }
    });
  }
});
