/**
 * Geometry kit for the procedural animals: a small mesh builder with a swept
 * elliptical tube (bodies, tentacles, stalks, arms), double-sided polygons
 * (fins, membranes) and ellipsoids. Every vertex carries a colour and an
 * `aAnim` triple (primary weight, secondary weight, glow weight) that the
 * vertex shader in `material.ts` reads, so one static mesh animates on the
 * GPU with a per-instance phase. Model space: forward +Z, up +Y, right +X,
 * one unit = one metre.
 */

import * as THREE from 'three';

export type V3 = [number, number, number];
export type RGB = [number, number, number];

const _c = new THREE.Color();
/** sRGB hex to the linear components vertex colours expect. */
export function rgb(hex: number): RGB {
  _c.setHex(hex);
  return [_c.r, _c.g, _c.b];
}
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
export const scaleRgb = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

/** Deterministic hash noise in [0,1) for texture-like variation without a texture. */
export function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Uniform Catmull-Rom through control points; `t` in [0,1] over the whole run. */
export function curvePoint(pts: V3[], t: number, out: V3 = [0, 0, 0]): V3 {
  const n = pts.length - 1;
  if (n <= 0) return [pts[0]![0], pts[0]![1], pts[0]![2]];
  const f = clamp(t) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  const p0 = pts[Math.max(0, i - 1)]!;
  const p1 = pts[i]!;
  const p2 = pts[i + 1]!;
  const p3 = pts[Math.min(n, i + 2)]!;
  const u2 = u * u;
  const u3 = u2 * u;
  for (let k = 0; k < 3; k++) {
    out[k] =
      0.5 *
      (2 * p1[k]! +
        (-p0[k]! + p2[k]!) * u +
        (2 * p0[k]! - 5 * p1[k]! + 4 * p2[k]! - p3[k]!) * u2 +
        (-p0[k]! + 3 * p1[k]! - 3 * p2[k]! + p3[k]!) * u3);
  }
  return out;
}

export type ColorFn = (t: number, s: number, c: number, p: V3) => RGB;
export type AnimFn = (t: number, s: number, c: number, p: V3) => V3;

export interface SweepOpts {
  /** Control points of the spine. */
  path: V3[];
  /** Rings along the spine. */
  rings: number;
  /** Vertices per ring. */
  sides: number;
  /** Half-extents (right, up) at spine parameter t and ring angle; a number scales both. */
  radius: (t: number, ang: number) => number | [number, number];
  color: ColorFn | RGB;
  anim?: AnimFn | V3;
  /** Reference up for the first frame. */
  up?: V3;
  /** Cap the two ends with a fan (needed when the radius does not close to zero). */
  caps?: boolean;
}

const ZERO3: V3 = [0, 0, 0];

export class Builder {
  readonly pos: number[] = [];
  readonly col: number[] = [];
  readonly anim: number[] = [];
  readonly idx: number[] = [];

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  vertex(p: V3, c: RGB, a: V3 = ZERO3): number {
    this.pos.push(p[0], p[1], p[2]);
    this.col.push(c[0], c[1], c[2]);
    this.anim.push(a[0], a[1], a[2]);
    return this.pos.length / 3 - 1;
  }

  tri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  /** A convex polygon as a triangle fan (double-sided via the material). */
  poly(pts: V3[], color: RGB | ((i: number, p: V3) => RGB), anim: V3 | ((p: V3) => V3)): void {
    const ids = pts.map((p, i) =>
      this.vertex(
        p,
        typeof color === 'function' ? color(i, p) : color,
        typeof anim === 'function' ? anim(p) : anim,
      ),
    );
    for (let i = 1; i < ids.length - 1; i++) this.tri(ids[0]!, ids[i]!, ids[i + 1]!);
  }

