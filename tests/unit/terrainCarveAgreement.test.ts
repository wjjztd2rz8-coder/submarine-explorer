// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { MONTEREY_FIDELITY } from '../../src/core/config/terrain.js';
import { EventBus } from '../../src/core/EventBus.js';
import { castSonarRay } from '../../src/audio/Sonar.js';
import { composedFreeDiveSpawn, spawnHeight, spawnSettings } from '../../src/game/Spawn.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { terrainCarveFor } from '../../src/world/terrainFeatures.js';
import { placeCell } from '../../src/world/scatter/ScatterPlacement.js';
import { SCATTER_TYPES } from '../../src/world/scatter/ScatterTypes.js';
import type { ScatterKind } from '../../src/world/TerrainBiome.js';
import type { TileMeta } from '../../src/util/types.js';
import { makeSyntheticTile } from './helpers.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const audit: unknown[] = [];
afterAll(() => {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.CARVE_AUDIT === '1') {
    mkdirSync('.cache/verify920', { recursive: true });
    writeFileSync('.cache/verify920/surfaces.json', JSON.stringify(audit, null, 2) + '\n');
  }
});

describe('920 shipped carve surfaces', () => {
  for (const site of ['monterey-canyon', 'great-blue-hole']) {
    for (const tier of ['low', 'medium', 'high'] as const) {
      it(`${site} ${tier}: survey, collision, placements, instruments and camera`, async () => {
        const config = makeConfig();
        const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
        const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
        const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
        const terrain = new Terrain({ meta, heights }, config.terrain, tier);
        const props = new Props(meta, terrain, config.props, tier);
        try {
          const centre = terrainCarveFor(meta)!.centre;
          const points =
            site === 'monterey-canyon'
              ? [-500, -400, -250, 0, 250, 400, 500].flatMap((along) =>
                  [-60, 0, 60].map((across) => ({
                    x: centre.x + 20 * Math.sin(along / 220) + across,
                    z: centre.z + along,
                  })),
                )
              : [0, 60, 108, 126, 153, 184, 215].flatMap((radius) =>
                  [0, 0.7, 2.3, 3.9, 5.4].map((angle) => ({
                    x: centre.x + radius * Math.cos(angle),
                    z: centre.z + radius * Math.sin(angle),
                  })),
                );
          const meshes = terrain.group.children.filter(
            (o): o is THREE.Mesh => (o as THREE.Mesh).isMesh,
          );
          const ray = new THREE.Raycaster();
          const meshHeight = (x: number, z: number): number => {
            ray.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
            const hit = ray.intersectObjects(meshes)[0];
            expect(hit).toBeDefined();
            return hit.point.y;
          };
          const measurements = points.map(({ x, z }) => {
            return {
              x,
              z,
              survey: terrain.sampleDataHeight(x, z),
              collision: terrain.sampleHeight(x, z),
              mesh: meshHeight(x, z),
            };
          });
          audit.push({ site, tier, centre, stats: terrain.stats, measurements });
          for (const p of measurements)
            expect(Math.abs(p.collision - p.mesh), `collision at ${p.x}, ${p.z}`).toBeLessThan(
              0.002,
            );
          const centreHeight = terrain.sampleDataHeight(centre.x, centre.z);
          expect(centreHeight).toBeCloseTo(site === 'monterey-canyon' ? -860 : -125, 6);
          expect(Math.abs(meshHeight(centre.x, centre.z) - centreHeight)).toBeLessThan(
            site === 'monterey-canyon' ? 5 : 2,
          );
          if (site === 'monterey-canyon') {
            expect(centre.x).toBeCloseTo(-3230.9, 0);
            expect(centre.z).toBeCloseTo(-1358.8, 0);
            for (const along of [-400, -250, 0, 250]) {
              const x = centre.x + 20 * Math.sin(along / 220);
              const z = centre.z + along;
              const floor = -860 + along * 0.2;
              expect(terrain.sampleDataHeight(x, z)).toBeCloseTo(floor, 6);
              expect(Math.abs(meshHeight(x, z) - floor)).toBeLessThan(
                tier === 'low' ? 8 : tier === 'medium' ? 3.5 : 2.5,
              );
            }
          }

          // Detail-off must still collide with the carved triangles.
          const pure = new Terrain(
            { meta, heights },
            { ...config.terrain, detailStrength: 0 },
            tier,
          );
          try {
            const pureMeshes = pure.group.children.filter(
              (o): o is THREE.Mesh => (o as THREE.Mesh).isMesh,
            );
            for (const p of points) {
              ray.set(new THREE.Vector3(p.x, 500, p.z), new THREE.Vector3(0, -1, 0));
              const hit = ray.intersectObjects(pureMeshes)[0];
              expect(hit).toBeDefined();
              expect(Math.abs(pure.sampleHeight(p.x, p.z) - hit.point.y)).toBeLessThan(0.002);
            }
            expect(pure.sampleDataHeight(centre.x, centre.z)).toBe(centreHeight);
          } finally {
            pure.dispose();
          }

          const settings = spawnSettings(config);
          const sub = new Submarine(config.submarine, terrain);
          const cameraObstructions: unknown[] = [];
          for (const p of measurements) {
            const y = spawnHeight(p.collision, null, settings);
            // The shelf may be too shallow to fit a full spawn clearance.
            if (
              p.mesh + settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM <=
              -settings.hullRadius
            )
              expect(y - p.mesh).toBeGreaterThanOrEqual(
                settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM - 0.002,
              );
            sub.reset(p.x, p.mesh + 30, p.z);
            expect(sub.getState().depth).toBe(p.mesh + 30);
            expect(sub.getState().altitude).toBeCloseTo(30, 2);
            const echo = castSonarRay(
              { x: p.x, y: p.mesh + 30, z: p.z },
              { x: 0, y: -1, z: 0 },
              terrain,
              { maxRangeM: 50, stepM: 1, speedOfSoundMps: 1500 },
            )!;
            expect(echo).not.toBeNull();
            expect(Math.abs(echo.rangeM - 30)).toBeLessThanOrEqual(1);
            expect(echo.delayS).toBe((2 * echo.rangeM) / 1500);
            for (const mode of ['chase', 'orbit', 'first-person'] as const) {
              // A pilot cannot occupy the shallow reef platform with full hull clearance.
              if (p.mesh + settings.hullRadius + settings.seabedClearance > -settings.hullRadius)
                continue;
              const rig = new CameraRig(config.camera, 16 / 9, terrain);
              rig.setMode(mode);
              const pilot = new THREE.Vector3(
                p.x,
                Math.min(-settings.hullRadius, p.mesh + 12),
                p.z,
              );
              rig.snap(pilot, 0.7, -0.3);
              const eye = rig.camera.position;
              const clearance = eye.y - meshHeight(eye.x, eye.z);
              expect(clearance).toBeGreaterThanOrEqual(config.camera.terrainClearance - 0.002);
              expect(eye.y).toBeLessThanOrEqual(-config.camera.surfaceClearance + 0.002);
              const arm = eye.clone().sub(pilot);
              const armRay = new THREE.Raycaster(pilot, arm.clone().normalize(), 0, arm.length());
              const obstruction = armRay.intersectObjects(meshes)[0];
              if (obstruction)
                cameraObstructions.push({
                  mode,
                  pilot: pilot.toArray(),
                  eye: eye.toArray(),
                  distance: obstruction.distance,
                });
            }
          }

          const pois = placePois(
            parsePois(json(`data/landmarks/${site}/pois.json`)),
            meta,
            terrain,
            config.scan,
            site,
          );
          for (const poi of pois) {
            const floor = meshHeight(poi.position.x, poi.position.z);
            expect(poi.position.y).toBeGreaterThanOrEqual(floor - 0.002);
            if (poi.def.snap_to_seabed)
              expect(Math.abs(poi.position.y - floor)).toBeLessThan(0.002);
          }
          await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
          expect(props.stats.failed).toBe(0);
          for (const prop of props.placed) {
            const p = prop.root.position;
            expect(Math.abs(p.y - prop.def.yOffsetM - meshHeight(p.x, p.z))).toBeLessThan(0.002);
          }
          const pose = composedFreeDiveSpawn(site, meta, terrain, props, settings, -6500)!;
          expect(pose).not.toBeNull();
          const position = new THREE.Vector3(pose.x, pose.y, pose.z);
          const scanner = new Scanner(config.scan, new EventBus());
          scanner.setTargets(pois);
          scanner.update(
            0,
            position,
            new THREE.Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)),
            false,
          );
          audit.push({
            site,
            tier,
            pose,
            firstScan: { ...scanner.view },
            pois: pois.map((p) => ({ id: p.id, position: p.position.toArray() })),
          });
          expect(position.y - meshHeight(position.x, position.z)).toBeGreaterThanOrEqual(
            settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM - 0.002,
          );
          expect(
            props.collide(position.clone(), settings.hullRadius + 4, new THREE.Vector3()),
          ).toBe(false);
          expect(scanner.view.candidateId).toBe(
            site === 'monterey-canyon' ? 'monterey-canyon-wall' : 'great-blue-hole-stalactites',
          );

          let scatterCount = 0;
          const normal = new THREE.Vector3();
          const ground = {
            sampleHeight: (x: number, z: number) => terrain.sampleHeight(x, z),
            contains: (x: number, z: number) => terrain.contains(x, z),
            normalAt: (x: number, z: number, out: [number, number, number]) => {
              terrain.getNormal(x, z, normal);
              out[0] = normal.x;
              out[1] = normal.y;
              out[2] = normal.z;
            },
          };
          for (let dx = -1; dx <= 1; dx++)
            for (let dz = -1; dz <= 1; dz++) {
              const cell = placeCell(
                Math.floor(centre.x / 80) + dx,
                Math.floor(centre.z / 80) + dz,
                ground,
                terrain.biome,
                {
                  cellSizeM: 80,
                  density: config.terrain.tiers[tier].scatterDensity,
                  rockLo: 1 - Math.cos((config.terrain.rockSlopeLoDeg * Math.PI) / 180),
                  rockHi: 1 - Math.cos((config.terrain.rockSlopeHiDeg * Math.PI) / 180),
                  seed: 920,
                },
              );
              for (const [kind, instances] of Object.entries(cell))
                for (const instance of instances) {
                  scatterCount++;
                  const base = instance.y + SCATTER_TYPES[kind as ScatterKind].embed * instance.sy;
                  expect(Math.abs(base - meshHeight(instance.x, instance.z))).toBeLessThan(0.002);
                }
            }
          expect(scatterCount).toBeGreaterThan(0);
          audit.push({ site, tier, scatterCount, cameraObstructions });
        } finally {
          terrain.dispose();
        }
      });
    }
  }
});

