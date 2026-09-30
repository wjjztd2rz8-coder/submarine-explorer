/**
 * Small swimmers and bottom crawlers: vent shrimp, hadal amphipods, sea
 * stars and brittle stars, sea cucumbers and squat lobsters. Model space:
 * forward +Z, up +Y, the animal's feet at y = 0.
 */

import type * as THREE from 'three';
import { Builder, mixRgb, scaleRgb, smooth, type RGB, type V3 } from './kit.js';
import { col, num, str, type Look } from './look.js';

/** A thin bent limb from `a` to `c` through a raised knee. */
function limb(
  b: Builder,
  a: V3,
  knee: V3,
  c: V3,
  r: number,
  colr: RGB,
  anim: V3,
  rings = 6,
  sides = 4,
): void {
  b.sweep({
    path: [a, knee, c],
    rings,
    sides,
    radius: (t) => r * (1 - 0.6 * t) + r * 0.15,
    color: (t) => scaleRgb(colr, 0.9 + 0.2 * t),
    anim: (t) => [anim[0] * (0.4 + 0.6 * t), anim[1], anim[2]],
  });
}

export function buildShrimp(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const L = size;
  const kind = str(look, 'kind', 'shrimp');
  const cBody = col(look, 'cBody', 0xf0e2d2);
  const cDark = col(look, 'cDark', 0xc9a48c);
  const b = new Builder();
  const rings = [8, 12, 16][detail]!;
  const sides = [5, 7, 9][detail]!;
  if (kind === 'amphipod') {
    // A laterally compressed, segmented comma.
    const path: V3[] = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      path.push([0, L * (0.02 + 0.16 * Math.sin(Math.PI * u * 0.9)), L * (0.5 - u)]);
    }
    b.sweep({
      path,
      rings: rings + 4,
      sides,
      radius: (t) => {
        const seg = 1 + 0.1 * Math.sin(t * 7 * Math.PI * 2 * 0.5);
        const prof = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.03)), 0.6);
        return [L * 0.055 * prof * seg, L * 0.11 * prof * seg];
      },
      color: (t, s) => mixRgb(cBody, cDark, smooth(0.2, 1, s) * 0.3 + 0.1 * Math.sin(t * 40)),
      anim: (t) => [smooth(0.15, 1, t), 0, 0],
      caps: true,
    });
    for (const sd of [-1, 1]) {
      // Antennae and limbs.
      limb(
        b,
        [sd * L * 0.03, L * 0.12, L * 0.46],
        [sd * L * 0.14, L * 0.2, L * 0.62],
        [sd * L * 0.26, L * 0.12, L * 0.85],
        L * 0.008,
        cBody,
        [0.3, 0.6, 0],
      );
      for (let i = 0; i < 5; i++) {
        const z = L * (0.34 - i * 0.13);
        limb(
          b,
          [sd * L * 0.04, L * 0.05, z],
          [sd * L * 0.11, L * 0.0, z - L * 0.03],
          [sd * L * 0.09, -L * 0.07, z - L * 0.07],
          L * 0.01,
          cBody,
          [0.4, 0.5, 0],
        );
      }
    }
    b.ellipsoid(
      [0, L * 0.12, L * 0.46],
      [L * 0.05, L * 0.04, L * 0.04],
      5,
      4,
      [0.03, 0.02, 0.02],
      [0, 0, 0],
    );
    return b.toGeometry();
  }
  // Shrimp: domed carapace, curled abdomen, tail fan, antennae and thoracic legs.
  const path: V3[] = [];
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    path.push([0, L * (0.1 - 0.16 * Math.pow(Math.max(0, u - 0.4), 1.6)), L * (0.5 - u * 0.95)]);
  }
  b.sweep({
    path,
    rings: rings + 4,
    sides,
    radius: (t) => {
      const carapace = t < 0.42 ? 1 : 1 - 0.55 * smooth(0.42, 1, t);
      const seg = t > 0.42 ? 1 + 0.08 * Math.sin((t - 0.42) * 46) : 1;
      const prof = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.02)), 0.55);
      return [L * 0.085 * carapace * prof * seg, L * 0.075 * carapace * prof * seg];
    },
    color: (t, s) => mixRgb(cBody, cDark, smooth(0.1, 0.9, s) * 0.45 * (t < 0.42 ? 1.0 : 0.4)),
    anim: (t) => [smooth(0.38, 1, t), 0, 0],
    caps: true,
  });
  const tz = L * (0.5 - 0.95);
  for (const sd of [-1, 1]) {
    b.poly(
      [
        [sd * L * 0.01, 0.0, tz + L * 0.02],
        [sd * L * 0.1, -L * 0.005, tz - L * 0.09],
        [sd * L * 0.02, 0.0, tz - L * 0.11],
      ],
      mixRgb(cBody, cDark, 0.3),
      [1, 0, 0],
    );
    limb(
      b,
      [sd * L * 0.03, L * 0.1, L * 0.5],
      [sd * L * 0.12, L * 0.16, L * 0.72],
      [sd * L * 0.3, L * 0.1, L * 0.98],
      L * 0.006,
      cBody,
      [0.3, 0.6, 0],
    );
    for (let i = 0; i < 4; i++) {
      const z = L * (0.32 - i * 0.09);
      limb(
        b,
        [sd * L * 0.05, L * 0.02, z],
        [sd * L * 0.12, -L * 0.02, z + L * 0.02],
        [sd * L * 0.11, -L * 0.1, z - L * 0.03],
        L * 0.008,
        cBody,
        [0.4, 0.5, 0],
      );
    }
  }
  b.poly(
    [
      [0, 0, tz + L * 0.02],
      [0, 0.005, tz - L * 0.12],
      [0, -0.005, tz - L * 0.02],
    ],
    cDark,
    [1, 0, 0],
  );
  return b.toGeometry();
}

