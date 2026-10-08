// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { geoDetail } from '../../src/world/props/geo/detail.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { projectedRaycast } from './projectedRaycast.js';

/** Real sloping bathymetry and authored transforms expose buried wall-life seats. */
describe('Monterey wall life on surveyed terrain', () => {
  for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
    it(`${tier}: wall colonies sit above the seabed and apron without removing the planted life`, async () => {
      const site = 'monterey-canyon';
      const config = makeConfig();
      // These checks use Terrain.sampleHeight and the actual prop apron, not
      // the seafloor mesh. Avoid building unused subdivided tile geometry;
      // retain this tier's detail octaves and every prop's full tier geometry.
      config.terrain.tiers[tier].detailSubdiv = 1;
      const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      try {
        const doc = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
        await props.load('props.json', site, async () => doc);
        expect(props.stats.failed).toBe(0);
        const pois = placePois(
          parsePois(JSON.parse(readFileSync(`data/landmarks/${site}/pois.json`, 'utf8'))),
          meta,
          terrain,
          config.scan,
          site,
        );
        expect(pois).toHaveLength(4);
        for (const poi of pois) {
          const { x, y, z } = poi.position;
          const seabed = terrain.sampleHeight(x, z);
          if (poi.def.snap_to_seabed) {
            expect(y).toBe(seabed);
            if (tier !== 'low') {
              const ray = new THREE.Raycaster(
                new THREE.Vector3(x, 100, z),
                new THREE.Vector3(0, -1, 0),
              );
              const hit = ray.intersectObject(terrain.group, true)[0];
              expect(hit, `${tier} ${poi.id} rendered surface`).toBeDefined();
              expect(Math.abs(hit.point.y - y)).toBeLessThan(0.002);
            }
          } else expect(y).toBeGreaterThanOrEqual(seabed);
        }
        const walls = props.placed.filter((prop) => prop.def.feature === 'canyon-ledge');
        expect(walls).toHaveLength(4);
        let apronChecks = 0;
        for (const hero of walls) {
          hero.root.updateMatrixWorld(true);
          // Intersect the rendered apron, including its lip and triangulation,
          // independently of the builder's analytic talus-height callback.
          const apron = hero.full.children[1] as THREE.Mesh;
          expect(apron.isMesh).toBe(true);
          const wall = hero.full.children[0] as THREE.Mesh;
          const localWall = new THREE.Mesh(wall.geometry, wall.material);
          const intersectFace = projectedRaycast(localWall, 'z');
          const intersectApron = projectedRaycast(apron, 'y');
          const faceRay = new THREE.Raycaster();
          const intoRock = new THREE.Vector3(0, 0, 1);
          const seat = new THREE.Vector3();
          const ray = new THREE.Raycaster();
          const down = new THREE.Vector3(0, -1, 0);
          const origin = new THREE.Vector3();
          const ranges: Record<string, { count: number; min: number; max: number }> = {};
          hero.full.traverse((object) => {
            const mesh = object as THREE.InstancedMesh;
            if (!mesh.isInstancedMesh) return;
            const range = { count: mesh.count, min: Infinity, max: -Infinity };
            const instance = new THREE.Matrix4();
            const world = new THREE.Matrix4();
            const position = new THREE.Vector3();
            for (let i = 0; i < mesh.count; i++) {
              mesh.getMatrixAt(i, instance);
              world.multiplyMatrices(mesh.matrixWorld, instance);
              position.setFromMatrixPosition(world);
              const clearance = position.y - terrain.sampleHeight(position.x, position.z);
              range.min = Math.min(range.min, clearance);
              range.max = Math.max(range.max, clearance);
              if (mesh.name.startsWith('wall-')) {
                seat.setFromMatrixPosition(instance);
                faceRay.set(
                  new THREE.Vector3(seat.x, seat.y, wall.geometry.boundingBox!.min.z - 1),
                  intoRock,
                );
                const face = intersectFace(faceRay)[0];
                const label = `${hero.def.id} ${mesh.name}[${i}]: attached to exposed lit face`;
                expect(face, label).toBeDefined();
                if (face) {
                  expect(face.point.z - seat.z, label).toBeGreaterThanOrEqual(-1e-4);
                  expect(face.point.z - seat.z, label).toBeLessThan(0.5);
                  expect(face.face!.normal.z, label).toBeLessThan(-0.25);
                }
                origin.copy(position);
                origin.y = hero.root.position.y + hero.localBounds.max.y + 1;
                ray.set(origin, down);
                const hit = intersectApron(ray)[0];
                if (hit) {
                  apronChecks++;
                  expect(
                    position.y - hit.point.y,
                    `${hero.def.id} ${mesh.name}[${i}]: exposed above rendered apron`,
                  ).toBeGreaterThan(0);
                }
              }
            }
            ranges[mesh.name] = range;
          });
          const life = Object.entries(ranges).filter(([name]) => name.startsWith('wall-'));
          expect(life.length, hero.def.id).toBe(5); // three sponge shapes and two coral shapes remain
          const growth = Math.min(geoDetail(tier).growth, 1.2);
          for (const [prefix, requested] of [
            ['wall-sponges-', Math.round(90 * growth)],
            ['wall-corals-', Math.round(70 * growth)],
          ] as const) {
            const actual = life
              .filter(([name]) => name.startsWith(prefix))
              .reduce((sum, [, range]) => sum + range.count, 0);
            expect(actual, `${hero.def.id} ${prefix} requested count`).toBe(requested);
          }
          let count = 0;
          let colonies = 0;
          for (const [name, range] of Object.entries(ranges)) {
            count += range.count;
            expect(range.min, `${hero.def.id} ${name}`).toBeGreaterThan(-3);
            if (name.startsWith('wall-')) {
              colonies += range.count;
              expect(range.min, `${hero.def.id} ${name}: exposed seat`).toBeGreaterThan(0.11);
            }
            if (hero.def.id === 'canyon-wall-ledge') {
              // Retain the unchanged browser gate's upper and lower limits.
              expect(range.max, name).toBeLessThan(
                (hero.localBounds.max.y - hero.localBounds.min.y) * 0.5,
              );
            }
          }
          expect(count, hero.def.id).toBeGreaterThan(20);
          if (tier === 'medium' && hero.def.id === 'canyon-wall-ledge') {
            expect(count).toBe(192);
            expect(colonies).toBe(96);
          }
        }
        expect(apronChecks).toBeGreaterThan(0);
      } finally {
        terrain.dispose();
      }
    });
  }
});
