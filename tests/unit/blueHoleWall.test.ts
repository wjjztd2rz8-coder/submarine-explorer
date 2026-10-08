import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { terrainCarveFor } from '../../src/world/terrainFeatures.js';
import type { TileMeta } from '../../src/util/types.js';
import { buildGeo, countGeo } from '../../src/world/props/geo/index.js';
import { blueHoleWallRelief } from '../../src/world/props/geo/blueHoleWall.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import { parsePropsDoc } from '../../src/world/PropLoader.js';
import doc from '../../data/landmarks/great-blue-hole/props.json';

const cfg = DEFAULT_CONFIG.props;
const def = parsePropsDoc(doc, cfg).props.find((p) => p.id === 'blue-hole-wall-relief')!;
const seed = hashString(def.id);
const carve = terrainCarveFor({
  id: 'great-blue-hole',
  center: { lat: def.lat, lon: def.lon },
} as TileMeta)!;
const gnd = (x: number, z: number): number => carve.apply(x, z, -4) + 125;

describe('Blue Hole wall relief', () => {
  it('leaves the reef, floor and both gallery mouths clear, with coherent vertical fluting', () => {
    for (const a of [0, 1, 2, 3, 4, 5]) {
      expect(blueHoleWallRelief(a, 96, seed)).toBe(0);
      expect(blueHoleWallRelief(a, 190, seed)).toBe(0);
    }
    for (const a of [Math.PI, 1]) {
      for (const r of [130, 140, 150, 170]) expect(blueHoleWallRelief(a, r, seed)).toBe(0);
    }
    const amplitudes = Array.from({ length: 100 }, (_, i) =>
      blueHoleWallRelief(i / 100, 160, seed),
    );
    expect(Math.max(...amplitudes) - Math.min(...amplitudes)).toBeGreaterThan(1);
  });

  for (const tier of ['low', 'medium', 'high', 'ultra']) {
    const built = buildGeo({
      def,
      dims: def.dimensionsM!,
      seed,
      tier,
      cfg,
      groundHeight: () => gnd,
    });
    it(`${tier}: has a closed seam, upward-facing walls, bounded relief and seated rubble`, () => {
      const wall = built.full.getObjectByName('fluted-limestone-wall') as THREE.Mesh;
      const pos = wall.geometry.getAttribute('position');
      const normal = wall.geometry.getAttribute('normal');
      let up = 0,
        exposed = 0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          y = pos.getY(i),
          z = pos.getZ(i);
        const above = y - gnd(x, z);
        expect(Number.isFinite(above)).toBe(true);
        expect(above).toBeGreaterThanOrEqual(-0.121);
        expect(above).toBeLessThan(3);
        if (normal.getY(i) > 0) up++;
        if (above > 0.3) exposed++;
      }
      expect(up / pos.count).toBeGreaterThan(0.99);
      expect(exposed / pos.count).toBeGreaterThan(0.4);
      let lastRingStart = 0;
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(Math.hypot(pos.getX(i), pos.getZ(i)) - 96) < 0.001) lastRingStart = i;
      }
      for (let j = 0; j < pos.count - lastRingStart; j++) {
        for (const attribute of [pos, normal]) {
          expect(
            new THREE.Vector3()
              .fromBufferAttribute(attribute, j)
              .distanceTo(new THREE.Vector3().fromBufferAttribute(attribute, lastRingStart + j)),
          ).toBeLessThan(0.001);
        }
      }
      const rocks = built.full.getObjectByName('ledge-base-rubble') as THREE.InstancedMesh;
      expect(rocks.count).toBeGreaterThan(30);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < rocks.count; i++) {
        rocks.getMatrixAt(i, matrix);
        const centre = new THREE.Vector3().setFromMatrixPosition(matrix);
        expect(centre.y - gnd(centre.x, centre.z)).toBeGreaterThan(0);
        expect(centre.y - gnd(centre.x, centre.z)).toBeLessThan(4);
        expect(built.colliders!.some((box) => box.containsPoint(centre))).toBe(true);
      }
      expect(
        built.colliders!.some((box) =>
          box.intersectsSphere(new THREE.Sphere(new THREE.Vector3(0, 60, 0), 8)),
        ),
      ).toBe(false);
      expect(countGeo(built.full).draws).toBe(2);
      if (tier === 'low') expect(countGeo(built.full).triangles).toBeLessThan(30_000);
      console.log(
        `Blue Hole wall ${tier}: ${JSON.stringify(countGeo(built.full))}, ${built.colliders!.length} collision cells`,
      );
    });
  }
});
