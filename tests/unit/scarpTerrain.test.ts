// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Terrain } from '../../src/world/Terrain.js';
import { geoDetail } from '../../src/world/props/geo/detail.js';
import { buildScarp, type ScarpPresetId } from '../../src/world/props/geo/scarp.js';
import type { BuiltProp } from '../../src/world/props/geo/shared.js';
import type { PropDef } from '../../src/world/PropLoader.js';

describe('Monterey wall anchors on the real sloping tile', () => {
  it.each(['low', 'medium', 'high'] as const)(
    '%s: every instance clears the seabed and exposed growth keeps its requested counts',
    async (tier) => {
      const meta = JSON.parse(
        readFileSync('data/tiles/monterey-canyon/meta.json', 'utf8'),
      ) as TileMeta;
      const bytes = readFileSync('data/tiles/monterey-canyon/heightmap.bin');
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const config = makeConfig();
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      try {
        const content = JSON.parse(
          readFileSync('data/landmarks/monterey-canyon/props.json', 'utf8'),
        );
        content.props = content.props.filter((p: { id: string }) => p.id === 'canyon-wall-ledge');
        await props.load('props.json', 'monterey-canyon', async () => content);
        expect(props.stats.failed).toBe(0);
        const hero = props.placed[0]!;
        hero.root.updateMatrixWorld(true);
        const height = hero.localBounds.max.y - hero.localBounds.min.y;
        let count = 0;
        let boulders = 0;
        let sponges = 0;
        let corals = 0;
        hero.full.traverse((o) => {
          const mesh = o as InstancedMesh;
          if (!mesh.isInstancedMesh) return;
          const growth = /^wall-(sponges|corals)-/.test(mesh.name);
          if (mesh.name.startsWith('wall-sponges-')) sponges += mesh.count;
          if (mesh.name.startsWith('wall-corals-')) corals += mesh.count;
          const m = new Matrix4();
          const p = new Vector3();
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, m);
            p.setFromMatrixPosition(m.premultiply(mesh.matrixWorld));
            const clearance = p.y - terrain.sampleHeight(p.x, p.z);
            const label = `${mesh.name}[${i}]`;
            count++;
            // Keep the browser gate's bounds for ALL instances, including wall life.
            expect(clearance, label).toBeGreaterThan(-3);
            expect(clearance, label).toBeLessThan(height * 0.5);
            // Growth anchors must be exposed, not merely within the rock tolerance.
            if (growth) expect(clearance, label).toBeGreaterThanOrEqual(-1e-4);
            if (mesh.name.startsWith('boulders-')) {
              boulders++;
              expect(clearance, `${label}: rock exposed above seabed`).toBeGreaterThan(0);
            }
          }
        });
        expect(count).toBeGreaterThan(20);
        const growth = Math.min(geoDetail(tier).growth, 1.2);
        expect(boulders).toBe(tier === 'low' ? 0 : Math.round(160 * geoDetail(tier).growth));
        expect(sponges).toBe(Math.round(90 * growth));
        expect(corals).toBe(Math.round(70 * growth));
        if (tier === 'medium') {
          expect(count).toBe(192);
          // Buried-face culling must retain every exposed triangle of the dense grid.
          // Probe omitted faces in world space against the real rendered terrain.
          const wall = hero.full.children[0] as THREE.Mesh;
          const pos = wall.geometry.getAttribute('position');
          const index = wall.geometry.getIndex()!;
          const kept = new Set<string>();
          for (let i = 0; i < index.count; i += 3)
            kept.add(`${index.getX(i)},${index.getX(i + 1)},${index.getX(i + 2)}`);
          const [nx, ny] = config.terrain.fidelity![meta.id]!.wallSegments.medium;
          const a = new Vector3(),
            b = new Vector3(),
            c = new Vector3(),
            p = new Vector3();
          let omitted = 0;
          let highestClearance = -Infinity;
          for (let x = 0; x < nx; x++)
            for (let y = 0; y < ny; y++) {
              const start = x * (ny + 1) + y;
              const next = start + ny + 1;
              for (const triangle of [
                [start, start + 1, next],
                [start + 1, next + 1, next],
              ]) {
                if (kept.has(triangle.join(','))) continue;
                omitted++;
                a.fromBufferAttribute(pos, triangle[0]);
                b.fromBufferAttribute(pos, triangle[1]);
                c.fromBufferAttribute(pos, triangle[2]);
                for (let u = 0; u <= 3; u++)
                  for (let v = 0; v <= 3 - u; v++) {
                    p.copy(a)
                      .multiplyScalar(u / 3)
                      .addScaledVector(b, v / 3)
                      .addScaledVector(c, 1 - (u + v) / 3);
                    hero.root.localToWorld(p);
                    highestClearance = Math.max(
                      highestClearance,
                      p.y - terrain.sampleHeight(p.x, p.z),
                    );
                  }
              }
            }
          expect(omitted).toBeGreaterThan(0);
          expect(highestClearance).toBeLessThan(0);
        }
      } finally {
        terrain.dispose();
      }
    },
  );
});

