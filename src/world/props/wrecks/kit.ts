/**
 * Geometry kit for the hand-built wrecks: a parts bin that merges everything
 * sharing a material into one mesh (one draw call), a hull loft (two side
 * surfaces from a half-breadth function, with deck strips and end caps that
 * share its edges), a few primitives placed between points, noise deformation
 * and box-projected UVs.
 *
 * Every piece carries a base colour in a `color` attribute (linear). The paint
 * pass in paint.ts then weathers it by position, so coincident vertices of
 * different pieces weather the same way and nothing needs per-piece textures.
 * Local frame as for every prop: base (mud line) at y = 0, -Z forward.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { valueNoise3 } from './shared.js';

const _c = new THREE.Color();

/** Strip to position + normal, non-indexed, no groups, so pieces can be merged. */
export function normalise(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom;
  if (g !== geom) geom.dispose();
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  }
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  g.clearGroups();
  return g;
}

/** Collects pieces for one material; `merge()` returns one geometry (one draw call). */
export class PartBin {
  private readonly parts: THREE.BufferGeometry[] = [];

  /** Add a piece with a base colour (hex or Color); `m` transforms it first. */
  add(geom: THREE.BufferGeometry, color: THREE.ColorRepresentation, m?: THREE.Matrix4): void {
    const g = normalise(geom);
    if (m) g.applyMatrix4(m);
    _c.set(color);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
  }

  get size(): number {
    return this.parts.length;
  }

  /** Merge and dispose the pieces. Null when the bin is empty. */
  merge(): THREE.BufferGeometry | null {
    if (!this.parts.length) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    if (!merged) throw new Error('wreck: geometry merge failed');
    return merged;
  }
}

// ------------------------------------------------------------ transforms

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

/** Matrix from position, Euler rotation (YXZ, radians) and optional scale. */
export function trs(
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Matrix4 {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** Matrix taking a unit Y-axis piece (height 1, centred) to span a -> b. */
export function spanMatrix(
  a: THREE.Vector3,
  b: THREE.Vector3,
  sx = 1,
  sz = sx,
  out = new THREE.Matrix4(),
): THREE.Matrix4 {
  const dir = _p.subVectors(b, a);
  const len = Math.max(1e-4, dir.length());
  _q.setFromUnitVectors(UP, dir.divideScalar(len));
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return out.compose(mid, _q, _s.set(sx, len, sz));
}

/** A cylinder of radius r (or r0 -> r1) from a to b. */
export function beam(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r0: number,
  r1 = r0,
  radial = 8,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, 1, radial, 1, false);
  g.applyMatrix4(spanMatrix(a, b, 1, 1, _m));
  return g;
}

/** A box of cross-section w x t (x, z) from a to b. */
export function strut(a: THREE.Vector3, b: THREE.Vector3, w: number, t = w): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.applyMatrix4(spanMatrix(a, b, w, t, _m));
  return g;
}

