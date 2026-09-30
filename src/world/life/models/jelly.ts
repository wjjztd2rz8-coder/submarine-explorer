/**
 * Gelatinous animals: medusae (bell, oral arms, tentacles), ctenophores
 * (egg body with eight comb rows that shimmer) and the siphonophore chain.
 * Model space: bell apex up, margin at y = 0, tentacles hang toward -Y.
 */

import type * as THREE from 'three';
import {
  Builder,
  clamp,
  curvePoint,
  lerp,
  mixRgb,
  rgb,
  scaleRgb,
  smooth,
  type RGB,
  type V3,
} from './kit.js';
import { col, num, type Look } from './look.js';

/** Hue 0..1 to a linear RGB (comb-row iridescence). */
function hue(h: number, s = 0.75, v = 1): RGB {
  const f = (n: number): number => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const c = rgb(0x000000);
  // Convert sRGB-ish hsv to the linear space the vertex colours use.
  const lin = (x: number): number => Math.pow(clamp(x), 2.2);
  c[0] = lin(f(5));
  c[1] = lin(f(3));
  c[2] = lin(f(1));
  return c;
}

export function buildMedusa(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const R = size / 2;
  const H = num(look, 'H', 0.7) * R;
  const cBell = col(look, 'cBell', 0xc7d9e6);
  const cRim = col(look, 'cRim', 0xa9c2d6);
  const cCanal = col(look, 'cCanal', 0x8fa8be);
  const cGonad = col(look, 'cGonad', 0xd98a6b);
  const cArm = col(look, 'cArm', 0xd9c3b3);
  const cTent = col(look, 'cTent', 0xd9d2cc);
  const canals = num(look, 'canals', 8);
  const lobes = num(look, 'lobes', 16);
  const arms = num(look, 'arms', 4);
  const armLen = num(look, 'armLen', 1.1) * R;
  const tentN = Math.round(num(look, 'tent', 16) * [0.45, 0.75, 1][detail]!);
  const tentLen = num(look, 'tentLen', 1.8) * R;
  const glowRim = num(look, 'glowRim', 0);
  const gonadRing = num(look, 'gonad', 1);
  const sides = [12, 18, 28][detail]!;
  const rings = [7, 10, 14][detail]!;
  const b = new Builder();

  // Bell.
  const bellPath: V3[] = [];
  for (let k = 0; k < rings; k++) {
    const th = (Math.PI / 2) * (k / (rings - 1));
    bellPath.push([0, H * Math.cos(th) * 0.98, 0]);
  }
  const rProf = (t: number): number =>
    R * Math.sin((Math.PI / 2) * t) * (1 + 0.05 * Math.sin(Math.PI * t));
  b.sweep({
    path: bellPath,
    rings,
    sides,
    up: [0, 0, 1],
    radius: (t, ang) => {
      const lob = t > 0.93 ? 0.05 * Math.cos(ang * lobes) : 0;
      return rProf(t) * (1 + lob);
    },
    color: (t, _s, _c, p) => {
      const ang = Math.atan2(p[2], p[0]);
      const can = Math.pow(Math.abs(Math.cos((ang * canals) / 2)), 40) * smooth(0.15, 0.6, t);
      let c = mixRgb(cBell, cRim, smooth(0.65, 1, t));
      c = mixRgb(c, cCanal, can * 0.75);
      return scaleRgb(c, 0.94 + 0.12 * Math.sin(ang * 3 + t * 5));
    },
    anim: (t) => [Math.pow(t, 1.25), 0, t > 0.9 ? glowRim : 0],
  });
  // Subumbrella / gonad ring seen through the bell.
  if (gonadRing > 0) {
    const gp: V3[] = [];
    for (let k = 0; k < 6; k++) gp.push([0, H * 0.75 * Math.cos((Math.PI / 2) * (k / 5)), 0]);
    b.sweep({
      path: gp,
      rings: 6,
      sides: Math.max(8, sides / 2),
      up: [0, 0, 1],
      radius: (t) => R * 0.62 * Math.sin((Math.PI / 2) * t) + 1e-4,
      color: (t) => mixRgb(cBell, cGonad, smooth(0.3, 0.8, t)),
      anim: (t) => [Math.pow(t, 1.2) * 0.8, 0, 0.35 * glowRim],
    });
  }
  // Oral arms.
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + 0.4;
    const path: V3[] = [];
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      path.push([
        Math.cos(a) * R * 0.14 * (1 + u * 1.2) + Math.sin(u * 5 + i) * R * 0.04,
        H * 0.1 - u * armLen,
        Math.sin(a) * R * 0.14 * (1 + u * 1.2) + Math.cos(u * 4 + i) * R * 0.04,
      ]);
    }
    b.sweep({
      path,
      rings: [6, 9, 12][detail]!,
      sides: 5,
      radius: (t) => R * 0.085 * (0.55 + 0.45 * Math.abs(Math.sin(t * 14 + i))) * (1 - 0.5 * t),
      color: (t) => scaleRgb(cArm, 0.85 + 0.25 * t),
      anim: (t) => [0.15, Math.min(1, t * 1.2), 0],
      caps: true,
    });
  }
  // Marginal tentacles.
  for (let i = 0; i < tentN; i++) {
    const a = (i / tentN) * Math.PI * 2;
    const len = tentLen * (0.75 + 0.5 * Math.abs(Math.sin(i * 2.3)));
    const path: V3[] = [];
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      path.push([
        Math.cos(a) * R * (0.98 - 0.05 * u) + Math.sin(u * 5 + i) * len * 0.05 * u,
        -len * u,
        Math.sin(a) * R * (0.98 - 0.05 * u) + Math.cos(u * 4 + i * 1.7) * len * 0.05 * u,
      ]);
    }
    b.sweep({
      path,
      rings: [5, 7, 10][detail]!,
      sides: 3,
      radius: (t) => R * 0.018 * (1 - 0.75 * t) + 1e-4,
      color: (t) => scaleRgb(cTent, 0.9 + 0.3 * (1 - t)),
      anim: (t) => [0.05, Math.max(0.1, t), glowRim * t * t],
    });
  }
  return b.toGeometry();
}