  /** A quad strip between two polylines of equal length (membranes, sails). */
  strip(
    a: V3[],
    b: V3[],
    color: RGB | ((u: number, v: number) => RGB),
    anim: V3 | ((u: number, v: number, p: V3) => V3),
  ): void {
    const n = a.length;
    const ia: number[] = [];
    const ib: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0;
      const ca = typeof color === 'function' ? color(u, 0) : color;
      const cb = typeof color === 'function' ? color(u, 1) : color;
      ia.push(this.vertex(a[i]!, ca, typeof anim === 'function' ? anim(u, 0, a[i]!) : anim));
      ib.push(this.vertex(b[i]!, cb, typeof anim === 'function' ? anim(u, 1, b[i]!) : anim));
    }
    for (let i = 0; i < n - 1; i++) {
      this.tri(ia[i]!, ib[i]!, ia[i + 1]!);
      this.tri(ib[i]!, ib[i + 1]!, ia[i + 1]!);
    }
  }

  /** A swept elliptical tube along a Catmull-Rom spine. */
  sweep(o: SweepOpts): void {
    const { rings, sides } = o;
    const up0 = o.up ?? [0, 1, 0];
    const pts = o.path;
    const P: V3[] = [];
    for (let i = 0; i < rings; i++) P.push(curvePoint(pts, i / (rings - 1)));
    // Parallel-transported frames.
    const T = new THREE.Vector3();
    const R = new THREE.Vector3();
    const U = new THREE.Vector3(up0[0], up0[1], up0[2]);
    const prevT = new THREE.Vector3();
    const base = this.vertexCount;
    for (let i = 0; i < rings; i++) {
      const a = P[Math.max(0, i - 1)]!;
      const b = P[Math.min(rings - 1, i + 1)]!;
      T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      if (i > 0) {
        // Rotate U by the minimal rotation taking prevT to T.
        const q = new THREE.Quaternion().setFromUnitVectors(prevT, T);
        U.applyQuaternion(q);
      }
      // Re-orthogonalise against the tangent.
      U.addScaledVector(T, -U.dot(T)).normalize();
      R.crossVectors(U, T).normalize();
      prevT.copy(T);
      const t = i / (rings - 1);
      for (let j = 0; j < sides; j++) {
        const ang = (j / sides) * Math.PI * 2;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const rr = o.radius(t, ang);
        const rx = typeof rr === 'number' ? rr : rr[0];
        const ry = typeof rr === 'number' ? rr : rr[1];
        const p: V3 = [
          P[i]![0] + R.x * c * rx + U.x * s * ry,
          P[i]![1] + R.y * c * rx + U.y * s * ry,
          P[i]![2] + R.z * c * rx + U.z * s * ry,
        ];
        const cc = typeof o.color === 'function' ? o.color(t, s, c, p) : o.color;
        const aa = typeof o.anim === 'function' ? o.anim(t, s, c, p) : (o.anim ?? ZERO3);
        this.vertex(p, cc, aa);
      }
    }
    for (let i = 0; i < rings - 1; i++) {
      for (let j = 0; j < sides; j++) {
        const j2 = (j + 1) % sides;
        const a = base + i * sides + j;
        const b = base + i * sides + j2;
        const c = base + (i + 1) * sides + j;
        const d = base + (i + 1) * sides + j2;
        this.tri(a, c, b);
        this.tri(b, c, d);
      }
    }
    if (o.caps) {
      for (const end of [0, rings - 1]) {
        const ring0 = base + end * sides;
        const ctr = this.vertex(
          P[end]!,
          typeof o.color === 'function' ? o.color(end === 0 ? 0 : 1, 0, 0, P[end]!) : o.color,
          typeof o.anim === 'function'
            ? o.anim(end === 0 ? 0 : 1, 0, 0, P[end]!)
            : (o.anim ?? ZERO3),
        );
        for (let j = 0; j < sides; j++) {
          const j2 = (j + 1) % sides;
          if (end === 0) this.tri(ctr, ring0 + j2, ring0 + j);
          else this.tri(ctr, ring0 + j, ring0 + j2);
        }
      }
    }
  }

  /** An ellipsoid centred at `c` with radii `r` (x, y, z). */
  ellipsoid(
    c: V3,
    r: V3,
    sides: number,
    rings: number,
    color: ColorFn | RGB,
    anim: AnimFn | V3 = ZERO3,
  ): void {
    const path: V3[] = [];
    for (let k = 0; k < rings; k++)
      path.push([c[0], c[1] - Math.cos((Math.PI * k) / (rings - 1)) * r[1], c[2]]);
    this.sweep({
      path,
      rings,
      sides,
      up: [0, 0, 1],
      radius: (t) => {
        const s = Math.sin(Math.PI * t);
        return [s * r[0], s * r[2]];
      },
      color,
      anim,
    });
  }

  toGeometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aAnim', new THREE.Float32BufferAttribute(this.anim, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}
