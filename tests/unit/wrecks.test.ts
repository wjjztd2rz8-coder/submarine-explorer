// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { parsePropsDoc, validatePropEntry, type PropDef } from '../../src/world/PropLoader.js';
import { Props, type PropsHeightField } from '../../src/world/Props.js';
import { WRECK_DETAIL, wreckDetail } from '../../src/world/props/wrecks/detail.js';
import {
  WRECK_HULLS,
  WRECK_SCATTERS,
  buildWreck,
  isWreckHull,
  isWreckScatter,
  type WreckId,
} from '../../src/world/props/wrecks/index.js';
import { hangRusticle, InstanceList } from '../../src/world/props/wrecks/instances.js';
import { countTriangles, flipFaces, makeStations } from '../../src/world/props/wrecks/kit.js';
import { paintWreck } from '../../src/world/props/wrecks/materials.js';
import { wreckScatterSpec } from '../../src/world/props/wrecks/scatter.js';
import { layoutScatter, scatterCount } from '../../src/world/props/wrecks/scatterLayout.js';
import { mulberry32 } from '../../src/world/props/wrecks/shared.js';
import { HEAVY_RUSTICLES, rusticlesAlong } from '../../src/world/props/wrecks/ship.js';
import { makeSyntheticTile } from './helpers.js';

const DIMS: Record<WreckId, [number, number, number]> = {
  'titanic-bow': [143, 28, 16],
  'titanic-stern': [107, 32, 10],
  bismarck: [251, 36, 15],
  endurance: [44, 7.6, 8],
  'titanic-boilers': [25, 25, 5],
  'titanic-field': [150, 150, 2],
  'titanic-trail': [55, 10, 2],
  'titanic-stern-field': [80, 80, 3],
  'bismarck-turrets': [50, 50, 6],
  'bismarck-field': [60, 60, 3],
  'bismarck-landslide': [200, 45, 4],
  'endurance-rigging': [35, 35, 3],
  'endurance-stern': [18, 18, 2],
};
const TIERS = ['low', 'medium', 'high'] as const;