export function buildComb(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const H = size / 2;
  const R = H * num(look, 'W', 0.62);
  const cBody = col(look, 'cBody', 0xcfe6f0);
  const sides = [16, 24, 32][detail]!;
  const rings = [8, 12, 16][detail]!;
  const b = new Builder();
  const path: V3[] = [];
  for (let k = 0; k < rings; k++) path.push([0, -Math.cos((Math.PI * k) / (rings - 1)) * H, 0]);
  b.sweep({
    path,
    rings,
    sides,
    up: [0, 0, 1],
    radius: (t, ang) => {
      const bulge = 1 + 0.045 * Math.pow(Math.abs(Math.cos(4 * ang)), 6);
      return [
        Math.pow(Math.sin(Math.PI * t), 0.85) * R * bulge,
        Math.pow(Math.sin(Math.PI * t), 0.85) * R * bulge * 0.92,
      ];
    },
    color: (t, _s, _c, p) => {
      const ang = Math.atan2(p[2], p[0]);
      const row =
        Math.pow(Math.abs(Math.cos(4 * ang)), 16) *
        smooth(0.12, 0.3, t) *
        (1 - smooth(0.72, 0.9, t));
      const irid = hue(0.55 + 0.5 * t + 0.1 * Math.sin(ang * 8));
      return mixRgb(cBody, irid, row);
    },
    anim: (t, _s, _c, p) => {
      const ang = Math.atan2(p[2], p[0]);
      const row =
        Math.pow(Math.abs(Math.cos(4 * ang)), 16) *
        smooth(0.12, 0.3, t) *
        (1 - smooth(0.72, 0.9, t));
      return [0, t, row];
    },
  });
  // Two oral lobes and two trailing tentacles.
  for (const sd of [-1, 1]) {
    b.ellipsoid(
      [sd * R * 0.45, -H * 0.85, 0],
      [R * 0.34, H * 0.42, R * 0.5],
      10,
      6,
      mixRgb(cBody, [1, 1, 1], 0.2),
      [0, 0.6, 0],
    );
    const path: V3[] = [];
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      path.push([sd * R * (0.7 + 0.15 * Math.sin(u * 4)), -H * (0.9 + 1.6 * u), 0]);
    }
    b.sweep({
      path,
      rings: 7,
      sides: 3,
      radius: (t) => R * 0.03 * (1 - 0.7 * t) + 1e-4,
      color: mixRgb(cBody, [1, 1, 1], 0.5),
      anim: (t) => [0, t, 0],
    });
  }
  return b.toGeometry();
}

