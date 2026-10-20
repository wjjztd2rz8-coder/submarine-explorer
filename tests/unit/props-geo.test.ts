// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { afterAll, describe, expect, it, vi } from 'vitest';
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
import { tieredSpire } from '../../src/world/props/geo/spire.js';
import { parsePropsDoc, validatePropEntry, type PropDef } from '../../src/world/PropLoader.js';

const cfg = DEFAULT_CONFIG.props;

function propEvidence(built: ReturnType<typeof buildGeo>, includeMaterials = true) {
  const digest = (value: ArrayBufferView): string =>
    createHash('sha256').update(value).digest('hex');
  const meshes: unknown[] = [];
  for (const root of [built.full, built.impostor])
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      meshes.push({
        name: object.name,
        attributes: Object.fromEntries(
          Object.entries(object.geometry.attributes as Record<string, THREE.BufferAttribute>).map(
            ([key, value]) => [key, digest(value.array)],
          ),
        ),
        index: object.geometry.index ? digest(object.geometry.index.array) : null,
        matrix: object.matrix.elements,
        instances:
          object instanceof THREE.InstancedMesh ? digest(object.instanceMatrix.array) : null,
        instanceColor:
          object instanceof THREE.InstancedMesh && object.instanceColor
            ? digest(object.instanceColor.array)
            : null,
        material: includeMaterials
          ? materials.map((m) => {
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
            })
          : undefined,
      });
    });
  return {
    buffers: createHash('sha256').update(JSON.stringify(meshes)).digest('hex'),
    placement: createHash('sha256')
      .update(JSON.stringify({ bounds: built.bounds, colliders: built.colliders }))
      .digest('hex'),
    ventTop: built.full.userData.ventTop,
    budget: countGeo(built.full),
  };
}

function disposeProp(built: ReturnType<typeof buildGeo>): void {
  for (const root of [built.full, built.impostor])
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        material.dispose();
    });
}

describe('spire buffer boundaries', () => {
  for (const profile of [
    { irregular: 1.15, crust: 1 },
    { irregular: 0.6, crust: 0.8 },
    { irregular: 1, crust: 0 },
    { irregular: 0, crust: 1 },
  ]) {
    for (const topFrac of [0, 0.45, 1]) {
      it(`irregular=${profile.irregular} crust=${profile.crust} top=${topFrac}: finite deterministic bounded buffers`, () => {
        for (const seed of [0, 42, -7]) {
          for (const [segs, rings] of [
            [0, 0],
            [10.4, 4.6],
            [48, 23],
          ]) {
            const opts = Object.freeze({
              h: 10,
              r0: 2,
              topFrac,
              seed,
              segs: segs!,
              rings: rings!,
              tiers: 3,
              flare: 0.75,
              lip: 0.3,
              crater: 0.7,
              ...profile,
            });
            const a = tieredSpire(opts);
            const b = tieredSpire(opts);
            try {
              for (const name of ['position', 'normal']) {
                const values = a.getAttribute(name).array;
                expect(Array.from(values).every(Number.isFinite)).toBe(true);
                expect(values).toEqual(b.getAttribute(name).array);
              }
              expect(a.index!.array).toEqual(b.index!.array);
              const count = a.getAttribute('position').count;
              expect(Array.from(a.index!.array).every((i) => i >= 0 && i < count)).toBe(true);
              a.computeBoundingBox();
              a.computeBoundingSphere();
              expect(a.boundingBox!.min.y).toBeCloseTo(0, 5);
              expect(a.boundingBox!.max.y).toBeLessThanOrEqual(opts.h);
              expect(a.boundingBox!.max.y).toBeGreaterThan(opts.h * 0.5);
              expect(a.boundingSphere!.radius).toBeGreaterThan(0);
              expect(Number.isFinite(a.boundingSphere!.radius)).toBe(true);
              expect(a.boundingBox!.getSize(new THREE.Vector3()).x).toBeLessThan(opts.r0 * 6);
            } finally {
              a.dispose();
              b.dispose();
            }
          }
        }
      });
    }
  }
});