it('textured steel shares plate tint and bounded rim light across tiers without adding GPU resources', async () => {
  // Node normally returns no canvas maps. Supply textures so this test exercises
  // the browser material path, including Low and Medium without normal maps.
  const map = new THREE.CanvasTexture();
  const normal = new THREE.CanvasTexture();
  vi.resetModules();
  const wreckTextures = await import('../../src/world/props/wrecks/textures.js');
  const maps = vi.spyOn(wreckTextures, 'steelMaps').mockImplementation((_size, withNormal) => ({
    map,
    normal: withNormal ? normal : null,
  }));
  const { steelMaterial, fittingMaterial } =
    await import('../../src/world/props/wrecks/materials.js');
  try {
    for (const tier of TIERS) {
      const detail = wreckDetail(tier);
      const material = steelMaterial(detail);
      expect(steelMaterial(detail)).toBe(material);
      expect(material.map).toBe(map);
      expect(material.normalMap).toBe(tier === 'high' ? normal : null);
      if (material.normalMap) {
        expect(material.normalMapType).toBe(THREE.TangentSpaceNormalMap);
        expect(material.normalScale.toArray()).toEqual([0.8, 0.8]);
      }
      expect(material.roughness).toBe(0.9);
      expect(material.metalness).toBe(0.12);
      expect(material.emissive.getHex()).toBe(0);
      expect(material.fog).toBe(true);
      const cacheKey = material.customProgramCacheKey();
      const shader = {
        ...THREE.ShaderLib.standard,
        uniforms: { ...THREE.ShaderLib.standard.uniforms },
      };
      const uniforms = { ...shader.uniforms };
      material.onBeforeCompile(
        shader as Parameters<typeof material.onBeforeCompile>[0],
        {} as THREE.WebGLRenderer,
      );
      expect(shader.vertexShader).toBe(THREE.ShaderLib.standard.vertexShader);
      expect(shader.uniforms).toEqual(uniforms);
      const declarations = (source: string) => source.match(/\buniform\s+[^;]+;/g);
      expect(declarations(shader.fragmentShader)).toEqual(
        declarations(THREE.ShaderLib.standard.fragmentShader),
      );
      // Tint and rim light retain standard normal, roughness, lighting, fog and
      // output chunks, with no additional texture fetches.
      const chunks = (source: string) => source.match(/#include <[^>]+>/g);
      expect(chunks(shader.fragmentShader)).toEqual(
        chunks(THREE.ShaderLib.standard.fragmentShader),
      );
      const samplers = (source: string) =>
        source.match(/\b(?:uniform\s+sampler\w*|texture\w*\s*\()/g);
      expect(samplers(shader.fragmentShader)).toEqual(
        samplers(THREE.ShaderLib.standard.fragmentShader),
      );
      expect(shader.fragmentShader).toContain('diffuseColor.rgb = mix(');
      const source = shader.fragmentShader;
      const rim = source.match(/float rimFacing = ([^;]+);/)!;
      const weight = source.match(/outgoingLight\s*\+=\s*vec3\([^)]+\)\s*\*\s*([^;]+);/)!;
      expect(rim).not.toBeNull();
      expect(weight).not.toBeNull();
      expect(source.indexOf(rim[0])).toBeGreaterThan(source.indexOf('vec3 outgoingLight ='));
      expect(source.indexOf(weight[0])).toBeLessThan(source.indexOf('#include <opaque_fragment>'));
      expect(source.indexOf(weight[0])).toBeLessThan(source.indexOf('#include <fog_fragment>'));
      // CPU evaluation of the emitted expressions, not GLSL compilation. The
      // standard shader supplies finite, nonzero view-space normal/view vectors.
      const rimWeight = new Function(
        'normal',
        'vViewPosition',
        'normalize',
        'dot',
        'clamp',
        'abs',
        'pow',
        `const rimFacing = ${rim[1]}; return ${weight[1]};`,
      );
      for (const scale of [0.001, 1, 1000]) {
        let previous = 1;
        for (let i = 0; i <= 20; i++) {
          const facing = i / 20;
          const normal = new THREE.Vector3(Math.sqrt(1 - facing * facing), 0, facing);
          const view = new THREE.Vector3(0, 0, scale);
          const evaluate = () =>
            rimWeight(
              normal,
              view,
              (v: THREE.Vector3) => v.clone().normalize(),
              (a: THREE.Vector3, b: THREE.Vector3) => a.dot(b),
              THREE.MathUtils.clamp,
              Math.abs,
              Math.pow,
            ) as number;
          const value = evaluate();
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(previous);
          if (i === 0) expect(value).toBe(1);
          if (i === 20) expect(value).toBe(0);
          normal.multiplyScalar(-4);
          expect(evaluate()).toBeCloseTo(value, 12);
          previous = value;
        }
      }
      const up = source.match(/float up = ([^;]+);/)!;
      const multiplier = source.match(/outgoingLight\s*\*=\s*([^;]+);/)!;
      expect(up).not.toBeNull();
      expect(multiplier).not.toBeNull();
      expect(source.indexOf(up[0])).toBeGreaterThan(
        source.indexOf('#include <normal_fragment_maps>'),
      );
      expect(source.indexOf(up[0])).toBeGreaterThan(source.indexOf(weight[0]));
      expect(source.indexOf(multiplier[0])).toBeLessThan(
        source.indexOf('#include <opaque_fragment>'),
      );
      const endpoints = multiplier[1]!.match(/^mix\((vec3\([^)]+\)), (vec3\([^)]+\)),/)!;
      expect(endpoints).not.toBeNull();
      // Adapt only GLSL vector construction/multiplication to Three's CPU math;
      // evaluate the emitted classification and blend rather than restating them.
      const upMultiplier = new Function(
        'normal',
        'viewMatrix',
        'normalize',
        'dot',
        'clamp',
        'vec4',
        'transform',
        'vec3',
        'mix',
        'smoothstep',
        `const up = ${up[1]!.replace(
          /\(viewMatrix\s*\*\s*(vec4\([^)]+\))\)\.xyz/g,
          'transform($1, viewMatrix)',
        )}; return { up, value: ${multiplier[1]}, neutral: ${endpoints[1]}, rust: ${endpoints[2]} };`,
      );
      const evaluateUp = (normal: THREE.Vector3, view: THREE.Matrix4) =>
        upMultiplier(
          normal,
          view,
          (v: THREE.Vector3) => v.clone().normalize(),
          (a: THREE.Vector3, b: THREE.Vector3) => a.dot(b),
          THREE.MathUtils.clamp,
          (x: number, y: number, z: number, w: number) => new THREE.Vector4(x, y, z, w),
          (v: THREE.Vector4, m: THREE.Matrix4) => {
            const result = v.clone().applyMatrix4(m);
            return new THREE.Vector3(result.x, result.y, result.z);
          },
          (x: number, y = x, z = x) => new THREE.Vector3(x, y, z),
          (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t),
          (lo: number, hi: number, x: number) => THREE.MathUtils.smoothstep(x, lo, hi),
        ) as { up: number; value: THREE.Vector3; neutral: THREE.Vector3; rust: THREE.Vector3 };
      const worldNormals = [
        new THREE.Vector3(0, 1, 0), // deck
        new THREE.Vector3(1, 0, 0), // side
        new THREE.Vector3(0, -1, 0), // underside
        ...Array.from({ length: 21 }, (_, i) => {
          const y = i / 10 - 1;
          return new THREE.Vector3(Math.sqrt(1 - y * y), y, 0);
        }),
      ];
      if (material.normalMap) {
        // Synthetic tangent-space perturbations on each surface. Three's final
        // normal is in view space; the source audit separately traces its TBN.
        for (const n of worldNormals.slice(0, 3)) {
          const tangent = new THREE.Vector3(0, 0, 1);
          const bitangent = n.clone().cross(tangent);
          for (const [x, y, z] of [
            [0, 0, 1],
            [0.6, -0.3, 0.74],
            [-0.8, 0.2, 0.56],
          ]) {
            worldNormals.push(
              n
                .clone()
                .multiplyScalar(z!)
                .addScaledVector(tangent, x! * material.normalScale.x)
                .addScaledVector(bitangent, y! * material.normalScale.y)
                .normalize(),
            );
          }
        }
      }
      const rotations = [
        [0, 0, 0],
        [Math.PI / 2, 0, 0],
        [0, Math.PI, 0],
        [0, 0, Math.PI / 2],
        [0.7, -1.2, 2.4],
      ];
      for (const [index, worldNormal] of worldNormals.entries()) {
        const reference = evaluateUp(worldNormal, new THREE.Matrix4());
        expect(reference.up).toBeCloseTo(Math.max(0, worldNormal.y), 12);
        if (index < 3) {
          expect(
            reference.value.distanceTo(index === 0 ? reference.rust : reference.neutral),
          ).toBeCloseTo(0, 12);
        }
        for (const [x, y, z] of rotations) {
          const view = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z));
          view.setPosition(123, -456, 789);
          const viewNormal = worldNormal
            .clone()
            .applyMatrix3(new THREE.Matrix3().getNormalMatrix(view));
          for (const scale of [0.001, 1, 1000]) {
            const result = evaluateUp(viewNormal.clone().multiplyScalar(scale), view);
            expect(result.up).toBeCloseTo(reference.up, 12);
            expect(result.value.distanceTo(reference.value)).toBeCloseTo(0, 12);
            for (const [channel, value] of result.value.toArray().entries()) {
              expect(Number.isFinite(value)).toBe(true);
              expect(value).toBeGreaterThanOrEqual(
                Math.min(
                  ...[result.neutral.getComponent(channel), result.rust.getComponent(channel)],
                ) - 1e-12,
              );
              expect(value).toBeLessThanOrEqual(
                Math.max(
                  ...[result.neutral.getComponent(channel), result.rust.getComponent(channel)],
                ) + 1e-12,
              );
            }
          }
        }
      }
      // Three invokes the cached material's hook with fresh shader objects for
      // each program. Recompilation must not accumulate edits or change its key.
      const repeated = {
        ...THREE.ShaderLib.standard,
        uniforms: { ...THREE.ShaderLib.standard.uniforms },
      };
      material.onBeforeCompile(
        repeated as Parameters<typeof material.onBeforeCompile>[0],
        {} as THREE.WebGLRenderer,
      );
      expect(repeated).toEqual(shader);
      expect(material.customProgramCacheKey()).toBe(cacheKey);
      expect(material.customProgramCacheKey()).not.toBe(fittingMaterial().customProgramCacheKey());
    }
    expect(maps.mock.calls).toEqual([
      [256, false],
      [512, false],
      [512, true],
    ]);
  } finally {
    maps.mockRestore();
    map.dispose();
    normal.dispose();
  }
});

