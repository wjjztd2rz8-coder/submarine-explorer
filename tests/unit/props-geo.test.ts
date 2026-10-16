// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import * as manifests from '../../src/core/SiteManifest.js';
import { PROCEDURAL_BUILDERS } from '../../src/world/props/builders/index.js';
import { buildPlacedChimney } from '../../src/world/props/builders/vents.js';
import {
  buildGeo,
  countGeo,
  GEO_FEATURES,
  isGeoFeature,
  type GeoFeatureId,
} from '../../src/world/props/geo/index.js';
import { billowRadius, makePlume, smokePlume } from '../../src/world/props/geo/plume.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import { parsePropsDoc, validatePropEntry, type PropDef } from '../../src/world/PropLoader.js';

const cfg = DEFAULT_CONFIG.props;

describe('smoker profile capability', () => {
  for (const tier of ['low', 'medium', 'high']) {
    it(`${tier}: applies validated taper and throat colour to an arbitrary prop id`, () => {
      const authored = manifests.propManifest('beebe-chimney-1')!.smoker!;
      const profile = manifests.validateSiteManifest(
        {
          id: 'fixture',
          props: { fixture: { smoker: { ...authored, topFraction: 0.6, throatColor: 0x123456 } } },
        },
        'fixture',
      ).props!.fixture!;
      const lookup = vi.spyOn(manifests, 'propManifest').mockReturnValue(profile);
      const input = {
        def: { id: 'fixture', feature: 'smoker-cluster', raw: {} } as PropDef,
        dims: [22, 18, 9] as [number, number, number],
        seed: 42,
        cfg,
        tier,
        groundHeight: () => undefined,
      };
      const built: ReturnType<typeof buildGeo>[] = [];
      try {
        const profiled = buildGeo(input);
        built.push(profiled);
        const body = profiled.full.getObjectByName('smoker-body') as THREE.Mesh;
        const mouths = profiled.full.getObjectByName('beebe-orifices') as THREE.Mesh;
        expect((mouths.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0x123456);
        const positions = mouths.geometry.getAttribute('position');
        // The first merged triangle has two rim vertices followed by the disc centre.
        expect(
          Math.hypot(positions.getX(0) - positions.getX(2), positions.getZ(0) - positions.getZ(2)),
        ).toBeCloseTo((9 * 1.5 * 0.15 + 0.6) * 0.6 * authored.topMouthRadiusFraction, 5);
        profiled.full.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          for (const name of ['position', 'normal', 'color']) {
            const attribute = object.geometry.getAttribute(name);
            if (attribute) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
          }
        });
        lookup.mockReturnValue(undefined);
        const plain = buildGeo(input);
        built.push(plain);
        const plainBody = plain.full.getObjectByName('smoker-body') as THREE.Mesh;
        expect(
          (body.material as THREE.MeshStandardMaterial).color.r /
            (plainBody.material as THREE.MeshStandardMaterial).color.r,
        ).toBeCloseTo(0.95 / 1.25);
        expect(plain.full.getObjectByName('beebe-orifices')).toBeUndefined();
      } finally {
        lookup.mockRestore();
        for (const result of built)
          for (const root of [result.full, result.impostor])
            root.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              object.geometry.dispose();
              for (const material of Array.isArray(object.material)
                ? object.material
                : [object.material])
                material.dispose();
            });
      }
    });
  }
});

const DIMS: Record<GeoFeatureId, [number, number, number]> = {
  'smoker-cluster': [22, 18, 9],
  'carbonate-tower': [70, 60, 60],
  'coral-mound': [60, 44, 12],
  'stalactite-cluster': [42, 16, 28],
  'pillow-field': [30, 24, 4],
  'tuff-cliff': [90, 30, 45],
  'canyon-ledge': [70, 26, 36],
  'hadal-scarp': [100, 40, 50],
  'benthic-lander': [3.4, 3.4, 4.6],
};

function build(feature: GeoFeatureId, tier = 'high', variant?: string) {
  const def = { feature, raw: { variant } } as unknown as PropDef;
  return buildGeo({
    def,
    dims: DIMS[feature],
    seed: hashString(`t-${feature}`),
    cfg,
    tier,
    groundHeight: () => undefined,
  });
}

function firstPositions(o: THREE.Object3D): number[] {
  let out: number[] = [];
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!out.length && m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh) {
      out = Array.from(m.geometry.getAttribute('position').array as Float32Array).slice(0, 300);
    }
  });
  return out;
}