describe('920 Blue Hole cubic reconstruction preflight', () => {
  for (const tier of ['medium', 'high'] as const) {
    it(`${tier}: retains the 125 m carve when a fidelity profile is enabled`, () => {
      const tile = makeSyntheticTile({
        id: 'great-blue-hole',
        cols: 33,
        rows: 33,
        centerLat: 17.3156,
        centerLon: -87.5356,
        cellsizeDeg: 0.0002,
        height: () => -4,
      });
      const config = makeConfig().terrain;
      config.fidelity = {
        'great-blue-hole': {
          ...MONTEREY_FIDELITY,
          chunkCells: 8,
          focus: { lat: 17.3156, lon: -87.5356, radiusM: 230, fadeM: 50 },
        },
      };
      const terrain = new Terrain(tile, config, tier);
      try {
        expect(terrain.sampleDataHeight(0, 0)).toBe(-125);
        expect(Math.abs(terrain.sampleHeight(0, 0) + 125)).toBeLessThan(2);
        const ray = new THREE.Raycaster(new THREE.Vector3(0, 100, 0), new THREE.Vector3(0, -1, 0));
        expect(Math.abs(ray.intersectObject(terrain.group, true)[0].point.y + 125)).toBeLessThan(2);
      } finally {
        terrain.dispose();
      }
    });
  }
});