it('steel without canvas maps retains the standard shader at every tier', async () => {
  vi.resetModules();
  const wreckTextures = await import('../../src/world/props/wrecks/textures.js');
  const maps = vi.spyOn(wreckTextures, 'steelMaps').mockReturnValue(null);
  const { steelMaterial } = await import('../../src/world/props/wrecks/materials.js');
  try {
    for (const tier of TIERS) {
      const material = steelMaterial(wreckDetail(tier));
      expect(material.map).toBeNull();
      expect(material.normalMap).toBeNull();
      const shader = {
        ...THREE.ShaderLib.standard,
        uniforms: { ...THREE.ShaderLib.standard.uniforms },
      };
      material.onBeforeCompile(
        shader as Parameters<typeof material.onBeforeCompile>[0],
        {} as THREE.WebGLRenderer,
      );
      expect(shader.fragmentShader).toBe(THREE.ShaderLib.standard.fragmentShader);
      expect(shader.vertexShader).toBe(THREE.ShaderLib.standard.vertexShader);
      expect(shader.uniforms).toEqual(THREE.ShaderLib.standard.uniforms);
      expect(material.customProgramCacheKey()).not.toBe('wreck-steel-plates');
    }
    expect(maps.mock.calls).toEqual([
      [256, false],
      [512, false],
      [512, true],
    ]);
  } finally {
    maps.mockRestore();
  }
});

