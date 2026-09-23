import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, makeConfig } from '../../src/core/Config.js';
import { latLonToWorld } from '../../src/util/geo.js';
import {
  parseModel,
  modelLoadUrl,
  parsePropsDoc,
  validatePropEntry,
  type PropDef,
} from '../../src/world/PropLoader.js';
import {
  Props,
  computePlacement,
  headingQuaternion,
  type PropsHeightField,
} from '../../src/world/Props.js';
import { makeSyntheticTile } from './helpers.js';

const cfg = DEFAULT_CONFIG.props;
const { meta } = makeSyntheticTile({ cols: 40, rows: 40, cellsizeDeg: 0.001 });

/** A plane rising 0.1 m per metre east: y = -3800 + 0.1 x. */
const slope: PropsHeightField = {
  sampleHeight: (x) => -3800 + 0.1 * x,
  getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(-0.1, 1, 0).normalize(),
};

const base = { id: 'a', model: 'procedural:hull-block', lat: 41.73, lon: -49.95 };

function def(extra: Record<string, unknown>): PropDef {
  const res = validatePropEntry({ ...base, ...extra }, cfg);
  if (typeof res === 'string') throw new Error(res);
  return res;
}

describe('PropLoader validation', () => {
  it('fills defaults for a minimal procedural entry', () => {
    const d = def({ snap_to_seabed: true, dimensions_m: [140, 28, 30] });
    expect(d.procedural).toBe('hull-block');
    expect(d.collision).toBe(cfg.defaultCollision['hull-block']);
    expect(d.lodDistanceM).toBe(cfg.defaultLodDistanceM);
    expect(d.scale).toEqual([1, 1, 1]);
    expect(d.headingDeg).toBe(0);
    expect(d.depthM).toBeNull();
  });

  it('parses hull-block "ends", defaulting to prow forward / cut aft', () => {
    expect(def({ snap_to_seabed: true }).hullEnds).toEqual(['prow', 'cut']);
    expect(def({ snap_to_seabed: true, ends: ['cut', 'rounded'] }).hullEnds).toEqual([
      'cut',
      'rounded',
    ]);
    for (const bad of [['prow'], ['prow', 'keel'], 'prow', ['cut', 'cut', 'cut'], [1, 2]]) {
      const res = validatePropEntry({ ...base, snap_to_seabed: true, ends: bad }, cfg);
      expect(typeof res).toBe('string');
      expect(res as string).toContain('"ends"');
    }
    const warnings: string[] = [];
    const chimney = validatePropEntry(
      { ...base, model: 'procedural:chimney', snap_to_seabed: true, ends: ['prow', 'cut'] },
      cfg,
      warnings,
    );
    expect(typeof chimney).not.toBe('string');
    expect((chimney as PropDef).hullEnds).toBeNull();
    expect(warnings.join(' ')).toContain('only applies to procedural:hull-block');
  });

  it('parses chimney "material_hint"; absent is null (basalt), unknown is an error', () => {
    const chim = { model: 'procedural:chimney', snap_to_seabed: true };
    expect(def(chim).materialHint).toBeNull();
    for (const m of ['basalt', 'carbonate', 'sulfide']) {
      const w: string[] = [];
      const d = validatePropEntry({ ...base, ...chim, material_hint: m }, cfg, w);
      expect((d as PropDef).materialHint).toBe(m);
      expect(w.join(' ')).not.toContain('material_hint');
    }
    for (const bad of ['granite', 'Carbonate', '', 3, null, ['carbonate']]) {
      const res = validatePropEntry({ ...base, ...chim, material_hint: bad }, cfg);
      expect(typeof res).toBe('string');
      expect(res as string).toContain('"material_hint"');
    }
    const warnings: string[] = [];
    const hull = validatePropEntry(
      { ...base, snap_to_seabed: true, material_hint: 'sulfide' },
      cfg,
      warnings,
    );
    expect((hull as PropDef).materialHint).toBeNull();
    expect(warnings.join(' ')).toContain('only applies to procedural:chimney');
  });

  it('recognises model kinds', () => {
    expect(parseModel('procedural:debris')).toBe('debris');
    expect(parseModel('procedural:chimney')).toBe('chimney');
    expect(parseModel('/assets/models/rock_09.glb')).toBeNull();
    expect(parseModel('procedural:castle')).toBeUndefined();
    expect(parseModel('https://evil.example/x.glb')).toBeUndefined();
    expect(parseModel('/assets/models/../../secret.glb')).toBeUndefined();
    expect(parseModel('/assets/models/rock.obj')).toBeUndefined();
  });

  it('loads authored models under the site base and preserves explicit URLs', () => {
    expect(modelLoadUrl('/assets/models/rock_09.glb', '/submarine-explorer/')).toBe(
      '/submarine-explorer/assets/models/rock_09.glb',
    );
    expect(modelLoadUrl('https://cdn.example/rock.glb', '/submarine-explorer/')).toBe(
      'https://cdn.example/rock.glb',
    );
  });

  it('skips bad entries and keeps good ones', () => {
    const doc = {
      version: 1,
      landmark: 't',
      props: [
        { ...base, id: 'ok', snap_to_seabed: true, dimensions_m: [10, 5, 5] },
        { ...base, id: '', snap_to_seabed: true },
        { ...base, id: 'bad-model', model: 'procedural:castle', snap_to_seabed: true },
        { ...base, id: 'bad-lat', lat: 123, snap_to_seabed: true },
        { ...base, id: 'neg-depth', depth_m: -3800 },
        { ...base, id: 'no-depth' },
        { ...base, id: 'bad-scale', snap_to_seabed: true, scale: [1, 0, 1] },
        { ...base, id: 'bad-collision', snap_to_seabed: true, collision: 'mesh' },
        { ...base, id: 'flat-hull', snap_to_seabed: true, dimensions_m: [10, 0, 5] },
        { ...base, id: 'bad-lod', snap_to_seabed: true, lod_distance_m: -1 },
        'not an object',
        { ...base, id: 'ok', snap_to_seabed: true },
        { ...base, id: 'ok2', depth_m: 3790, model: '/assets/models/rock_09.glb', scale: 3 },
      ],
    };
    const res = parsePropsDoc(doc, cfg);
    expect(res.props.map((p) => p.id)).toEqual(['ok', 'ok2']);
    expect(res.errors).toHaveLength(11);
    expect(res.errors.some((e) => e.includes('duplicate id "ok"'))).toBe(true);
    expect(res.errors.some((e) => e.includes('positive depth magnitude'))).toBe(true);
    expect(res.landmark).toBe('t');
    expect(res.props[1]!.scale).toEqual([3, 3, 3]);
    expect(res.props[1]!.collision).toBe(cfg.defaultCollision.model);
  });

  it('reports a document without a props array', () => {
    expect(parsePropsDoc({ version: 1 }, cfg).errors).toHaveLength(1);
    expect(parsePropsDoc(null, cfg).errors).toHaveLength(1);
    expect(parsePropsDoc([{ ...base, snap_to_seabed: true }], cfg).props).toHaveLength(1);
  });

  it('prefers snapping when both depth_m and snap_to_seabed are set', () => {
    const warnings: string[] = [];
    const d = validatePropEntry({ ...base, depth_m: 100, snap_to_seabed: true }, cfg, warnings);
    expect(typeof d).not.toBe('string');
    expect((d as PropDef).depthM).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('uses default dimensions for a procedural entry without them, with a warning', () => {
    const warnings: string[] = [];
    const d = validatePropEntry(
      { ...base, model: 'procedural:chimney', snap_to_seabed: true },
      cfg,
      warnings,
    );
    expect((d as PropDef).dimensionsM).toEqual(cfg.defaultDimensionsM.chimney);
    expect(warnings[0]).toMatch(/dimensions_m/);
  });

  it('caps the number of props', () => {
    const small = makeConfig({ props: { ...cfg, maxProps: 2 } }).props;
    const props = [1, 2, 3].map((i) => ({ ...base, id: `p${i}`, snap_to_seabed: true }));
    const res = parsePropsDoc({ props }, small);
    expect(res.props).toHaveLength(2);
    expect(res.errors[0]).toMatch(/cap/);
  });

  it('normalises heading and keeps the raw entry for the debug tool', () => {
    const d = def({ snap_to_seabed: true, heading_deg: -90, custom_key: 7 });
    expect(d.headingDeg).toBe(270);
    expect(d.raw.custom_key).toBe(7);
  });
});

describe('prop placement', () => {
  const pos = new THREE.Vector3();
  const q = new THREE.Quaternion();

  it('converts positive depth_m to negative world Y', () => {
    computePlacement(def({ depth_m: 3800 }), meta, slope, null, pos, q);
    expect(pos.y).toBe(-3800);
    const { x, z } = latLonToWorld(meta, base.lat, base.lon);
    expect(pos.x).toBeCloseTo(x);
    expect(pos.z).toBeCloseTo(z);
  });

  it('snaps to the seabed and applies y_offset_m', () => {
    const d = def({ snap_to_seabed: true, y_offset_m: -2 });
    computePlacement(d, meta, slope, null, pos, q);
    expect(pos.y).toBeCloseTo(slope.sampleHeight(pos.x, pos.z) - 2);
  });

  it('sits a snapped footprint on its lowest corner so it never floats', () => {
    const d = def({ snap_to_seabed: true, heading_deg: 90 });
    // 100 m long along local Z; heading 90 lays it east-west across the slope.
    const footprint = new THREE.Box3(new THREE.Vector3(-5, 0, -50), new THREE.Vector3(5, 10, 50));
    computePlacement(d, meta, slope, footprint, pos, q);
    const centre = slope.sampleHeight(pos.x, pos.z);
    expect(pos.y).toBeCloseTo(centre - 0.1 * 50, 3);
  });

  it('turns local -Z to the compass heading (90 = east = +X)', () => {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(headingQuaternion(90));
    expect(fwd.x).toBeCloseTo(1);
    expect(fwd.z).toBeCloseTo(0);
    const north = new THREE.Vector3(0, 0, -1).applyQuaternion(headingQuaternion(0));
    expect(north.z).toBeCloseTo(-1);
    const south = new THREE.Vector3(0, 0, -1).applyQuaternion(headingQuaternion(180));
    expect(south.z).toBeCloseTo(1);
  });

  it('tilts to the terrain normal with align_to_slope', () => {
    const d = def({ snap_to_seabed: true, align_to_slope: true, heading_deg: 30 });
    computePlacement(d, meta, slope, null, pos, q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const n = slope.getNormal(0, 0);
    expect(up.distanceTo(n)).toBeLessThan(1e-6);
  });
});

describe('Props.placeAll', () => {
  it('builds procedural props, skips entries outside the tile, and counts them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const props = new Props(meta, slope, cfg);
    const stats = await props.placeAll(
      {
        props: [
          { ...base, id: 'hull', snap_to_seabed: true, dimensions_m: [60, 12, 10] },
          {
            ...base,
            id: 'deb',
            model: 'procedural:debris',
            snap_to_seabed: true,
            dimensions_m: [30, 0, 0],
          },
          {
            ...base,
            id: 'chim',
            model: 'procedural:chimney',
            depth_m: 3790,
            dimensions_m: [0, 0, 20],
          },
          { ...base, id: 'far', lat: 10, snap_to_seabed: true },
          { ...base, id: 'broken', model: 'procedural:castle', snap_to_seabed: true },
        ],
      },
      't',
    );
    expect(stats.count).toBe(3);
    expect(stats.procedural).toBe(3);
    expect(stats.skipped).toBe(2);
    expect(props.group.children).toHaveLength(3);
    // hull (box) + chimney (box); debris defaults to none.
    expect(stats.colliders).toBe(2);
    expect(props.problems).toHaveLength(2);
    expect(props.debugString()).toMatch(/props 3/);
    warn.mockRestore();
  });

  it('passes a chimney material_hint through to the built palette', async () => {
    const props = new Props(meta, slope, cfg);
    const chim = { ...base, model: 'procedural:chimney', depth_m: 3790, dimensions_m: [0, 0, 20] };
    await props.placeAll(
      {
        props: [
          { ...chim, id: 'plain' },
          { ...chim, id: 'white', material_hint: 'carbonate' },
        ],
      },
      't',
    );
    const imp = (id: string): number =>
      (
        (props.placed.find((p) => p.def.id === id)!.impostor as THREE.Mesh)
          .material as THREE.MeshStandardMaterial
      ).color.getHex();
    expect(imp('plain')).toBe(cfg.colors.basalt);
    expect(imp('white')).toBe(cfg.chimneyMaterials.carbonate.rock);
  });

  it('treats a missing file as no props and never throws', async () => {
    const props = new Props(meta, slope, cfg);
    const stats = await props.load('/nope/props.json', 'nope', async () => null);
    expect(stats.count).toBe(0);
    expect(stats.landmarkId).toBe('nope');
  });

  it('counts a model that fails to load instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const props = new Props(meta, slope, cfg);
    const stats = await props.placeAll(
      { props: [{ ...base, id: 'm', model: '/assets/models/missing.glb', snap_to_seabed: true }] },
      't',
    );
    expect(stats.count).toBe(0);
    expect(stats.failed).toBe(1);
    warn.mockRestore();
  });

  it('switches full / impostor / hidden by camera distance', async () => {
    const props = new Props(meta, slope, cfg);
    await props.placeAll(
      {
        props: [
          { ...base, id: 'h', depth_m: 3800, dimensions_m: [20, 10, 10], lod_distance_m: 100 },
        ],
      },
      't',
    );
    const p = props.placed[0]!;
    const cam = new THREE.PerspectiveCamera(60, 1, 0.5, 60000);
    const look = (dist: number): void => {
      cam.position.copy(p.sphere.center).add(new THREE.Vector3(0, 0, dist));
      cam.lookAt(p.sphere.center);
      cam.updateMatrixWorld();
      props.update(cam);
    };
    look(50);
    expect(p.lod).toBe('full');
    look(400);
    expect(p.lod).toBe('impostor');
    expect(p.full.visible).toBe(false);
    expect(p.impostor.visible).toBe(true);
    look(cfg.cullDistanceM + 500);
    expect(p.lod).toBe('hidden');
    expect(props.stats.hiddenDistance).toBe(1);
    // Close, but looking away: frustum-culled.
    cam.position.copy(p.sphere.center).add(new THREE.Vector3(0, 0, 50));
    cam.lookAt(p.sphere.center.clone().add(new THREE.Vector3(0, 0, 500)));
    cam.updateMatrixWorld();
    props.update(cam);
    expect(props.stats.hiddenFrustum).toBe(1);
  });
});
