import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
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
import { InstanceList } from '../../src/world/props/wrecks/instances.js';
import { countTriangles, flipFaces, makeStations } from '../../src/world/props/wrecks/kit.js';
import { paintWreck } from '../../src/world/props/wrecks/materials.js';
import { wreckScatterSpec } from '../../src/world/props/wrecks/scatter.js';
import { layoutScatter, scatterCount } from '../../src/world/props/wrecks/scatterLayout.js';
import { mulberry32 } from '../../src/world/props/wrecks/shared.js';
import { makeSyntheticTile } from './helpers.js';

const DIMS: Record<WreckId, [number, number, number]> = {
  'titanic-bow': [143, 28, 16],
  'titanic-stern': [107, 32, 10],
  bismarck: [251, 36, 15],
  endurance: [44, 7.6, 8],
  'titanic-boilers': [25, 25, 5],
  'titanic-field': [150, 150, 2],
  'titanic-stern-field': [80, 80, 3],
  'bismarck-turrets': [50, 50, 6],
  'bismarck-field': [60, 60, 3],
  'bismarck-landslide': [200, 45, 4],
  'endurance-rigging': [35, 35, 3],
  'endurance-stern': [4, 4, 2],
};
const TIERS = ['low', 'medium', 'high', 'ultra'] as const;

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

  it('detail scales with the tier: low < medium <= high <= ultra', () => {
    for (const id of WRECK_HULLS) {
      const t = TIERS.map((tier) => nearStats(id, tier).triangles);
      expect(t[0]).toBeLessThan(t[1]!);
      expect(t[1]).toBeLessThanOrEqual(t[2]!);
      expect(t[2]).toBeLessThanOrEqual(t[3]!);
    }
  });

  it('stays inside the per-tier triangle budgets (near LOD, instances counted)', () => {
    // Budgets per hull in thousands of triangles; see plan/progress/F1-WRECKS.md.
    const budget: Record<string, number> = { low: 180, medium: 400, high: 700, ultra: 1200 };
    for (const id of WRECK_HULLS) {
      for (const tier of TIERS) {
        expect(nearStats(id, tier).triangles / 1000, `${id}@${tier}`).toBeLessThan(budget[tier]!);
      }
    }
  });

  it('low tier drops small debris; ultra has more scatter than medium', () => {
    const count = (tier: string): number =>
      buildWreck('titanic-field', DIMS['titanic-field'], 3, tier, () => 0).full.getObjectsByProperty('isInstancedMesh', true).length;
    const low = buildWreck('titanic-field', DIMS['titanic-field'], 3, 'low', () => 0);
    expect(low.full.getObjectByName('titanic-field-crockery')).toBeUndefined();
    expect(count('medium')).toBeGreaterThan(count('low'));
    const inst = (tier: string): number => {
      let n = 0;
      buildWreck('titanic-field', DIMS['titanic-field'], 3, tier, () => 0).full.traverse((o) => {
        if ((o as THREE.InstancedMesh).isInstancedMesh && !o.name.endsWith('-mid')) n += (o as THREE.InstancedMesh).count;
      });
      return n;
    };
    expect(inst('ultra')).toBeGreaterThan(inst('medium'));
  });

  it('exports interior anchor points for later ROV interiors', () => {
    const names = (id: WreckId): string[] => buildWreck(id, DIMS[id], 1, 'medium').anchors.map((a) => a.name);
    expect(names('titanic-bow')).toContain('interior-entry');
    expect(names('titanic-stern')).toContain('interior-entry');
    expect(names('endurance')).toContain('interior-entry');
    expect(names('bismarck')).toEqual(
      expect.arrayContaining(['barbette-anton', 'barbette-bruno', 'barbette-caesar', 'barbette-dora', 'interior-entry']),
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
});

describe('scatter layout', () => {
  const spec = wreckScatterSpec('titanic-field', [100, 100, 2]);

  it('is deterministic from the seed', () => {
    const o = { density: 1, smallDebris: true };
    expect(layoutScatter(spec, mulberry32(4), o)).toEqual(layoutScatter(spec, mulberry32(4), o));
    expect(layoutScatter(spec, mulberry32(4), o)).not.toEqual(layoutScatter(spec, mulberry32(5), o));
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
    const boilers = wreckScatterSpec('titanic-boilers', [25, 25, 5]).kinds.find((k) => k.name === 'boilers')!;
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
    expect(st.some((s) => Math.abs(s - 49.98) < 1e-6) && st.some((s) => Math.abs(s - 50.02) < 1e-6)).toBe(true);
  });

  it('flipFaces reverses winding and normals', () => {
    const g = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    const n0 = new THREE.Vector3().fromBufferAttribute(g.getAttribute('normal'), 0);
    flipFaces(g);
    const n1 = new THREE.Vector3().fromBufferAttribute(g.getAttribute('normal'), 0);
    expect(n1.dot(n0)).toBeCloseTo(-1);
    const tri = new THREE.Triangle().setFromAttributeAndIndices(g.getAttribute('position'), 0, 1, 2);
    expect(tri.getNormal(new THREE.Vector3()).dot(n1)).toBeCloseTo(1);
  });

  it('InstanceList.thin keeps an even, deterministic subset', () => {
    const l = new InstanceList();
    for (let i = 0; i < 100; i++) l.push(new THREE.Matrix4().makeTranslation(i, 0, 0));
    l.thin(0.25);
    expect(l.length).toBe(25);
    expect(new THREE.Vector3().setFromMatrixPosition(l.matrices[1]!).x).toBe(4);
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
});

describe('props.json wiring', () => {
  const cfg = DEFAULT_CONFIG.props;
  const entry = { id: 'w', lat: 41.73, lon: -49.95, snap_to_seabed: true, dimensions_m: [143, 28, 16] };

  it('accepts a wreck id matching the procedural kind', () => {
    const d = validatePropEntry({ ...entry, model: 'procedural:hull-block', wreck: 'titanic-bow' }, cfg) as PropDef;
    expect(d.wreck).toBe('titanic-bow');
    const s = validatePropEntry({ ...entry, model: 'procedural:debris', wreck: 'titanic-field' }, cfg) as PropDef;
    expect(s.wreck).toBe('titanic-field');
  });

  it('warns and falls back to the generic builder on a mismatched or unknown id', () => {
    const w: string[] = [];
    const d = validatePropEntry({ ...entry, model: 'procedural:debris', wreck: 'titanic-bow' }, cfg, w) as PropDef;
    expect(d.wreck).toBeNull();
    expect(validatePropEntry({ ...entry, model: 'procedural:hull-block', wreck: 'nope' }, cfg, w)).not.toBeTypeOf('string');
    expect(w).toHaveLength(2);
    expect((validatePropEntry({ ...entry, model: 'procedural:hull-block' }, cfg) as PropDef).wreck).toBeNull();
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
      endurance: { 'main-hull': 'endurance', 'rigging-debris': 'endurance-rigging', 'helm-marker': 'endurance-stern' },
    };
    for (const [site, ids] of Object.entries(expected)) {
      const doc = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8')) as unknown;
      const parsed = parsePropsDoc(doc, cfg);
      expect(parsed.errors, site).toEqual([]);
      const byId = new Map(parsed.props.map((p) => [p.id, p]));
      for (const [id, wreck] of Object.entries(ids)) expect(byId.get(id)?.wreck, `${site}/${id}`).toBe(wreck);
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
      { props: [{ ...entry, model: 'procedural:hull-block', wreck: 'titanic-bow', collision: 'box' }] },
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
