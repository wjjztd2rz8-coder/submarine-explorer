/**
 * Ship-shaped helpers on top of the loft: surface frames, rows of openings
 * along the side, deck-edge polylines for railings and rusticles, and a few
 * fittings every hull uses (bollards, capstans, vents, davits, anchors).
 */

import * as THREE from 'three';
import { beam, loftPoint, strut, trs, v3, type LoftSpec, type PartBin } from './kit.js';
import { facingMatrix, hangRusticle, type InstanceList } from './instances.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();

/** Point and outward unit normal of the lofted side at (s, y). */
export function hullFrame(
  spec: LoftSpec,
  s: number,
  y: number,
  side: -1 | 1,
): { p: THREE.Vector3; n: THREE.Vector3 } {
  const e = 0.25;
  const p = loftPoint(spec, s, y, side, new THREE.Vector3());
  loftPoint(spec, s + e, y, side, _a);
  loftPoint(spec, s - e, y, side, _b);
  loftPoint(spec, s, y + e, side, _c);
  loftPoint(spec, s, y - e, side, _d);
  const ts = _a.sub(_b);
  const ty = _c.sub(_d);
  const n = new THREE.Vector3().crossVectors(ts, ty).normalize();
  // Port side (-X) normals come out of the cross product pointing -X already.
  if (n.x * side < 0) n.negate();
  return { p, n };
}

/**
 * A row of openings (portholes or windows) along one side between s0 and s1 at
 * height y(s), every `spacing` m, some skipped. Adds instances to `list` and
 * returns the placed points (for rusticles under them).
 */
export function openingRow(
  list: InstanceList,
  spec: LoftSpec,
  side: -1 | 1,
  s0: number,
  s1: number,
  y: (s: number) => number,
  spacing: number,
  w: number,
  h: number,
  rnd: () => number,
  skip = 0.15,
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let s = s0; s <= s1; s += spacing) {
    if (rnd() < skip) continue;
    const { p, n } = hullFrame(spec, s, y(s), side);
    p.addScaledVector(n, 0.04);
    list.push(facingMatrix(p, n, w, h));
    out.push(p);
  }
  return out;
}

/** Deck-edge polyline along one side, `inset` m in from the hull side. */
export function edgePath(
  spec: LoftSpec,
  s0: number,
  s1: number,
  step: number,
  y: (s: number) => number,
  side: -1 | 1,
  inset = 0.3,
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const n = Math.max(1, Math.round((s1 - s0) / step));
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    const p = loftPoint(spec, s, y(s), side, new THREE.Vector3());
    p.x -= side * inset;
    out.push(p);
  }
  return out;
}

/** Rusticles along a polyline (a deck edge, a rail), hanging from just outboard of it. */
export function rusticlesAlong(
  list: InstanceList,
  path: readonly THREE.Vector3[],
  density: number,
  lenMin: number,
  lenMax: number,
  rnd: () => number,
  outward?: THREE.Vector3 | ((p: THREE.Vector3) => THREE.Vector3),
): void {
  // Rusticles gather in clumps under seams, rails and edges, with bare steel between.
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const dist = a.distanceTo(b);
    const clumps = Math.floor((dist * density) / 2 + rnd());
    for (let k = 0; k < clumps; k++) {
      const c = new THREE.Vector3().lerpVectors(a, b, rnd());
      const o = typeof outward === 'function' ? outward(c) : outward;
      const reach = lenMin + (lenMax - lenMin) * Math.pow(rnd(), 1.6);
      const strands = 3 + Math.floor(rnd() * 6);
      for (let j = 0; j < strands; j++) {
        const p = c.clone();
        p.lerp(b, (rnd() - 0.5) * Math.min(0.6, 0.5 / Math.max(dist, 0.5)) * 2);
        if (o) p.addScaledVector(o, 0.06 + rnd() * 0.06);
        // Strands in a clump share a rough length; the odd one runs long.
        const len = reach * (0.35 + rnd() * 0.65) * (rnd() < 0.08 ? 1.6 : 1);
        hangRusticle(list, p, len, rnd);
      }
    }
  }
}

// --------------------------------------------------------------- fittings

/** A pair of mooring bollards (bitts) on a common base plate. */
export function bollards(
  bin: PartBin,
  x: number,
  y: number,
  z: number,
  rotY: number,
  color: number,
): void {
  const m = trs(x, y, z, 0, rotY);
  const base = new THREE.BoxGeometry(0.7, 0.15, 1.7);
  base.translate(0, 0.075, 0);
  bin.add(base, color, m);
  for (const dz of [-0.5, 0.5]) {
    const c = new THREE.CylinderGeometry(0.22, 0.24, 0.75, 10);
    c.translate(0, 0.52, dz);
    bin.add(c, color, m);
    const cap = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10);
    cap.translate(0, 0.9, dz);
    bin.add(cap, color, m);
  }
}