/** Triangles in the near LOD level (what the player sees up close). */
function nearStats(id: WreckId, tier: string): { draws: number; triangles: number } {
  const b = buildWreck(id, DIMS[id], 1234, tier, () => 0);
  const lod = b.full.getObjectByProperty('isLOD', true) as THREE.LOD;
  return countTriangles(lod.levels[0]!.object);
}

describe('wreck ids', () => {
  it('hull and scatter ids are disjoint and recognised', () => {
    for (const h of WRECK_HULLS) expect(isWreckHull(h) && !isWreckScatter(h)).toBe(true);
    for (const s of WRECK_SCATTERS) expect(isWreckScatter(s) && !isWreckHull(s)).toBe(true);
    expect(isWreckHull('nope')).toBe(false);
    expect(isWreckScatter(3)).toBe(false);
  });

  it('unknown tiers fall back to high', () => {
    expect(wreckDetail('bogus')).toBe(WRECK_DETAIL.high);
    expect(wreckDetail(undefined)).toBe(WRECK_DETAIL.high);
  });
});

describe('wreck builders', () => {
  for (const id of [...WRECK_HULLS, ...WRECK_SCATTERS] as WreckId[]) {
    it(`${id} builds at every tier, deterministically, with a near/mid LOD`, () => {
      for (const tier of TIERS) {
        const a = buildWreck(id, DIMS[id], 99, tier, () => 0);
        const b = buildWreck(id, DIMS[id], 99, tier, () => 0);
        expect(a.bounds.isEmpty()).toBe(false);
        expect(a.bounds.equals(b.bounds)).toBe(true);
        const lod = a.full.getObjectByProperty('isLOD', true) as THREE.LOD;
        expect(lod.levels).toHaveLength(2);
        expect(lod.levels[1]!.distance).toBe(WRECK_DETAIL[tier]!.nearLodM);
        expect(countTriangles(a.full).triangles).toBe(countTriangles(b.full).triangles);
        // Bounds alone miss NaN colours and seeded instance-buffer regressions.
        const buffers = (root: THREE.Object3D) => {
          const result: Array<ArrayLike<number>> = [];
          root.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            for (const attribute of Object.values(
              o.geometry.attributes as Record<string, THREE.BufferAttribute>,
            ))
              result.push(attribute.array);
            if (o instanceof THREE.InstancedMesh) {
              result.push(o.instanceMatrix.array);
              if (o.instanceColor) result.push(o.instanceColor.array);
            }
          });
          return result;
        };
        const current = buffers(a.full);
        expect(current).toEqual(buffers(b.full));
        expect(current.every((array) => Array.from(array).every(Number.isFinite))).toBe(true);
      }
    });
  }

  it('hull bounds match the published length and beam', () => {
    const cases: Array<[WreckId, number, number]> = [
      // Titanic bow: 143 m; stern 107 m (plating splayed); Bismarck 251 m less
      // the missing stern; Endurance 44 m plus the bowsprit stump.
      ['titanic-bow', 143, 28],
      ['titanic-stern', 107, 32],
      ['bismarck', 236, 36],
      ['endurance', 44, 7.6],
    ];
    for (const [id, len, beam] of cases) {
      const size = buildWreck(id, DIMS[id], 7, 'medium').bounds.getSize(new THREE.Vector3());
      expect(size.z).toBeGreaterThan(len * 0.93);
      expect(size.z).toBeLessThan(len * 1.12);
      expect(size.x).toBeGreaterThan(beam * 0.9);
      expect(size.x).toBeLessThan(beam * 1.35);
    }
  });

  it('hulls stay readable: visible height near the props.json estimate', () => {
    for (const id of WRECK_HULLS) {
      const b = buildWreck(id, DIMS[id], 7, 'medium').bounds;
      expect(b.min.y).toBeLessThan(0); // sunk into the mud, no gap on rough ground
      expect(b.max.y).toBeGreaterThan(DIMS[id][2] * 0.7);
      expect(b.max.y).toBeLessThan(DIMS[id][2] * 1.9);
    }
  });

  it('detail scales with the tier: low < medium <= high', () => {
    for (const id of WRECK_HULLS) {
      const t = TIERS.map((tier) => nearStats(id, tier).triangles);
      expect(t[0]).toBeLessThan(t[1]!);
      expect(t[1]).toBeLessThanOrEqual(t[2]!);
    }
  });

  it('stays inside the per-tier triangle budgets (near LOD, instances counted)', () => {
    // Budgets per hull in thousands of triangles.
    const budget: Record<string, number> = { low: 180, medium: 400, high: 700 };
    for (const id of WRECK_HULLS) {
      for (const tier of TIERS) {
        expect(nearStats(id, tier).triangles / 1000, `${id}@${tier}`).toBeLessThan(budget[tier]!);
      }
    }
  });

  it('low tier drops small debris; high has more scatter than medium', () => {
    const count = (tier: string): number =>
      buildWreck(
        'titanic-field',
        DIMS['titanic-field'],
        3,
        tier,
        () => 0,
      ).full.getObjectsByProperty('isInstancedMesh', true).length;
    const low = buildWreck('titanic-field', DIMS['titanic-field'], 3, 'low', () => 0);
    expect(low.full.getObjectByName('titanic-field-crockery')).toBeUndefined();
    expect(count('medium')).toBeGreaterThan(count('low'));
    const inst = (tier: string): number => {
      let n = 0;
      buildWreck('titanic-field', DIMS['titanic-field'], 3, tier, () => 0).full.traverse((o) => {
        if ((o as THREE.InstancedMesh).isInstancedMesh && !o.name.endsWith('-mid'))
          n += (o as THREE.InstancedMesh).count;
      });
      return n;
    };
    expect(inst('high')).toBeGreaterThan(inst('medium'));
  });

  it('exports interior anchor points for wreck interiors', () => {
    const names = (id: WreckId): string[] =>
      buildWreck(id, DIMS[id], 1, 'medium').anchors.map((a) => a.name);
    expect(names('titanic-bow')).toContain('interior-entry');
    expect(names('titanic-stern')).toContain('interior-entry');
    expect(names('endurance')).toContain('interior-entry');
    expect(names('bismarck')).toEqual(
      expect.arrayContaining([
        'barbette-anton',
        'barbette-bruno',
        'barbette-caesar',
        'barbette-dora',
        'interior-entry',
      ]),
    );
    for (const id of WRECK_HULLS) {
      const b = buildWreck(id, DIMS[id], 1, 'medium');
      for (const a of b.anchors) {
        expect(a.userData.kind).toBe('interior-entry');
        expect(a.parent).toBe(b.full);
        expect(b.bounds.clone().expandByScalar(1).containsPoint(a.position)).toBe(true);
      }
    }
  });

  it('hull colliders lie inside the hull bounds and cover the hull footprint', () => {
    for (const id of WRECK_HULLS) {
      const b = buildWreck(id, DIMS[id], 5, 'medium');
      expect(b.colliders.length).toBeGreaterThan(2);
      const grown = b.bounds.clone().expandByScalar(0.5);
      const union = new THREE.Box3();
      for (const c of b.colliders) {
        expect(grown.containsBox(c), `${id}`).toBe(true);
        union.union(c);
      }
      const size = union.getSize(new THREE.Vector3());
      expect(size.z).toBeGreaterThan(b.bounds.getSize(new THREE.Vector3()).z * 0.85);
    }
  });

  it('scatter kits follow the terrain', () => {
    const tilt = (x: number, z: number): number => 0.1 * x + 0.05 * z;
    const b = buildWreck('titanic-boilers', DIMS['titanic-boilers'], 8, 'medium', tilt);
    const boilers = b.full.getObjectByName('titanic-boilers-boilers') as THREE.InstancedMesh;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    for (let i = 0; i < boilers.count; i++) {
      boilers.getMatrixAt(i, m);
      p.setFromMatrixPosition(m);
      expect(Math.abs(p.y - tilt(p.x, p.z))).toBeLessThan(1);
    }
    expect(boilers.count).toBe(5);
  });

  it('isolates warm HDR instance tints to trail plates and frames at every tier', () => {
    // Guard accidental gain/palette leakage through shared materials or kind names.
    const palette = [0xffdcb8, 0xf0b890, 0xffe8d0].map((hex) =>
      new THREE.Color(hex).multiplyScalar(1.7),
    );
    for (const tier of TIERS) {
      let warmKinds = 0;
      for (const id of WRECK_SCATTERS) {
        const built = buildWreck(id, DIMS[id], 99, tier, () => 0);
        for (const kind of ['plates', 'frames', 'pipes']) {
          const mesh = built.full.getObjectByName(`${id}-${kind}`) as THREE.InstancedMesh;
          if (!mesh) continue;
          if (id === 'titanic-trail' && kind !== 'pipes') warmKinds++;
          const color = new THREE.Color();
          for (let i = 0; i < mesh.count; i++) {
            mesh.getColorAt(i, color);
            if (id === 'titanic-trail' && kind !== 'pipes') {
              expect(
                palette.some((p) =>
                  p.toArray().every((v, j) => Math.abs(v - color.toArray()[j]) < 1e-6),
                ),
              ).toBe(true);
              expect(color.r).toBeGreaterThan(1);
            } else {
              expect(color.r).toBe(color.g);
              expect(color.g).toBe(color.b);
              expect(color.r).toBeGreaterThanOrEqual(0.8 - 1e-6);
              expect(color.r).toBeLessThanOrEqual(1.15 + 1e-6);
            }
          }
        }
      }
      expect(warmKinds).toBe(2);
    }
  });
});

