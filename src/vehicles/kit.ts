/**
 * The vehicle construction kit (F1-VEHICLES).
 *
 * Every vehicle is assembled from these parts in its own metres (front -Z,
 * up +Y, starboard +X) and then merged: a {@link PartBuilder} collects
 * geometry per material slot and emits one mesh per slot, so a detailed hull
 * costs a handful of draw calls. All merged geometry carries the same four
 * attributes (position, normal, uv in metres, colour), and colour is the
 * livery: the lit materials multiply their textures by it.
 *
 * The shapes follow real deep-submergence practice (lofted syntactic-foam
 * fairings, a pressure sphere with conical viewports, Kort-nozzle ducted
 * thrusters, tubular frames and skids) without copying any one vehicle.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Slot } from './materials.js';

export type Rgb = readonly [number, number, number];

/** Palette shared by every vehicle (linear-ish sRGB triples, 0..1+). */
export const PAINT = {
  white: [0.9, 0.91, 0.9],
  offWhite: [0.8, 0.8, 0.77],
  orange: [0.98, 0.33, 0.06],
  yellow: [0.98, 0.72, 0.08],
  red: [0.78, 0.12, 0.08],
  black: [0.05, 0.055, 0.06],
  charcoal: [0.13, 0.14, 0.15],
  gunmetal: [0.24, 0.26, 0.28],
  steel: [0.55, 0.58, 0.6],
  titanium: [0.62, 0.64, 0.66],
  bronze: [0.55, 0.42, 0.26],
  navy: [0.08, 0.14, 0.24],
  seat: [0.12, 0.2, 0.3],
} as const satisfies Record<string, Rgb>;

/** Face colour rule: centroid and face normal (part space) -> colour. */
export type Painter = (c: THREE.Vector3, n: THREE.Vector3) => Rgb;

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Transform: translate, then Euler (XYZ, radians), then scale. */
export function T(
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = sx,
  sz = sx,
): THREE.Matrix4 {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** A transform whose local +Y axis points along `dir`, placed at `pos`. */
export function alongY(pos: THREE.Vector3Like, dir: THREE.Vector3Like, scale = 1): THREE.Matrix4 {
  const d = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(pos.x, pos.y, pos.z),
    q,
    new THREE.Vector3(scale, scale, scale),
  );
}

