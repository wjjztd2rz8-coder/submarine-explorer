import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import blakeProps from '../../data/landmarks/blake-plateau-corals/props.json';
import hudsonProps from '../../data/landmarks/hudson-canyon/props.json';
import type { GameContext } from '../../src/app/context.js';
import { propsSystem } from '../../src/app/systems/props.js';
import * as manifests from '../../src/core/SiteManifest.js';
import { DEFAULT_CONFIG, makeConfig } from '../../src/core/Config.js';
import { latLonToWorld } from '../../src/util/geo.js';
import {
  ModelCache,
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
import { PROCEDURAL_BUILDERS, type BuiltProp } from '../../src/world/props/builders/index.js';
import { propData, siteIds } from '../content.js';

const cfg = DEFAULT_CONFIG.props;

// Runs in default gates without a browser; rejected or capped entries must not
// reduce the expected count used by the rendered-content checks.
it.each([...siteIds, '_test'])('%s: every declared prop survives loading validation', (site) => {
  const doc = propData(site);
  const parsed = parsePropsDoc(doc, cfg);
  expect(doc.props.length).toBeGreaterThan(0);
  expect(parsed.errors).toEqual([]);
  expect(parsed.warnings).toEqual([]);
  expect(parsed.props.map((p) => p.id)).toEqual(doc.props.map((p) => p.id));
});

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

  it.each([false, true])(
    'covers only the clear_ground prop footprint (slope alignment: %s)',
    async (aligned) => {
      const props = new Props(meta, slope, cfg);
      await props.placeAll(
        {
          props: [
            {
              ...base,
              id: 'dressed',
              snap_to_seabed: true,
              dimensions_m: [60, 12, 10],
              clear_ground: true,
              align_to_slope: aligned,
              heading_deg: 37,
              scale: [2, 1, 0.5],
            },
            { ...base, id: 'plain', lat: 41.74, snap_to_seabed: true, dimensions_m: [60, 12, 10] },
          ],
        },
        't',
      );
      const dressed = props.placed.find((p) => p.def.id === 'dressed')!;
      const plain = props.placed.find((p) => p.def.id === 'plain')!;
      expect(dressed.def.clearsGround).toBe(true);
      expect(plain.def.clearsGround).toBe(false);
      const inside = dressed.localBounds.getCenter(new THREE.Vector3());
      dressed.root.localToWorld(inside);
      expect(props.coversGround(inside.x, inside.z)).toBe(true);
      // A vertical projection must include both the base and crown of a tilted prop.
      for (const x of [0.01, 0.99])
        for (const y of [0.01, 0.99])
          for (const z of [0.01, 0.99]) {
            const point = dressed.localBounds.getSize(new THREE.Vector3());
            point.multiply(new THREE.Vector3(x, y, z));
            point.add(dressed.localBounds.min);
            dressed.root.localToWorld(point);
            expect(props.coversGround(point.x, point.z, 0)).toBe(true);
          }
      expect(props.coversGround(inside.x + 400, inside.z + 400)).toBe(false);
      const other = plain.localBounds.getCenter(new THREE.Vector3());
      plain.root.localToWorld(other);
      expect(props.coversGround(other.x, other.z)).toBe(false);
    },
  );

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

describe('loaded prop scatter policy', () => {
  const cases = [
    ...manifests.allSiteManifests().map((m) => ({ site: m.id })),
    { site: 'unknown' },
    { site: 'challenger-deep', missingHero: true },
    { site: 'challenger-deep', missingContent: true },
    { site: 'challenger-deep', content: 'unknown' },
    { site: 'unknown', content: 'challenger-deep' },
    { site: 'unknown', content: 'challenger-deep', mission: true },
    { site: 'custom', customHero: true },
    { site: 'challenger-deep', disabled: true },
  ];
  it.each(cases)(
    'resolves keepout from loaded content: %j',
    async (row: {
      site: string;
      content?: string;
      missingHero?: boolean;
      missingContent?: boolean;
      mission?: boolean;
      customHero?: boolean;
      disabled?: boolean;
    }) => {
      const content = row.content ?? row.site;
      const heroId = row.customHero ? 'custom-hero' : 'leggo-lander-marker';
      const originalLoad = Props.prototype.load;
      let finish!: (doc: unknown) => void;
      const pending = new Promise<unknown>((resolve) => (finish = resolve));
      const load = vi.spyOn(Props.prototype, 'load').mockImplementationOnce(function (
        this: Props,
        url,
        id,
      ) {
        return originalLoad.call(this, url, id, () => pending);
      });
      const manifest = vi.spyOn(manifests, 'siteManifest');
      if (row.customHero || row.disabled)
        manifest.mockReturnValue({
          id: content,
          scatter: { keepoutHero: !row.disabled },
          opening: { freeDive: { hero: heroId, bearing: 0, range: 30 } },
        });
      const order: string[] = [];
      const setGroundKeepout = vi.fn(() => order.push('ground'));
      const setBoulderKeepout = vi.fn((_bounds: THREE.Box3) => order.push('boulders'));
      let loaded!: () => void;
      const ready = new Promise<void>((resolve) => (loaded = resolve));
      const emit = vi.fn(() => {
        order.push('loaded');
        loaded();
      });
      const ctx = {
        meta: { ...meta, id: row.site },
        terrain: { ...slope, scatter: { setGroundKeepout, setBoulderKeepout } },
        config: DEFAULT_CONFIG,
        tier: 'medium',
        scene: new THREE.Scene(),
        params: new URLSearchParams({ depth: '3800', landmark: content }),
        route: row.mission ? {} : null,
        contentLandmark: content,
        sub: { position: new THREE.Vector3() },
        bus: { emit },
        expose: () => {},
      } as unknown as GameContext;
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      try {
        propsSystem.init?.(ctx);
        expect(load).toHaveBeenCalledWith(`/data/landmarks/${content}/props.json`, content);
        expect(order).toEqual([]);
        finish(
          row.missingContent
            ? null
            : {
                props: [
                  {
                    ...base,
                    id: row.missingHero ? 'other-prop' : heroId,
                    snap_to_seabed: true,
                    clear_ground: true,
                    dimensions_m: [60, 12, 10],
                    heading_deg: 37,
                    scale: [2, 1, 0.5],
                    align_to_slope: true,
                  },
                ],
              },
        );
        await ready;
        const enabled =
          (content === 'challenger-deep' || row.customHero) &&
          !row.missingHero &&
          !row.missingContent &&
          !row.disabled;
        expect(setBoulderKeepout).toHaveBeenCalledTimes(enabled ? 1 : 0);
        expect(order).toEqual(
          row.missingContent
            ? ['loaded']
            : enabled
              ? ['ground', 'boulders', 'loaded']
              : ['ground', 'loaded'],
        );
        expect(emit).toHaveBeenCalledWith('props:loaded', {
          landmarkId: content,
          count: row.missingContent ? 0 : 1,
          models: 0,
          procedural: row.missingContent ? 0 : 1,
        });
        if (enabled) {
          const prop = ctx.props.placed[0];
          const local = prop.localBounds.clone();
          const expected = local.clone().applyMatrix4(prop.root.matrixWorld);
          expect(setBoulderKeepout.mock.calls[0][0]).toEqual(expected);
          expect(setBoulderKeepout.mock.calls[0][0]).not.toBe(prop.localBounds);
          expect(expected).not.toEqual(local);
          expect(prop.localBounds).toEqual(local);
        }
      } finally {
        info.mockRestore();
        manifest.mockRestore();
        load.mockRestore();
        propsSystem.dispose?.();
      }
    },
  );
});

describe('prop resource lifetime', () => {
  it.each([
    { site: 'blake-plateau-corals', doc: blakeProps },
    { site: 'hudson-canyon', doc: hudsonProps },
  ])(
    '$site retains coral bindings through LOD and terrain rebuilds, releasing only owned resources',
    async ({ site, doc }) => {
      const authored = doc.props.find((p) => p.feature === 'coral-mound')!;
      const { meta: localMeta } = makeSyntheticTile({
        centerLat: authored.lat,
        centerLon: authored.lon,
      });
      const props = new Props(localMeta, slope, cfg, 'low');
      const survivor = new Props(localMeta, slope, cfg, 'low');
      // Observe the real registry boundary before placement can alter a builder's bindings.
      const observe = (built: BuiltProp) => {
        const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.InstancedMesh>();
        const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
        for (const root of [built.full, built.impostor])
          root.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            resources.add(object.geometry);
            for (const m of Array.isArray(object.material) ? object.material : [object.material])
              resources.add(m);
            if (object instanceof THREE.InstancedMesh) resources.add(object);
            if (
              root === built.full &&
              (!(object instanceof THREE.InstancedMesh) || /^colonies-/.test(object.name))
            )
              meshes.push(object);
          });
        const colonies = meshes.filter((m) => m instanceof THREE.InstancedMesh);
        expect(colonies.length).toBeGreaterThan(1);
        expect(new Set(colonies.map((m) => m.material)).size).toBe(1);
        expect(meshes.some((m) => !(m instanceof THREE.InstancedMesh))).toBe(true);
        const bindings = meshes.map((mesh) => ({
          mesh,
          material: mesh.material,
          emissive: mesh.material.emissive.clone(),
          compile: mesh.material.onBeforeCompile,
          cacheKey: mesh.material.customProgramCacheKey,
          key: mesh.material.customProgramCacheKey(),
        }));
        return {
          built,
          resources,
          disposals: [...resources].map((r) => vi.spyOn(r, 'dispose')),
          checkBindings() {
            for (const b of bindings) {
              expect(b.mesh.material).toBe(b.material);
              expect(b.material.emissive).toEqual(b.emissive);
              expect(b.material.onBeforeCompile).toBe(b.compile);
              expect(b.material.customProgramCacheKey).toBe(b.cacheKey);
              expect(b.material.customProgramCacheKey()).toBe(b.key);
              expect(b.mesh.parent).toBe(built.full);
            }
          },
        };
      };
      const builds: ReturnType<typeof observe>[] = [];
      const build = PROCEDURAL_BUILDERS.geo;
      const registry = vi.spyOn(PROCEDURAL_BUILDERS, 'geo').mockImplementation((input) => {
        const built = build(input);
        builds.push(observe(built));
        return built;
      });
      try {
        for (const system of [props, survivor]) {
          await system.load('props.json', site, async () => ({ props: [authored] }));
          expect(system.loaded).toBe(true);
          expect(system.stats.failed).toBe(0);
          expect(system.placed).toHaveLength(1);
          expect(system.placed[0].def.dimensionsM).toEqual(authored.dimensions_m);
        }
        const [initial, peer] = builds;
        const p = props.placed[0];
        expect(p.full).toBe(initial.built.full);
        initial.checkBindings();
        peer.checkBindings();
        for (const resource of initial.resources) expect(peer.resources.has(resource)).toBe(false);
        const cam = new THREE.PerspectiveCamera(60, 1, 0.5, 60000);
        const look = (distance: number, lod: 'full' | 'impostor' | 'hidden') => {
          cam.position.copy(p.sphere.center).add(new THREE.Vector3(0, 0, distance));
          cam.lookAt(p.sphere.center);
          props.update(cam);
          expect(p.lod).toBe(lod);
          expect(p.root.visible).toBe(lod !== 'hidden');
          expect(p.full.visible).toBe(lod === 'full');
          expect(p.impostor.visible).toBe(lod === 'impostor');
        };
        const near = p.sphere.radius + p.def.lodDistanceM / 2;
        const far = p.sphere.radius + p.def.lodDistanceM * 1.5;
        look(near, 'full');
        look(far, 'impostor');
        look(
          p.sphere.radius + Math.max(cfg.cullDistanceM, p.def.lodDistanceM * cfg.cullLodFactor) + 1,
          'hidden',
        );
        look(near, 'full');
        initial.checkBindings();
        for (const dispose of initial.disposals) expect(dispose).not.toHaveBeenCalled();

        look(far, 'impostor');
        p.def.headingDeg += 15;
        await props.replace(p);
        expect(builds).toHaveLength(3);
        const rebuilt = builds[2];
        expect(p.full).toBe(rebuilt.built.full);
        expect(p.full).not.toBe(initial.built.full);
        expect(initial.built.full.parent).toBeNull();
        expect(initial.built.impostor.parent).toBeNull();
        expect(p.lod).toBe('impostor');
        expect(p.full.visible).toBe(false);
        expect(p.impostor.visible).toBe(true);
        rebuilt.checkBindings();
        look(p.sphere.radius + p.def.lodDistanceM / 2, 'full');
        rebuilt.checkBindings();
        for (const dispose of initial.disposals) expect(dispose).toHaveBeenCalledOnce();
        for (const dispose of [...rebuilt.disposals, ...peer.disposals])
          expect(dispose).not.toHaveBeenCalled();

        props.dispose();
        props.dispose();
        for (const dispose of [...initial.disposals, ...rebuilt.disposals])
          expect(dispose).toHaveBeenCalledOnce();
        peer.checkBindings();
        expect(survivor.placed[0].full).toBe(peer.built.full);
        for (const dispose of peer.disposals) expect(dispose).not.toHaveBeenCalled();
        survivor.dispose();
        survivor.dispose();
        for (const dispose of peer.disposals) expect(dispose).toHaveBeenCalledOnce();
      } finally {
        props.dispose();
        survivor.dispose();
        registry.mockRestore();
        for (const observed of builds)
          for (const dispose of observed.disposals) dispose.mockRestore();
      }
    },
  );

  it('teardown releases procedural geometry/materials and removes collision and scene ownership', async () => {
    const props = new Props(meta, slope, cfg, 'low');
    const scene = new THREE.Scene();
    scene.add(props.group);
    await props.placeAll({ props: [{ ...base, snap_to_seabed: true }] }, 'test');
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    props.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material)
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
          materials.add(m);
    });
    const disposals = [...geometries, ...materials].map((o) => vi.spyOn(o, 'dispose'));
    const position = props.placed[0].sphere.center.clone();
    expect(props.collide(position.clone(), 6, new THREE.Vector3())).toBe(true);
    props.dispose();
    props.dispose();
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
    expect(scene.children).toHaveLength(0);
    expect(props.placed).toHaveLength(0);
    expect(props.collide(position, 6, new THREE.Vector3())).toBe(false);
  });

  it.each(['content', 'model'] as const)(
    'late %s cannot recreate a disposed prop scene',
    async (stage) => {
      const props = new Props(meta, slope, cfg, 'low');
      let finish!: (value: unknown) => void;
      const pending = new Promise<unknown>((resolve) => {
        finish = resolve;
      });
      const shared = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
      const geometry = vi.spyOn(shared.geometry, 'dispose');
      const material = vi.spyOn(shared.material, 'dispose');
      const models = vi.spyOn(ModelCache.prototype, 'get').mockImplementation(async () => {
        await pending;
        return shared.clone();
      });
      try {
        const loading =
          stage === 'content'
            ? props.load('props.json', 'test', () => pending)
            : props.placeAll(
                { props: [{ ...base, model: '/assets/models/rock.glb', snap_to_seabed: true }] },
                'test',
              );
        props.dispose();
        finish(stage === 'content' ? { props: [{ ...base, snap_to_seabed: true }] } : null);
        await loading;
        expect(props.placed).toHaveLength(0);
        expect(props.group.children).toHaveLength(0);
        // GLB clones borrow their full-detail resources from the shared asset cache.
        expect(geometry).not.toHaveBeenCalled();
        expect(material).not.toHaveBeenCalled();
      } finally {
        models.mockRestore();
        shared.geometry.dispose();
        shared.material.dispose();
      }
    },
  );
});