describe('scatter layout', () => {
  const spec = wreckScatterSpec('titanic-field', [100, 100, 2]);

  it('is deterministic from the seed', () => {
    const o = { density: 1, smallDebris: true };
    expect(layoutScatter(spec, mulberry32(4), o)).toEqual(layoutScatter(spec, mulberry32(4), o));
    expect(layoutScatter(spec, mulberry32(4), o)).not.toEqual(
      layoutScatter(spec, mulberry32(5), o),
    );
  });

  it('keeps pieces inside the area and scales counts with density', () => {
    const full = layoutScatter(spec, mulberry32(1), { density: 1, smallDebris: true });
    for (const p of full) expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(100 + 1e-6);
    const half = layoutScatter(spec, mulberry32(1), { density: 0.5, smallDebris: true });
    expect(half.length).toBeLessThan(full.length * 0.6);
    const noSmall = layoutScatter(spec, mulberry32(1), { density: 1, smallDebris: false });
    expect(noSmall.every((p) => !spec.kinds.find((k) => k.name === p.kind)!.small)).toBe(true);
  });

  it('keeps fixed pieces fixed regardless of density', () => {
    const boilers = wreckScatterSpec('titanic-boilers', [25, 25, 5]).kinds.find(
      (k) => k.name === 'boilers',
    )!;
    expect(scatterCount(boilers, { density: 0.2, smallDebris: false })).toBe(5);
    expect(scatterCount(boilers, { density: 3, smallDebris: true })).toBe(5);
  });

  it('elliptical kits respect both half-extents and align blocks down the slope', () => {
    const slide = wreckScatterSpec('bismarck-landslide', [200, 45, 4]);
    const pts = layoutScatter(slide, mulberry32(2), { density: 1, smallDebris: true });
    for (const p of pts) expect((p.x / 45) ** 2 + (p.z / 200) ** 2).toBeLessThanOrEqual(1 + 1e-6);
    const berms = pts.filter((p) => p.kind === 'berms');
    expect(berms.length).toBeGreaterThan(0);
    for (const b of berms) expect(Math.abs(Math.sin(b.ry))).toBeLessThan(0.1);
  });
});

