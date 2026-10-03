/**
 * Placed 3D props: wrecks, debris, chimneys, rocks (docs/props.md).
 *
 * Reads `/data/landmarks/<landmark>/props.json` (plan/PHASE-B-CONTRACTS.md §2.3),
 * builds procedural placeholders or loads GLBs, and places them at real
 * coordinates on the real terrain. Per frame, `update(camera)` picks full mesh /
 * impostor / hidden by distance and frustum; `collide()` pushes a sphere (the
 * submarine) out of any prop volume.
 *
 * Orientation: `heading_deg` is the compass heading of the prop's local -Z
 * (0 = north = world -Z, 90 = east = +X), the same convention as
 * `Submarine.getForward()`. Three's +Y rotation turns -Z toward -X (west), hence
 * the minus sign in {@link headingQuaternion}.
 */

import * as THREE from 'three';
import type { PropsConfig } from '../core/Config.js';
import { fetchContentJson } from '../game/ContentPath.js';
import { bboxContains, latLonToWorld } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';
import { ModelCache, parsePropsDoc, type PropDef } from './PropLoader.js';
import {
  collideAll,
  makeBoxCollider,
  makeSphereCollider,
  type Collider,
} from './props/Collision.js';
import {
  PROCEDURAL_BUILDERS,
  hashString,
  makeBoxSilhouette,
  type BuiltProp,
  type LocalHeightFn,
} from './props/builders/index.js';

/** The narrow terrain interface props need (Terrain satisfies it). */
export interface PropsHeightField {
  sampleHeight(x: number, z: number): number;
  getNormal(x: number, z: number, out?: THREE.Vector3): THREE.Vector3;
}

export type PropLod = 'full' | 'impostor' | 'hidden';

export interface PlacedProp {
  def: PropDef;
  /** Carries the placement transform (position, orientation, scale). */
  root: THREE.Group;
  full: THREE.Object3D;
  impostor: THREE.Object3D;
  /** Bounds of `full` in the prop's local, unscaled frame. */
  localBounds: THREE.Box3;
  /** World-space bounding sphere, for distance LOD and frustum culling. */
  sphere: THREE.Sphere;
  /** The first (or only) collider; `colliders` holds every part of a compound one. */
  collider: Collider | null;
  colliders: Collider[];
  /** Compound collision boxes from the builder (local, unscaled), or null. */
  localColliders: THREE.Box3[] | null;
  lod: PropLod;
}

