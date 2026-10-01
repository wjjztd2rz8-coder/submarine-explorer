/**
 * Cephalopods: the dumbo octopus (ears and a webbed umbrella), the vampire
 * squid (a dark cloak with glowing arm tips and fin-base photophores) and a
 * squid with a long mantle, rhomboid fins and two feeding tentacles.
 * Model space: forward +Z, dorsal +Y; the cloak and arms trail to -Z.
 */

import type * as THREE from 'three';
import { Builder, mixRgb, scaleRgb, smooth, type V3 } from './kit.js';
import { col, num, type Look } from './look.js';

export function buildOctopus(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const L = size;
  const cBody = col(look, 'cBody', 0xe9c8c2);
  const cWeb = col(look, 'cWeb', 0xf1d6d0);
  const cEye = col(look, 'cEye', 0x1a1416);
  const ears = num(look, 'ears', 1);
  const warts = num(look, 'warts', 0);
  const armLen = num(look, 'armLen', 0.55) * L;
  const b = new Builder();
  const sides = [10, 14, 20][detail]!;
  // Mantle and head: one soft ovoid, mantle trailing behind.
  const mp: V3[] = [];
  const rings = [8, 12, 16][detail]!;
  for (let k = 0; k < rings; k++)
    mp.push([
      0,
      L * 0.04 + L * 0.02 * Math.sin((k / (rings - 1)) * 3),
      L * (0.3 - 0.6 * (k / (rings - 1))),
    ]);
  b.sweep({
    path: mp,
    rings,
    sides,
    radius: (t, ang) => {
      const prof = Math.pow(Math.sin(Math.PI * (0.06 + 0.9 * t)), 0.7);
      const wart = warts > 0 ? 1 + 0.05 * Math.sin(ang * 11 + t * 40) * Math.sin(t * 33) : 1;
      return [L * 0.17 * prof * wart, L * 0.15 * prof * wart];
    },
    color: (t, s) => scaleRgb(mixRgb(cBody, cWeb, smooth(0, 1, -s) * 0.4), 0.9 + 0.15 * t),
    anim: (t) => [0.1 * t, 0, 0],
    caps: true,
  });
  // Eyes.
  for (const sd of [-1, 1])
    b.ellipsoid(
      [sd * L * 0.13, L * 0.09, L * 0.22],
      [L * 0.03, L * 0.04, L * 0.04],
      6,
      5,
      cEye,
      [0, 0, 0],
    );
  // Ears (fins): large, rounded, flapping.
  if (ears > 0) {
    for (const sd of [-1, 1]) {
      const pts: V3[] = [];
      const m = 7;
      for (let k = 0; k <= m; k++) {
        const a = -0.9 + (k / m) * 1.8;
        pts.push([
          sd * (L * 0.15 + L * 0.2 * Math.cos(a * 0.9) * (0.5 + 0.5 * Math.cos(a))),
          L * 0.11 + L * 0.11 * Math.sin(a),
          L * 0.12 - L * 0.06 * Math.cos(a) + L * 0.02,
        ]);
      }
      b.poly(
        [[sd * L * 0.14, L * 0.1, L * 0.1], ...pts],
        (i) => mixRgb(cBody, cWeb, i > 0 ? 0.6 : 0),
        [0, 1, 0],
      );
    }
  }
  // Eight arms trailing back and down with a web between them.
  const arms: V3[][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const path: V3[] = [];
    for (let k = 0; k <= 5; k++) {
      const u = k / 5;
      const flare = 0.12 + 0.28 * u;
      path.push([
        dx * armLen * flare * 1.1,
        L * 0.02 + dy * armLen * flare * 0.7 - armLen * 0.35 * u * u,
        L * 0.2 - armLen * (0.1 + 0.9 * u),
      ]);
    }
    arms.push(path);
    b.sweep({
      path,
      rings: [6, 8, 11][detail]!,
      sides: 4,
      radius: (t) => L * 0.032 * (1 - 0.8 * t) + L * 0.002,
      color: (t) => mixRgb(cBody, cWeb, t * 0.5),
      anim: (t) => [t * 0.8 + 0.15, 0, 0],
      caps: true,
    });
  }
  // Web membrane between adjacent arms out to ~65% of their length.
  for (let i = 0; i < 8; i++) {
    const a = arms[i]!;
    const c = arms[(i + 1) % 8]!;
    const m = 5;
    const lo: V3[] = [];
    const hi: V3[] = [];
    for (let k = 0; k <= m; k++) {
      const idx = Math.min(5, k);
      lo.push(a[idx]!);
      hi.push(c[idx]!);
    }
    b.strip(
      lo,
      hi,
      (u) => mixRgb(cWeb, cBody, 0.2 + 0.4 * u),
      (u) => [Math.min(1, 0.15 + u * 0.55), 0, 0],
    );
  }
  return b.toGeometry();
}

