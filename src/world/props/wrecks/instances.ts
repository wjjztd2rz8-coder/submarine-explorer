/**
 * Instanced details shared by every wreck: rusticles, portholes, window
 * openings, railings and sessile animals. Each kind is one InstancedMesh (one
 * draw call) over a small shared geometry with baked vertex colours, tinted
 * per instance. Builders collect transforms into an {@link InstanceList} and
 * turn it into a mesh at the end, so tier budgets can thin the list first.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { normalise, spanMatrix } from './kit.js';
import { valueNoise3 } from './shared.js';

export class InstanceList {
  readonly matrices: THREE.Matrix4[] = [];
  readonly colors: THREE.Color[] = [];

  push(m: THREE.Matrix4, color: THREE.ColorRepresentation = 0xffffff): void {
    this.matrices.push(m);
    this.colors.push(new THREE.Color(color));
  }

  get length(): number {
    return this.matrices.length;
  }

  /** Keep roughly `fraction` of the entries, deterministically (every k-th, spread evenly). */
  thin(fraction: number): void {
    if (fraction >= 1) return;
    const keep = Math.max(0, Math.round(this.length * fraction));
    if (keep >= this.length) return;
    const m: THREE.Matrix4[] = [];
    const c: THREE.Color[] = [];
    for (let i = 0; i < keep; i++) {
      const k = Math.floor((i * this.length) / Math.max(1, keep));
      m.push(this.matrices[k]!);
      c.push(this.colors[k]!);
    }
    this.matrices.splice(0, this.matrices.length, ...m);
    this.colors.splice(0, this.colors.length, ...c);
  }
}

/** One InstancedMesh from a list; null when the list is empty. */
export function makeInstanced(
  geom: THREE.BufferGeometry,
  material: THREE.Material,
  list: InstanceList,
  name: string,
): THREE.InstancedMesh | null {
  if (!list.length) return null;
  const mesh = new THREE.InstancedMesh(geom, material, list.length);
  for (let i = 0; i < list.length; i++) {
    mesh.setMatrixAt(i, list.matrices[i]!);
    mesh.setColorAt(i, list.colors[i]!);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.name = name;
  return mesh;
}

/** Give a geometry a constant or height-graded vertex colour. */
function colourise(
  g: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number) => THREE.Color,
): THREE.BufferGeometry {
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function cachedGeo(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

// ------------------------------------------------------------- rusticles

/**
 * A rusticle: a thin, lumpy strand 1 m long hanging from y = 0 to y = -1. It
 * flares at the root where it grips the steel, narrows to a thread, and the tip
 * sags sideways like a drip that ran. Ochre at the root to deep brown at the tip.
 */
export function rusticleGeometry(): THREE.BufferGeometry {
  return cachedGeo('rusticle', () => {
    const g = new THREE.CylinderGeometry(0.5, 0.05, 1, 6, 8, false);
    g.translate(0, -0.5, 0);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const t = -y;
      const bulge = 0.7 + 0.6 * valueNoise3(Math.cos(a) * 1.3, y * 5.3, Math.sin(a) * 1.3, 0x7a3);
      // Flared root, then a thin, slightly beaded stalk.
      const flare = 1 + 1.4 * Math.pow(1 - Math.min(1, t * 6), 2);
      const k = bulge * flare;
      // Droop: the tip swings sideways and the stalk wanders.
      const sway = 0.5 * t * t + 0.06 * Math.sin(t * 9);
      pos.setXYZ(i, x * k + sway, y, z * k);
    }
    g.computeVertexNormals();
    const root = new THREE.Color(0x8a5424);
    const tip = new THREE.Color(0x4a2a14);
    const c = new THREE.Color();
    return colourise(normalise(g), (_x, y) => c.copy(root).lerp(tip, Math.pow(-y, 0.7)));
  });
}

const _up = new THREE.Vector3();
/**
 * Hang one rusticle at `p`. `len` is the nominal length; strands are thin
 * (radius 3-8% of length), vary in thickness, and hang almost straight down.
 */
export function hangRusticle(
  list: InstanceList,
  p: THREE.Vector3,
  len: number,
  rnd: () => number,
): void {
  const L = len * (0.75 + rnd() * 0.3);
  const r = Math.max(0.02, L * (0.065 + rnd() * rnd() * 0.1));
  const m = new THREE.Matrix4().compose(
    p,
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler((rnd() - 0.5) * 0.12, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.12),
    ),
    _up.set(r * 2, L, r * 2),
  );
  // Ochre to brown, subtle; never neon.
  const shade = 0.8 + rnd() * 0.35;
  const warm = rnd();
  list.push(m, new THREE.Color(shade, shade * (0.8 + warm * 0.15), shade * (0.7 + warm * 0.15)));
}