describe('kit helpers', () => {
  it('makeStations covers [0, L], ascending, finer in the fine ranges, doubled at breaks', () => {
    const st = makeStations(100, 10, 2, [[0, 20]], [50]);
    expect(st[0]).toBe(0);
    expect(st[st.length - 1]).toBe(100);
    for (let i = 1; i < st.length; i++) expect(st[i]!).toBeGreaterThan(st[i - 1]!);
    expect(st.filter((s) => s <= 20).length).toBeGreaterThan(8);
    expect(
      st.some((s) => Math.abs(s - 49.98) < 1e-6) && st.some((s) => Math.abs(s - 50.02) < 1e-6),
    ).toBe(true);
  });

  it('flipFaces reverses winding and normals', () => {
    const g = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    const n0 = new THREE.Vector3().fromBufferAttribute(g.getAttribute('normal'), 0);
    flipFaces(g);
    const n1 = new THREE.Vector3().fromBufferAttribute(g.getAttribute('normal'), 0);
    expect(n1.dot(n0)).toBeCloseTo(-1);
    const tri = new THREE.Triangle().setFromAttributeAndIndices(
      g.getAttribute('position'),
      0,
      1,
      2,
    );
    expect(tri.getNormal(new THREE.Vector3()).dot(n1)).toBeCloseTo(1);
  });

  it('InstanceList.thin keeps an even, deterministic subset', () => {
    const l = new InstanceList();
    for (let i = 0; i < 100; i++) l.push(new THREE.Matrix4().makeTranslation(i, 0, 0));
    l.thin(0.25);
    expect(l.length).toBe(25);
    expect(new THREE.Vector3().setFromMatrixPosition(l.matrices[1]!).x).toBe(4);
  });

  it('rusticle girth defaults to one and only scales a strand radially', () => {
    const strand = (girth?: number) => {
      const list = new InstanceList();
      hangRusticle(list, new THREE.Vector3(2, 3, 4), 1.5, mulberry32(19), girth);
      return list;
    };
    const original = strand();
    expect(strand(1)).toEqual(original);
    const thick = strand(HEAVY_RUSTICLES);
    const p = new THREE.Vector3(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3();
    original.matrices[0].decompose(p, q, s);
    const tp = new THREE.Vector3(),
      tq = new THREE.Quaternion(),
      ts = new THREE.Vector3();
    thick.matrices[0].decompose(tp, tq, ts);
    expect(tp).toEqual(p);
    expect(tq.angleTo(q)).toBeCloseTo(0);
    expect(ts.y).toBeCloseTo(s.y);
    expect(ts.x / s.x).toBeCloseTo(HEAVY_RUSTICLES);
    expect(ts.z / s.z).toBeCloseTo(HEAVY_RUSTICLES);
    expect(thick.colors).toEqual(original.colors);

    const path = [new THREE.Vector3(), new THREE.Vector3(0, 0, 10)];
    const a = new InstanceList(),
      b = new InstanceList();
    const ra = mulberry32(19),
      rb = mulberry32(19);
    rusticlesAlong(a, path, 1, 0.3, 1.5, ra);
    rusticlesAlong(b, path, 1, 0.3, 1.5, rb, undefined, 1);
    expect(a).toEqual(b);
    expect(ra()).toBe(rb()); // Default girth must preserve the caller's later random choices too.
  });

  it('paintWreck darkens the mud line and silts up-facing surfaces', () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.05, 0, 0, 8, 0, 0, 8, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    const white = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    g.setAttribute('color', new THREE.Float32BufferAttribute(white, 3));
    paintWreck(g, { seed: 1, rustiness: 0, growth: 0, silt: 1, mudBand: 2, wood: true });
    const c = g.getAttribute('color');
    const lum = (i: number): number => c.getX(i) + c.getY(i) + c.getZ(i);
    expect(lum(0)).toBeLessThan(lum(1)); // mud line darker than the side above it
    expect(Math.abs(c.getX(2) - c.getZ(2))).toBeGreaterThan(0.01); // silt tints the top
  });

  it('plate variation is opt-in and does not leak into later wreck paint', () => {
    const source = new THREE.BoxGeometry(12, 10, 30, 2, 2, 2);
    const colors = new Float32Array(source.getAttribute('position').count * 3).fill(0.5);
    source.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const options = { seed: 19, rustiness: 0.72, growth: 0.25, silt: 0.55, mudBand: 2.2 };
    const normal = source.clone();
    const plated = source.clone();
    const later = source.clone();
    paintWreck(normal, options);
    paintWreck(plated, { ...options, plates: [1.9, 5.5, 1.1] });
    paintWreck(later, options);
    expect(plated.getAttribute('color').array).not.toEqual(normal.getAttribute('color').array);
    expect(later.getAttribute('color').array).toEqual(normal.getAttribute('color').array);
    for (const attribute of ['position', 'normal', 'uv'])
      expect(plated.getAttribute(attribute).array).toEqual(source.getAttribute(attribute).array);
    for (const geometry of [source, normal, plated, later]) geometry.dispose();
  });
});

