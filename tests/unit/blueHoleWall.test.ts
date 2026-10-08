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
  blueHoleWallRelief,
} from '../../src/world/terrainFeatures.js';
import { latLonToWorld } from '../../src/util/geo.js';
import { chooseFreeDiveHull, composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Props } from '../../src/world/Props.js';
import doc from '../../data/landmarks/great-blue-hole/props.json';

const meta = JSON.parse(readFileSync('data/tiles/great-blue-hole/meta.json', 'utf8')) as TileMeta;
const bytes = readFileSync('data/tiles/great-blue-hole/heightmap.bin');
const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
const centre = latLonToWorld(meta, BLUE_HOLE_LAT, BLUE_HOLE_LON);

describe('910 Blue Hole wall relief on the terrain surface', () => {
  it('High: preserves the opening gallery footprint and terrain visibility in both layouts', async () => {
    const cfg = makeConfig();
    const terrain = new Terrain({ meta, heights }, cfg.terrain, 'high');
    const props = new Props(meta, terrain, cfg.props, 'high');
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
      // Main's measured High opening footprint: 1600x900 desktop and 390x844 portrait.
      for (const [aspect, width, height] of [
        [16 / 9, 0.1868116483, 0.0986286749],
        [390 / 844, 0.332109597, 0.0455748616],
      ]) {
        const rig = new CameraRig(cfg.camera, aspect, terrain);
        rig.setChaseRadiusDefault(spawn.chaseRadius, spawn.chaseOffsetX, spawn.chaseOffsetY);
        rig.snap(sub, spawn.yaw, 0);
        rig.camera.updateMatrixWorld(true);
        terrain.update(rig.camera);
        expect(props.collide(sub.clone(), cfg.submarine.hullRadius + 4, new THREE.Vector3())).toBe(
          false,
        );
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
        expect(size.x).toBeGreaterThanOrEqual(width * 0.99);
        expect(size.y).toBeGreaterThanOrEqual(height * 0.99);
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

  for (const tier of ['medium', 'high'] as const) {
    it(`${tier}: resolves walls locally within budget and physics follows rendered triangles`, () => {
      const cfg = makeConfig().terrain;
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
});