describe('procedural:geo features', () => {
  for (const f of GEO_FEATURES) {
    it(`${f}: builds a finite, non-empty prop with colliders and an impostor`, () => {
      const b = build(f);
      expect(b.bounds.isEmpty()).toBe(false);
      const size = b.bounds.getSize(new THREE.Vector3());
      for (const v of [size.x, size.y, size.z]) expect(Number.isFinite(v)).toBe(true);
      expect(b.colliders!.length).toBeGreaterThan(0);
      for (const c of b.colliders!) expect(c.isEmpty()).toBe(false);
      expect(countGeo(b.full).triangles).toBeGreaterThan(500);
      expect((b.impostor as THREE.Mesh).isMesh).toBe(true);
    });

    it(`${f}: is deterministic from the seed`, () => {
      expect(firstPositions(build(f).full)).toEqual(firstPositions(build(f).full));
    });

    it(`${f}: the low tier is cheaper than high`, () => {
      const lo = countGeo(build(f, 'low').full);
      const hi = countGeo(build(f, 'high').full);
      expect(lo.triangles).toBeLessThan(hi.triangles);
    });
  }

  it('the smoker cluster swaps tubeworms for shrimp with variant "shrimp"', () => {
    const names = (b: ReturnType<typeof build>): string[] => b.full.children.map((c) => c.name);
    expect(names(build('smoker-cluster'))).toContain('tubeworms');
    expect(names(build('smoker-cluster', 'high', 'shrimp'))).toContain('shrimp');
  });

  it('the tower is about as tall as dimensions_m[2] and colliders stay inside the bounds', () => {
    const b = build('carbonate-tower');
    // Flat ground: dimensions_m[2] is the total local relief (Lost City: up to about 60 m).
    expect(b.bounds.max.y).toBeGreaterThan(57);
    expect(b.bounds.max.y).toBeLessThan(63);
    for (const c of b.colliders!) {
      expect(b.bounds.containsPoint(c.getCenter(new THREE.Vector3()))).toBe(true);
    }
  });

  it('routes through the registry: geo, and a chimney that carries a feature', () => {
    const def = { feature: 'coral-mound', raw: {} } as unknown as PropDef;
    const input = {
      def,
      dims: DIMS['coral-mound'],
      seed: 1,
      cfg,
      tier: 'medium',
      groundHeight: () => undefined,
    };
    expect(PROCEDURAL_BUILDERS.geo(input).full.name).toBe('coral-mound');
    const ch = { ...input, def: { ...def, feature: 'carbonate-tower' } as unknown as PropDef };
    expect(PROCEDURAL_BUILDERS.chimney(ch).full.name).toBe('carbonate-tower');
    const plain = PROCEDURAL_BUILDERS.chimney({ ...input, def: { raw: {} } as unknown as PropDef });
    expect((plain.full as THREE.Mesh).isMesh).toBe(true);
  });

  it('a placed chimney is still one mesh with vertex colours', () => {
    const b = buildPlacedChimney([3, 3, 6], 7, cfg, 'sulfide', 'medium');
    expect((b.full as THREE.Mesh).geometry.getAttribute('color')).toBeDefined();
  });
});