export function buildSiphonophore(
  look: Look,
  size: number,
  detail: 0 | 1 | 2,
): THREE.BufferGeometry {
  const L = size;
  const cNect = col(look, 'cNect', 0xd9ecf2);
  const cEdge = col(look, 'cEdge', 0xff9a6b);
  const cZooid = col(look, 'cZooid', 0xff6f3c);
  const cFloat = col(look, 'cFloat', 0xffc2a8);
  const pairs = [5, 8, 11][detail]!;
  const zooids = [6, 10, 16][detail]!;
  const b = new Builder();
  // Sinuous stem hanging from the float at +Y.
  const stem: V3[] = [];
  const N = 12;
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    stem.push([Math.sin(u * 9) * L * 0.06 * u, L * (0.5 - u), Math.cos(u * 7.5) * L * 0.06 * u]);
  }
  const at = (u: number): V3 => curvePoint(stem, u);
  b.sweep({
    path: stem,
    rings: [14, 24, 36][detail]!,
    sides: 4,
    radius: (t) => L * 0.006 * (1 + 0.5 * t) + 1e-4,
    color: (t) => mixRgb(cEdge, cNect, 1 - t),
    anim: (t) => [t, 0, 0],
  });
  // Gas float.
  {
    const p = at(0);
    b.ellipsoid(
      [p[0], p[1] + L * 0.012, p[2]],
      [L * 0.02, L * 0.04, L * 0.02],
      8,
      6,
      cFloat,
      [0, 0, 0],
    );
  }
  // Swimming bells (nectophores) in two rows.
  for (let i = 0; i < pairs; i++) {
    const u = 0.05 + (i / pairs) * 0.3;
    const p = at(u);
    for (const sd of [-1, 1]) {
      const cx = p[0] + sd * L * 0.022;
      b.ellipsoid(
        [cx, p[1] - L * 0.012, p[2] + (i % 2 ? L * 0.006 : -L * 0.006)],
        [L * 0.017, L * 0.03, L * 0.017],
        7,
        5,
        (t) => mixRgb(cNect, cEdge, smooth(0.65, 1, t) * 0.7),
        [u, 1, 0],
      );
    }
  }
  // Feeding polyps and bracts, with a few trailing tentacles.
  for (let i = 0; i < zooids; i++) {
    const u = 0.38 + (i / zooids) * 0.6;
    const p = at(u);
    const a = i * 2.4;
    const off: V3 = [p[0] + Math.cos(a) * L * 0.014, p[1], p[2] + Math.sin(a) * L * 0.014];
    b.ellipsoid(off, [L * 0.011, L * 0.02, L * 0.011], 6, 5, cZooid, [u, 0.4, 0]);
    b.ellipsoid(
      [p[0] - Math.cos(a) * L * 0.012, p[1] + L * 0.01, p[2] - Math.sin(a) * L * 0.012],
      [L * 0.008, L * 0.016, L * 0.008],
      5,
      4,
      mixRgb(cNect, [1, 1, 1], 0.3),
      [u, 0.3, 0],
    );
    if (i % 3 === 0) {
      const path: V3[] = [];
      for (let k = 0; k <= 3; k++) {
        const w = k / 3;
        path.push([
          off[0] + Math.sin(w * 6 + i) * L * 0.02,
          off[1] - L * 0.16 * w,
          off[2] + Math.cos(w * 5 + i) * L * 0.02,
        ]);
      }
      b.sweep({
        path,
        rings: [4, 6, 9][detail]!,
        sides: 3,
        radius: () => L * 0.0022,
        color: (t) => mixRgb(cZooid, cNect, t),
        anim: [lerp(u, 1, 0.3), 1, 0],
      });
    }
  }
  return b.toGeometry();
}