// ------------------------------------------------------------- openings

/** Porthole: a rim ring and a dark glass disc, 1 m across, facing +Z. */
export function portholeGeometry(): THREE.BufferGeometry {
  return cachedGeo('porthole', () => {
    const rim = new THREE.TorusGeometry(0.42, 0.08, 5, 14);
    const glass = new THREE.CircleGeometry(0.4, 14);
    glass.translate(0, 0, -0.03);
    const dark = new THREE.Color(0x060403);
    const brass = new THREE.Color(0x5a3d22);
    const a = colourise(normalise(rim), () => brass);
    const b = colourise(normalise(glass), () => dark);
    return mergeGeometries([a, b], false)!;
  });
}

/** Window or door opening: a dark inset panel with a frame, 1 x 1 m, facing +Z. */
export function windowGeometry(): THREE.BufferGeometry {
  return cachedGeo('window', () => {
    const pane = new THREE.PlaneGeometry(0.86, 0.86);
    const frame: THREE.BufferGeometry[] = [];
    for (const [w, h, x, y] of [
      [1, 0.07, 0, 0.465],
      [1, 0.07, 0, -0.465],
      [0.07, 1, 0.465, 0],
      [0.07, 1, -0.465, 0],
    ] as const) {
      const b = new THREE.BoxGeometry(w, h, 0.08);
      b.translate(x, y, 0.02);
      frame.push(normalise(b));
    }
    const dark = new THREE.Color(0x050303);
    const rust = new THREE.Color(0x4f2716);
    const p = colourise(normalise(pane), () => dark);
    const f = colourise(mergeGeometries(frame, false)!, () => rust);
    return mergeGeometries([p, f], false)!;
  });
}

const _look = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _zero = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

/** Place a +Z-facing unit panel at `p`, facing along `normal`, scaled (w, h). */
export function facingMatrix(
  p: THREE.Vector3,
  normal: THREE.Vector3,
  w: number,
  h: number,
): THREE.Matrix4 {
  _look.lookAt(_zero, normal, Y);
  _q.setFromRotationMatrix(_look);
  // lookAt points -Z at the target direction; flip so +Z faces out.
  _q.multiply(new THREE.Quaternion().setFromAxisAngle(Y, Math.PI));
  return new THREE.Matrix4().compose(p, _q, _s.set(w, h, Math.max(w, h)));
}

// ------------------------------------------------------------- railings

/** Unit cylinder (radius 1, height 1, centred) used for posts and rails. */
export function barGeometry(): THREE.BufferGeometry {
  return cachedGeo('bar', () => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    const c = new THREE.Color(0x5a2c18);
    return colourise(normalise(g), () => c);
  });
}

export interface RailOptions {
  height?: number;
  postSpacing?: number;
  /** Fraction of panels missing. */
  missing?: number;
  /** Max outward lean of a bent panel (radians). */
  bend?: number;
  /** Outward direction in the XZ plane at a point; the rail bends that way. */
  outward?: (p: THREE.Vector3) => THREE.Vector3;
  radius?: number;
}

/**
 * A ship's railing along a polyline: posts every `postSpacing` m with a top rail
 * and a mid rail, some panels missing and some bent outward, as the Titanic's
 * are. Adds bar instances to `list`.
 */
