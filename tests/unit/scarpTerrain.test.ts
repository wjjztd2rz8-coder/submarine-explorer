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
// Geometry includes the distant impostor; only collision reflects the mesh-
// clipped depth extents. Placement and material contracts remain independent.
const scarpBaseline: Record<string, string[]> = {
  'tuff-low': [
    'e96e7ab77c81d31df191e3b680e9de128f38608895a5fa203ed754aa5d6d211e',
    '18b7e7ec183937dc9ba6296cb75fa34e1c48253df3c93f66f83a0113790de95b',
    '9a0255067cba24ebae01497072a0e9e4e544b768adadb0bdc85f8708b029d68a',
    'f64de787b57029e6f9a5bd32f04d99954a6d2b162a3f163ce25aaaae0ce2a1b2',
  ],
  'tuff-medium': [
    '09cff40c8dac45c2c42b547ab6ae230b404ead41bd6f0097d5fd8ddef0db3afb',
    'b3e02644e65503abd5ddbf48e17b2abdfeeac5fee6e61c30106005c5b46c7071',
    'db463017008dfc3080e0e2a04c076c436c48c888dac7fb77670374f9fc0e6c92',
    'dd87c3d418eb12fbafb1e4c5a4e6553c213ff24e2f126327efb71e50772f4f76',
  ],
  'tuff-high': [
    'a0c4cc9c640fba93a326c56fa1d41100860ae8567f1c5b3d975b9af204d7be8c',
    'cf2189a1ddc14a8be492f4cf3c1710620e02664cb2ada9a5c52bef5ea8d05c94',
    'db463017008dfc3080e0e2a04c076c436c48c888dac7fb77670374f9fc0e6c92',
    '6957eb6dd98a1c6b35e13c618db11941e8204e45eab9fed6f9531d4a121e6c47',
  ],
  'canyon-low': [
    'a59694039df1257d8887a9756e06df631427481bdea775a10030526e7d40fe68',
    '1031d523ff67aab3d97e8a844057f0d694936f9e435385d3e33a4067addbabdd',
    'c0ce84f8b2a58ea34282403f409ba1553abd4189f2fd51f27d985f7851b590e7',
    'cb8ba17f3e48a41a087e7295016fdc544838a3a28c9a24d15eca002f998257c3',
  ],
  'canyon-medium': [
    '024707cf61dee7b76ac0c500c9e5ad989af13b2cf9e1a3d35d35101472f86720',
    '4967421bc68ddf81cfe60b55e8356e653b9c89c29efa41426e189945f0e72630',
    '48dfcfadac6e78d878afec47647a72b68d520994c0b711b26cc4e62aa7ea91b4',
    'fa275ed9e78291b44f8e620174d0e040e6a18781d983c7c388afbc73b2958de2',
  ],
  'canyon-high': [
    'cb8b5dad2113804674f0afdb9614fac8a70411ae96a6f1a1011d01042503d35f',
    'df69fff0636a7e4c8d3bec0bb8dd8e0dadd6bc0ccdc6c66d07fe628d6207d817',
    '48dfcfadac6e78d878afec47647a72b68d520994c0b711b26cc4e62aa7ea91b4',
    'c73fae1f813e90917cb6178ef492ecdeccd7a344348a1ca2a14e373b910791fa',
  ],
  'hadal-low': [
    'a71578ade963941be6625523d7665e0a3c4bdc5973923acd50e141e6cc2c3087',
    'acf440dfd5b22af1084fa1315766c7540efca512411b1027f0f5013bb7eb55a9',
    '45f29b7cd06c5b28a61261f20734b8e6a0bfcbef2666a2da33f52cfb04fed595',
    '78dbe93a244c2ceabbf3e7098ab0ae4d5b12098a104f570d18984442096ca366',
  ],
  'hadal-medium': [
    '7d54846e679300efe2a101bf814186a8bc6efca27fe3b4d4e708d873989567e5',
    'fbb7493f6b04608e06735689d085756c4d01c7475ec4edc6622b24e0147a2ad8',
    'a2b8093d4198d54331faa284d0f3a6f4e00f03c6d4ec334b1a50ac43d6b07c8a',
    'c69fc1a9d3e7a20f919313e04e6b74df837d962ab62319948fb14e8bf770d8dd',
  ],
  'hadal-high': [
    '39db010d5afc391a654ceeca20d4524005cdfb7e70529928f3a1cb7da932b7b3',
    '9f8492eeb54d9689cddf82a640957c848c5a783558b922bd9a301712be17b805',
    'a2b8093d4198d54331faa284d0f3a6f4e00f03c6d4ec334b1a50ac43d6b07c8a',
    'd0ef0b099cd4c375f03523272667d112c4e7179496054c1c6fbeadb33346bc3c',
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
