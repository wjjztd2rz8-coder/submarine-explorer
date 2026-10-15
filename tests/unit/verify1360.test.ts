// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { TileMeta } from '../../src/util/types.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import { spawnSettings } from '../../src/game/Spawn.js';
import { composedFreeDiveSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Scatter } from '../../src/world/scatter/Scatter.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import { talusMeshSampler } from '../../src/world/props/geo/talus.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const evidence: unknown[] = [];
afterAll(() => {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.VERIFY_1360 === '1')
    writeFileSync('.cache/1360/geometry.json', JSON.stringify(evidence, null, 2) + '\n');
});

function terrainFor(site: string, tier: 'low' | 'high') {
  const config = makeConfig();
  const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
  const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
  return new Terrain(
    { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
    config.terrain,
    tier,
  );
}

/** Test triangle edges in both directions; a bounding-box overlap alone is not a collision. */
function surfacesCross(a: THREE.Mesh, b: THREE.Object3D): boolean {
  const ray = new THREE.Raycaster();
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const meshes: THREE.Mesh[] = [];
  b.traverse((o) => {
    if (o instanceof THREE.Mesh) meshes.push(o);
  });
  for (const [source, targets] of [[a, meshes], ...meshes.map((mesh) => [mesh, [a]])] as [
    THREE.Mesh,
    THREE.Mesh[],
  ][]) {
    const positions = source.geometry.getAttribute('position');
    const indices = source.geometry.index;
    const count = indices?.count ?? positions.count;
    for (let i = 0; i < count; i += 3)
      for (let edge = 0; edge < 3; edge++) {
        const ia = i + edge,
          ib = i + ((edge + 1) % 3);
        start
          .fromBufferAttribute(positions, indices ? indices.getX(ia) : ia)
          .applyMatrix4(source.matrixWorld);
        end
          .fromBufferAttribute(positions, indices ? indices.getX(ib) : ib)
          .applyMatrix4(source.matrixWorld);
        const delta = end.clone().sub(start);
        if (delta.length() < 1e-6) continue;
        ray.set(start, delta.clone().normalize());
        ray.near = 0;
        ray.far = delta.length();
        if (ray.intersectObjects(targets, false).length) return true;
      }
  }
  return false;
}

for (const tier of ['low', 'high'] as const) {
  it(`1360 Blue Hole ${tier}: audit actual apron triangles and contacts`, async () => {
    const config = makeConfig();
    const terrain = terrainFor('great-blue-hole', tier);
    const props = new Props(terrain.meta, terrain, config.props, tier);
    try {
      await props.placeAll(json('data/landmarks/great-blue-hole/props.json'), 'great-blue-hole');
      expect(props.stats.failed).toBe(0);
      props.group.updateMatrixWorld(true);
      for (const hero of props.placed.filter((p) => p.def.feature === 'stalactite-cluster')) {
        const apron = hero.full.getObjectByName('grotto-sediment-apron') as THREE.Mesh;
        const rocks = hero.full.getObjectByName('fallen-blocks') as THREE.InstancedMesh;
        const positions = apron.geometry.getAttribute('position');
        let stride = 1;
        while (positions.getX(stride) === positions.getX(0)) stride++;
        const sample = talusMeshSampler(apron.geometry, positions.count / stride - 1, stride - 1);
        const inverse = apron.matrixWorld.clone().invert();
        const skin = (x: number, z: number): number | undefined => {
          const point = new THREE.Vector3(x, 0, z).applyMatrix4(inverse);
          const y = sample(point.x, point.z);
          return y === undefined ? undefined : point.setY(y).applyMatrix4(apron.matrixWorld).y;
        };
        let floating = 0;
        let maximumGap = -Infinity;
        const matrix = new THREE.Matrix4();
        const world = new THREE.Matrix4();
        const vertices = rocks?.geometry.getAttribute('position');
        for (let i = 0; i < (rocks?.count ?? 0); i++) {
          rocks.getMatrixAt(i, matrix);
          world.multiplyMatrices(rocks.matrixWorld, matrix);
          let gap = Infinity;
          for (let j = 0; j < vertices!.count; j++) {
            const p = new THREE.Vector3().fromBufferAttribute(vertices!, j).applyMatrix4(world);
            const y = skin(p.x, p.z);
            if (y !== undefined) gap = Math.min(gap, p.y - y);
          }
          if (Number.isFinite(gap)) {
            expect(gap, `${hero.def.id}: rendered rock is embedded`).toBeLessThan(1e-5);
            maximumGap = Math.max(maximumGap, gap);
            if (gap > 0.02) floating++;
          }
        }
        let missed = 0;
        let contacts = 0;
        let unresolved = 0;
        const index = apron.geometry.index!;
        const triangles: THREE.Triangle[] = [];
        for (let i = 0; i < index.count; i += 3) {
          triangles.push(
            new THREE.Triangle(
              new THREE.Vector3().fromBufferAttribute(positions, index.getX(i)),
              new THREE.Vector3().fromBufferAttribute(positions, index.getX(i + 1)),
              new THREE.Vector3().fromBufferAttribute(positions, index.getX(i + 2)),
            ),
          );
        }
        const closest = new THREE.Vector3();
        for (let i = 0; i < index.count; i += 18) {
          const p = new THREE.Vector3();
          for (let j = 0; j < 3; j++)
            p.add(new THREE.Vector3().fromBufferAttribute(positions, index.getX(i + j)));
          p.divideScalar(3).applyMatrix4(apron.matrixWorld);
          if (p.y - terrain.sampleHeight(p.x, p.z) < 1) continue;
          const centre = p.clone().add(new THREE.Vector3(0, config.submarine.hullRadius - 0.4, 0));
          contacts++;
          if (!props.collide(centre, config.submarine.hullRadius, new THREE.Vector3())) missed++;
          const localCentre = centre.clone().applyMatrix4(inverse);
          if (
            triangles.some(
              (triangle) =>
                triangle.closestPointToPoint(localCentre, closest).distanceTo(localCentre) <
                config.submarine.hullRadius - 1e-4,
            )
          )
            unresolved++;
        }
        expect(floating, `${hero.def.id}: every block touches the rendered apron`).toBe(0);
        expect(contacts).toBeGreaterThan(0);
        expect(missed, `${hero.def.id}: all sampled contacts reach a collider`).toBe(0);
        expect(
          unresolved,
          `${hero.def.id}: resolved hull clears every rendered apron triangle`,
        ).toBe(0);
        evidence.push({
          site: 'great-blue-hole',
          tier,
          hero: hero.def.id,
          rocks: rocks?.count ?? 0,
          floating,
          maximumGap,
          contacts,
          missed,
          unresolved,
        });
      }
    } finally {
      terrain.dispose();
    }
  });

  it(`1360 Challenger ${tier}: enlarged boulders clear opening volumes and camera arms`, async () => {
    const config = makeConfig();
    const site = 'challenger-deep';
    const terrain = terrainFor(site, tier);
    const props = new Props(terrain.meta, terrain, config.props, tier);
    let scatter: Scatter | undefined;
    try {
      await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
      const pose = composedFreeDiveSpawn(
        site,
        terrain.meta,
        terrain,
        props,
        spawnSettings(config),
        -11000,
        config.camera,
      )!;
      const position = new THREE.Vector3(pose.x, pose.y, pose.z);
      const hero = props.placed.find((p) => p.def.id === 'leggo-lander-marker')!;
      props.group.updateMatrixWorld(true);
      const heroBounds = hero.localBounds.clone().applyMatrix4(hero.root.matrixWorld);
      vi.stubGlobal('document', {});
      const normal = new THREE.Vector3();
      const tierConfig = config.terrain.tiers[tier];
      scatter = new Scatter({
        biome: biomeFor(site),
        ground: {
          sampleHeight: (x, z) => terrain.sampleHeight(x, z),
          contains: (x, z) => terrain.contains(x, z),
          normalAt: (x, z, out) => {
            terrain.getNormal(x, z, normal);
            out[0] = normal.x;
            out[1] = normal.y;
            out[2] = normal.z;
          },
        },
        density: tierConfig.scatterDensity,
        rangeM: tierConfig.scatterRangeM,
        seed: config.terrain.detailSeed ^ hashString(site),
        rockLo: 1 - Math.cos((config.terrain.rockSlopeLoDeg * Math.PI) / 180),
        rockHi: 1 - Math.cos((config.terrain.rockSlopeHiDeg * Math.PI) / 180),
      });
      vi.unstubAllGlobals();
      for (const [width, height] of [
        [1600, 900],
        [844, 390],
        [390, 844],
      ]) {
        const rig = new CameraRig(config.camera, width / height, terrain);
        rig.setChaseRadiusDefault(
          pose.chaseRadius,
          pose.chaseOffsetX,
          pose.chaseOffsetY,
          pose.portraitChaseOffset,
        );
        rig.snap(position, pose.yaw, 0);
        for (let i = 0; i < 128; i++) scatter.update(rig.camera);
        const before = scatter.group.children.map((o) => {
          const mesh = o as THREE.InstancedMesh;
          return {
            name: mesh.name,
            count: mesh.count,
            triangles:
              (mesh.count *
                (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count)) /
              3,
            matrices: mesh.instanceMatrix.array.slice(),
          };
        });
        const beforeDraws = scatter.stats.drawCalls;
        scatter.setBoulderKeepout(heroBounds);
        scatter.update(rig.camera);
        expect(scatter.stats.drawCalls).toBe(beforeDraws);
        for (const [i, o] of scatter.group.children.entries()) {
          const mesh = o as THREE.InstancedMesh;
          if (tier === 'low' || mesh.name !== 'scatter:boulder') {
            expect(mesh.count).toBe(before[i].count);
            expect(
              (mesh.count *
                (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count)) /
                3,
            ).toBe(before[i].triangles);
            expect(mesh.instanceMatrix.array).toEqual(before[i].matrices);
          }
        }
        scatter.group.updateMatrixWorld(true);
        const rocks = scatter.group.getObjectByName('scatter:boulder') as THREE.InstancedMesh;
        rocks.geometry.computeBoundingBox();
        const matrix = new THREE.Matrix4();
        const probe = new THREE.Mesh(
          rocks.geometry,
          new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
        );
        let spawnGap = Infinity,
          eyeGap = Infinity,
          armGap = Infinity,
          landerHits = 0,
          landerCandidates = 0;
        for (let i = 0; i < rocks.count; i++) {
          rocks.getMatrixAt(i, matrix);
          const box = rocks.geometry
            .boundingBox!.clone()
            .applyMatrix4(matrix.premultiply(rocks.matrixWorld));
          const arm = position.clone().sub(rig.camera.position);
          const hit = new THREE.Ray(rig.camera.position, arm.clone().normalize()).intersectBox(
            box.clone().expandByScalar(1),
            new THREE.Vector3(),
          );
          expect(
            hit && hit.distanceTo(rig.camera.position) <= arm.length(),
            'whole opening camera arm clears boulders by 1 m',
          ).toBeFalsy();
          spawnGap = Math.min(
            spawnGap,
            box.distanceToPoint(position) - config.submarine.hullRadius,
          );
          eyeGap = Math.min(eyeGap, box.distanceToPoint(rig.camera.position));
          if (box.intersectsBox(heroBounds)) {
            landerCandidates++;
            probe.matrixWorld.copy(matrix);
            if (surfacesCross(probe, hero.full)) landerHits++;
          }
          for (let j = 0; j <= 100; j++)
            armGap = Math.min(
              armGap,
              box.distanceToPoint(rig.camera.position.clone().lerp(position, j / 100)),
            );
        }
        evidence.push({
          site,
          tier,
          viewport: [width, height],
          pose,
          boulders: rocks.count,
          spawnGap,
          eyeGap,
          armGap,
          landerCandidates,
          landerHits,
          triangles: scatter.group.children.reduce((sum, o) => {
            const mesh = o as THREE.InstancedMesh;
            return (
              sum +
              (mesh.count *
                (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count)) /
                3
            );
          }, 0),
          trianglesBefore: before.reduce((sum, mesh) => sum + mesh.triangles, 0),
          stats: { ...scatter.stats },
        });
        probe.material.dispose();
        expect(landerHits).toBe(0);
        expect(landerCandidates).toBe(0);
        expect(spawnGap).toBeGreaterThan(0);
        expect(eyeGap).toBeGreaterThan(1);
        expect(armGap).toBeGreaterThan(1);
      }
    } finally {
      vi.unstubAllGlobals();
      scatter?.dispose();
      terrain.dispose();
    }
  });
}
