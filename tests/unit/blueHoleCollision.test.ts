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
  if (env?.BLUEHOLE_ROOF_AUDIT === '1')
    writeFileSync('.cache/bluehole-roof-collision.json', JSON.stringify(evidence, null, 2) + '\n');
  if (env?.VERIFY_1495 === '1')
    writeFileSync('.cache/1495/clearance.json', JSON.stringify(evidence, null, 2) + '\n');
});

function actualTerrain(tier: 'low' | 'medium' | 'high') {
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
  const index = apron.geometry.index;
  const triangles: THREE.Triangle[] = [];
  for (let i = 0; i < (index?.count ?? positions.count); i += 3)
    triangles.push(
      new THREE.Triangle(
        new THREE.Vector3()
          .fromBufferAttribute(positions, index ? index.getX(i) : i)
          .applyMatrix4(apron.matrixWorld),
        new THREE.Vector3()
          .fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1)
          .applyMatrix4(apron.matrixWorld),
        new THREE.Vector3()
          .fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2)
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

for (const tier of ['low', 'medium', 'high'] as const) {
  it(`${tier}: bounds roof proxy error and keeps deep contacts stable`, async () => {
    const terrain = actualTerrain(tier);
    const config = makeConfig();
    const radius = config.submarine.hullRadius;
    const props = new Props(terrain.meta, terrain, config.props, tier);
    try {
      await props.placeAll(doc, 'great-blue-hole');
      const hero = props.placed.find((p) => p.def.id === 'karst-grotto-east')!;
      const roof = hero.full.getObjectByName('grotto-overhang') as THREE.Mesh;
      const triangles = renderedTriangles(roof);
      const ray = new THREE.Raycaster();
      const probes: {
        x: number;
        penetration: number;
        hit: boolean;
        clearance: number;
        stable: number;
      }[] = [];
      for (const x of [-16, -8, 0, 8, 16]) {
        const top = new THREE.Vector3(x, 100, -14).applyMatrix4(roof.matrixWorld);
        ray.set(top, new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(roof)[0];
        expect(hit).toBeDefined();
        for (const penetration of [0.4, 2.5]) {
          const p = hit.point.clone().add(new THREE.Vector3(0, radius - penetration, 0));
          const n = new THREE.Vector3();
          const collided = props.collide(p, radius, n);
          const clearance = distance(triangles, p);
          const repeated = p.clone();
          props.collide(repeated, radius, new THREE.Vector3());
          probes.push({ x, penetration, hit: collided, clearance, stable: repeated.distanceTo(p) });
        }
      }
      evidence.push({ tier, roof: probes });
      expect(probes).toHaveLength(10);
      // Raised roof faces must register shallow contacts too. Keep the tighter
      // shallow-contact budget; deep contacts retain the coarse wall proxy budget.
      for (const p of probes) {
        expect(p.clearance, `roof clearance at ${p.x}/${p.penetration}`).toBeGreaterThanOrEqual(
          radius - 0.85,
        );
        expect(p.stable).toBeLessThan(1e-4);
        expect(p.hit, `roof contact at ${p.x}/${p.penetration}`).toBe(true);
        if (p.penetration === 0.4) expect(p.clearance).toBeGreaterThanOrEqual(radius - 0.43);
      }
      // The roof proxy must still leave independently clear water above the gallery open.
      const top = Math.max(...triangles.flatMap((t) => [t.a.y, t.b.y, t.c.y]));
      for (const x of [-16, -8, 0, 8, 16]) {
        const clear = new THREE.Vector3(x, 0, -14).applyMatrix4(roof.matrixWorld);
        clear.y = top + radius + 1;
        expect(distance(triangles, clear)).toBeGreaterThan(radius);
        const before = clear.clone();
        expect(props.collide(clear, radius, new THREE.Vector3())).toBe(false);
        expect(clear).toEqual(before);
      }
    } finally {
      terrain.dispose();
    }
  });

  it(`${tier}: roof gaps and varied pendants retain hull collision coverage`, async () => {
    const terrain = actualTerrain(tier);
    const config = makeConfig();
    const radius = config.submarine.hullRadius;
    const props = new Props(terrain.meta, terrain, config.props, tier);
    try {
      await props.placeAll(doc, 'great-blue-hole');
      const hero = props.placed.find((p) => p.def.id === 'karst-grotto-east')!;
      const rows = [];
      for (const name of ['grotto-overhang', 'stalactite-gallery']) {
        const mesh = hero.full.getObjectByName(name) as THREE.Mesh;
        const triangles = renderedTriangles(mesh);
        let missed = 0,
          contacts = 0,
          minClearance = Infinity,
          maxStable = 0;
        const stride = Math.max(1, Math.floor(triangles.length / 120));
        for (let i = 0; i < triangles.length; i += stride) {
          const triangle = triangles[i];
          const normal = triangle.getNormal(new THREE.Vector3());
          if (normal.lengthSq() < 0.5) continue;
          for (const sign of [-1, 1]) {
            const p = triangle
              .getMidpoint(new THREE.Vector3())
              .addScaledVector(normal, sign * (radius - 0.4));
            if (!props.collide(p, radius, new THREE.Vector3())) missed++;
            minClearance = Math.min(minClearance, distance(triangles, p));
            const repeated = p.clone();
            props.collide(repeated, radius, new THREE.Vector3());
            maxStable = Math.max(maxStable, repeated.distanceTo(p));
            contacts++;
          }
        }
        rows.push({ name, contacts, missed, minClearance, maxStable });
      }
      const roof = hero.full.getObjectByName('grotto-overhang') as THREE.Mesh;
      const gaps = [];
      for (const u of [-0.12, 0.175, -0.4]) {
        const x = u * hero.def.dimensionsM![0];
        for (const z of [-8, -14, -20]) {
          const origin = new THREE.Vector3(x, 100, z).applyMatrix4(roof.matrixWorld);
          const hit = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0)).intersectObject(
            roof,
          )[0];
          if (!hit) continue;
          const local = roof.worldToLocal(hit.point.clone());
          const tops = hero
            .localColliders!.filter(
              (b) => b.min.x <= x && b.max.x >= x && b.min.z <= z && b.max.z >= z,
            )
            .map((b) => b.max.y);
          gaps.push({ x, z, meshTop: local.y, colliderTop: Math.max(...tops) });
        }
      }
      evidence.push({ tier, coverage: rows, gaps, colliderCount: hero.colliders.length });
      for (const row of rows) {
        expect(row.contacts).toBeGreaterThan(200);
        expect(row.missed).toBe(0);
        expect(row.minClearance).toBeGreaterThanOrEqual(radius - 1e-4);
        expect(row.maxStable).toBeLessThan(1e-4);
      }
      // The two interior cuts must lower the collision ceiling with the mesh.
      // The outer cut is buried in the pinched terrain join and can meet talus boxes.
      expect(gaps).toHaveLength(8);
      const interiorCuts = gaps.filter((g) => g.x > -20 && g.z === -14);
      expect(interiorCuts).toHaveLength(2);
      for (const gap of interiorCuts) {
        expect(gap.colliderTop).toBeGreaterThanOrEqual(gap.meshTop - 1e-4);
        expect(gap.colliderTop - gap.meshTop).toBeLessThan(1);
        expect(gap.colliderTop).toBeLessThan(9);
      }
    } finally {
      props.dispose();
      terrain.dispose();
    }
  });

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
        // Denser coverage retains enough clear-water probes after covering every pendant.
        const stride = Math.max(1, Math.floor(triangles.length / 320));
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
              if (p.distanceToSquared(c.center) > (c.boundRadius + radius) ** 2) continue;
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
        expect(contacts).toBeGreaterThan(400);
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