// Exact numerical contracts from the original builder, including buffers that
// reveal shifted rubble/life RNG draws. UUIDs are deliberately excluded.
function scarpObservations(built: BuiltProp) {
  const geometry = createHash('sha256');
  const placement = createHash('sha256');
  const materials = createHash('sha256');
  const collision = createHash('sha256');
  const geometries = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const json = (hash: typeof geometry, value: unknown) => hash.update(JSON.stringify(value));
  const attribute = (
    hash: typeof geometry,
    a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null,
  ) => {
    if (!a) {
      json(hash, null);
      return;
    }
    const array = a.array;
    json(hash, [array.constructor.name, a.itemSize, a.count, a.normalized]);
    hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
  };
  for (const root of [built.full, built.impostor]) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      json(placement, [
        o.type,
        o.name,
        o.children.length,
        o.matrix.elements,
        o.visible,
        o.frustumCulled,
        o.renderOrder,
      ]);
      const mesh = o as THREE.Mesh | THREE.Points;
      if (!mesh.geometry) return;
      const g = mesh.geometry;
      geometries.add(g);
      json(geometry, [o.name, g.groups, g.drawRange, g.boundingBox, g.boundingSphere]);
      for (const key of Object.keys(g.attributes).sort()) {
        json(geometry, key);
        attribute(geometry, g.getAttribute(key));
      }
      attribute(geometry, g.index);
      const instance = o as THREE.InstancedMesh;
      if (instance.isInstancedMesh) {
        json(placement, instance.count);
        attribute(placement, instance.instanceMatrix);
        attribute(placement, instance.instanceColor);
      }
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const sharedIndex = [...mats].indexOf(m);
        json(materials, sharedIndex);
        if (sharedIndex >= 0) continue;
        mats.add(m);
        const { uuid: _uuid, ...parameters } = m.toJSON();
        // Exercise shader hooks as string transforms; no renderer is constructed.
        const shader = {
          uniforms: {},
          vertexShader: 'void main() {\n#include <begin_vertex>\ngl_PointSize = size;\n}',
          fragmentShader:
            'void main() {\n#include <emissivemap_fragment>\n#include <normal_fragment_maps>\n#include <color_fragment>\n#include <map_particle_fragment>\n}',
        };
        m.onBeforeCompile(
          shader as Parameters<typeof m.onBeforeCompile>[0],
          {} as THREE.WebGLRenderer,
        );
        json(materials, [parameters, m.customProgramCacheKey(), shader]);
      }
    });
  }
  json(collision, [built.bounds, built.colliders, built.collisionSurfaces ?? []]);
  const result = [geometry, placement, materials, collision].map((hash) => hash.digest('hex'));
  // The ownership graph remains disposable without allocating a WebGL context.
  for (const resource of [...geometries, ...mats]) {
    let events = 0;
    resource.addEventListener('dispose', () => events++);
    resource.dispose();
    expect(events).toBe(1);
  }
  return result;
}

const scarpKinds: ScarpPresetId[] = ['tuff', 'canyon', 'hadal'];
const scarpTiers = ['low', 'medium', 'high'] as const;
const slope = (x: number, z: number) => 0.045 * x + 0.025 * z;

