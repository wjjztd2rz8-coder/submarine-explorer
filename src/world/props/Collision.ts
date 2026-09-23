/**
 * Sphere-vs-prop push-out maths for `Props.collide()`. Pure functions over
 * three.js vectors so they are unit-testable headlessly (tests/unit/props-collision.test.ts).
 *
 * A collider is either a sphere or an oriented box (centre, half extents and a
 * rotation). The moving body is a sphere (the submarine's hull radius). Each
 * test pushes the body's centre out along the contact normal by the
 * penetration depth x `stiffness` (1 = rigid).
 */

import * as THREE from 'three';

export interface SphereCollider {
  kind: 'sphere';
  center: THREE.Vector3;
  radius: number;
  /** Broad-phase radius around `center`. */
  boundRadius: number;
}

export interface BoxCollider {
  kind: 'box';
  center: THREE.Vector3;
  halfExtents: THREE.Vector3;
  rotation: THREE.Quaternion;
  /** Cached inverse of `rotation`. */
  inverse: THREE.Quaternion;
  boundRadius: number;
}

export type Collider = SphereCollider | BoxCollider;

export function makeSphereCollider(center: THREE.Vector3, radius: number): SphereCollider {
  return { kind: 'sphere', center: center.clone(), radius, boundRadius: radius };
}

export function makeBoxCollider(
  center: THREE.Vector3,
  halfExtents: THREE.Vector3,
  rotation: THREE.Quaternion,
): BoxCollider {
  return {
    kind: 'box',
    center: center.clone(),
    halfExtents: halfExtents.clone(),
    rotation: rotation.clone(),
    inverse: rotation.clone().invert(),
    boundRadius: halfExtents.length(),
  };
}

const local = new THREE.Vector3();
const closest = new THREE.Vector3();
const n = new THREE.Vector3();

/**
 * Push `pos` (a sphere of radius `r`) out of a sphere collider. Writes the unit
 * normal (collider -> body) to `outNormal` and returns the penetration depth
 * before the push, or 0 when not touching (pos and outNormal untouched).
 */
export function pushOutOfSphere(
  pos: THREE.Vector3,
  r: number,
  c: SphereCollider,
  stiffness: number,
  outNormal: THREE.Vector3,
): number {
  n.subVectors(pos, c.center);
  const dist = n.length();
  const pen = c.radius + r - dist;
  if (pen <= 0) return 0;
  if (dist > 1e-6) n.divideScalar(dist);
  else n.set(0, 1, 0); // dead centre: go up, the one direction that is always open
  pos.addScaledVector(n, pen * stiffness);
  outNormal.copy(n);
  return pen;
}

/**
 * Push `pos` (a sphere of radius `r`) out of an oriented box. Outside the box
 * the normal runs from the closest surface point to the centre; with the centre
 * inside, it is the face of least penetration. Returns the penetration depth or 0.
 */
export function pushOutOfBox(
  pos: THREE.Vector3,
  r: number,
  c: BoxCollider,
  stiffness: number,
  outNormal: THREE.Vector3,
): number {
  const he = c.halfExtents;
  local.subVectors(pos, c.center).applyQuaternion(c.inverse);
  closest.set(
    THREE.MathUtils.clamp(local.x, -he.x, he.x),
    THREE.MathUtils.clamp(local.y, -he.y, he.y),
    THREE.MathUtils.clamp(local.z, -he.z, he.z),
  );
  n.subVectors(local, closest);
  const dist = n.length();
  let pen: number;
  if (dist > 1e-6) {
    if (dist >= r) return 0;
    n.divideScalar(dist);
    pen = r - dist;
  } else {
    // Centre inside the box: leave through the nearest face.
    const dx = he.x - Math.abs(local.x);
    const dy = he.y - Math.abs(local.y);
    const dz = he.z - Math.abs(local.z);
    if (dx <= dy && dx <= dz) {
      n.set(local.x >= 0 ? 1 : -1, 0, 0);
      pen = dx + r;
    } else if (dy <= dz) {
      n.set(0, local.y >= 0 ? 1 : -1, 0);
      pen = dy + r;
    } else {
      n.set(0, 0, local.z >= 0 ? 1 : -1);
      pen = dz + r;
    }
  }
  n.applyQuaternion(c.rotation);
  pos.addScaledVector(n, pen * stiffness);
  outNormal.copy(n);
  return pen;
}

const contact = new THREE.Vector3();

/**
 * Resolve `pos` against every collider. `out` receives the penetration-weighted
 * average push normal (unit length) when anything was hit. Returns whether
 * anything was hit.
 */
export function collideAll(
  colliders: readonly Collider[],
  pos: THREE.Vector3,
  r: number,
  stiffness: number,
  out: THREE.Vector3,
): boolean {
  out.set(0, 0, 0);
  let hit = false;
  for (const c of colliders) {
    const reach = c.boundRadius + r;
    if (pos.distanceToSquared(c.center) > reach * reach) continue;
    const pen =
      c.kind === 'sphere'
        ? pushOutOfSphere(pos, r, c, stiffness, contact)
        : pushOutOfBox(pos, r, c, stiffness, contact);
    if (pen > 0) {
      out.addScaledVector(contact, pen);
      hit = true;
    }
  }
  if (hit) {
    if (out.lengthSq() > 1e-12) out.normalize();
    else out.set(0, 1, 0);
  }
  return hit;
}
