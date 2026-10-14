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
import { Terrain } from '../../src/world/Terrain.js';
import { geoDetail } from '../../src/world/props/geo/detail.js';
import { buildScarp, type ScarpPresetId } from '../../src/world/props/geo/scarp.js';
import type { BuiltProp } from '../../src/world/props/geo/shared.js';
import type { PropDef } from '../../src/world/PropLoader.js';

describe('Monterey wall anchors on the real sloping tile', () => {
  it.each(['low', 'medium', 'high', 'ultra'] as const)(
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
        if (tier === 'medium') expect(count).toBe(192);
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
const scarpTiers = ['low', 'medium', 'high', 'ultra'] as const;
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
  'tuff-ultra': [
    '4ba21842ed2da7d0f72cad6bccaf03a082644f22d5b7ab56096289c5299a40b2',
    '4dff5edb487e6b5716d798399dc02436e6d4a39240a0b4c0ed409c969f8f1c47',
    'd9b5179cf5fa338c3f0ef468096ece4376a72afd4df38ae85b33621b6841214e',
    'f1648f65d53f34171bece5a0a69c1f61cb8b2a21049188faa9c9233f0b5612a4',
  ],
  'canyon-low': [
    '49fb77c72c521fe20771a6d570ca37d8e8d81cd50f9756c8740bcd72382747ee',
    'f2a610d7d3a9f202b7fa35be81b8f0ccb67638256327807cfb080cc2ff4bc346',
    '371f5fbf11f94644e522c2018d0820bf0ecdfd94d4fd6108b214d5d37a4d88de',
    'd9c8e5e3c42da7cab629af6e1bb8e9d59d94cd6c27495b2de7d219b1ff336cf4',
  ],
  'canyon-medium': [
    '2fa9d2dbfb81d269e16459c9709ca0f78033261d2c58560922e8bb5309fdd100',
    'eca9379583d76351604de0798846c9c2254604fb2ecf705f86f92457e7bf7837',
    'c799bedaae7fffa61896021f4d01c9ebbd7fa5bdbd2da46c29ce61da779944f8',
    'f1464d7bdf706892714fc56315dde7eeaf7964a36f89a7f5905b3db1fe03cd33',
  ],
  'canyon-high': [
    '6cfa3247e9de85c36ba2360ba4abea9453c864a03f954d8c32e5e38319d7b0f2',
    'ecaf293631897100f1bb2f52938bf7e60ee459195e20ee6269e4c9fc56aa117b',
    'c799bedaae7fffa61896021f4d01c9ebbd7fa5bdbd2da46c29ce61da779944f8',
    'b31c55238f554318f9d498ff0122f4e84671d17e4f3ded786871c6aff785d727',
  ],
  'canyon-ultra': [
    'a441f856e2c2c52f5aab1d39f719555491ea2d4838f8d80bd786834df3f13fe8',
    '7c1689d36cbe8aa45f0200a97d59587ae2a7e16b719f2dcc5fcc5ab1bcabd4c6',
    'c799bedaae7fffa61896021f4d01c9ebbd7fa5bdbd2da46c29ce61da779944f8',
    '472c6e72930e2a3011ee7b4a1437a6dff003a6e4f1ae356d0373bcada30ca319',
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
  'hadal-ultra': [
    '5064425cb79bb78e0f89e6103edb1b9ae66b9376884c96f89544541e0d284747',
    '78e0b37cc2983edb1ffdfd1effa90cd70204bfca371826821e262b16c04bfe01',
    'a2b8093d4198d54331faa284d0f3a6f4e00f03c6d4ec334b1a50ac43d6b07c8a',
    'c1cf88db6c1394de2a9892d732c7288d71fd5d02441fffe1572ecc20980d410b',
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
