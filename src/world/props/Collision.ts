/**
 * Sphere-vs-prop push-out maths for `Props.collide()`. Pure functions over
 * three.js vectors so they are unit-testable headlessly (tests/unit/props-collision.test.ts).
 *
 * A collider is a sphere, an oriented box, or a triangulated floor surface.
 * The moving body is a sphere (the submarine's hull radius). Each
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

/** A solid floor below its rendered triangles; cached in world space at placement. */
export interface SurfaceCollider {
  kind: 'surface';
  center: THREE.Vector3;
  boundRadius: number;
  triangles: THREE.Triangle[];
  /** Horizontal bins contain only triangles whose projected bounds overlap them. */
  bins: Map<number, number[]>;
  bounds: THREE.Box3;
  columns: number;
  rows: number;
}

export type Collider = SphereCollider | BoxCollider | SurfaceCollider;

const SURFACE_CELL_M = 8;

export function makeSurfaceCollider(mesh: THREE.Mesh): SurfaceCollider {
  const positions = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.index;
  const triangles: THREE.Triangle[] = [];
  const bounds = new THREE.Box3();
  for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
    const vertices = [0, 1, 2].map((j) =>
      new THREE.Vector3()
        .fromBufferAttribute(positions, index ? index.getX(i + j) : i + j)
        .applyMatrix4(mesh.matrixWorld),
    );
    triangles.push(new THREE.Triangle(vertices[0], vertices[1], vertices[2]));
    for (const vertex of vertices) bounds.expandByPoint(vertex);
  }
  const columns = Math.floor((bounds.max.x - bounds.min.x) / SURFACE_CELL_M) + 1;
  const rows = Math.floor((bounds.max.z - bounds.min.z) / SURFACE_CELL_M) + 1;
  const bins = new Map<number, number[]>();
  triangles.forEach(({ a, b, c }, i) => {
    const x0 = Math.floor((Math.min(a.x, b.x, c.x) - bounds.min.x) / SURFACE_CELL_M);
    const x1 = Math.floor((Math.max(a.x, b.x, c.x) - bounds.min.x) / SURFACE_CELL_M);
    const z0 = Math.floor((Math.min(a.z, b.z, c.z) - bounds.min.z) / SURFACE_CELL_M);
    const z1 = Math.floor((Math.max(a.z, b.z, c.z) - bounds.min.z) / SURFACE_CELL_M);
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const key = z * columns + x;
        const bin = bins.get(key) ?? [];
        bin.push(i);
        bins.set(key, bin);
      }
  });
  return {
    kind: 'surface',
    center: bounds.getCenter(new THREE.Vector3()),
    boundRadius: bounds.getSize(new THREE.Vector3()).length() / 2,
    triangles,
    bins,
    bounds,
    columns,
    rows,
  };
}

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
const side = new THREE.Vector3();

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
  sideDirection?: THREE.Vector3,
): number {
  const he = c.halfExtents;
  local.subVectors(pos, c.center).applyQuaternion(c.inverse);
  // After a floor lift, escape a ceiling pinch through a side instead of
  // pushing back down into that floor. Use the exact sphere cross-section at
  // the nearest box height, preserving rounded clearance above/below its edges.
  if (sideDirection) {
    const dy = Math.max(0, Math.abs(local.y) - he.y);
    if (dy >= r) return 0;
    r = Math.sqrt(r * r - dy * dy);
  }
  closest.set(
    THREE.MathUtils.clamp(local.x, -he.x, he.x),
    sideDirection ? local.y : THREE.MathUtils.clamp(local.y, -he.y, he.y),
    THREE.MathUtils.clamp(local.z, -he.z, he.z),
  );
  n.subVectors(local, closest);
  const dist = n.length();
  let pen: number;
  if (sideDirection) {
    if (dist >= r) return 0;
    side.copy(sideDirection).applyQuaternion(c.inverse);
    const alongX = Math.abs(side.x) >= Math.abs(side.z);
    const sign = (alongX ? side.x : side.z) >= 0 ? 1 : -1;
    const gap = Math.max(0, alongX ? Math.abs(local.z) - he.z : Math.abs(local.x) - he.x);
    const reach = Math.sqrt(Math.max(0, r * r - gap * gap));
    pen = (alongX ? he.x : he.z) + reach - sign * (alongX ? local.x : local.z);
    n.set(alongX ? sign : 0, 0, alongX ? 0 : sign);
  } else if (dist > 1e-6) {
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
const surfaceNormal = new THREE.Vector3();
const surfacePoint = new THREE.Vector3();
const surfaceContact = new THREE.Vector3();
const candidates = new Set<number>();

/**
 * Minimum vertical lift clearing the whole sphere, including triangle edges.
 * Maximise y + sqrt(r² - horizontalDistance²) over the nearby rendered surface:
 * the maximum lies at the plane's tangent point or on one of its three edges.
 * This follows the exact triangles without filling navigable water beside them.
 */
export function pushOutOfSurface(
  pos: THREE.Vector3,
  r: number,
  c: SurfaceCollider,
  stiffness: number,
  outNormal: THREE.Vector3,
): number {
  const { min, max } = c.bounds;
  if (pos.x + r < min.x || pos.x - r > max.x || pos.z + r < min.z || pos.z - r > max.z) return 0;
  if (pos.y >= max.y + r) return 0;
  const x0 = Math.max(0, Math.floor((pos.x - r - min.x) / SURFACE_CELL_M));
  const x1 = Math.min(c.columns - 1, Math.floor((pos.x + r - min.x) / SURFACE_CELL_M));
  const z0 = Math.max(0, Math.floor((pos.z - r - min.z) / SURFACE_CELL_M));
  const z1 = Math.min(c.rows - 1, Math.floor((pos.z + r - min.z) / SURFACE_CELL_M));
  candidates.clear();
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++)
      for (const i of c.bins.get(z * c.columns + x) ?? []) candidates.add(i);

  let height = pos.y;
  const consider = (x: number, y: number, z: number) => {
    const distanceSq = (pos.x - x) ** 2 + (pos.z - z) ** 2;
    if (distanceSq > r * r) return;
    const support = y + Math.sqrt(Math.max(0, r * r - distanceSq));
    if (support > height) {
      height = support;
      surfaceContact.set(x, y, z);
    }
  };
  for (const i of candidates) {
    const triangle = c.triangles[i];
    const { a, b, c: d } = triangle;
    triangle.getNormal(surfaceNormal);
    if (surfaceNormal.y < 0) surfaceNormal.negate();
    if (surfaceNormal.y > 1e-8) {
      const x = pos.x - r * surfaceNormal.x;
      const z = pos.z - r * surfaceNormal.z;
      const y = a.y - (surfaceNormal.x * (x - a.x) + surfaceNormal.z * (z - a.z)) / surfaceNormal.y;
      surfacePoint.set(x, y, z);
      if (triangle.containsPoint(surfacePoint)) consider(x, y, z);
    }
    for (let edge = 0; edge < 3; edge++) {
      const start = edge === 0 ? a : edge === 1 ? b : d;
      const end = edge === 0 ? b : edge === 1 ? d : a;
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const dy = end.y - start.y;
      const lengthSq = dx * dx + dz * dz;
      if (lengthSq < 1e-12) {
        consider(start.x, Math.max(start.y, end.y), start.z);
        continue;
      }
      const ax = start.x - pos.x;
      const az = start.z - pos.z;
      const t0 = -(ax * dx + az * dz) / lengthSq;
      const perpendicularSq = Math.max(0, ax * ax + az * az - t0 * t0 * lengthSq);
      if (perpendicularSq > r * r) continue;
      const t = THREE.MathUtils.clamp(
        t0 + dy * Math.sqrt((r * r - perpendicularSq) / (lengthSq * (lengthSq + dy * dy))),
        0,
        1,
      );
      consider(start.x + t * dx, start.y + t * dy, start.z + t * dz);
    }
  }
  const penetration = height - pos.y;
  if (penetration <= 1e-8) return 0;
  outNormal.set(pos.x, height, pos.z).sub(surfaceContact).normalize();
  pos.y += penetration * stiffness;
  return penetration;
}

function volumePush(
  c: SphereCollider | BoxCollider,
  pos: THREE.Vector3,
  r: number,
  stiffness: number,
  sideDirection?: THREE.Vector3,
): number {
  const reach = c.boundRadius + r;
  if (pos.distanceToSquared(c.center) > reach * reach) return 0;
  return c.kind === 'sphere'
    ? pushOutOfSphere(pos, r, c, stiffness, contact)
    : pushOutOfBox(pos, r, c, stiffness, contact, sideDirection);
}

/** Escape a floor/roof pinch without bouncing between neighbouring wall boxes. */
function clearFloorPinch(
  colliders: readonly Collider[],
  pos: THREE.Vector3,
  r: number,
  stiffness: number,
  out: THREE.Vector3,
): void {
  const obstruction = colliders.find(
    (c) => c.kind !== 'surface' && volumePush(c, pos, r, 0) > 1e-8,
  );
  if (!obstruction) return;
  let bestDistance = Infinity;
  const best = pos.clone();
  const bestNormal = new THREE.Vector3();
  // Keep each candidate's direction consistent across adjoining boxes; picking
  // the nearest face afresh at each segment can oscillate inside their overlap.
  for (const [x, z] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const direction = new THREE.Vector3(x, 0, z);
    if (obstruction.kind === 'box') direction.applyQuaternion(obstruction.rotation);
    const candidate = pos.clone();
    const normal = new THREE.Vector3();
    for (let pass = 0; pass < 16; pass++) {
      let moved = false;
      for (const c of colliders) {
        if (c.kind === 'surface') continue;
        const pen = volumePush(c, candidate, r, stiffness, direction);
        if (pen > 1e-8) {
          normal.addScaledVector(contact, pen);
          moved = true;
        }
      }
      if (!moved) {
        const distance = candidate.distanceToSquared(pos);
        if (distance < bestDistance) {
          bestDistance = distance;
          best.copy(candidate);
          bestNormal.copy(normal);
        }
        break;
      }
      for (const c of colliders) {
        if (c.kind !== 'surface') continue;
        const pen = pushOutOfSurface(candidate, r, c, stiffness, contact);
        if (pen > 0) normal.addScaledVector(contact, pen);
      }
    }
  }
  pos.copy(best);
  out.add(bestNormal);
}

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
  let hasSurface = false;
  for (const c of colliders) {
    if (c.kind === 'surface') {
      hasSurface = true;
      continue;
    }
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
  // Floors run after every volume: a box's lateral push may reach another riser.
  // A floor pass only raises Y, so it cannot undo another floor's clearance.
  for (const c of colliders) {
    if (c.kind !== 'surface') continue;
    const pen = pushOutOfSurface(pos, r, c, stiffness, contact);
    if (pen > 0) {
      out.addScaledVector(contact, pen);
      hit = true;
    }
  }
  if (hasSurface && hit) clearFloorPinch(colliders, pos, r, stiffness, out);
  if (hit) {
    if (out.lengthSq() > 1e-12) out.normalize();
    else out.set(0, 1, 0);
  }
  return hit;
}
