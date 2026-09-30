/**
 * Debris builder: `procedural:debris`, 20-60 plates and pipes scattered within
 * dimensions_m[0] m, instanced by shape and tinted rust / growth. Uses the
 * wreck rust texture (`wrecks.ts`). Split out of `world/props/Procedural.ts`
 * (F0-CORE); owned by the wrecks package.
 */

import * as THREE from 'three';
import type { PropsConfig } from '../../../core/Config.js';
import {
  mulberry32,
  type BuiltProp,
  type LocalHeightFn,
  type ProceduralBuilder,
} from './shared.js';
import { makeRustTexture } from './wrecks.js';

export interface DebrisPiece {
  kind: 'box' | 'cylinder';
  /** Characteristic size (m), in [debrisMinSizeM, debrisMaxSizeM]. */
  size: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  /** Box: x/y/z extents. Cylinder: (radius, length, radius). */
  extents: THREE.Vector3;
}

/** Deterministic debris layout; exported so tests can check counts and ranges. */
export function layoutDebris(
  radius: number,
  seed: number,
  cfg: PropsConfig,
  heightAt?: LocalHeightFn,
): DebrisPiece[] {
  const rnd = mulberry32(seed);
  const span = cfg.debrisMaxPieces - cfg.debrisMinPieces;
  const count = cfg.debrisMinPieces + Math.floor(rnd() * (span + 1));
  const pieces: DebrisPiece[] = [];
  for (let i = 0; i < count; i++) {
    // Denser toward the centre, like a real debris field around a break-up.
    const a = rnd() * Math.PI * 2;
    const r = radius * Math.pow(rnd(), 0.75);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const size = cfg.debrisMinSizeM + rnd() * (cfg.debrisMaxSizeM - cfg.debrisMinSizeM);
    const kind: DebrisPiece['kind'] = rnd() < 0.72 ? 'box' : 'cylinder';
    const extents =
      kind === 'box'
        ? new THREE.Vector3(size, size * (0.08 + rnd() * 0.4), size * (0.35 + rnd() * 0.65))
        : new THREE.Vector3(size * (0.12 + rnd() * 0.18), size, 0);
    if (kind === 'cylinder') extents.z = extents.x;
    const rotation = new THREE.Euler(
      (rnd() - 0.5) * 0.5,
      rnd() * Math.PI * 2,
      kind === 'cylinder' ? Math.PI / 2 + (rnd() - 0.5) * 0.4 : (rnd() - 0.5) * 0.5,
      'YXZ',
    );
    const halfUp = kind === 'box' ? extents.y / 2 : extents.x;
    // Partially sunk into the silt.
    const ground = heightAt ? heightAt(x, z) : 0;
    const position = new THREE.Vector3(x, ground + halfUp * 0.5, z);
    pieces.push({ kind, size, position, rotation, extents });
  }
  return pieces;
}

export function buildDebris(
  radius: number,
  seed: number,
  cfg: PropsConfig,
  heightAt?: LocalHeightFn,
): BuiltProp {
  const layout = layoutDebris(radius, seed, cfg, heightAt);
  const map = makeRustTexture(seed, cfg.textureSize, cfg.colors);
  if (map) map.repeat.set(0.25, 0.25);
  const material = new THREE.MeshStandardMaterial({
    color: map ? 0xffffff : cfg.colors.rust,
    map,
    roughness: 0.9,
    metalness: 0.2,
  });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  const rnd = mulberry32(seed ^ 0xdeb415);
  const rust = new THREE.Color(1, 1, 1);
  const growth = new THREE.Color(cfg.colors.growth).multiplyScalar(
    1 / new THREE.Color(cfg.colors.rust).g,
  );
  const tint = (c: THREE.Color): THREE.Color => {
    const t = rnd();
    // Most pieces plain rust, some darker, a few growth-tinted.
    if (t < 0.55) return c.copy(rust).multiplyScalar(0.8 + rnd() * 0.35);
    if (t < 0.85) return c.copy(rust).multiplyScalar(0.45 + rnd() * 0.2);
    return c.copy(rust).lerp(growth, 0.35 + rnd() * 0.3);
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  const bounds = new THREE.Box3();
  const tmpBox = new THREE.Box3();
  const unit = new THREE.Box3(
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, 0.5),
  );

  const makeInstanced = (
    kind: DebrisPiece['kind'],
    list: DebrisPiece[],
  ): THREE.InstancedMesh | null => {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(kind === 'box' ? boxGeo : cylGeo, material, list.length);
    list.forEach((p, i) => {
      q.setFromEuler(p.rotation);
      if (kind === 'box') s.copy(p.extents);
      else s.set(p.extents.x, p.extents.y, p.extents.x);
      m.compose(p.position, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, tint(c));
      bounds.union(tmpBox.copy(unit).applyMatrix4(m));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
    mesh.name = `debris-${kind}`;
    return mesh;
  };

  // Sorted largest first so the impostor can show just the first N instances.
  const byKind = (k: DebrisPiece['kind']): DebrisPiece[] =>
    layout.filter((p) => p.kind === k).sort((a, b) => b.size - a.size);
  const full = new THREE.Group();
  full.name = 'debris';
  const boxes = makeInstanced('box', byKind('box'));
  const cyls = makeInstanced('cylinder', byKind('cylinder'));
  if (boxes) full.add(boxes);
  if (cyls) full.add(cyls);

  const impostor = new THREE.Group();
  impostor.name = 'debris-impostor';
  if (boxes) {
    const imp = new THREE.InstancedMesh(boxGeo, material, boxes.count);
    imp.instanceMatrix.copy(boxes.instanceMatrix);
    if (boxes.instanceColor) imp.instanceColor = boxes.instanceColor;
    imp.count = Math.min(cfg.debrisImpostorPieces, boxes.count);
    imp.boundingSphere = boxes.boundingSphere;
    impostor.add(imp);
  }
  return { full, impostor, bounds };
}

/** Registry entries for this family (`builders/index.ts`). */
export const DEBRIS_BUILDERS = {
  debris: ({ dims, seed, cfg, groundHeight }) => buildDebris(dims[0], seed, cfg, groundHeight()),
} satisfies Record<'debris', ProceduralBuilder>;
