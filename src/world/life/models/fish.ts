/**
 * The fish family: schooling fish, groupers, hakes, rattails, snailfish,
 * eels, sharks, whales and sea lions are one parametric builder (a swept
 * body with countershading, median fins, paired fins and a tail), so the
 * whole family shares one shader mode and a tuned look per species is a few
 * numbers. Model space: nose at +Z, tail at -Z, dorsal +Y.
 */

import type * as THREE from 'three';
import {
  Builder,
  clamp,
  hash1,
  lerp,
  mixRgb,
  scaleRgb,
  smooth,
  type RGB,
  type V3,
} from './kit.js';
import { col, num, str, type Look } from './look.js';

/** Tail-weight for the body wave: 0 at the head, 1 at the tail base and fin. */
const wt = (t: number): number => Math.pow(clamp((t - 0.1) / 0.9), 1.25);

export function buildFish(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const L = size;
  const H = num(look, 'H', 0.28); // body height / length
  const W = num(look, 'W', 0.16); // body width / length
  const peak = num(look, 'peak', 0.32);
  const noseP = num(look, 'noseP', 0.75);
  const tailP = num(look, 'tailP', 1.1);
  const ped = num(look, 'ped', 0.09);
  const eel = num(look, 'eel', 0); // eels and snailfish wave along the whole body
  const cD = col(look, 'cD', 0x3a5a78);
  const cF = col(look, 'cF', 0x6f8fa8);
  const cB = col(look, 'cB', 0xd7dde0);
  const cFin = col(look, 'cFin', 0x4a6a88);
  const pattern = str(look, 'pattern', 'none');
  const cP = col(look, 'cP', 0xf2c230);
  const tail = str(look, 'tail', 'fork');
  const tailLen = num(look, 'tailLen', 0.22);
  const dorsal = num(look, 'dorsal', 0.16); // fin height / length
  const dorsalA = num(look, 'dorsalA', 0.3);
  const dorsalB = num(look, 'dorsalB', 0.62);
  const dorsal2 = num(look, 'dorsal2', 0);
  const median = num(look, 'median', 0); // continuous fringe (rattail, snailfish, eel)
  const pec = num(look, 'pec', 0.16);
  const pecAngle = num(look, 'pecAngle', 0.55);
  const anal = num(look, 'anal', 0.08);
  const eye = num(look, 'eye', 0.035);
  const cEye = col(look, 'cEye', 0x0b0b0c);
  const gills = num(look, 'gills', 0);
  const overhang = num(look, 'overhang', 0);
  const rear = str(look, 'rear', 'none');
  const rings = [14, 22, 34][detail]!;
  const sides = [8, 12, 16][detail]!;

  const b = new Builder();
  const zAt = (t: number): number => L * (0.5 - t);
  const prof = (t: number): number => {
    if (t <= 0) return 0;
    let r: number;
    if (t < peak) r = Math.pow(Math.sin((0.5 * Math.PI * t) / peak), noseP);
    else r = Math.pow(Math.max(0, 1 - (t - peak) / (1 - peak)), tailP);
    return Math.max(r, t > 0.02 ? ped * smooth(0.55, 1, t) : 0);
  };
  const hAt = (t: number): number => H * L * 0.5 * prof(t) * (t < 0.03 ? 0.6 : 1) + 1e-4;
  const wAt = (t: number): number => W * L * 0.5 * prof(t) + 1e-4;

  const patternColor = (t: number, s: number, c: number): RGB => {
    const d = smooth(-0.12, 0.6, s);
    const v = smooth(0.05, -0.55, s);
    let base = mixRgb(mixRgb(cF, cD, d), cB, v);
    const scale =
      0.93 + 0.14 * hash1(Math.floor(t * 46) * 7.1 + Math.floor((Math.atan2(s, c) + 3.2) * 4.5));
    if (pattern === 'stripe') {
      const band = 1 - smooth(0.05, 0.17, Math.abs(s - 0.02));
      base = mixRgb(base, cP, band * smooth(0.06, 0.2, t) * (1 - smooth(0.82, 0.95, t)));
    } else if (pattern === 'bars') {
      const n = 5;
      const f = (t * n - 0.35) % 1;
      const bar =
        (f < 0.42 ? 1 : 0) *
        smooth(-0.55, 0.0, s) *
        smooth(0.15, 0.25, t) *
        (1 - smooth(0.85, 0.92, t));
      base = mixRgb(base, scaleRgb(cD, 0.55), bar * 0.85);
    } else if (pattern === 'spots') {
      const sp = hash1(Math.floor(t * 30) * 13.1 + Math.floor(s * 9 + 9) * 3.7 + (c > 0 ? 0 : 50));
      base = mixRgb(base, cP, sp > 0.86 ? 0.8 : 0);
    } else if (pattern === 'mottle') {
      const m = hash1(Math.floor(t * 18) * 5.3 + Math.floor((s + 1) * 4) * 2.9 + (c > 0 ? 0 : 31));
      base = mixRgb(base, cP, m * 0.9);
    } else if (pattern === 'blueSheen') {
      base = mixRgb(base, cP, smooth(0.3, 0.9, 1 - Math.abs(s)) * 0.45);
    }
    // Gill-cover edge and a faint lateral line read as anatomy, not paint.
    const gill = (1 - smooth(0.004, 0.014, Math.abs(t - 0.205))) * smooth(-0.6, -0.1, s);
    const lat =
      (1 - smooth(0.012, 0.04, Math.abs(s - 0.1))) *
      smooth(0.22, 0.32, t) *
      (1 - smooth(0.85, 0.95, t));
    base = scaleRgb(base, 1 - 0.32 * gill - 0.1 * lat);
    return scaleRgb(base, scale);
  };

  // Body.
  const path: V3[] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) path.push([0, 0, zAt(i / n)]);
  b.sweep({
    path,
    rings,
    sides,
    up: [0, 1, 0],
    radius: (t, ang) => {
      // A flatter belly and a fuller back read as fish, not as a spindle.
      const sn = Math.sin(ang);
      const belly = sn < 0 ? 0.86 : 1.0;
      return [wAt(t), hAt(t) * belly];
    },
    color: (t, s, c) => patternColor(t, s, c),
    anim: (t) => [eel > 0 ? lerp(0.22, 1, t) : wt(t), 0, 0],
    caps: true,
  });
  // A gill-cover crease and mouth line read as a face at range.
  if (gills > 0) {
    for (let g = 0; g < gills; g++) {
      const t = 0.19 + g * 0.022;
      for (const sd of [-1, 1]) {
        b.strip(
          [
            [sd * wAt(t) * 0.97, hAt(t) * 0.55, zAt(t)],
            [sd * wAt(t) * 0.97, hAt(t) * 0.05, zAt(t)],
          ],
          [
            [sd * wAt(t + 0.004) * 1.0, hAt(t) * 0.55, zAt(t + 0.004)],
            [sd * wAt(t + 0.004) * 1.0, hAt(t) * 0.05, zAt(t + 0.004)],
          ],
          scaleRgb(cD, 0.35),
          [0, 0, 0],
        );
      }
    }
  }
  // Eyes: a pale iris ring around a dark pupil, set into the head.
  if (eye > 0) {
    const t = 0.085;
    const er = eye * L;
    const iris = mixRgb(cEye, mixRgb(cB, [0.9, 0.85, 0.6], 0.5), 0.75);
    for (const sd of [-1, 1]) {
      const c: V3 = [sd * wAt(t) * 0.9, hAt(t) * 0.22, zAt(t)];
      b.ellipsoid(c, [er * 0.5, er * 0.95, er * 0.95], 8, 7, iris, [0, 0, 0]);
      b.ellipsoid(
        [c[0] + sd * er * 0.12, c[1], c[2]],
        [er * 0.5, er * 0.62, er * 0.62],
        8,
        6,
        cEye,
        [0, 0, 0],
      );
    }
  }
  // Overhanging snout / beak (rattail, parrotfish).
  if (overhang > 0) {
    b.ellipsoid(
      [0, -hAt(0.03) * 0.2, zAt(0.0) - 0.0],
      [wAt(0.06) * 0.7, hAt(0.06) * 0.5, L * overhang],
      6,
      6,
      scaleRgb(mixRgb(cF, cB, 0.4), 0.9),
      [0, 0, 0],
    );
  }

  const finCol = (u: number): RGB => scaleRgb(cFin, 0.85 + 0.3 * u);
  const fin = (a: V3[], bb: V3[], w = 1): void =>
    b.strip(
      a,
      bb,
      (_u, v) => finCol(v),
      (_u, _v, p) => [wt((0.5 - p[2] / L) * 1) * w, 0, 0],
    );

  // Dorsal fin(s): a raked outline over the back.
  const ridge = (t0: number, t1: number, h: number, steps: number, rake = 0.3): void => {
    const a: V3[] = [];
    const bb: V3[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const t = t0 + (t1 - t0) * u;
      const f = u < rake ? u / rake : Math.pow(1 - (u - rake) / (1 - rake), 1.4);
      a.push([0, hAt(t) * 0.92, zAt(t)]);
      bb.push([0, hAt(t) * 0.92 + h * L * f, zAt(t) - h * L * 0.25 * f]);
    }
    fin(a, bb);
  };
  const under = (t0: number, t1: number, h: number, steps: number, rake = 0.3): void => {
    const a: V3[] = [];
    const bb: V3[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const t = t0 + (t1 - t0) * u;
      const f = u < rake ? u / rake : Math.pow(1 - (u - rake) / (1 - rake), 1.4);
      a.push([0, -hAt(t) * 0.88, zAt(t)]);
      bb.push([0, -hAt(t) * 0.88 - h * L * f, zAt(t) - h * L * 0.25 * f]);
    }
    fin(a, bb);
  };
  if (median > 0) {
    ridge(0.28, 0.985, median, 12, 0.18);
    under(0.36, 0.985, median * 0.85, 12, 0.18);
  } else {
    if (dorsal > 0) ridge(dorsalA, dorsalB, dorsal, 8);
    if (dorsal2 > 0) ridge(0.66, 0.78, dorsal2, 5, 0.35);
    if (anal > 0) under(0.62, 0.76, anal, 5, 0.3);
  }

  // Paired fins.
  if (pec > 0) {
    const t0 = 0.2;
    const t1 = 0.26;
    for (const sd of [-1, 1]) {
      const bx = wAt(t0) * 0.95;
      const by = -hAt(t0) * 0.25;
      const px = pec * L * Math.sin(pecAngle);
      const pz = pec * L * Math.cos(pecAngle);
      b.poly(
        [
          [sd * bx, by + hAt(t0) * 0.1, zAt(t0)],
          [sd * (bx + px), by - pec * L * 0.32, zAt(t0) - pz * 0.85],
          [sd * (bx + px * 0.85), by - pec * L * 0.42, zAt(t1) - pz],
          [sd * bx, by - hAt(t1) * 0.15, zAt(t1)],
        ],
        (i) => finCol(i > 0 ? 1 : 0),
        [0, 1, 0],
      );
    }
  }
  if (rear === 'pelvic' || pec > 0.05) {
    for (const sd of [-1, 1]) {
      const t0 = 0.36;
      b.poly(
        [
          [sd * wAt(t0) * 0.3, -hAt(t0) * 0.95, zAt(t0)],
          [sd * wAt(t0) * 1.2, -hAt(t0) * 1.5, zAt(t0) - L * 0.06],
          [sd * wAt(t0) * 0.3, -hAt(t0) * 0.95, zAt(t0) - L * 0.07],
        ],
        finCol(0.5),
        [0.15, 0.6, 0],
      );
    }
  }

  // Tail.
  const z0 = zAt(1);
  const tl = tailLen * L;
  const pT = ped * H * L * 0.5;
  const tailAnim = (p: V3): V3 => [wt(0.5 - p[2] / L), 0, 0];
  const tailTri = (p: V3[]): void => b.poly(p, (i) => finCol(i === 0 ? 0 : 1), tailAnim);
  if (tail === 'fork' || tail === 'lunate') {
    const lob = tail === 'lunate' ? 0.55 : 0.85;
    const notch = tail === 'lunate' ? 0.55 : 0.28;
    tailTri([
      [0, pT, z0 + 0.02 * L],
      [0, tl * 0.95, z0 - tl * lob],
      [0, 0, z0 - tl * notch],
    ]);
    tailTri([
      [0, -pT, z0 + 0.02 * L],
      [0, -tl * 0.95, z0 - tl * lob],
      [0, 0, z0 - tl * notch],
    ]);
  } else if (tail === 'hetero') {
    tailTri([
      [0, pT, z0 + 0.02 * L],
      [0, tl * 1.35, z0 - tl * 1.0],
      [0, 0, z0 - tl * 0.3],
    ]);
    tailTri([
      [0, -pT, z0 + 0.02 * L],
      [0, -tl * 0.55, z0 - tl * 0.55],
      [0, 0, z0 - tl * 0.3],
    ]);
    tailTri([
      [0, pT, z0 + 0.02 * L],
      [0, -pT, z0 + 0.02 * L],
      [0, 0, z0 - tl * 0.3],
    ]);
  } else if (tail === 'round') {
    b.poly(
      [
        [0, pT, z0 + 0.02 * L],
        [0, tl * 0.62, z0 - tl * 0.7],
        [0, tl * 0.2, z0 - tl * 1.0],
        [0, -tl * 0.2, z0 - tl * 1.0],
        [0, -tl * 0.62, z0 - tl * 0.7],
        [0, -pT, z0 + 0.02 * L],
      ],
      (i) => finCol(i > 0 && i < 5 ? 1 : 0),
      tailAnim,
    );
  } else if (tail === 'fluke') {
    // Horizontal flukes: two swept lobes with a notch.
    const span = tl;
    for (const sd of [-1, 1]) {
      b.poly(
        [
          [0, 0, z0 + 0.03 * L],
          [sd * span * 0.55, 0.01 * L, z0 - span * 0.2],
          [sd * span, 0.0, z0 - span * 0.5],
          [sd * span * 0.55, 0, z0 - span * 0.42],
          [0, 0, z0 - span * 0.16],
        ],
        (i) => finCol(i > 1 ? 1 : 0.2),
        tailAnim,
      );
    }
  } else if (tail === 'seal') {
    for (const sd of [-1, 1]) {
      b.poly(
        [
          [sd * wAt(0.9) * 0.6, 0, z0 + 0.03 * L],
          [sd * tl * 0.55, 0.01 * L, z0 - tl * 0.6],
          [sd * tl * 0.12, 0, z0 - tl * 0.75],
        ],
        (i) => finCol(i === 0 ? 0.2 : 1),
        tailAnim,
      );
    }
  } else {
    // 'taper': the body runs to a point; the median fringe carries the tail.
    tailTri([
      [0, pT, z0 + 0.02 * L],
      [0, 0, z0 - tl],
      [0, -pT, z0 + 0.02 * L],
    ]);
  }
  return b.toGeometry();
}