/** Force a geometry into the kit's attribute layout (non-indexed, pos/normal/uv/color). */
export function normalise(geo: THREE.BufferGeometry, color?: Rgb | Painter): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const keepColor = color === undefined && g.getAttribute('color')?.itemSize === 3;
  for (const name of Object.keys(g.attributes)) {
    if (name === 'color' && keepColor) continue;
    if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  }
  const pos = g.getAttribute('position');
  if (!g.getAttribute('uv'))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.count * 2), 2));
  g.morphAttributes = {};
  g.clearGroups();
  if (keepColor) return g;
  color ??= PAINT.white;
  const colors = new Float32Array(pos.count * 3);
  if (typeof color === 'function') {
    const nrm = g.getAttribute('normal');
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      c.set(0, 0, 0);
      n.set(0, 0, 0);
      for (let k = 0; k < 3; k++) {
        c.x += pos.getX(i + k) / 3;
        c.y += pos.getY(i + k) / 3;
        c.z += pos.getZ(i + k) / 3;
        n.x += nrm.getX(i + k);
        n.y += nrm.getY(i + k);
        n.z += nrm.getZ(i + k);
      }
      n.normalize();
      const rgb = color(c, n);
      for (let k = 0; k < 3; k++) colors.set(rgb, (i + k) * 3);
    }
  } else {
    for (let i = 0; i < pos.count; i++) colors.set(color, i * 3);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

/**
 * Collects parts per slot and merges them. `slotMap` lets a low LOD fold one
 * slot into another (for example `metal` into `frame`) to save a draw call.
 */
export class PartBuilder {
  private readonly parts = new Map<Slot, THREE.BufferGeometry[]>();
  private readonly slotMap: Partial<Record<Slot, Slot | null>>;

  constructor(slotMap: Partial<Record<Slot, Slot | null>> = {}) {
    this.slotMap = slotMap;
  }

  /**
   * Add a part. The geometry is consumed. `color` is a flat colour or a
   * per-face painter evaluated in the part's own space, before `matrix`;
   * omitted, an existing colour attribute is kept (else white).
   */
  add(slot: Slot, geo: THREE.BufferGeometry, matrix?: THREE.Matrix4, color?: Rgb | Painter): void {
    const target = slot in this.slotMap ? this.slotMap[slot] : slot;
    if (target === null || target === undefined) {
      geo.dispose();
      return;
    }
    const g = normalise(geo, color);
    if (matrix) g.applyMatrix4(matrix);
    let list = this.parts.get(target);
    if (!list) this.parts.set(target, (list = []));
    list.push(g);
  }

  /** True if nothing has been added. */
  get empty(): boolean {
    return this.parts.size === 0;
  }

  /** One merged geometry per slot. The builder is emptied. */
  build(): Map<Slot, THREE.BufferGeometry> {
    const out = new Map<Slot, THREE.BufferGeometry>();
    for (const [slot, list] of this.parts) {
      const merged = list.length === 1 ? list[0]! : mergeGeometries(list, false);
      if (list.length > 1) for (const g of list) g.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      out.set(slot, merged);
    }
    this.parts.clear();
    return out;
  }
}

// ---------------------------------------------------------------- shapes

/** One cross-section of a lofted body. */
export interface Section {
  /** Half width (m). */
  w: number;
  /** Top and bottom of the section (m). */
  top: number;
  bottom: number;
  /** Superellipse exponent (2 = ellipse, higher = boxier). Top and bottom halves. */
  nTop?: number;
  nBottom?: number;
  /** Lateral offset of the section centre (m). */
  x?: number;
}

/**
 * A lofted body along Z: `fn(t, z)` returns the section at each of `steps + 1`
 * stations from `z0` to `z1`. Zero-size end sections close the body. UVs are
 * in metres (u around the girth, v along Z), for the tiled surface textures.
 */
export function loft(
  z0: number,
  z1: number,
  steps: number,
  radial: number,
  fn: (t: number, z: number) => Section,
): THREE.BufferGeometry {
  const ring = radial + 1;
  const positions = new Float32Array((steps + 1) * ring * 3);
  const uvs = new Float32Array((steps + 1) * ring * 2);
  const index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = z0 + (z1 - z0) * t;
    const s = fn(t, z);
    const cy = (s.top + s.bottom) / 2;
    const hy = (s.top - s.bottom) / 2;
    const cx = s.x ?? 0;
    let arc = 0;
    let px = 0;
    let py = 0;
    for (let j = 0; j <= radial; j++) {
      // Start (and seam) at the keel, -pi/2, where it is never seen.
      const a = -Math.PI / 2 + (j / radial) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const n = sa >= 0 ? (s.nTop ?? 2) : (s.nBottom ?? 2);
      const x = cx + s.w * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / n);
      const y = cy + hy * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n);
      if (j > 0) arc += Math.hypot(x - px, y - py);
      px = x;
      py = y;
      const k = i * ring + j;
      positions[k * 3] = x;
      positions[k * 3 + 1] = y;
      positions[k * 3 + 2] = z;
      uvs[k * 2] = arc;
      uvs[k * 2 + 1] = z;
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * ring + j;
      const b = a + ring;
      // Wound so faces point outward for z increasing and angle increasing CCW (seen from +Z).
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Smooth rounded end: 0 at the tip (t = 0) rising to 1 at t = 1 (quarter ellipse). */
export function roundEnd(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return Math.sqrt(1 - (1 - c) * (1 - c));
}

/** Hermite smoothstep. */
export function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------- detail

let detail = 1;

/**
 * Radial segment count scaled by the current build detail (see
 * {@link withDetail}), never below `min`.
 */
export function seg(n: number, min = 4): number {
  return Math.max(min, Math.round(n * detail));
}

/**
 * Run a build at a detail factor: every `lathe`, `bar`, `tube` and `seg()`
 * inside scales its radial segments (the low LOD builds at 0.5).
 */
export function withDetail<T>(factor: number, fn: () => T): T {
  const prev = detail;
  detail = factor;
  try {
    return fn();
  } finally {
    detail = prev;
  }
}

/** A lathe from [radius, y] pairs, around +Y. */
export function lathe(profile: Array<[number, number]>, segments = 24): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)),
    seg(segments, 6),
  );
}

/** A tube along a polyline (Catmull-Rom smoothed unless `sharp`). */
export function tube(
  points: Array<[number, number, number]>,
  radius: number,
  radial = 6,
  segmentsPerSpan = 4,
  sharp = false,
): THREE.BufferGeometry {
  const pts = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve =
    sharp || pts.length === 2
      ? new THREE.CurvePath<THREE.Vector3>()
      : new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  if (curve instanceof THREE.CurvePath) {
    for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(pts[i]!, pts[i + 1]!));
  }
  const segs = Math.max(1, (pts.length - 1) * segmentsPerSpan);
  return new THREE.TubeGeometry(
    curve as THREE.Curve<THREE.Vector3>,
    segs,
    radius,
    seg(radial),
    false,
  );
}