it('a disposed prop system drops late load events and scatter/spawn callbacks', async () => {
  let finish!: (doc: unknown) => void;
  const pending = new Promise<unknown>((resolve) => {
    finish = resolve;
  });
  const original = Props.prototype.load;
  const load = vi.spyOn(Props.prototype, 'load').mockImplementationOnce(function (
    this: Props,
    url,
    id,
  ) {
    return original.call(this, url, id, () => pending);
  });
  const keepout = vi.fn();
  const emit = vi.fn();
  const ctx = {
    meta,
    config: DEFAULT_CONFIG,
    tier: 'low',
    route: null,
    terrain: { ...slope, scatter: { setGroundKeepout: keepout, setBoulderKeepout: keepout } },
    scene: new THREE.Scene(),
    params: new URLSearchParams('depth=3800'),
    sub: { position: new THREE.Vector3() },
    bus: { emit },
    expose() {},
  } as unknown as GameContext;
  try {
    propsSystem.init!(ctx);
    propsSystem.dispose?.();
    finish({ props: [{ ...base, snap_to_seabed: true, clear_ground: true }] });
    await load.mock.results[0].value;
    await Promise.resolve();
    expect(ctx.scene.children).toHaveLength(0);
    expect(ctx.props.placed).toHaveLength(0);
    expect(keepout).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  } finally {
    load.mockRestore();
    propsSystem.dispose?.();
  }
});

it.each(['hull-block', 'debris'])(
  '%s releases its private rust texture during teardown',
  async (kind) => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(128);
    const context = new Proxy(
      {
        getImageData: () => ({ data: pixels }),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
      },
      { get: (target, key) => Reflect.get(target, key) ?? (() => {}) },
    );
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
    const props = new Props(meta, slope, { ...cfg, textureSize: 4 }, 'low');
    try {
      await props.placeAll(
        { props: [{ ...base, model: `procedural:${kind}`, snap_to_seabed: true }] },
        'test',
      );
      expect(props.stats.failed).toBe(0);
      const maps: THREE.Texture[] = [];
      props.placed[0].full.traverse((o) => {
        const mesh = o as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
        if (mesh.material?.map) maps.push(mesh.material.map);
      });
      expect(maps[0]).toBeInstanceOf(THREE.Texture);
      const dispose = vi.spyOn(maps[0], 'dispose');
      if (kind === 'debris') {
        await props.replace(props.placed[0]);
        expect(dispose).toHaveBeenCalledOnce();
      }
      props.dispose();
      props.dispose();
      expect(dispose).toHaveBeenCalledOnce();
    } finally {
      props.dispose();
      vi.unstubAllGlobals();
    }
  },
);
