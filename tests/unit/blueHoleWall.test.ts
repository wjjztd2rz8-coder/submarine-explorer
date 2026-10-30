// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import type { TileMeta } from '../../src/util/types.js';
import { Terrain } from '../../src/world/Terrain.js';
import {
  BLUE_HOLE_LAT,
  BLUE_HOLE_LON,
  blueHoleTerraces,
  blueHoleSeatBank,
  blueHoleWallRelief,
  blueHoleApron,
} from '../../src/world/terrainFeatures.js';
import { latLonToWorld } from '../../src/util/geo.js';
import { chooseFreeDiveHull, composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Props } from '../../src/world/Props.js';
import doc from '../../data/landmarks/great-blue-hole/props.json';
import mission from '../../data/landmarks/great-blue-hole/mission.json';

const meta = JSON.parse(readFileSync('data/tiles/great-blue-hole/meta.json', 'utf8')) as TileMeta;
const bytes = readFileSync('data/tiles/great-blue-hole/heightmap.bin');
const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
const centre = latLonToWorld(meta, BLUE_HOLE_LAT, BLUE_HOLE_LON);

describe('910 Blue Hole wall relief on the terrain surface', () => {
  for (const tier of ['low', 'high'] as const)
    it(`${tier}: preserves the opening gallery footprint and terrain visibility in both layouts`, async () => {
      const cfg = makeConfig();
      const terrain = new Terrain({ meta, heights }, cfg.terrain, tier);
      const props = new Props(meta, terrain, cfg.props, tier);
      try {
        await props.placeAll(doc, 'great-blue-hole');
        expect(props.stats.failed).toBe(0);
        const hull = chooseFreeDiveHull(
          cfg.submarine.hullClasses,
          meta.min_m,
          cfg.submarine.freeDiveHullMarginM,
        )!;
        const spawn = composedFreeDiveSpawn(
          'great-blue-hole',
          meta,
          terrain,
          props,
          spawnSettings(cfg),
          hull.hull.ratedDepth,
          cfg.camera,
          'arcade',
        )!;
        expect(spawn).not.toBeNull();
        const sub = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
        const hero = props.placed.find((p) => p.def.id === 'karst-grotto')!;
        hero.root.updateMatrixWorld(true);
        const gallery = hero.root.getObjectByName('stalactite-gallery') as THREE.Mesh;
        const vertices = gallery.geometry.getAttribute('position');
        const meshes = terrain.group.children.filter(
          (o): o is THREE.Mesh => (o as THREE.Mesh).isMesh,
        );
        terrain.group.updateMatrixWorld(true);
        // Main's measured High opening footprint (132858). Low retains its own
        // pendant envelope, pinned separately in blueHoleProps.test.ts.
        for (const [aspect, width, height] of [
          [16 / 9, 0.1868116483, 0.0986286749],
          [390 / 844, 0.332109597, 0.0455748616],
        ]) {
          const rig = new CameraRig(cfg.camera, aspect, terrain);
          rig.setChaseRadiusDefault(spawn.chaseRadius, spawn.chaseOffsetX, spawn.chaseOffsetY);
          rig.snap(sub, spawn.yaw, 0);
          rig.camera.updateMatrixWorld(true);
          terrain.update(rig.camera);
          expect(
            props.collide(sub.clone(), cfg.submarine.hullRadius + 4, new THREE.Vector3()),
          ).toBe(false);
          const bounds = new THREE.Box2();
          const point = new THREE.Vector3();
          const ray = new THREE.Raycaster();
          let checked = 0;
          const stride = Math.max(1, Math.floor(vertices.count / 64));
          for (let i = 0; i < vertices.count; i++) {
            point.fromBufferAttribute(vertices, i).applyMatrix4(gallery.matrixWorld);
            const screen = point.clone().project(rig.camera);
            expect(Math.abs(screen.x)).toBeLessThan(1);
            expect(Math.abs(screen.y)).toBeLessThan(1);
            expect(screen.z).toBeGreaterThan(-1);
            expect(screen.z).toBeLessThan(1);
            bounds.expandByPoint(new THREE.Vector2(screen.x, screen.y));
            if (i % stride === 0) {
              const delta = point.clone().sub(rig.camera.position);
              ray.set(rig.camera.position, delta.clone().normalize());
              ray.far = delta.length() - 0.1;
              expect(
                ray.intersectObjects(meshes, false),
                `terrain hides pendant vertex ${i}`,
              ).toHaveLength(0);
              checked++;
            }
          }
          expect(checked).toBeGreaterThanOrEqual(64);
          const size = bounds.getSize(new THREE.Vector2());
          if (tier === 'high') {
            expect(size.x).toBeGreaterThanOrEqual(width * 0.99);
            expect(size.y).toBeGreaterThanOrEqual(height * 0.99);
          } else {
            // Reference geometry uses the old Low opening. The newly resolved
            // bowl may improve the automatic bearing, but cannot shrink the gallery.
            const previous =
              aspect === 16 / 9 ? [0.0504748702, 0.0879778568] : [0.0897615816, 0.0406749029];
            expect(size.x).toBeGreaterThanOrEqual(previous[0]! * 0.99);
            expect(size.y).toBeGreaterThanOrEqual(previous[1]! * 0.99);
          }
        }
      } finally {
        terrain.dispose();
      }
    });

  it('fades smoothly at the reef, floor and gallery mouths with no angular seam', () => {
    let largest = 0;
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      for (let r = 90; r <= 195; r += 1.5) {
        const relief = blueHoleWallRelief(a, r);
        expect(Number.isFinite(relief)).toBe(true);
        expect(relief).toBeGreaterThanOrEqual(0);
        expect(relief).toBeLessThan(3.3);
        largest = Math.max(largest, relief);
        if (r <= 96 || r >= 190) expect(relief).toBe(0);
      }
    }
    expect(largest).toBeGreaterThan(2);
    const e = 1e-4;
    for (const r of [96, 108, 139, 177, 190]) {
      expect(blueHoleWallRelief(e, r)).toBeCloseTo(blueHoleWallRelief(2 * Math.PI + e, r), 10);
      for (const [bearing, halfWidth] of [
        [Math.PI, 0.3],
        [1, 0.25],
      ]) {
        for (const a of [bearing - halfWidth, bearing, bearing + halfWidth]) {
          expect(blueHoleWallRelief(a, r)).toBeCloseTo(0, 12);
          expect(
            Math.abs(blueHoleWallRelief(a + e, r) - blueHoleWallRelief(a - e, r)),
          ).toBeLessThan(1e-5);
        }
      }
    }
    for (const r of [96, 108, 177, 190]) {
      const left = (blueHoleWallRelief(0.2, r) - blueHoleWallRelief(0.2, r - e)) / e;
      const right = (blueHoleWallRelief(0.2, r + e) - blueHoleWallRelief(0.2, r)) / e;
      expect(Math.abs(left - right)).toBeLessThan(0.001);
    }
  });

  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`${tier}: resolves walls locally within budget and physics follows rendered triangles`, async () => {
      const config = makeConfig();
      const cfg = config.terrain;
      const terrain = new Terrain({ meta, heights }, cfg, tier);
      try {
        expect(terrain.stats.vertices).toBeLessThanOrEqual(cfg.maxVertices);
        const counts = terrain.stats.subdivisionCounts!;
        expect(counts).toBeDefined();
        const refined = Object.entries(counts).filter(
          ([sub]) => Number(sub) > terrain.stats.subdiv,
        );
        expect(refined.length).toBeGreaterThan(0);
        expect(refined.reduce((sum, [, count]) => sum + count, 0)).toBeLessThan(20);

        // Measure the rendered triangle heights across an upper bed, where the
        // old height-quantised relief left a dune. This catches Low aliasing the
        // entire tread/riser away even when the analytic height function changes.
        for (const a of [0.15, 2, 4.2]) {
          const wob = 1 + 0.035 * Math.sin(3 * a + 0.8) + 0.025 * Math.sin(5 * a + 2.1);
          const at = (r: number) =>
            terrain.sampleHeight(
              centre.x + Math.cos(a) * r * wob,
              centre.z + Math.sin(a) * r * wob,
            );
          const treadRise = Math.abs(at(184) - at(177));
          const riserRise = at(177) - at(173);
          expect(treadRise).toBeLessThan(3);
          expect(riserRise).toBeGreaterThan(3);
          expect(riserRise / 4).toBeGreaterThan((2 * treadRise) / 7);
        }

        // The bank must leave the occupied gallery seat clear, on the actual
        // rendered ground as well as the analytic carve.
        const props = new Props(meta, terrain, config.props, tier);
        await props.placeAll(doc, 'great-blue-hole');
        expect(props.stats.failed).toBe(0);
        expect(props.placed).toHaveLength(doc.props.length);
        for (const prop of props.placed) {
          prop.root.updateMatrixWorld(true);
          const gallery = prop.root.getObjectByName('stalactite-gallery') as THREE.Mesh;
          const positions = gallery.geometry.getAttribute('position');
          let clearance = Infinity;
          for (let i = 0; i < positions.count; i++) {
            const point = new THREE.Vector3()
              .fromBufferAttribute(positions, i)
              .applyMatrix4(gallery.matrixWorld);
            clearance = Math.min(clearance, point.y - terrain.sampleHeight(point.x, point.z));
          }
          expect(clearance, prop.def.id).toBeGreaterThan(0);

          // The wider apron reaches the seats: check the entire authored footprint,
          // including its joins, against the same ground and normals physics samples.
          const [width, depth] = prop.def.dimensionsM!;
          for (let ix = -4; ix <= 4; ix++) {
            for (let iz = -4; iz <= 4; iz++) {
              const point = new THREE.Vector3((ix * width) / 8, 0, (iz * depth) / 4)
                .applyQuaternion(prop.root.quaternion)
                .add(prop.root.position);
              const height = terrain.sampleHeight(point.x, point.z);
              expect(Number.isFinite(height)).toBe(true);
              const normal = terrain.getNormal(point.x, point.z);
              expect(normal.toArray().every(Number.isFinite)).toBe(true);
              expect(normal.length()).toBeCloseTo(1, 5);
              expect(Math.abs(terrain.sampleHeight(point.x + 1e-5, point.z) - height)).toBeLessThan(
                0.001,
              );
              expect(Math.abs(terrain.sampleHeight(point.x, point.z + 1e-5) - height)).toBeLessThan(
                0.001,
              );
            }
          }
        }

        const hull = chooseFreeDiveHull(
          config.submarine.hullClasses,
          meta.min_m,
          config.submarine.freeDiveHullMarginM,
        )!;
        const opening = composedFreeDiveSpawn(
          meta.id,
          meta,
          terrain,
          props,
          spawnSettings(config),
          hull.hull.ratedDepth,
          config.camera,
          'arcade',
        )!;
        expect(opening).not.toBeNull();
        expect([opening.x, opening.y, opening.z].every(Number.isFinite)).toBe(true);
        expect(opening.y - terrain.sampleHeight(opening.x, opening.z)).toBeGreaterThan(
          config.submarine.hullRadius,
        );
        for (const spawn of [opening, latLonToWorld(meta, mission.spawn.lat, mission.spawn.lon)]) {
          for (let ix = -6; ix <= 6; ix++) {
            for (let iz = -6; iz <= 6; iz++) {
              const x = spawn.x + ix * 2;
              const z = spawn.z + iz * 2;
              const height = terrain.sampleHeight(x, z);
              expect(Number.isFinite(height)).toBe(true);
              expect(Math.abs(terrain.sampleHeight(x + 1e-5, z) - height)).toBeLessThan(0.001);
              expect(Math.abs(terrain.sampleHeight(x, z + 1e-5) - height)).toBeLessThan(0.001);
            }
          }
        }

        const chunks = terrain.group.children.filter(
          (o): o is THREE.Mesh => (o as THREE.Mesh).isMesh,
        );
        expect(new Set(chunks.map((m) => m.material)).size).toBe(1);
        const ray = new THREE.Raycaster();
        // Cover the upper slope, both benches, gallery seats, floor, and coarse outer terrain.
        for (const [a, r] of [
          [0.13, 180],
          [0.72, 140],
          [2.12, 115],
          [3.14, 145],
          [1, 145],
          [Math.PI, 160],
          [Math.PI, 168],
          [Math.PI, 172],
          [1, 160],
          [1, 168],
          [1, 172],
          [4.8, 75],
          [2.7, 400],
        ]) {
          const x = centre.x + Math.cos(a) * r;
          const z = centre.z + Math.sin(a) * r;
          ray.set(new THREE.Vector3(x, 200, z), new THREE.Vector3(0, -1, 0));
          const hit = ray.intersectObject(terrain.group, true)[0];
          expect(hit, `missing terrain at bearing ${a}, radius ${r}`).toBeDefined();
          expect(Math.abs(terrain.sampleHeight(x, z) - hit.point.y)).toBeLessThan(0.001);
        }
      } finally {
        terrain.dispose();
      }
    });
  }

  it('terraces are bounded, seamless and leave both gallery seats and the floor untouched', () => {
    let largest = 0;
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      for (let r = 90; r <= 195; r += 1.5) {
        const t = blueHoleTerraces(a, r);
        expect(Number.isFinite(t)).toBe(true);
        expect(Math.abs(t)).toBeLessThan(10);
        largest = Math.max(largest, Math.abs(t));
        if (r <= 100 || r >= 195) expect(t).toBe(0);
      }
    }
    expect(largest).toBeGreaterThan(2);
    for (const bearing of [Math.PI, 1]) {
      for (const r of [139, 150]) expect(blueHoleTerraces(bearing, r)).toBe(0);
      // Below the seat the mouth sector terraces too, so the view down it is not a blank ramp.
      let deep = 0;
      for (let r = 104; r <= 124; r += 1)
        deep = Math.max(deep, Math.abs(blueHoleTerraces(bearing, r)));
      expect(deep).toBeGreaterThan(1);
    }
    expect(blueHoleTerraces(1e-4, 139)).toBeCloseTo(blueHoleTerraces(2 * Math.PI + 1e-4, 139), 10);
  });
});