/** Straight bar between two points (a thin cylinder), with optional end caps. */
export function bar(
  a: [number, number, number],
  b: [number, number, number],
  radius: number,
  radial = 6,
): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(radius, radius, len, seg(radial), 1, false);
  g.applyMatrix4(alongY(va.clone().add(vb).multiplyScalar(0.5), vb.clone().sub(va)));
  return g;
}

/** Rounded box via an extruded rounded rectangle (depth along Z). */
export function roundedBox(
  w: number,
  h: number,
  d: number,
  r: number,
  bevel = 0.3,
): THREE.BufferGeometry {
  const rr = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3);
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -h / 2;
  s.moveTo(x0 + rr, y0);
  s.lineTo(x0 + w - rr, y0);
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
  s.lineTo(x0 + w, y0 + h - rr);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rr, y0 + h);
  s.lineTo(x0 + rr, y0 + h);
  s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rr);
  s.lineTo(x0, y0 + rr);
  s.quadraticCurveTo(x0, y0, x0 + rr, y0);
  const bv = Math.min(d * 0.25, rr * bevel + 0.004);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-3, d - 2 * bv),
    bevelEnabled: true,
    bevelThickness: bv,
    bevelSize: bv * 0.8,
    bevelSegments: 2,
    curveSegments: 3,
  });
  g.translate(0, 0, -(d - 2 * bv) / 2);
  // Extrude UVs are in shape units already (metres); keep them.
  return g;
}

/** A flat extruded profile in the YZ plane (x thickness), e.g. fins and skids. */
export function sideProfile(
  points: Array<[number, number]>,
  thickness: number,
  bevel = 0.01,
): THREE.BufferGeometry {
  const s = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-3, thickness - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 6,
  });
  // Shape x -> z, shape y -> y, extrude z -> x.
  g.applyMatrix4(
    new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 0, 0),
    ),
  );
  g.translate(-(thickness - 2 * bevel) / 2, 0, 0);
  return g;
}

/** Reverse triangle winding (after a mirroring transform). */
export function flipWinding(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const gg = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(gg.attributes)) {
    const a = gg.getAttribute(name) as THREE.BufferAttribute;
    const n = a.itemSize;
    const arr = a.array as Float32Array;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = arr[(i + 1) * n + k]!;
        arr[(i + 1) * n + k] = arr[(i + 2) * n + k]!;
        arr[(i + 2) * n + k] = t;
      }
    }
    a.needsUpdate = true;
  }
  return gg;
}

/** A keyframe of a lofted body: z and the section values at that station. */
export type ProfileKey = [z: number, w: number, top: number, bottom: number];

/**
 * Catmull-Rom interpolation through profile keys (sorted by z), clamped at
 * the ends. Returns the section at any z; exponents are fixed per body.
 */
export function profile(keys: ProfileKey[], nTop = 2, nBottom = 2): (z: number) => Section {
  const k = keys;
  const cr = (p0: number, p1: number, p2: number, p3: number, t: number): number =>
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  return (z) => {
    let i = 0;
    while (i < k.length - 2 && z > k[i + 1]![0]) i++;
    const a = k[Math.max(0, i - 1)]!;
    const b = k[i]!;
    const c = k[i + 1]!;
    const d = k[Math.min(k.length - 1, i + 2)]!;
    const t = Math.min(1, Math.max(0, (z - b[0]) / (c[0] - b[0] || 1)));
    const v = (j: 1 | 2 | 3): number => cr(a[j], b[j], c[j], d[j], t);
    return { w: Math.max(0, v(1)), top: v(2), bottom: v(3), nTop, nBottom };
  };
}

/** Lateral half-width of a section's surface at height y (superellipse). */
export function sideX(s: Section, y: number): number {
  const cy = (s.top + s.bottom) / 2;
  const hy = (s.top - s.bottom) / 2;
  const n = y >= cy ? (s.nTop ?? 2) : (s.nBottom ?? 2);
  const r = Math.min(1, Math.abs((y - cy) / hy));
  return (s.x ?? 0) + s.w * Math.pow(1 - Math.pow(r, n), 1 / n);
}

/** Surface height of a section's top at lateral offset x (superellipse). */
export function topY(s: Section, x: number): number {
  const cy = (s.top + s.bottom) / 2;
  const hy = (s.top - s.bottom) / 2;
  const n = s.nTop ?? 2;
  const r = Math.min(1, Math.abs((x - (s.x ?? 0)) / s.w));
  return cy + hy * Math.pow(1 - Math.pow(r, n), 1 / n);
}