export function buildStar(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const span = size;
  const n = Math.round(num(look, 'arms', 5));
  const discR = num(look, 'disc', 0.14) * span;
  const armW = num(look, 'armW', 0.04) * span;
  const flat = num(look, 'flat', 0.5);
  const raised = num(look, 'raised', 0);
  const serp = num(look, 'serp', 0);
  const cA = col(look, 'cA', 0xc9b79a);
  const cB = col(look, 'cB', 0x8c7a62);
  const bands = num(look, 'bands', 0);
  const b = new Builder();
  const h = Math.max(armW * flat, discR * 0.35);
  b.ellipsoid(
    [0, h, 0],
    [discR, h * 0.9, discR],
    [8, 12, 16][detail]!,
    6,
    (_t, _s, _c, p) => mixRgb(cA, cB, 0.35 + 0.25 * Math.sin(Math.atan2(p[2], p[0]) * n)),
    [0, 0, 0],
  );
  const rings = [7, 11, 16][detail]!;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const px = -dz;
    const pz = dx;
    const path: V3[] = [];
    const steps = 6;
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const rr = discR * 0.5 + (span * 0.5 - discR * 0.5) * u;
      const wig = serp * Math.sin(u * 9 + i * 1.7) * span * 0.04 * u;
      const up = raised * Math.sin(u * 1.4) * span * 0.35;
      const curl = raised > 0 ? -raised * span * 0.06 * u * u : 0;
      path.push([
        dx * rr + px * wig + dx * curl,
        h * (1 - 0.3 * u) + up,
        dz * rr + pz * wig + dz * curl,
      ]);
    }
    b.sweep({
      path,
      rings,
      sides: [4, 6, 8][detail]!,
      up: [0, 1, 0],
      radius: (t) => [armW * (1 - 0.88 * t) + 0.0008, armW * flat * (1 - 0.85 * t) + 0.0006],
      color: (t, s) => {
        const band = bands > 0 ? 0.5 + 0.5 * Math.sin(t * bands * Math.PI * 2) : 0.5;
        return mixRgb(mixRgb(cA, cB, band * 0.6), cA, smooth(-0.4, 0.6, -s) * 0.4);
      },
      anim: (t) => [t * t, (i % 3) / 3, 0],
      caps: true,
    });
  }
  return b.toGeometry();
}