export interface PropsStats {
  landmarkId: string;
  /** Props placed. */
  count: number;
  /** ...of which loaded from GLB files. */
  models: number;
  /** ...of which procedural placeholders. */
  procedural: number;
  /** Entries rejected by validation or outside the tile. */
  skipped: number;
  /** Entries whose model failed to load or build. */
  failed: number;
  /** Per-frame LOD counts (from the last `update`). */
  full: number;
  impostor: number;
  hiddenDistance: number;
  hiddenFrustum: number;
  colliders: number;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Quaternion turning local -Z to a compass heading (deg). */
export function headingQuaternion(
  headingDeg: number,
  out = new THREE.Quaternion(),
): THREE.Quaternion {
  return out.setFromAxisAngle(Y_AXIS, -THREE.MathUtils.degToRad(headingDeg));
}

/** True for props whose builder conforms to the terrain (`groundHeight`), so they need no footprint snap. */
export function followsTerrain(def: PropDef): boolean {
  return (
    def.procedural === 'debris' ||
    def.feature !== null ||
    // The carbonate builder makes a terrain-following apron even without a feature id.
    (def.procedural === 'chimney' &&
      def.materialHint === 'carbonate' &&
      (def.dimensionsM?.[0] ?? 0) === 0)
  );
}

/**
 * World position and orientation for a prop.
 *
 * X/Z from lat/lon. Y is `-depth_m`, or the seabed when snapping: the lowest
 * terrain sample under the footprint's corners and centre, so a long hull on a
 * slope digs into the uphill side rather than floating off the downhill one.
 * `y_offset_m` is added last. With `align_to_slope` the prop is tilted to the
 * terrain normal at its centre (and sits on the centre sample).
 *
 * @param footprint local, unscaled bounds of the prop (null = a point)
 */
export function computePlacement(
  def: PropDef,
  meta: TileMeta,
  hf: PropsHeightField,
  footprint: THREE.Box3 | null,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion,
): void {
  const { x, z } = latLonToWorld(meta, def.lat, def.lon);
  headingQuaternion(def.headingDeg, outQuat);
  let y: number;
  if (!def.snapToSeabed) {
    y = -(def.depthM ?? 0);
  } else if (def.alignToSlope) {
    y = hf.sampleHeight(x, z);
    const n = hf.getNormal(x, z, new THREE.Vector3());
    outQuat.premultiply(new THREE.Quaternion().setFromUnitVectors(Y_AXIS, n));
  } else {
    y = hf.sampleHeight(x, z);
    if (footprint && !footprint.isEmpty()) {
      const [sx, , sz] = def.scale;
      const c = new THREE.Vector3();
      for (const lx of [footprint.min.x, footprint.max.x]) {
        for (const lz of [footprint.min.z, footprint.max.z]) {
          c.set(lx * sx, 0, lz * sz).applyQuaternion(outQuat);
          y = Math.min(y, hf.sampleHeight(x + c.x, z + c.z));
        }
      }
    }
  }
  outPos.set(x, y + def.yOffsetM, z);
}

function emptyStats(landmarkId: string): PropsStats {
  return {
    landmarkId,
    count: 0,
    models: 0,
    procedural: 0,
    skipped: 0,
    failed: 0,
    full: 0,
    impostor: 0,
    hiddenDistance: 0,
    hiddenFrustum: 0,
    colliders: 0,
  };
}

export class Props {
  readonly group = new THREE.Group();
  readonly placed: PlacedProp[] = [];
  stats: PropsStats;
  /** Validation / load problems from the last `load()`, for the debug panel and tests. */
  readonly problems: string[] = [];
  /** True once `load()` has finished (with or without props). */
  loaded = false;

  private readonly models = new ModelCache();
  private readonly colliders: Collider[] = [];
  private readonly frustum = new THREE.Frustum();
  private readonly projView = new THREE.Matrix4();
  private readonly camPos = new THREE.Vector3();

  /**
   * @param tier graphics tier for procedural detail budgets (hand-built wrecks);
   *   defaults to `medium`, the fixed default tier.
   */
  constructor(
    private readonly meta: TileMeta,
    private readonly hf: PropsHeightField,
    private readonly cfg: PropsConfig,
    private readonly tier = 'medium',
  ) {
    this.group.name = 'props';
    this.stats = emptyStats('');
  }

  /**
   * Fetch, validate, build and place. Never throws: a missing file is "no
   * props", bad entries are logged and skipped.
   */
  async load(
    url: string,
    landmarkId: string,
    fetchJson: (url: string) => Promise<unknown> = fetchContentJson,
  ): Promise<PropsStats> {
    this.stats = emptyStats(landmarkId);
    const doc = await fetchJson(url);
    if (doc !== null && doc !== undefined) await this.placeAll(doc, landmarkId);
    this.loaded = true;
    return this.stats;
  }

  /** Validate and place an already-parsed props.json document. */
  async placeAll(doc: unknown, landmarkId: string): Promise<PropsStats> {
    this.stats = emptyStats(landmarkId);
    const parsed = parsePropsDoc(doc, this.cfg);
    for (const w of parsed.warnings) console.warn(`[props] ${w}`);
    for (const e of parsed.errors) {
      console.warn(`[props] skipped ${e}`);
      this.problems.push(e);
    }
    this.stats.skipped = parsed.errors.length;

    const jobs: Promise<void>[] = [];
    for (const def of parsed.props) {
      if (!bboxContains(this.meta.bbox, def.lat, def.lon)) {
        const msg = `prop "${def.id}" at ${def.lat}, ${def.lon} is outside tile "${this.meta.id}"`;
        console.warn(`[props] skipped ${msg}`);
        this.problems.push(msg);
        this.stats.skipped++;
        continue;
      }
      jobs.push(
        this.build(def).then(
          (built) => {
            this.add(def, built);
            if (def.procedural) this.stats.procedural++;
            else this.stats.models++;
          },
          (err: unknown) => {
            const msg = `prop "${def.id}" (${def.model}) failed: ${err instanceof Error ? err.message : String(err)}`;
            console.warn(`[props] ${msg}`);
            this.problems.push(msg);
            this.stats.failed++;
          },
        ),
      );
    }
    await Promise.all(jobs);
    // Keep file order regardless of which GLB finished first.
    const order = new Map(parsed.props.map((p, i) => [p.id, i]));
    this.placed.sort((a, b) => order.get(a.def.id)! - order.get(b.def.id)!);
    this.stats.count = this.placed.length;
    this.stats.colliders = this.colliders.length;
    return this.stats;
  }

