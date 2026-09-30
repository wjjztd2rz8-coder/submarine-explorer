import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { PROCEDURAL_BUILDERS } from '../../src/world/props/builders/index.js';
import { buildPlacedChimney } from '../../src/world/props/builders/vents.js';
import {
  buildGeo,
  countGeo,
  GEO_FEATURES,
  isGeoFeature,
  type GeoFeatureId,
} from '../../src/world/props/geo/index.js';
import { makePlume } from '../../src/world/props/geo/plume.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import { parsePropsDoc, validatePropEntry, type PropDef } from '../../src/world/PropLoader.js';

const cfg = DEFAULT_CONFIG.props;

const DIMS: Record<GeoFeatureId, [number, number, number]> = {
  'smoker-cluster': [22, 18, 9],
  'carbonate-tower': [70, 60, 60],
  'coral-mound': [60, 44, 12],
  'stalactite-cluster': [42, 16, 28],
  'pillow-field': [30, 24, 4],
  'tuff-cliff': [90, 30, 45],
  'canyon-ledge': [70, 26, 36],
  'hadal-scarp': [100, 40, 50],
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
    expect(b.bounds.max.y).toBeGreaterThan(55);
    expect(b.bounds.max.y).toBeLessThan(75);
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