export function buildCucumber(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const L = size;
  const W = num(look, 'W', 0.17) * L;
  const Ht = num(look, 'Hh', 0.12) * L;
  const cD = col(look, 'cD', 0x8b6a8a);
  const cB = col(look, 'cB', 0xc4a8be);
  const sail = num(look, 'sail', 0);
  const papillae = Math.round(num(look, 'papillae', 10) * [0.4, 0.7, 1][detail]!);
  const b = new Builder();
  const path: V3[] = [];
  for (let k = 0; k <= 6; k++) {
    const u = k / 6;
    path.push([Math.sin(u * 3) * L * 0.03, Ht, L * (0.5 - u)]);
  }
  b.sweep({
    path,
    rings: [10, 14, 20][detail]!,
    sides: [7, 10, 14][detail]!,
    radius: (t, ang) => {
      const prof = Math.pow(Math.sin(Math.PI * (0.03 + 0.94 * t)), 0.55);
      const belly = Math.sin(ang) < 0 ? 0.55 : 1;
      return [W * prof, Ht * prof * belly];
    },
    color: (_t, s) => mixRgb(cB, cD, smooth(-0.4, 0.7, s)),
    anim: (t) => [Math.sin(Math.PI * t), 0, 0],
    caps: true,
  });
  // Papillae along the back and flanks.
  for (let i = 0; i < papillae; i++) {
    const t = 0.12 + (0.76 * i) / Math.max(1, papillae - 1);
    const side = i % 2 ? 1 : -1;
    const z = L * (0.5 - t);
    const prof = Math.pow(Math.sin(Math.PI * (0.03 + 0.94 * t)), 0.55);
    b.sweep({
      path: [
        [side * W * prof * 0.55, Ht * (1 + prof * 0.75), z],
        [side * W * prof * 0.6, Ht * (1.0 + prof * 0.75) + L * 0.05, z - L * 0.012],
      ],
      rings: 3,
      sides: 4,
      radius: (u) => L * 0.014 * (1 - 0.8 * u) + 1e-4,
      color: mixRgb(cD, cB, 0.4),
      anim: [Math.sin(Math.PI * t), 0, 0],
    });
  }
  if (sail > 0) {
    // A tall, tapering dorsal sail (Psychropotes).
    const top: V3[] = [];
    const base: V3[] = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      const t = 0.5 + u * 0.46;
      base.push([0, Ht * 1.55, L * (0.5 - t)]);
      top.push([
        0,
        Ht * 1.55 + sail * L * Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.02)) * (1 - 0.15 * u),
        L * (0.5 - t) - sail * L * 0.4 * u,
      ]);
    }
    b.strip(base, top, (_u, v) => mixRgb(cD, cB, v * 0.6), [0.4, 0, 0]);
  }
  // Feeding tentacles at the front.
  const nt = [4, 7, 10][detail]!;
  for (let i = 0; i < nt; i++) {
    const a = (i / nt) * Math.PI * 2;
    b.sweep({
      path: [
        [Math.cos(a) * W * 0.3, Ht * 0.9 + Math.sin(a) * Ht * 0.3, L * 0.5],
        [Math.cos(a) * W * 0.55, Ht * 0.7 + Math.sin(a) * Ht * 0.4, L * 0.58],
      ],
      rings: 3,
      sides: 4,
      radius: (u) => L * 0.02 * (1 - 0.5 * u) + 1e-4,
      color: mixRgb(cB, [1, 1, 1], 0.15),
      anim: [0.2, 0, 0],
    });
  }
  return b.toGeometry();
}

