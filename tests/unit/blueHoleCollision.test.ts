// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it } from 'vitest';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { TileMeta } from '../../src/util/types.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import { collideAll, pushOutOfBox, pushOutOfSphere } from '../../src/world/props/Collision.js';
import doc from '../../data/landmarks/great-blue-hole/props.json';

const evidence: unknown[] = [];
afterAll(() => {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.VERIFY_1495 === '1')
    writeFileSync('.cache/1495/clearance.json', JSON.stringify(evidence, null, 2) + '\n');
});

function actualTerrain(tier: 'low' | 'medium' | 'high' | 'ultra') {
  const config = makeConfig();
  const meta = JSON.parse(readFileSync('data/tiles/great-blue-hole/meta.json', 'utf8')) as TileMeta;
  const bytes = readFileSync('data/tiles/great-blue-hole/heightmap.bin');
  return new Terrain(
    { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
    config.terrain,
    tier,
  );
}

/** Independently measure the sphere against EVERY transformed rendered triangle. */
function renderedTriangles(apron: THREE.Mesh): THREE.Triangle[] {
  const positions = apron.geometry.getAttribute('position');
  const index = apron.geometry.index!;
  const triangles: THREE.Triangle[] = [];
  for (let i = 0; i < index.count; i += 3)
    triangles.push(
      new THREE.Triangle(
        new THREE.Vector3()
          .fromBufferAttribute(positions, index.getX(i))
          .applyMatrix4(apron.matrixWorld),
        new THREE.Vector3()
          .fromBufferAttribute(positions, index.getX(i + 1))
          .applyMatrix4(apron.matrixWorld),
        new THREE.Vector3()
          .fromBufferAttribute(positions, index.getX(i + 2))
          .applyMatrix4(apron.matrixWorld),
      ),
    );
  return triangles;
}

const nearest = new THREE.Vector3();
function distance(triangles: THREE.Triangle[], p: THREE.Vector3): number {
  let squared = Infinity;
  for (const triangle of triangles)
    squared = Math.min(squared, triangle.closestPointToPoint(p, nearest).distanceToSquared(p));
  return Math.sqrt(squared);
}

for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
  it(`1495 ${tier}: both galleries clear shallow/deep contacts and retain open water`, async () => {
    const terrain = actualTerrain(tier);
    const config = makeConfig();
    const radius = config.submarine.hullRadius;
    expect(radius).toBe(8);
    const props = new Props(terrain.meta, terrain, config.props, tier);
    try {
      await props.placeAll(doc, 'great-blue-hole');
      expect(props.stats.failed).toBe(0);
      expect(props.placed).toHaveLength(2);
      const volumes = props.placed.flatMap((p) => p.colliders.filter((c) => c.kind !== 'surface'));
      for (const hero of props.placed) {
        const apron = hero.full.getObjectByName('grotto-sediment-apron') as THREE.Mesh;
        const triangles = renderedTriangles(apron);
        let contacts = 0;
        let openWater = 0;
        let minimumClearance = Infinity;
        let maximumVolumePenetration = 0;
        // Spread probes across the full apron, including its wall join and buried rim.
        const stride = Math.max(1, Math.floor(triangles.length / 160));
        for (let i = 0; i < triangles.length; i += stride) {
          const seat = triangles[i].getMidpoint(new THREE.Vector3());
          for (const above of [radius - 0.4, radius - 2.5, 1]) {
            const p = seat.clone().add(new THREE.Vector3(0, above, 0));
            const n = new THREE.Vector3();
            expect(props.collide(p, radius, n), `${hero.def.id} contact ${i}/${above}`).toBe(true);
            expect(n.length()).toBeCloseTo(1);
            const clearance = distance(triangles, p);
            expect(
              clearance,
              `${hero.def.id} resolved contact ${i}/${above}`,
            ).toBeGreaterThanOrEqual(radius - 1e-4);
            minimumClearance = Math.min(minimumClearance, clearance);
            for (const c of volumes) {
              const depth =
                c.kind === 'box'
                  ? pushOutOfBox(p.clone(), radius, c, 0, new THREE.Vector3())
                  : pushOutOfSphere(p.clone(), radius, c, 0, new THREE.Vector3());
              expect(
                depth,
                `${hero.def.id}: floor resolution also clears prop volumes`,
              ).toBeLessThanOrEqual(1e-4);
              maximumVolumePenetration = Math.max(maximumVolumePenetration, depth);
            }
            const repeated = p.clone();
            props.collide(repeated, radius, new THREE.Vector3());
            expect(
              repeated.distanceTo(p),
              `${hero.def.id}: resolved pose stays stable`,
            ).toBeLessThan(1e-4);
            contacts++;
          }
          // An already clear sphere in the gallery keeps its exact pose. Compare
          // against the original volumes and triangle distances, not the new solver.
          const clear = seat.clone().add(new THREE.Vector3(0, radius + 6, 0));
          if (
            !collideAll(volumes, clear.clone(), radius, 1, new THREE.Vector3()) &&
            distance(triangles, clear) > radius + 1e-4
          ) {
            const before = clear.clone();
            expect(props.collide(clear, radius, new THREE.Vector3())).toBe(false);
            expect(clear).toEqual(before);
            openWater++;
          }
        }
        expect(contacts).toBeGreaterThan(200);
        expect(openWater).toBeGreaterThan(10);
        evidence.push({
          tier,
          hero: hero.def.id,
          contacts,
          openWater,
          minimumClearance,
          maximumVolumePenetration,
        });
      }
    } finally {
      terrain.dispose();
    }
  });
}

it('1495: re-placement/rebuild refresh surfaces and collision:none removes them', async () => {
  const terrain = actualTerrain('low');
  const props = new Props(terrain.meta, terrain, makeConfig().props, 'low');
  try {
    await props.placeAll(doc, 'great-blue-hole');
    const hero = props.placed[0];
    const check = () => {
      const apron = hero.full.getObjectByName('grotto-sediment-apron') as THREE.Mesh;
      const triangles = renderedTriangles(apron);
      const p = triangles[Math.floor(triangles.length / 2)]
        .getMidpoint(new THREE.Vector3())
        .add(new THREE.Vector3(0, 7.6, 0));
      expect(props.collide(p, 8, new THREE.Vector3())).toBe(true);
      expect(distance(triangles, p)).toBeGreaterThanOrEqual(8 - 1e-4);
    };
    check();
    const before = props.stats.colliders;
    const oldSurface = hero.colliders.find((c) => c.kind === 'surface')!;
    hero.def.headingDeg += 15;
    hero.def.yOffsetM += 3;
    hero.def.scale = [1.2, 0.8, 1.1];
    props.place(hero);
    expect(props.stats.colliders).toBe(before);
    expect(hero.colliders).not.toContain(oldSurface);
    check();
    const rebuiltSurface = hero.colliders.find((c) => c.kind === 'surface')!;
    await props.replace(hero);
    expect(hero.colliders).not.toContain(rebuiltSurface);
    expect(props.stats.colliders).toBe(before);
    check();
    const count = hero.colliders.length;
    hero.def.collision = 'none';
    props.place(hero);
    expect(hero.colliders).toEqual([]);
    expect(props.stats.colliders).toBe(before - count);
    const apron = hero.full.getObjectByName('grotto-sediment-apron') as THREE.Mesh;
    const p = renderedTriangles(apron)
      [Math.floor(apron.geometry.index!.count / 6)].getMidpoint(new THREE.Vector3())
      .add(new THREE.Vector3(0, 7.6, 0));
    expect(props.collide(p, 8, new THREE.Vector3())).toBe(false);
  } finally {
    terrain.dispose();
  }
});