// Each digest combines a small flat, unsnapped wall (seed 42) and a larger
// terrain-following wall (seed 17), covering both groundHeight paths.
const scarpBaseline: Record<string, string[]> = {
  'tuff-low': [
    'b40f1b9300ae6b2f351077199774079a9a3a3f355f0edcf2fe347f9f349c7f4d',
    '18b7e7ec183937dc9ba6296cb75fa34e1c48253df3c93f66f83a0113790de95b',
    '54d9f5bd1c5aa439d7894342e18d1a64c3012c3306246091c1a2ba2334cb15d6',
    '2eb7876c149802ef4811237908f7d2e1526cd8d9dc95e2d89cc7f8c93441d640',
  ],
  'tuff-medium': [
    '04092fa2eda09bef70e348f838fe7205adca8a6687eb6a12dbb6c668aa54e9f9',
    '1bf3c274ee29b15fa4ea1d0289d04f077b90cc248dae5e25825e561f0d8202a7',
    'd9b5179cf5fa338c3f0ef468096ece4376a72afd4df38ae85b33621b6841214e',
    '388cd94d98fa1c127288b93e5d9051257f0d7469c75ce57c11788ac5b8f76c0e',
  ],
  'tuff-high': [
    '573d0b79245830eeba20d9f4979cd4fae6edeb62bada82826cc165868d4a5724',
    'aec654474b0dc667ab84a6caa19448032b6a5c13c7a384c8c62700c483e3dc62',
    'd9b5179cf5fa338c3f0ef468096ece4376a72afd4df38ae85b33621b6841214e',
    '4d8e50adb9da01413cdb925e189b066d407a6aef77708b2da1024478051429c4',
  ],
  'canyon-low': [
    '51a60d18785aee4ac2e52a450d826ef2c908978fe23aff51a329156e9f2a66f1',
    '730c5157ed3ff6fb0aa9eb5283cfc0d043ac355e7927e61797dc3f8f46e57514',
    '371f5fbf11f94644e522c2018d0820bf0ecdfd94d4fd6108b214d5d37a4d88de',
    '05a42aac242dcc1808f22984806a8ab9286514c4c3603b28c9ffccbb618a4db9',
  ],
  'canyon-medium': [
    'd96e0fb2a9a778df71ec0ef659623f5f21bee28828cf9f269770ccc3282fae4e',
    'a4fe85103e794a6da06121c879a49ad0f547d617cf83d3ffdd9ba12649dc9213',
    '06e9fe44edb1a8ba102681bb70b4ca9f9e77022ec53943336d7b2a085c049d67',
    '8d8c814d4f03603ab3229481ebb45b5f04a44b3786672eb3e2f2fa2db44915f2',
  ],
  'canyon-high': [
    'c4fa5c3e87063d3c6dc1dec9d1578bb02b8f3e8c693b99dce93955b965ac5ad6',
    'c8f2ecacc4cf34763d86eeb64ccc9ee959f11e72377f3bda81f22d09e1a58dd6',
    '06e9fe44edb1a8ba102681bb70b4ca9f9e77022ec53943336d7b2a085c049d67',
    'adcb4b3aa1293098d857e52209962eed1089e2743176c82d836b11e0a6477c94',
  ],
  'hadal-low': [
    'a71578ade963941be6625523d7665e0a3c4bdc5973923acd50e141e6cc2c3087',
    'acf440dfd5b22af1084fa1315766c7540efca512411b1027f0f5013bb7eb55a9',
    '45f29b7cd06c5b28a61261f20734b8e6a0bfcbef2666a2da33f52cfb04fed595',
    'd17b24bd81465e97317238d1b6533cd5292dc0b261c513bd9c4c6424e4129b45',
  ],
  'hadal-medium': [
    '7d54846e679300efe2a101bf814186a8bc6efca27fe3b4d4e708d873989567e5',
    'fbb7493f6b04608e06735689d085756c4d01c7475ec4edc6622b24e0147a2ad8',
    'a2b8093d4198d54331faa284d0f3a6f4e00f03c6d4ec334b1a50ac43d6b07c8a',
    'd5dba26b53088dea1c75fd629d7bc657d505aba483da9a18a84c10a8ebd9937f',
  ],
  'hadal-high': [
    '39db010d5afc391a654ceeca20d4524005cdfb7e70529928f3a1cb7da932b7b3',
    '9f8492eeb54d9689cddf82a640957c848c5a783558b922bd9a301712be17b805',
    'a2b8093d4198d54331faa284d0f3a6f4e00f03c6d4ec334b1a50ac43d6b07c8a',
    '0c62feb8e5bf6bfa6b8e8d84383b9c2f0bc056fab60047e0a140466a500001f1',
  ],
};