describe('smoker profile capability', () => {
  for (const tier of ['low', 'medium', 'high']) {
    // Regression guard: material tuning must stay local to each build and leave all
    // geometry, placement, collision boxes, vent anchors and tier costs untouched.
    it(`${tier}: isolates finite material tuning and preserves profiled and unprofiled defaults`, () => {
      const lookupOriginal = manifests.propManifest;
      const authored = lookupOriginal('beebe-chimney-1')!;
      const { bodyShade: _shade, bodyGlow: _glow, ...omitted } = authored.smoker!;
      const raw = Object.freeze(omitted);
      const resolve = (smoker: object) => {
        const resolved = manifests.validateSiteManifest(
          { id: 'fixture', props: { fixture: { ...authored, smoker } } },
          'fixture',
        ).props!.fixture!;
        Object.freeze(resolved.smoker);
        return Object.freeze(resolved);
      };
      let active = resolve(authored.smoker!);
      const lookup = vi
        .spyOn(manifests, 'propManifest')
        .mockImplementation((id) => (id === 'beebe-chimney-1' ? active : lookupOriginal(id)));
      const built: ReturnType<typeof buildGeo>[] = [];
      const make = (site: string, id: string) => {
        const def = parsePropsDoc(
          JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8')),
          cfg,
        ).props.find((prop) => prop.id === id)!;
        const result = buildGeo({
          def,
          dims: def.dimensionsM!,
          seed: hashString(def.id),
          cfg,
          tier,
          groundHeight: () => (x, z) => x * 0.07 - z * 0.1,
        });
        built.push(result);
        for (const box of [result.bounds, ...result.colliders!])
          expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
        for (const root of [result.full, result.impostor])
          root.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            for (const attribute of Object.values(
              object.geometry.attributes as Record<string, THREE.BufferAttribute>,
            ))
              expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
            if (object instanceof THREE.InstancedMesh)
              expect(Array.from(object.instanceMatrix.array).every(Number.isFinite)).toBe(true);
          });
        expect(Number.isFinite(result.full.userData.ventTop)).toBe(true);
        return result;
      };
      const bodyMaterial = (result: ReturnType<typeof buildGeo>) =>
        (result.full.getObjectByName('smoker-body') as THREE.Mesh)
          .material as THREE.MeshStandardMaterial;
      const mouthMaterial = (result: ReturnType<typeof buildGeo>) =>
        (result.full.getObjectByName('beebe-orifices') as THREE.Mesh)
          .material as THREE.MeshStandardMaterial;
      const checkBody = (result: ReturnType<typeof buildGeo>, shade: number, glow: number) => {
        const material = bodyMaterial(result);
        // Headless detail textures are null, so the neutral albedo is exactly 0.07.
        expect(material.color.toArray()).toEqual([0.07 * shade, 0.07 * shade, 0.07 * shade]);
        expect(material.emissive.toArray()).toEqual(
          new THREE.Color(0xff9a68).multiplyScalar(glow).toArray(),
        );
        expect(
          [...material.color.toArray(), ...material.emissive.toArray()].every(Number.isFinite),
        ).toBe(true);
        expect(material.emissiveIntensity).toBe(1);
        expect(material.customProgramCacheKey()).toBe('vertexGlow2-0.5');
      };
      const sourceBefore = JSON.stringify(authored);
      try {
        const axial = make('axial-seamount-ashes', 'ashes-smoker-mound');
        const axialBefore = propEvidence(axial);
        checkBody(axial, 1.25, 0.13);
        expect(axial.full.getObjectByName('beebe-orifices')).toBeUndefined();
        const baseline = make('beebe-vent-field', 'beebe-chimney-1');
        const baselineBefore = propEvidence(baseline);
        const geometryBefore = propEvidence(baseline, false);
        checkBody(baseline, 0.85, 0.16);
        expect(mouthMaterial(baseline).emissive.getHex()).toBe(0xff681a);

        for (const smoker of [
          raw,
          { ...raw, bodyShade: 0.95, bodyGlow: 0.16 },
          { ...authored.smoker, bodyShade: 1 },
          { ...authored.smoker, bodyGlow: 1 },
          { ...authored.smoker, throatColor: 0xffffff },
          { ...authored.smoker, bodyShade: Number.MIN_VALUE, bodyGlow: Number.MIN_VALUE },
          { ...raw, bodyShade: 0.95, bodyGlow: 0.16, throatColor: 0x9a3a0c },
        ]) {
          active = resolve(smoker);
          const tuned = make('beebe-vent-field', 'beebe-chimney-1');
          checkBody(tuned, active.smoker!.bodyShade, active.smoker!.bodyGlow);
          expect(mouthMaterial(tuned).emissive.getHex()).toBe(active.smoker!.throatColor);
          expect(propEvidence(tuned, false)).toEqual(geometryBefore);
          expect(propEvidence(baseline)).toEqual(baselineBefore);
          expect(propEvidence(axial)).toEqual(axialBefore);
          expect(bodyMaterial(tuned)).not.toBe(bodyMaterial(baseline));
          expect(bodyMaterial(tuned).color).not.toBe(bodyMaterial(baseline).color);
          expect(bodyMaterial(tuned).emissive).not.toBe(bodyMaterial(baseline).emissive);
        }

        // Mutating an earlier cluster must not affect existing peers or later builds.
        const earlier = built[built.length - 1]!;
        bodyMaterial(earlier).color.setScalar(7);
        bodyMaterial(earlier).emissive.setScalar(8);
        mouthMaterial(earlier).emissive.setScalar(9);
        active = resolve(authored.smoker!);
        expect(propEvidence(make('beebe-vent-field', 'beebe-chimney-1'))).toEqual(baselineBefore);
        expect(propEvidence(make('axial-seamount-ashes', 'ashes-smoker-mound'))).toEqual(
          axialBefore,
        );
        expect(propEvidence(baseline)).toEqual(baselineBefore);
        expect(propEvidence(axial)).toEqual(axialBefore);
        expect(JSON.stringify(authored)).toBe(sourceBefore);
        expect(raw).not.toHaveProperty('bodyShade');
        expect(raw).not.toHaveProperty('bodyGlow');
      } finally {
        lookup.mockRestore();
        for (const result of built) disposeProp(result);
      }
    });

    it(`${tier}: applies validated taper, body shade and throat colour to an arbitrary prop id`, () => {
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
        ).toBeCloseTo(authored.bodyShade / 1.25);
        expect(plain.full.getObjectByName('beebe-orifices')).toBeUndefined();
      } finally {
        lookup.mockRestore();
        for (const result of built) disposeProp(result);
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
            return { id: def.id, ...propEvidence(built) };
          });
        expect(evidence).toMatchSnapshot();
      });
    }
  }
});