describe('props.json wiring', () => {
  const cfg = DEFAULT_CONFIG.props;
  const entry = {
    id: 'w',
    lat: 41.73,
    lon: -49.95,
    snap_to_seabed: true,
    dimensions_m: [143, 28, 16],
  };

  it('accepts a wreck id matching the procedural kind', () => {
    const d = validatePropEntry(
      { ...entry, model: 'procedural:hull-block', wreck: 'titanic-bow' },
      cfg,
    ) as PropDef;
    expect(d.wreck).toBe('titanic-bow');
    const s = validatePropEntry(
      { ...entry, model: 'procedural:debris', wreck: 'titanic-field' },
      cfg,
    ) as PropDef;
    expect(s.wreck).toBe('titanic-field');
  });

  it('warns and falls back to the generic builder on a mismatched or unknown id', () => {
    const w: string[] = [];
    const d = validatePropEntry(
      { ...entry, model: 'procedural:debris', wreck: 'titanic-bow' },
      cfg,
      w,
    ) as PropDef;
    expect(d.wreck).toBeNull();
    expect(
      validatePropEntry({ ...entry, model: 'procedural:hull-block', wreck: 'nope' }, cfg, w),
    ).not.toBeTypeOf('string');
    expect(w).toHaveLength(2);
    expect(
      (validatePropEntry({ ...entry, model: 'procedural:hull-block' }, cfg) as PropDef).wreck,
    ).toBeNull();
  });

  it('every wreck site names hand-built wrecks for its hulls and keeps the old prop ids', () => {
    const expected: Record<string, Record<string, string>> = {
      titanic: {
        'bow-hull': 'titanic-bow',
        'stern-hull': 'titanic-stern',
        'boiler-field': 'titanic-boilers',
        'debris-midfield': 'titanic-field',
        'debris-stern': 'titanic-stern-field',
      },
      bismarck: { 'main-hull': 'bismarck', 'turret-debris': 'bismarck-turrets' },
      endurance: {
        'main-hull': 'endurance',
        'rigging-debris': 'endurance-rigging',
        'helm-marker': 'endurance-stern',
      },
    };
    for (const [site, ids] of Object.entries(expected)) {
      const doc = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8')) as unknown;
      const parsed = parsePropsDoc(doc, cfg);
      expect(parsed.errors, site).toEqual([]);
      const byId = new Map(parsed.props.map((p) => [p.id, p]));
      for (const [id, wreck] of Object.entries(ids))
        expect(byId.get(id)?.wreck, `${site}/${id}`).toBe(wreck);
    }
  });

  it('Props builds compound colliders for a hand-built hull', async () => {
    const { meta } = makeSyntheticTile({ cols: 40, rows: 40 });
    const flat: PropsHeightField = {
      sampleHeight: () => -3800,
      getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
    };
    const props = new Props(meta, flat, cfg, 'low');
    await props.placeAll(
      {
        props: [
          { ...entry, model: 'procedural:hull-block', wreck: 'titanic-bow', collision: 'box' },
        ],
      },
      't',
    );
    expect(props.stats.failed).toBe(0);
    const p = props.placed[0]!;
    expect(p.colliders.length).toBeGreaterThan(2);
    expect(props.stats.colliders).toBe(p.colliders.length);
    // A point over the fine bow, just above the forecastle, is not inside the
    // compound shape, though the full bounding box would contain it.
    const out = new THREE.Vector3();
    const bow = p.root.localToWorld(new THREE.Vector3(12, 12, -60));
    expect(props.collide(bow, 0.5, out)).toBe(false);
    const hull = p.root.localToWorld(new THREE.Vector3(0, 5, 0));
    expect(props.collide(hull, 0.5, out)).toBe(true);
  });
});