it('gallery aprons remain bounded and continuous through radial and angular transitions', () => {
  let min = Infinity;
  let max = -Infinity;
  let radialJump = 0;
  let angularJump = 0;
  const epsilon = 1e-5;
  // Dense probes cover wandering risers and clipped sediment mounds as well as
  // the radial fade endpoints; neither side of a join may open a height seam.
  for (let i = 0; i <= 360; i++) {
    const a = -Math.PI + (i * Math.PI) / 180;
    for (let r = 110; r <= 170; r += 0.25) {
      const height = blueHoleApron(a, r);
      expect(Number.isFinite(height)).toBe(true);
      min = Math.min(min, height);
      max = Math.max(max, height);
      if (r <= 112 || r >= 168) expect(height).toBeCloseTo(0, 12);
      radialJump = Math.max(
        radialJump,
        Math.abs(blueHoleApron(a, r + epsilon) - blueHoleApron(a, r - epsilon)),
      );
      angularJump = Math.max(
        angularJump,
        Math.abs(blueHoleApron(a + epsilon, r) - blueHoleApron(a - epsilon, r)),
      );
    }
  }
  // Four steps are each at most 1.7 * 1.45 m; mounds add at most 1.3 m.
  expect(min).toBeGreaterThanOrEqual(-4 * 1.7 * 1.45);
  expect(min).toBeLessThan(-3);
  expect(max).toBeGreaterThan(0);
  expect(max).toBeLessThanOrEqual(1.3);
  expect(radialJump).toBeLessThan(0.001);
  expect(angularJump).toBeLessThan(0.01);
  for (const [bearing, width] of [
    [Math.PI, 0.3],
    [1, 0.25],
  ]) {
    for (const a of [
      bearing - width - 0.15,
      bearing - width,
      bearing,
      bearing + width,
      bearing + width + 0.15,
    ]) {
      for (const r of [112, 120, 126.5, 133, 139.5, 146, 152, 160, 168]) {
        expect(blueHoleApron(a, r)).toBeCloseTo(blueHoleApron(a + 2 * Math.PI, r), 10);
        expect(
          Math.abs(blueHoleApron(a + epsilon, r) - blueHoleApron(a - epsilon, r)),
        ).toBeLessThan(0.01);
      }
    }
  }
});