export function buildVampire(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const L = size;
  const cBody = col(look, 'cBody', 0x3c0d16);
  const cWeb = col(look, 'cWeb', 0x5a1420);
  const cEye = col(look, 'cEye', 0x3d7cf0);
  const b = new Builder();
  const sides = [10, 14, 20][detail]!;
  // Mantle/head ovoid.
  b.ellipsoid(
    [0, 0, L * 0.05],
    [L * 0.16, L * 0.15, L * 0.28],
    sides,
    [7, 9, 12][detail]!,
    (_t, s) => scaleRgb(cBody, 0.85 + 0.3 * smooth(-1, 1, s)),
    [0.05, 0, 0],
  );
  // Huge blue eyes.
  for (const sd of [-1, 1]) {
    b.ellipsoid(
      [sd * L * 0.13, L * 0.06, L * 0.22],
      [L * 0.05, L * 0.055, L * 0.055],
      8,
      6,
      cEye,
      [0, 0, 0.2],
    );
  }
  // Two rounded fins ("ears") with photophores at their bases.
  for (const sd of [-1, 1]) {
    const pts: V3[] = [];
    for (let k = 0; k <= 6; k++) {
      const a = -1 + (k / 6) * 2;
      pts.push([
        sd * (L * 0.15 + L * 0.13 * Math.cos(a * 0.8)),
        L * 0.1 + L * 0.09 * Math.sin(a),
        L * 0.02 - L * 0.05 * Math.cos(a),
      ]);
    }
    b.poly([[sd * L * 0.14, L * 0.1, L * 0.02], ...pts], (i) => (i ? cWeb : cBody), [0, 1, 0]);
    b.ellipsoid(
      [sd * L * 0.15, L * 0.1, L * 0.0],
      [L * 0.014, L * 0.014, L * 0.014],
      5,
      4,
      [0.4, 0.8, 1],
      [0, 0, 1],
    );
  }
  // Cloak: eight arms joined by a deep web, tips glowing.
  const arms: V3[][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const path: V3[] = [];
    for (let k = 0; k <= 5; k++) {
      const u = k / 5;
      const r = L * (0.13 + 0.35 * Math.sin(u * 1.2) * (1 - 0.15 * u));
      path.push([Math.cos(a) * r, Math.sin(a) * r * 0.9 - L * 0.06 * u, -L * 0.02 - L * 0.9 * u]);
    }
    arms.push(path);
    b.sweep({
      path,
      rings: [6, 8, 12][detail]!,
      sides: 4,
      radius: (t) => L * 0.022 * (1 - 0.8 * t) + L * 0.002,
      color: (t) => mixRgb(cBody, cWeb, t),
      anim: (t) => [t * 0.9, 0, t > 0.93 ? 1 : 0],
      caps: true,
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = arms[i]!;
    const c = arms[(i + 1) % 8]!;
    b.strip(
      a,
      c,
      (u) => mixRgb(cWeb, cBody, 0.3 + 0.3 * u),
      (u) => [0.15 + u * 0.7, 0, 0],
    );
  }
  return b.toGeometry();
}

export function buildSquid(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const L = size;
  const cD = col(look, 'cD', 0x9c3e3a);
  const cB = col(look, 'cB', 0xd8a898);
  const cFin = col(look, 'cFin', 0xb9524c);
  const cEye = col(look, 'cEye', 0x0b0d10);
  const glow = num(look, 'glowSpots', 0);
  const b = new Builder();
  const sides = [8, 12, 16][detail]!;
  const rings = [10, 14, 20][detail]!;
  // Mantle: a long cone from the head (+Z) to a pointed tail.
  const mp: V3[] = [];
  for (let k = 0; k < rings; k++) {
    const u = k / (rings - 1);
    mp.push([0, 0, L * (0.02 - 0.5 * u)]);
  }
  b.sweep({
    path: mp,
    rings,
    sides,
    radius: (t) => {
      const prof = t < 0.1 ? 0.75 + 2.5 * t : Math.max(0.02, 1 - 0.85 * smooth(0.05, 1, t));
      return L * 0.075 * prof + 1e-4;
    },
    color: (t, s) => mixRgb(mixRgb(cD, cB, smooth(0.1, -0.7, s)), scaleRgb(cD, 0.8), t * 0.3),
    anim: (t) => [0.05 + 0.5 * t, 0, glow * (t > 0.1 && t < 0.9 ? 0.3 : 0)],
    caps: true,
  });
  // Head with big eyes.
  b.ellipsoid(
    [0, 0, L * 0.06],
    [L * 0.07, L * 0.065, L * 0.06],
    sides,
    6,
    mixRgb(cD, cB, 0.2),
    [0, 0, 0],
  );
  for (const sd of [-1, 1])
    b.ellipsoid(
      [sd * L * 0.08, 0, L * 0.055],
      [L * 0.024, L * 0.05, L * 0.05],
      7,
      6,
      cEye,
      [0, 0, 0],
    );
  // Rhomboid fins at the tail end.
  for (const sd of [-1, 1]) {
    b.poly(
      [
        [sd * L * 0.02, 0, -L * 0.28],
        [sd * L * 0.16, 0, -L * 0.36],
        [sd * L * 0.02, 0, -L * 0.5],
        [sd * L * 0.005, 0, -L * 0.36],
      ],
      (i) => (i === 1 ? cFin : mixRgb(cFin, cD, 0.4)),
      [0, 1, 0],
    );
  }
  // Eight arms and two long feeding tentacles.
  for (let i = 0; i < 10; i++) {
    const long = i >= 8;
    const a = long ? (i === 8 ? -0.5 : 0.5) + Math.PI / 2 : (i / 8) * Math.PI * 2;
    const len = L * (long ? 0.62 : 0.3);
    const path: V3[] = [];
    for (let k = 0; k <= 5; k++) {
      const u = k / 5;
      const spread = L * (0.04 + 0.06 * u) * (long ? 1.2 : 1);
      path.push([
        Math.cos(a) * spread + Math.sin(u * 5 + i) * len * 0.04,
        Math.sin(a) * spread,
        L * 0.09 + len * u,
      ]);
    }
    b.sweep({
      path,
      rings: [6, 8, 12][detail]!,
      sides: 4,
      radius: (t) =>
        L * (long ? 0.0085 : 0.017) * (1 - 0.75 * t) +
        L * 0.0015 +
        (long && t > 0.85 ? L * 0.012 : 0),
      color: (t) => mixRgb(cD, cB, t * 0.5),
      anim: (t) => [0.2 + t * 0.8, 0, 0],
      caps: true,
    });
  }
  return b.toGeometry();
}