export function railing(
  list: InstanceList,
  path: readonly THREE.Vector3[],
  rnd: () => number,
  o: RailOptions = {},
): void {
  const h = o.height ?? 1.1;
  const spacing = o.postSpacing ?? 1.4;
  const r = o.radius ?? 0.035;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const n = Math.max(1, Math.round(a.distanceTo(b) / spacing));
    for (let k = 0; k < n; k++) pts.push(new THREE.Vector3().lerpVectors(a, b, k / n));
  }
  pts.push(path[path.length - 1]!.clone());
  const tops: THREE.Vector3[] = [];
  const mids: THREE.Vector3[] = [];
  const keep: boolean[] = [];
  // Bends come in runs, like a section of rail pushed over together.
  let bendRun = 0;
  let bendAmt = 0;
  for (const p of pts) {
    if (bendRun <= 0 && rnd() < 0.12) {
      bendRun = 2 + Math.floor(rnd() * 5);
      bendAmt = (o.bend ?? 0.6) * (0.4 + rnd() * 0.6);
    }
    const lean = bendRun-- > 0 ? bendAmt : (rnd() - 0.5) * 0.12;
    const out = o.outward ? o.outward(p) : new THREE.Vector3(0, 0, 0);
    const top = new THREE.Vector3(
      p.x + out.x * Math.sin(lean) * h,
      p.y + Math.cos(lean) * h,
      p.z + out.z * Math.sin(lean) * h,
    );
    tops.push(top);
    mids.push(new THREE.Vector3().lerpVectors(p, top, 0.5));
    keep.push(rnd() >= (o.missing ?? 0.12));
  }
  const col = new THREE.Color(1, 1, 1);
  for (let i = 0; i < pts.length; i++) {
    if (!keep[i]) continue;
    list.push(spanMatrix(pts[i]!, tops[i]!, r * 1.3, r * 1.3), col);
    if (i + 1 < pts.length && keep[i + 1]) {
      list.push(spanMatrix(tops[i]!, tops[i + 1]!, r, r), col);
      list.push(spanMatrix(mids[i]!, mids[i + 1]!, r * 0.8, r * 0.8), col);
    }
  }
}

// ------------------------------------------------------------ sessile life

/**
 * Deep-sea anemone, 1 m tall: a column and a crown of short tentacles. The
 * pale geometry colour is tinted per instance (white, pink, orange).
 */
export function anemoneGeometry(): THREE.BufferGeometry {
  return cachedGeo('anemone', () => {
    const parts: THREE.BufferGeometry[] = [];
    const col = new THREE.CylinderGeometry(0.28, 0.34, 0.6, 9, 1);
    col.translate(0, 0.3, 0);
    parts.push(normalise(col));
    const disc = new THREE.CylinderGeometry(0.42, 0.3, 0.12, 9, 1);
    disc.translate(0, 0.64, 0);
    parts.push(normalise(disc));
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const t = new THREE.ConeGeometry(0.05, 0.42, 4, 1);
      t.rotateZ(-0.9);
      t.translate(0.2, 0, 0);
      t.rotateY(a);
      t.translate(Math.cos(a) * 0.2, 0.8, -Math.sin(a) * 0.2);
      parts.push(normalise(t));
    }
    const g = mergeGeometries(parts, false)!;
    const base = new THREE.Color(0.85, 0.8, 0.78);
    const tipC = new THREE.Color(1, 0.95, 0.92);
    const c = new THREE.Color();
    return colourise(g, (_x, y) => c.copy(base).lerp(tipC, THREE.MathUtils.clamp(y, 0, 1)));
  });
}

/** Sea squirt: a translucent-looking pale tube with a siphon at the top, 1 m tall. */
export function squirtGeometry(): THREE.BufferGeometry {
  return cachedGeo('squirt', () => {
    const body = new THREE.CylinderGeometry(0.22, 0.3, 0.8, 8, 3);
    body.translate(0, 0.4, 0);
    const pos = body.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const w = 1 + 0.25 * Math.sin(y * 4);
      pos.setX(i, pos.getX(i) * w);
      pos.setZ(i, pos.getZ(i) * w);
    }
    const siphon = new THREE.CylinderGeometry(0.1, 0.14, 0.25, 6, 1, true);
    siphon.rotateZ(0.4);
    siphon.translate(0.08, 0.88, 0);
    const g = mergeGeometries([normalise(body), normalise(siphon)], false)!;
    const c = new THREE.Color(0.95, 0.93, 0.85);
    return colourise(g, () => c);
  });
}

/** Instance tints for sessile life on the Endurance (white, cream, pink, orange). */
export const LIFE_TINTS = [0xf2ece4, 0xf0d9c4, 0xe9a8a0, 0xe98a5a, 0xf5e6b0, 0xc9b8d8] as const;