  private async build(def: PropDef): Promise<BuiltProp> {
    const seed = hashString(def.id);
    const dims = def.dimensionsM ?? this.cfg.defaultDimensionsM[def.procedural ?? 'hull-block'];
    // Procedural kinds come from the family registry (props/builders/index.ts).
    if (def.procedural) {
      return PROCEDURAL_BUILDERS[def.procedural]({
        def,
        dims,
        seed,
        cfg: this.cfg,
        tier: this.tier,
        groundHeight: () => this.debrisHeightFn(def),
      });
    }
    // A GLB model.
    const model = await this.models.get(def.model);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // GLTFLoader already yields MeshStandard/Physical materials (fogged,
      // lit by the headlights) with sRGB colour maps; make sure nothing
      // glows, per art-direction §4 "no loot glow".
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.isMeshStandardMaterial) {
          std.emissive.setRGB(0, 0, 0);
          std.emissiveMap = null;
        }
      }
    });
    const bounds = new THREE.Box3().setFromObject(model);
    const impostor = makeBoxSilhouette(bounds, this.cfg.colors.basalt, this.cfg.impostorOpacity);
    return { full: model, impostor, bounds };
  }

  /** Terrain-following for debris pieces, in the prop's local frame. */
  private debrisHeightFn(def: PropDef): LocalHeightFn | undefined {
    if (!def.snapToSeabed || def.alignToSlope) return undefined;
    const { x, z } = latLonToWorld(this.meta, def.lat, def.lon);
    const originY = this.hf.sampleHeight(x, z) + def.yOffsetM;
    const q = headingQuaternion(def.headingDeg);
    const [sx, sy, sz] = def.scale;
    const v = new THREE.Vector3();
    return (lx, lz) => {
      v.set(lx * sx, 0, lz * sz).applyQuaternion(q);
      return (this.hf.sampleHeight(x + v.x, z + v.z) + def.yOffsetM - originY) / sy;
    };
  }

  private add(def: PropDef, built: BuiltProp): void {
    const root = new THREE.Group();
    root.name = `prop:${def.id}`;
    root.userData.propId = def.id;
    root.add(built.full, built.impostor);
    built.impostor.visible = false;
    const prop: PlacedProp = {
      def,
      root,
      full: built.full,
      impostor: built.impostor,
      localBounds: built.bounds,
      sphere: new THREE.Sphere(),
      collider: null,
      colliders: [],
      localColliders: built.colliders?.length ? built.colliders : null,
      lod: 'full',
    };
    this.placed.push(prop);
    this.group.add(root);
    this.place(prop);
  }

  /** (Re)compute transform, bounding sphere and collider from `prop.def`. */
  place(prop: PlacedProp): void {
    const { def, root, localBounds } = prop;
    // Debris and geo features already follow the terrain themselves (their origin is the centre
    // sample); other props sit on the lowest sample under their footprint.
    const footprint = followsTerrain(def) ? null : localBounds;
    computePlacement(def, this.meta, this.hf, footprint, root.position, root.quaternion);
    root.scale.set(...def.scale);
    root.updateMatrixWorld(true);

    const scale = new THREE.Vector3(...def.scale);
    const half = localBounds.getSize(new THREE.Vector3()).multiply(scale).multiplyScalar(0.5);
    const centre = localBounds
      .getCenter(new THREE.Vector3())
      .multiply(scale)
      .applyQuaternion(root.quaternion)
      .add(root.position);
    prop.sphere.set(centre, half.length());

    for (const c of prop.colliders) this.colliders.splice(this.colliders.indexOf(c), 1);
    prop.colliders = [];
    if (def.collision === 'box' && prop.localColliders) {
      // A hand-built wreck: one oriented box per part, so the sub can get down
      // onto the decks between the deck houses.
      for (const b of prop.localColliders) {
        const c = b.getCenter(new THREE.Vector3()).multiply(scale);
        const h = b.getSize(new THREE.Vector3()).multiply(scale).multiplyScalar(0.5);
        c.applyQuaternion(root.quaternion).add(root.position);
        prop.colliders.push(makeBoxCollider(c, h, root.quaternion));
      }
    } else if (def.collision === 'box') {
      prop.colliders.push(makeBoxCollider(centre, half, root.quaternion));
    } else if (def.collision === 'sphere') {
      const r = ((half.x + half.y + half.z) / 3) * this.cfg.sphereColliderFit;
      prop.colliders.push(makeSphereCollider(centre, r));
    }
    prop.collider = prop.colliders[0] ?? null;
    this.colliders.push(...prop.colliders);
    this.stats.colliders = this.colliders.length;
  }

  /**
   * Re-place after `prop.def` changed. Debris is rebuilt, because its pieces
   * follow the terrain relative to the old origin.
   */
  async replace(prop: PlacedProp): Promise<void> {
    if (followsTerrain(prop.def)) {
      const built = await this.build(prop.def);
      prop.root.remove(prop.full, prop.impostor);
      prop.full = built.full;
      prop.impostor = built.impostor;
      prop.localBounds = built.bounds;
      prop.localColliders = built.colliders?.length ? built.colliders : null;
      prop.root.add(built.full, built.impostor);
      prop.full.visible = prop.lod === 'full';
      prop.impostor.visible = prop.lod === 'impostor';
    }
    this.place(prop);
  }

  /** Pick full mesh / impostor / hidden for every prop. Call once per frame before rendering. */
  update(camera: THREE.Camera): void {
    camera.updateMatrixWorld();
    this.projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projView);
    const cam = camera.getWorldPosition(this.camPos);
    const s = this.stats;
    s.full = s.impostor = s.hiddenDistance = s.hiddenFrustum = 0;
    for (const p of this.placed) {
      const d = Math.max(0, cam.distanceTo(p.sphere.center) - p.sphere.radius);
      const cull = Math.max(this.cfg.cullDistanceM, p.def.lodDistanceM * this.cfg.cullLodFactor);
      let lod: PropLod;
      if (d > cull) {
        lod = 'hidden';
        s.hiddenDistance++;
      } else if (!this.frustum.intersectsSphere(p.sphere)) {
        lod = 'hidden';
        s.hiddenFrustum++;
      } else if (d <= p.def.lodDistanceM) {
        lod = 'full';
        s.full++;
      } else {
        lod = 'impostor';
        s.impostor++;
      }
      if (lod !== p.lod) {
        p.lod = lod;
        p.root.visible = lod !== 'hidden';
        p.full.visible = lod === 'full';
        p.impostor.visible = lod === 'impostor';
      }
    }
  }

  /**
   * Push a sphere at `position` (radius `radius`) out of every prop volume.
   * Writes the unit push normal to `out`. Returns true if anything was hit.
   * (Contracts §3: the narrow interface the sub is wired to in main.ts.)
   */
  collide(position: THREE.Vector3, radius: number, out: THREE.Vector3): boolean {
    return collideAll(this.colliders, position, radius, this.cfg.collisionPushStiffness, out);
  }

  /** Placed prop whose visible geometry the ray hits first, if any. */
  pick(raycaster: THREE.Raycaster): PlacedProp | null {
    const roots = this.placed.filter((p) => p.root.visible).map((p) => p.root);
    const hits = raycaster.intersectObjects(roots, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && o.userData.propId === undefined) o = o.parent;
      if (o) return this.placed.find((p) => p.def.id === o!.userData.propId) ?? null;
    }
    return null;
  }

  debugString(): string {
    const s = this.stats;
    return (
      `props ${s.count} (${s.procedural} procedural, ${s.models} glb) ` +
      `full ${s.full} impostor ${s.impostor} culled ${s.hiddenDistance}d/${s.hiddenFrustum}f ` +
      `colliders ${s.colliders} skipped ${s.skipped} failed ${s.failed}`
    );
  }
}