describe('scarp output equivalence', () => {
  for (const kind of scarpKinds) {
    it.each(scarpTiers)(
      `${kind} %s: retains geometry, placement, materials and collision`,
      (tier) => {
        const observations: string[][] = [];
        for (const sloping of [false, true]) {
          const built = buildScarp(kind, {
            def: { raw: {} } as PropDef,
            dims: sloping ? [70, 26, 36] : [32, 16, 24],
            seed: sloping ? 17 : 42,
            cfg: makeConfig().props,
            tier,
            groundHeight: () => (sloping ? slope : undefined),
          });
          const instances: Record<string, number> = {};
          built.full.traverse((o) => {
            const m = o as THREE.InstancedMesh;
            if (m.isInstancedMesh) instances[m.name] = m.count;
          });
          const count = (prefix: string) =>
            Object.entries(instances)
              .filter(([name]) => name.startsWith(prefix))
              .reduce((sum, [, n]) => sum + n, 0);
          const rubble = { tuff: 220, canyon: 160, hadal: 190 }[kind];
          expect(count('boulders-')).toBe(
            tier === 'low' ? 0 : Math.round(rubble * geoDetail(tier).growth),
          );
          const growth = Math.min(geoDetail(tier).growth, 1.2);
          expect(count('wall-sponges-')).toBe(kind === 'canyon' ? Math.round(90 * growth) : 0);
          expect(count('wall-corals-')).toBe(kind === 'canyon' ? Math.round(70 * growth) : 0);
          expect(built.full.children.filter((o) => o.type === 'Points')).toHaveLength(
            kind === 'tuff' ? 3 : 0,
          );
          expect(built.impostor.name).toBe('geo-impostor');
          expect(built.colliders!.every((b) => !b.isEmpty())).toBe(true);
          observations.push(scarpObservations(built));
        }
        const combined = [0, 1, 2, 3].map((i) =>
          createHash('sha256')
            .update(JSON.stringify(observations.map((o) => o[i])))
            .digest('hex'),
        );
        expect(combined).toEqual(scarpBaseline[`${kind}-${tier}`]);
      },
    );
  }
});

it('rejects offscreen steep terrain boxes in the elevated wall view without changing geometry', async () => {
  const meta = JSON.parse(readFileSync('data/tiles/monterey-canyon/meta.json', 'utf8')) as TileMeta;
  const bytes = readFileSync('data/tiles/monterey-canyon/heightmap.bin');
  const config = makeConfig();
  const terrain = new Terrain(
    { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
    config.terrain,
    'medium',
  );
  const props = new Props(meta, terrain, config.props, 'medium');
  try {
    await props.placeAll(
      JSON.parse(readFileSync('data/landmarks/monterey-canyon/props.json', 'utf8')),
      meta.id,
    );
    const hero = props.placed.find((p) => p.def.id === 'canyon-wall-ledge')!;
    hero.root.updateMatrixWorld(true);
    const b = hero.localBounds;
    const cx = (b.min.x + b.max.x) / 2;
    // Same elevated wall pose as the browser's view-budget guard.
    const position = hero.root.localToWorld(
      new Vector3(cx - 0.15 * (b.max.x - b.min.x), 0, b.min.z - 6),
    );
    const aim = hero.root.localToWorld(new Vector3(cx, 0, 0));
    position.y = Math.min(-2, terrain.sampleHeight(position.x, position.z) + 8);
    const yaw = Math.atan2(aim.x - position.x, -(aim.z - position.z));
    const rig = new CameraRig(config.camera, 1280 / 720, terrain);
    rig.setMode('orbit');
    rig.orbitRadius = 75;
    rig.orbitElevation = 0.6;
    rig.orbitAzimuth = Math.atan2(-Math.sin(yaw), Math.cos(yaw)) - 0.4;
    rig.snap(position, yaw, 0);
    const chunks = terrain.group.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh);
    const buffers = chunks.map((mesh) => mesh.geometry.getAttribute('position').array.slice());
    terrain.update(rig.camera);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(rig.camera.projectionMatrix, rig.camera.matrixWorldInverse),
    );
    let sphereTriangles = 0;
    let submitted = 0;
    for (const mesh of chunks) {
      const geometry = mesh.geometry;
      const triangles = geometry.index!.count / 3;
      const sphereInView = frustum.intersectsSphere(geometry.boundingSphere!);
      if (sphereInView) sphereTriangles += triangles;
      if (mesh.visible && sphereInView) submitted += triangles;
      if (!mesh.visible)
        expect(
          frustum.intersectsSphere(geometry.boundingSphere!) &&
            frustum.intersectsBox(geometry.boundingBox!),
        ).toBe(false);
    }
    // Regression: sphere-only culling submitted 101,760 fully offscreen triangles here.
    expect(sphereTriangles - submitted).toBeGreaterThanOrEqual(100_000);
    expect(terrain.stats.drawnTriangles).toBe(submitted);
    chunks.forEach((mesh, i) =>
      expect(mesh.geometry.getAttribute('position').array).toEqual(buffers[i]),
    );
    // A later viewpoint must restore visible chunks rather than leaving them hidden.
    rig.camera.position.set(0, 5000, 0);
    rig.camera.lookAt(0, 9000, 0);
    terrain.update(rig.camera);
    expect(chunks.every((mesh) => !mesh.visible)).toBe(true);
    rig.snap(position, yaw, 0);
    terrain.update(rig.camera);
    expect(terrain.stats.drawnTriangles).toBe(submitted);
  } finally {
    terrain.dispose();
  }
});
