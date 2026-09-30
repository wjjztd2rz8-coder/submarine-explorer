/**
 * Turns a wreck builder's parts into the {@link BuiltProp} the prop system
 * places: a near/mid LOD pair inside `full` (switched by distance from the
 * camera to the wreck's bounding box, not its origin, so a 250 m hull does not
 * drop detail while the sub hovers over one end), the builder's far silhouette
 * as the impostor (Props shows it beyond `lod_distance_m`), compound collision
 * boxes and named anchor nodes such as `interior-entry`.
 */

import * as THREE from 'three';
import type { WreckDetail } from './detail.js';
import type { BuiltProp } from './shared.js';

/** What a hull or scatter builder produces. */
export interface WreckParts {
  /** Drawn at every near-or-mid distance (the hull body). Cloned into both levels. */
  core: THREE.Mesh[];
  /** Near-only detail: rusticles, railings, openings, small fittings, life. */
  near: THREE.Object3D[];
  /** Far silhouette (the prop impostor). */
  far: THREE.Object3D;
  /** Collision boxes in the local, unscaled frame. Empty = none (scatter kits). */
  colliders: THREE.Box3[];
  /** Named empty nodes (e.g. `interior-entry`) for later packages to hook onto. */
  anchors: THREE.Object3D[];
}

/** A wreck prop: the standard built prop plus compound colliders. */
export interface WreckBuilt extends BuiltProp {
  colliders: THREE.Box3[];
}

const _cam = new THREE.Vector3();

/**
 * LOD that measures distance to a local-space box instead of to its origin.
 * Level 0 shows inside `levels[1].distance`, level 1 beyond it.
 */
export class BoxLod extends THREE.LOD {
  level = 0;

  constructor(readonly box: THREE.Box3) {
    super();
  }

  override update(camera: THREE.Camera): void {
    const levels = this.levels;
    if (levels.length < 2) return;
    _cam.setFromMatrixPosition(camera.matrixWorld);
    this.worldToLocal(_cam);
    const d = this.box.distanceToPoint(_cam);
    let i = 1;
    for (; i < levels.length; i++) {
      // 10% hysteresis so hovering on the boundary does not flicker.
      const lim = levels[i]!.distance * (this.level >= i ? 0.9 : 1);
      if (d < lim) break;
    }
    this.level = i - 1;
    levels.forEach((l, k) => (l.object.visible = k === this.level));
  }
}

/** Assemble near/mid/far into a placed-prop shape. */
export function assembleWreck(name: string, parts: WreckParts, detail: WreckDetail): WreckBuilt {
  const bounds = new THREE.Box3();
  const near = new THREE.Group();
  near.name = `${name}-near`;
  const mid = new THREE.Group();
  mid.name = `${name}-mid`;
  for (const m of parts.core) {
    m.geometry.computeBoundingBox();
    bounds.union(m.geometry.boundingBox!);
    near.add(m);
    const twin = new THREE.Mesh(m.geometry, m.material);
    twin.name = `${m.name}-mid`;
    mid.add(twin);
  }
  for (const o of parts.near) {
    near.add(o);
    const box = new THREE.Box3().setFromObject(o);
    if (!box.isEmpty()) bounds.union(box);
  }

  const lod = new BoxLod(bounds.clone());
  lod.name = `${name}-lod`;
  lod.addLevel(near, 0);
  lod.addLevel(mid, detail.nearLodM);
  mid.visible = false;

  const full = new THREE.Group();
  full.name = name;
  full.add(lod);
  for (const a of parts.anchors) full.add(a);

  parts.far.name = `${name}-far`;
  return { full, impostor: parts.far, bounds, colliders: parts.colliders };
}

/** Wrap a merged geometry as a named mesh. */
export function meshOf(
  geom: THREE.BufferGeometry | null,
  material: THREE.Material,
  name: string,
): THREE.Mesh | null {
  if (!geom) return null;
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  const m = new THREE.Mesh(geom, material);
  m.name = name;
  return m;
}