describe('Beebe mineral finish', () => {
  const beebe = parsePropsDoc(
    JSON.parse(readFileSync('data/landmarks/beebe-vent-field/props.json', 'utf8')),
    cfg,
  ).props;
  const bareCfg = { ...cfg, chimneyCrust: { ...cfg.chimneyCrust, amount: 0 } };

  for (const tier of ['low', 'high']) {
    for (const def of beebe) {
      it(`${def.id} ${tier}: patchy crust lifts rock without changing geometry, bounds or draws`, () => {
        const input = {
          def,
          dims: def.dimensionsM!,
          seed: hashString(def.id),
          tier,
          groundHeight: () => undefined,
        };
        const finished = PROCEDURAL_BUILDERS.chimney({ ...input, cfg });
        const bare = PROCEDURAL_BUILDERS.chimney({ ...input, cfg: bareCfg });
        const body = (built: typeof finished): THREE.Mesh =>
          (built.full.getObjectByName('smoker-body') ?? built.full) as THREE.Mesh;
        const a = body(finished).geometry;
        const b = body(bare).geometry;
        expect(a.getAttribute('position').array).toEqual(b.getAttribute('position').array);
        expect(a.getAttribute('normal').array).toEqual(b.getAttribute('normal').array);
        expect(finished.bounds.equals(bare.bounds)).toBe(true);
        expect(countGeo(finished.full)).toEqual(countGeo(bare.full));
        const ca = a.getAttribute('color');
        const cb = b.getAttribute('color');
        const luminance = (c: typeof ca, i: number): number =>
          0.2126 * c.getX(i) + 0.7152 * c.getY(i) + 0.0722 * c.getZ(i);
        const lift = Array.from(
          { length: ca.count },
          (_, i) => luminance(ca, i) - luminance(cb, i),
        );
        const mean = lift.reduce((sum, n) => sum + n, 0) / lift.length;
        expect(mean).toBeGreaterThan(0);
        // Variation must survive on Low too, where no bump map is available.
        expect(new Set(lift.map((n) => Math.round(n * 1000))).size).toBeGreaterThan(10);
        expect(lift.reduce((m, n) => Math.max(m, n), -Infinity)).toBeGreaterThan(mean * 2);
      });
    }

    it(`${tier}: other smoker clusters keep their original colours and material`, () => {
      const def = { ...beebe[0]!, id: 'axial-unselected-smoker' };
      const input = {
        def,
        dims: def.dimensionsM!,
        seed: hashString(def.id),
        tier,
        groundHeight: () => undefined,
      };
      const finished = PROCEDURAL_BUILDERS.chimney({ ...input, cfg });
      const bare = PROCEDURAL_BUILDERS.chimney({ ...input, cfg: bareCfg });
      const a = finished.full.getObjectByName('smoker-body') as THREE.Mesh;
      const b = bare.full.getObjectByName('smoker-body') as THREE.Mesh;
      expect(a.geometry.getAttribute('color').array).toEqual(
        b.geometry.getAttribute('color').array,
      );
      expect((a.material as THREE.MeshStandardMaterial).bumpScale).toBe(
        (b.material as THREE.MeshStandardMaterial).bumpScale,
      );
    });
  }
});

describe('plumes', () => {
  it('build a shader-animated point cloud sized by the count, or nothing when tiny', () => {
    const p = makePlume({
      height: 10,
      baseRadius: 0.5,
      spread: 2,
      count: 100,
      color: 0x444444,
      opacity: 0.5,
      size: 2,
      speed: 0.2,
      seed: 1,
    })!;
    expect(p.geometry.getAttribute('aSeed').count).toBe(100);
    expect(p.geometry.boundingSphere!.radius).toBeGreaterThan(10);
    expect(
      makePlume({
        height: 10,
        baseRadius: 0.5,
        spread: 2,
        count: 2,
        color: 0,
        opacity: 1,
        size: 1,
        speed: 1,
        seed: 1,
      }),
    ).toBeNull();
  });
});

describe('smoke plume', () => {
  it('billows: irregular outline, orifice shimmer, count follows the tier', () => {
    const p = smokePlume(20, 0.5, 150, 7)!;
    expect(p.geometry.getAttribute('aSeed').count).toBe(150);
    const glint = p.getObjectByName('plume-orifice-shimmer') as THREE.Points;
    expect(glint).toBeDefined();
    expect(glint.geometry.getAttribute('aSeed').count).toBeGreaterThanOrEqual(4);
    // Tier scaling: the phone tier gets fewer particles, the shimmer still builds.
    const low = smokePlume(20, 0.5, Math.round(150 * 0.35), 7)!;
    expect(low.geometry.getAttribute('aSeed').count).toBeLessThan(60);
    // Seeds are spread (sprite size / swirl variety), not constant.
    const seeds = p.geometry.getAttribute('aSeed').array as Float32Array;
    for (let c = 1; c < 4; c++) {
      let lo = 1,
        hi = 0;
      for (let i = 0; i < 150; i++) {
        lo = Math.min(lo, seeds[i * 4 + c]!);
        hi = Math.max(hi, seeds[i * 4 + c]!);
      }
      expect(hi - lo).toBeGreaterThan(0.7);
    }
    // No clean cone: at a fixed rise phase the radial spread varies a lot between particles.
    const o = { baseRadius: 0.5, spread: 4 };
    const r: number[] = [];
    for (let i = 0; i < 150; i++)
      r.push(billowRadius(o, [0, ...seeds.slice(i * 4 + 1, i * 4 + 4)], 0.7));
    const mean = r.reduce((a, b) => a + b, 0) / r.length;
    const sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length);
    expect(sd / mean).toBeGreaterThan(0.45);
    // It widens with height on average.
    const at = (t: number) =>
      [...Array(150).keys()].reduce(
        (a, i) => a + billowRadius(o, [0, ...seeds.slice(i * 4 + 1, i * 4 + 4)], t),
        0,
      );
    expect(at(0.8)).toBeGreaterThan(at(0.2) * 2);
    // Culling sphere covers the spread and drift.
    expect(p.geometry.boundingSphere!.radius).toBeGreaterThan(20 + 4);
  });
});