export function buildSquatLobster(
  look: Look,
  size: number,
  detail: 0 | 1 | 2,
): THREE.BufferGeometry {
  const L = size;
  const cA = col(look, 'cA', 0xf1ece2);
  const cB = col(look, 'cB', 0xd6a98a);
  const b = new Builder();
  const sides = [6, 8, 10][detail]!;
  const rings = [6, 8, 10][detail]!;
  // Carapace.
  b.ellipsoid(
    [0, L * 0.13, L * 0.12],
    [L * 0.14, L * 0.1, L * 0.27],
    sides + 2,
    rings,
    (t, s) => mixRgb(cA, cB, smooth(0.1, 0.9, s) * 0.35 + 0.1 * Math.sin(t * 20)),
    [0, 0, 0],
  );
  // Rostrum.
  b.sweep({
    path: [
      [0, L * 0.16, L * 0.36],
      [0, L * 0.18, L * 0.52],
    ],
    rings: 3,
    sides: 4,
    radius: (t) => L * 0.02 * (1 - t) + 1e-4,
    color: cA,
    anim: [0, 0, 0],
  });
  // Abdomen tucked under, with a tail fan.
  b.ellipsoid(
    [0, L * 0.075, -L * 0.2],
    [L * 0.09, L * 0.06, L * 0.12],
    sides,
    5,
    mixRgb(cA, cB, 0.3),
    [0, 0, 0],
  );
  b.poly(
    [
      [0, L * 0.02, -L * 0.3],
      [L * 0.07, 0.003, -L * 0.42],
      [-L * 0.07, 0.003, -L * 0.42],
    ],
    mixRgb(cA, cB, 0.45),
    [0, 0, 0],
  );
  for (const sd of [-1, 1]) {
    // Long slender chelipeds (claws).
    b.sweep({
      path: [
        [sd * L * 0.12, L * 0.12, L * 0.3],
        [sd * L * 0.2, L * 0.13, L * 0.62],
        [sd * L * 0.22, L * 0.1, L * 0.98],
      ],
      rings: 9,
      sides: 5,
      radius: (t) => L * 0.028 * (1 - 0.35 * t) + L * 0.006,
      color: (t) => mixRgb(cA, cB, smooth(0.5, 1, t) * 0.5),
      anim: (t) => [0.25 * t, 0.15, 0],
    });
    b.ellipsoid(
      [sd * L * 0.22, L * 0.1, L * 1.03],
      [L * 0.028, L * 0.02, L * 0.07],
      6,
      5,
      mixRgb(cA, cB, 0.5),
      [0.2, 0.15, 0],
    );
    // Eyes and antennae.
    b.ellipsoid(
      [sd * L * 0.06, L * 0.2, L * 0.4],
      [L * 0.02, L * 0.02, L * 0.02],
      5,
      4,
      [0.03, 0.02, 0.02],
      [0, 0, 0],
    );
    limb(
      b,
      [sd * L * 0.04, L * 0.15, L * 0.4],
      [sd * L * 0.14, L * 0.24, L * 0.62],
      [sd * L * 0.34, L * 0.16, L * 0.9],
      L * 0.006,
      cA,
      [0.05, 0.4, 0],
      6,
      3,
    );
    // Four pairs of walking legs, alternate gait.
    for (let i = 0; i < 4; i++) {
      const z = L * (0.22 - i * 0.1);
      const ph = ((i + (sd > 0 ? 0 : 1)) % 2) * 0.5;
      limb(
        b,
        [sd * L * 0.11, L * 0.1, z],
        [sd * L * 0.26, L * 0.2, z - L * 0.02],
        [sd * L * 0.34, 0.0, z - L * 0.07],
        L * 0.014,
        cA,
        [1, ph, 0],
        7,
        4,
      );
    }
  }
  return b.toGeometry();
}