/** A capstan: a waisted drum with a cap and whelps. */
export function capstan(
  bin: PartBin,
  x: number,
  y: number,
  z: number,
  r: number,
  color: number,
): void {
  const pts = [
    new THREE.Vector2(r * 1.25, 0),
    new THREE.Vector2(r * 1.2, 0.12),
    new THREE.Vector2(r * 0.85, 0.2),
    new THREE.Vector2(r * 0.72, 0.55),
    new THREE.Vector2(r * 0.85, 0.85),
    new THREE.Vector2(r * 1.05, 0.95),
    new THREE.Vector2(r * 1.05, 1.05),
    new THREE.Vector2(0, 1.12),
  ];
  const g = new THREE.LatheGeometry(pts, 12);
  bin.add(g, color, trs(x, y, z));
}

/** A ship's cowl ventilator: a pipe with a bell mouth turned to one side. */
export function cowlVent(
  bin: PartBin,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  rotY: number,
  color: number,
): void {
  const m = trs(x, y, z, 0, rotY);
  const pipe = new THREE.CylinderGeometry(r, r * 1.1, h, 10);
  pipe.translate(0, h / 2, 0);
  bin.add(pipe, color, m);
  const bell = new THREE.SphereGeometry(r * 1.6, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
  bell.rotateX(Math.PI / 2);
  bell.translate(0, h + r * 0.6, r * 0.4);
  bin.add(bell, color, m);
}

/**
 * A Welin quadrant davit on a deck edge: a heavy base and a curved arm that
 * reaches up and outboard. `out` is +1 for starboard (+X), -1 for port.
 */
export function welinDavit(
  bin: PartBin,
  x: number,
  y: number,
  z: number,
  out: -1 | 1,
  lean: number,
  color: number,
): void {
  const base = new THREE.BoxGeometry(0.7, 0.7, 1.1);
  base.translate(x, y + 0.35, z);
  bin.add(base, color);
  const pts = [
    v3(x, y + 0.6, z),
    v3(x + out * 0.3, y + 2.0, z),
    v3(x + out * (0.9 + lean), y + 3.1, z),
    v3(x + out * (1.9 + lean * 1.5), y + 3.3 - lean, z),
  ];
  for (let i = 0; i < pts.length - 1; i++)
    bin.add(beam(pts[i]!, pts[i + 1]!, 0.13, 0.11, 6), color);
}

/**
 * A stockless bower anchor seated against the hull: shank up the side, crown
 * at the bottom, two flukes turned up against the plating. `p` is the crown,
 * `n` the hull's outward normal there.
 */
export function stocklessAnchor(
  bin: PartBin,
  p: THREE.Vector3,
  n: THREE.Vector3,
  size: number,
  color: number,
): void {
  // Local frame: X = outward normal, Y = up, Z = along the hull.
  const up = new THREE.Vector3(0, 1, 0);
  const along = new THREE.Vector3().crossVectors(n, up).normalize();
  const basis = new THREE.Matrix4().makeBasis(n, up, along);
  basis.setPosition(p);
  const s = size;
  const shank = new THREE.BoxGeometry(0.35 * s, 2.6 * s, 0.45 * s);
  shank.translate(0.25 * s, 1.3 * s, 0);
  bin.add(shank, color, basis);
  const crown = new THREE.BoxGeometry(0.55 * s, 0.55 * s, 1.1 * s);
  crown.translate(0.3 * s, 0.1 * s, 0);
  bin.add(crown, color, basis);
  for (const side of [-1, 1]) {
    const fluke = new THREE.CylinderGeometry(0.05 * s, 0.32 * s, 1.5 * s, 4);
    fluke.rotateX(side * 0.35);
    fluke.translate(0.35 * s, 0.75 * s, side * 0.7 * s);
    bin.add(fluke, color, basis);
  }
  // Shackle ring at the top of the shank.
  const ring = new THREE.TorusGeometry(0.22 * s, 0.07 * s, 5, 10);
  ring.rotateY(Math.PI / 2);
  ring.translate(0.25 * s, 2.7 * s, 0);
  bin.add(ring, color, basis);
}

/** A deck house (box) with an optional crushed roof (a sag in the middle). */
export function deckHouse(
  bin: PartBin,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  l: number,
  color: number,
  sag = 0,
): void {
  const g = new THREE.BoxGeometry(w, h, l, 4, 1, Math.max(2, Math.round(l / 3)));
  g.translate(x, y + h / 2, z);
  if (sag > 0) {
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < y + h - 0.01) continue;
      const u = (pos.getX(i) - x) / (w / 2);
      const v = (pos.getZ(i) - z) / (l / 2);
      pos.setY(i, pos.getY(i) - sag * (1 - u * u) * (1 - v * v * 0.6));
    }
    g.computeVertexNormals();
  }
  bin.add(g, color);
}

/** Thin plate from a to b (its long axis), `w` wide, a box of thickness t. */
export function plate(
  bin: PartBin,
  a: THREE.Vector3,
  b: THREE.Vector3,
  w: number,
  t: number,
  color: number,
): void {
  bin.add(strut(a, b, w, t), color);
}