// A positive-only bank cannot introduce a carve depression under the opening
// or move the foot before the authored seat radius.
it('gallery banks are finite, additive and start behind both seat radii', () => {
  let largest = 0;
  for (let a = -Math.PI; a <= Math.PI; a += 0.05) {
    for (let r = 0; r <= 230; r += 0.5) {
      const bank = blueHoleSeatBank(a, r);
      expect(Number.isFinite(bank)).toBe(true);
      expect(bank).toBeGreaterThanOrEqual(0);
      if (r <= 155 || r >= 206) expect(bank).toBe(0);
      largest = Math.max(largest, bank);
    }
  }
  expect(largest).toBeGreaterThan(10);
  for (const [bearing, foot] of [
    [Math.PI, 162],
    [1, 155],
  ]) {
    for (let r = foot - 10; r <= foot; r += 0.25) expect(blueHoleSeatBank(bearing, r)).toBe(0);
    expect(blueHoleSeatBank(bearing, foot + 12)).toBeGreaterThan(0);
  }
});

for (const tier of ['low', 'medium', 'high'] as const) {
  it(`${tier}: the camera stays clear across gallery apron steps and the 168 m fade`, () => {
    // Regression guard: widening the apron must not bury the chase eye or put
    // terrain between the eye and the submarine while turning near a riser.
    const config = makeConfig();
    const terrain = new Terrain({ meta, heights }, config.terrain, tier);
    const rig = new CameraRig(config.camera, 16 / 9, terrain);
    const point = new THREE.Vector3();
    let checked = 0;
    try {
      for (const bearing of [Math.PI - 0.15, Math.PI, Math.PI + 0.15, 0.85, 1, 1.15]) {
        for (const radius of [112, 120, 126.5, 133, 139.5, 146, 152, 160, 164, 168, 172]) {
          const sub = new THREE.Vector3(
            centre.x + Math.cos(bearing) * radius,
            0,
            centre.z + Math.sin(bearing) * radius,
          );
          sub.y = terrain.sampleHeight(sub.x, sub.z) + config.submarine.hullRadius + 0.01;
          // The outer reef can be too shallow for the hull to fit underwater.
          if (sub.y > -config.submarine.hullRadius) continue;
          for (let heading = 0; heading < 24; heading++) {
            rig.snap(sub, (heading * Math.PI) / 12, 0);
            const eye = rig.camera.position;
            expect(
              [...eye.toArray(), ...rig.camera.quaternion.toArray()].every(Number.isFinite),
            ).toBe(true);
            expect(eye.y).toBeLessThanOrEqual(-config.camera.surfaceClearance);
            expect(eye.y - terrain.sampleHeight(eye.x, eye.z)).toBeGreaterThanOrEqual(
              config.camera.terrainClearance - 1e-8,
            );
            // Independent dense probes check visibility along the entire arm;
            // the eye-height assertion alone misses a ridge between its ends.
            for (let i = 0; i <= 100; i++) {
              point.copy(sub).lerp(eye, i / 100);
              expect(point.y - terrain.sampleHeight(point.x, point.z)).toBeGreaterThan(0);
            }
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(1000);
    } finally {
      terrain.dispose();
    }
  });
}