const surfaceAudit: unknown[] = [];
afterAll(() => {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.VENT_SURFACE_AUDIT !== '1') return;
  mkdirSync('.cache/vent-surfaces', { recursive: true });
  writeFileSync('.cache/vent-surfaces/props.json', JSON.stringify(surfaceAudit, null, 2) + '\n');
});

// Regression guard: authored vent geometry must stay finite and nondegenerate,
// and coarse crater meshes must support every top mouth vertex.
describe('authored vent surface integrity', () => {
  for (const site of ['lost-city', 'beebe-vent-field']) {
    for (const tier of ['low', 'medium', 'high']) {
      it(`${site} ${tier}: has valid buffers and seated top mouths`, () => {
        const defs = parsePropsDoc(
          JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8')),
          cfg,
        ).props;
        const totals = { draws: 0, triangles: 0 };
        expect(defs.length).toBeGreaterThan(0);
        const issues: unknown[] = [];
        let maxMouthDistance = 0;
        let mouthVertices = 0;
        for (const def of defs) {
          const built = PROCEDURAL_BUILDERS[def.procedural!]({
            def,
            dims: def.dimensionsM!,
            seed: hashString(def.id),
            cfg,
            tier,
            groundHeight: () => (x, z) => x * 0.07 - z * 0.1,
          });
          try {
            for (const box of [built.bounds, ...(built.colliders ?? [])]) {
              expect(box.isEmpty()).toBe(false);
              expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(
                true,
              );
            }
            const cost = countGeo(built.full);
            totals.draws += cost.draws;
            totals.triangles += cost.triangles;
            for (const root of [built.full, built.impostor]) {
              root.updateMatrixWorld(true);
              root.traverse((object) => {
                const mesh = object as THREE.Mesh;
                if (!mesh.geometry) return;
                for (const attribute of Object.values(mesh.geometry.attributes))
                  expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
                expect(mesh.matrixWorld.elements.every(Number.isFinite)).toBe(true);
                expect(mesh.matrixWorld.determinant()).not.toBe(0);
                if (mesh instanceof THREE.InstancedMesh) {
                  expect(Array.from(mesh.instanceMatrix.array).every(Number.isFinite)).toBe(true);
                  if (mesh.instanceColor)
                    expect(Array.from(mesh.instanceColor.array).every(Number.isFinite)).toBe(true);
                  const instance = new THREE.Matrix4();
                  for (let i = 0; i < mesh.count; i++) {
                    mesh.getMatrixAt(i, instance);
                    // Invertible transforms cannot collapse a valid template triangle.
                    expect(instance.determinant()).not.toBe(0);
                  }
                }
                if (!mesh.isMesh) return;
                const geometry = mesh.geometry;
                const pos = geometry.getAttribute('position');
                const idx = geometry.index;
                if (idx)
                  expect(
                    Array.from(idx.array as ArrayLike<number>).every(
                      (i) => i >= 0 && i < pos.count,
                    ),
                  ).toBe(true);
                const count = idx?.count ?? pos.count;
                expect(count % 3).toBe(0);
                const a = new THREE.Vector3(),
                  b = new THREE.Vector3(),
                  c = new THREE.Vector3();
                let degenerate = 0;
                for (let i = 0; i < count; i += 3) {
                  a.fromBufferAttribute(pos, idx ? idx.getX(i) : i);
                  b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1);
                  c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2);
                  const area = b.sub(a).cross(c.sub(a)).lengthSq();
                  if (area === 0) degenerate++;
                }
                if (degenerate) issues.push({ prop: def.id, mesh: mesh.name, degenerate });
              });
            }
            const body = built.full.getObjectByName('smoker-body') as THREE.Mesh | undefined;
            const mouths = built.full.getObjectByName('beebe-orifices') as THREE.Mesh | undefined;
            if (body && mouths) {
              const positions = mouths.geometry.getAttribute('position');
              const normals = mouths.geometry.getAttribute('normal');
              const surface = body.geometry.getAttribute('position');
              const index = body.geometry.index;
              const triangle = new THREE.Triangle();
              const vertex = new THREE.Vector3(),
                closest = new THREE.Vector3();
              const inverseBody = body.matrixWorld.clone().invert();
              for (let i = 0; i < positions.count; i++) {
                // Side outlet discs have horizontal normals and are seated on collars.
                if (normals.getY(i) < 0.5) continue;
                vertex
                  .fromBufferAttribute(positions, i)
                  .applyMatrix4(mouths.matrixWorld)
                  .applyMatrix4(inverseBody);
                let distance = Infinity;
                for (let j = 0; j < (index?.count ?? surface.count); j += 3) {
                  triangle.a.fromBufferAttribute(surface, index ? index.getX(j) : j);
                  triangle.b.fromBufferAttribute(surface, index ? index.getX(j + 1) : j + 1);
                  triangle.c.fromBufferAttribute(surface, index ? index.getX(j + 2) : j + 2);
                  triangle.closestPointToPoint(vertex, closest);
                  distance = Math.min(distance, closest.distanceTo(vertex));
                }
                maxMouthDistance = Math.max(maxMouthDistance, distance);
                mouthVertices++;
                expect(distance).toBeLessThanOrEqual(0.5);
              }
            }
          } finally {
            disposeProp(built);
          }
        }
        surfaceAudit.push({ site, tier, ...totals, issues, mouthVertices, maxMouthDistance });
        expect(totals.draws).toBeLessThanOrEqual(1200);
        expect(totals.triangles).toBeGreaterThan(0);
        expect(totals.triangles).toBeLessThanOrEqual(1_200_000);
        // Frozen Low costs from the audited reference commit guard future growth.
        const lowTriangles = { 'lost-city': 50_712, 'beebe-vent-field': 20_338 };
        if (tier === 'low')
          expect(totals.triangles).toBeLessThanOrEqual(
            lowTriangles[site as keyof typeof lowTriangles] * 1.1,
          );
        expect(issues).toEqual([]);
        if (site === 'beebe-vent-field') expect(mouthVertices).toBe(288);
      });
    }
  }
});