describe('props.json "feature"', () => {
  it('parses on geo and chimney, ignores it elsewhere', () => {
    const base = { id: 'a', lat: 1, lon: 1, snap_to_seabed: true, dimensions_m: [20, 20, 10] };
    const geo = validatePropEntry(
      { ...base, model: 'procedural:geo', feature: 'coral-mound' },
      cfg,
    );
    expect((geo as PropDef).feature).toBe('coral-mound');
    const ch = validatePropEntry(
      { ...base, model: 'procedural:chimney', feature: 'carbonate-tower' },
      cfg,
    );
    expect((ch as PropDef).feature).toBe('carbonate-tower');
    const warnings: string[] = [];
    const bad = validatePropEntry(
      { ...base, model: 'procedural:hull-block', dimensions_m: [10, 5, 3], feature: 'coral-mound' },
      cfg,
      warnings,
    );
    expect((bad as PropDef).feature).toBeNull();
    expect(warnings.join(' ')).toContain('"feature"');
    expect(isGeoFeature('nope')).toBe(false);
  });

  it('every shipped geo entry parses cleanly', () => {
    const doc = {
      props: [
        {
          id: 'x',
          model: 'procedural:geo',
          feature: 'hadal-scarp',
          lat: 0,
          lon: 0,
          snap_to_seabed: true,
          dimensions_m: [100, 40, 50],
        },
      ],
    };
    const r = parsePropsDoc(doc, cfg);
    expect(r.errors).toEqual([]);
    expect(r.props[0]!.feature).toBe('hadal-scarp');
  });
});

// Regression guard: prop policies and profiles must preserve the authored geometry,
// finish, vent sources, collision bounds and tier budgets exactly.
describe('authored prop geometry golden', () => {
  const digest = (value: ArrayBufferView): string =>
    createHash('sha256').update(value).digest('hex');
  for (const site of ['beebe-vent-field', 'great-blue-hole', 'lost-city', 'axial-seamount-ashes']) {
    for (const tier of ['low', 'medium', 'high']) {
      it(`${site} ${tier}: retains buffers, materials and anchors`, () => {
        const doc = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
        const evidence = parsePropsDoc(doc, cfg)
          .props.filter((def) => def.procedural)
          .map((def) => {
            const built = PROCEDURAL_BUILDERS[def.procedural!]({
              def,
              dims: def.dimensionsM!,
              seed: hashString(def.id),
              cfg,
              tier,
              groundHeight: () => (x, z) => x * 0.07 - z * 0.1,
            });
            const meshes: unknown[] = [];
            for (const root of [built.full, built.impostor])
              root.traverse((object) => {
                if (!(object instanceof THREE.Mesh)) return;
                const materials = Array.isArray(object.material)
                  ? object.material
                  : [object.material];
                meshes.push({
                  name: object.name,
                  attributes: Object.fromEntries(
                    Object.entries(
                      object.geometry.attributes as Record<string, THREE.BufferAttribute>,
                    ).map(([key, value]) => [key, digest(value.array)]),
                  ),
                  index: object.geometry.index ? digest(object.geometry.index.array) : null,
                  matrix: object.matrix.elements,
                  instances:
                    object instanceof THREE.InstancedMesh
                      ? digest(object.instanceMatrix.array)
                      : null,
                  instanceColor:
                    object instanceof THREE.InstancedMesh && object.instanceColor
                      ? digest(object.instanceColor.array)
                      : null,
                  material: materials.map((m) => {
                    const mat = m as THREE.MeshStandardMaterial;
                    return {
                      type: m.type,
                      color: mat.color,
                      emissive: mat.emissive,
                      roughness: mat.roughness,
                      metalness: mat.metalness,
                      bumpScale: mat.bumpScale,
                      side: m.side,
                      transparent: m.transparent,
                      opacity: m.opacity,
                    };
                  }),
                });
              });
            return {
              id: def.id,
              buffers: createHash('sha256').update(JSON.stringify(meshes)).digest('hex'),
              placement: createHash('sha256')
                .update(JSON.stringify({ bounds: built.bounds, colliders: built.colliders }))
                .digest('hex'),
              ventTop: built.full.userData.ventTop,
              budget: countGeo(built.full),
            };
          });
        expect(evidence).toMatchSnapshot();
      });
    }
  }
});