export function v3(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

// ------------------------------------------------------------ deformers

/**
 * Displace every vertex by a smooth noise vector of its own position. Pure in
 * the position, so coincident vertices (box edges, loft seams) stay together.
 */
export function jitter(
  geom: THREE.BufferGeometry,
  amp: number | THREE.Vector3,
  freq: number,
  seed: number,
  weight?: (x: number, y: number, z: number) => number,
): THREE.BufferGeometry {
  const pos = geom.getAttribute('position');
  const a = typeof amp === 'number' ? new THREE.Vector3(amp, amp, amp) : amp;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const w = weight ? weight(x, y, z) : 1;
    if (w <= 0) continue;
    const fx = x * freq;
    const fy = y * freq;
    const fz = z * freq;
    pos.setXYZ(
      i,
      x + (valueNoise3(fx, fy, fz, seed) - 0.5) * 2 * a.x * w,
      y + (valueNoise3(fx + 17.1, fy, fz, seed ^ 0x51) - 0.5) * 2 * a.y * w,
      z + (valueNoise3(fx, fy + 9.7, fz, seed ^ 0xa3) - 0.5) * 2 * a.z * w,
    );
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Bend a plate built along +Z (root at z = 0) about the X axis into a circular
 * arc that turns through `angle` radians over `length` metres: positive curls
 * up (+Y), negative down. Arc length is preserved, so the plate keeps its size.
 */
export function curl(geom: THREE.BufferGeometry, length: number, angle: number): THREE.BufferGeometry {
  if (Math.abs(angle) < 1e-4) return geom;
  const r = length / angle;
  const pos = geom.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const th = z / r;
    pos.setXYZ(i, pos.getX(i), r - (r - y) * Math.cos(th), (r - y) * Math.sin(th));
  }
  geom.computeVertexNormals();
  return geom;
}

// ------------------------------------------------------------ hull loft

export interface LoftSpec {
  /** Hull length (m); s = 0 is the forward end (z = -L/2), s = L the aft end. */
  L: number;
  /** s stations, ascending. Repeat an s (s, s + 1e-3) for a vertical step. */
  stations: readonly number[];
  /** Bottom of the side surface (below the mud line, so no gap shows on rough ground). */
  yBottom: number;
  /** Vertical subdivisions of the side surface. */
  levels: number;
  /** Sheer: top of the side surface at s. */
  top: (s: number) => number;
  /** Half-breadth (>= 0) at s and height y. */
  half: (s: number, y: number) => number;
  /** Optional deformation of a surface point; must be a pure function of its arguments. */
  deform?: (p: THREE.Vector3, s: number, y: number, side: -1 | 1) => void;
}

/** Point on the lofted surface (before/after deform). */
export function loftPoint(
  spec: LoftSpec,
  s: number,
  y: number,
  side: -1 | 1,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  out.set(side * spec.half(s, y), y, s - spec.L / 2);
  spec.deform?.(out, s, y, side);
  return out;
}

function sideY(spec: LoftSpec, s: number, j: number): number {
  const top = spec.top(s);
  // Bunch levels slightly toward the top, where the detail (and the camera) is.
  const t = 1 - Math.pow(1 - j / spec.levels, 1.4);
  return spec.yBottom + (top - spec.yBottom) * t;
}

/** Port and starboard side surfaces as one geometry (smooth normals within each side). */
export function loftSides(spec: LoftSpec): THREE.BufferGeometry {
  const out: THREE.BufferGeometry[] = [];
  const ns = spec.stations.length;
  const nl = spec.levels + 1;
  const p = new THREE.Vector3();
  for (const side of [-1, 1] as const) {
    const pos = new Float32Array(ns * nl * 3);
    for (let i = 0; i < ns; i++) {
      const s = spec.stations[i]!;
      for (let j = 0; j < nl; j++) {
        loftPoint(spec, s, sideY(spec, s, j), side, p);
        pos.set([p.x, p.y, p.z], (i * nl + j) * 3);
      }
    }
    const idx: number[] = [];
    for (let i = 0; i < ns - 1; i++) {
      for (let j = 0; j < nl - 1; j++) {
        const a = i * nl + j;
        const b = (i + 1) * nl + j;
        const c = (i + 1) * nl + j + 1;
        const d = i * nl + j + 1;
        if (side < 0) idx.push(a, b, c, a, c, d);
        else idx.push(a, c, b, a, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    out.push(normalise(g));
  }
  const merged = mergeGeometries(out, false)!;
  for (const g of out) g.dispose();
  return merged;
}

/** Closing face across the hull at station s (normal toward the nearer end). */
export function loftCap(spec: LoftSpec, s: number, facing: -1 | 1): THREE.BufferGeometry {
  const nl = spec.levels + 1;
  const pos: number[] = [];
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  for (let j = 0; j < nl - 1; j++) {
    const y0 = sideY(spec, s, j);
    const y1 = sideY(spec, s, j + 1);
    const a = loftPoint(spec, s, y0, -1, p).toArray();
    const b = loftPoint(spec, s, y0, 1, q).toArray();
    const c = loftPoint(spec, s, y1, 1, q).toArray();
    const d = loftPoint(spec, s, y1, -1, p).toArray();
    if (facing > 0) pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    else pos.push(...a, ...c, ...b, ...a, ...d, ...c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A deck: a strip across the hull between s0 and s1 at height y(s), inset from
 * the side by `inset` metres, sharing the loft's deform so its edges follow the
 * (possibly splayed) sides. `across` subdivides the width for sagging decks.
 */
export function deckStrip(
  spec: LoftSpec,
  s0: number,
  s1: number,
  y: (s: number) => number,
  inset = 0,
  across = 2,
  deform?: (p: THREE.Vector3, s: number, u: number) => void,
): THREE.BufferGeometry {
  const ss = spec.stations.filter((s) => s > s0 && s < s1);
  const list = [s0, ...ss, s1];
  const nu = across + 1;
  const pos = new Float32Array(list.length * nu * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const p = new THREE.Vector3();
  list.forEach((s, i) => {
    const yy = y(s);
    loftPoint(spec, s, yy, -1, a);
    loftPoint(spec, s, yy, 1, b);
    // Keep the deck level across even where the sides deform vertically.
    for (let k = 0; k < nu; k++) {
      const u = k / across;
      p.lerpVectors(a, b, u);
      const half = Math.abs(b.x - a.x) / 2;
      const shrink = half > 1e-3 ? Math.max(0, half - inset) / half : 0;
      p.x = (a.x + b.x) / 2 + (p.x - (a.x + b.x) / 2) * shrink;
      deform?.(p, s, u);
      pos.set([p.x, p.y, p.z], (i * nu + k) * 3);
    }
  });
  const idx: number[] = [];
  for (let i = 0; i < list.length - 1; i++) {
    for (let k = 0; k < nu - 1; k++) {
      const a0 = i * nu + k;
      const b0 = (i + 1) * nu + k;
      const c0 = (i + 1) * nu + k + 1;
      const d0 = i * nu + k + 1;
      idx.push(a0, b0, c0, a0, c0, d0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Stations from 0 to L: `fine` spacing inside the given [from, to] ranges,
 * `coarse` elsewhere, plus every breakpoint doubled for a crisp vertical step.
 */
export function makeStations(
  L: number,
  coarse: number,
  fine: number,
  fineRanges: ReadonlyArray<readonly [number, number]>,
  breaks: readonly number[] = [],
): number[] {
  const out: number[] = [0];
  let s = 0;
  const inFine = (x: number): boolean => fineRanges.some(([a, b]) => x >= a && x < b);
  while (s < L) {
    s = Math.min(L, s + (inFine(s) ? fine : coarse));
    out.push(s);
  }
  for (const b of breaks) out.push(b - 0.02, b + 0.02);
  out.sort((a, b) => a - b);
  return out.filter((v, i) => i === 0 || v - out[i - 1]! > 0.01);
}

// ------------------------------------------------------------ UVs

/**
 * World-scale box-projected UVs: side faces run u along the horizontal axis and
 * v up the height; top faces use x/z (or z/x with `swapTop`, so planks on decks
 * run fore-and-aft like the hull planking). `repeatM` metres per texture repeat.
 */
export function projectUVs(geom: THREE.BufferGeometry, repeatM: number, swapTop = false): void {
  const pos = geom.getAttribute('position');
  const nrm = geom.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nrm.getX(i));
    const ay = Math.abs(nrm.getY(i));
    const az = Math.abs(nrm.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = swapTop ? z : x;
      v = swapTop ? x : z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u / repeatM;
    uv[i * 2 + 1] = v / repeatM;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Triangle count of every mesh under `root` (instanced meshes count every instance). */
export function countTriangles(root: THREE.Object3D): { draws: number; triangles: number } {
  let draws = 0;
  let triangles = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !o.visible) return;
    const g = m.geometry;
    const tri = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    const inst = (o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1;
    if (inst <= 0) return;
    draws++;
    triangles += tri * inst;
  });
  return { draws, triangles };
}
