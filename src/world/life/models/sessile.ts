/**
 * Rooted animals: vent tube worms, sea lilies, sea pens, gorgonians,
 * anemones, glass sponges and brain coral. Model space: base at y = 0,
 * growing toward +Y. `aAnim.x` is the sway weight (grows with height).
 */

import type * as THREE from 'three';
import { Builder, hash1, mixRgb, scaleRgb, smooth, type V3 } from './kit.js';
import { col, num, str, type Look } from './look.js';

export function buildTubeworm(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const H = size;
  const cTube = col(look, 'cTube', 0xece6da);
  const cPlume = col(look, 'cPlume', 0xc8141a);
  const cRock = col(look, 'cRock', 0x1f1b19);
  const n = Math.round(num(look, 'tubes', 16) * [0.4, 0.7, 1][detail]!);
  const b = new Builder();
  // A little sulfide mound to root the bush.
  b.ellipsoid(
    [0, 0, 0],
    [H * 0.16, H * 0.06, H * 0.16],
    [7, 10, 14][detail]!,
    4,
    (_t, _s, _c, p) =>
      scaleRgb(cRock, 0.7 + 0.6 * hash1(Math.floor(p[0] * 60) + Math.floor(p[2] * 60) * 7)),
    [0, 0, 0],
  );
  for (let i = 0; i < n; i++) {
    const a = i * 2.399 + 0.3;
    const r0 = H * 0.11 * Math.sqrt((i + 0.5) / n);
    const len = H * (0.45 + 0.55 * hash1(i * 3.7 + 1));
    const lean = H * (0.06 + 0.16 * hash1(i * 5.3));
    const path: V3[] = [];
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      path.push([
        Math.cos(a) * (r0 + lean * u * u) + Math.sin(u * 4 + i) * H * 0.03 * u,
        len * u,
        Math.sin(a) * (r0 + lean * u * u) + Math.cos(u * 3 + i) * H * 0.03 * u,
      ]);
    }
    const tubeR = H * (0.016 + 0.006 * hash1(i * 9.1));
    b.sweep({
      path,
      rings: [6, 9, 12][detail]!,
      sides: [5, 6, 8][detail]!,
      radius: (t) => tubeR * (0.7 + 0.5 * t),
      color: (t) => scaleRgb(cTube, 0.82 + 0.2 * Math.sin(t * 60 + i) * 0.5 + 0.18 * t),
      anim: (t) => [t * (len / H) * 1.6, 0, 0],
      caps: true,
    });
    // Red gill plume: a feathery cluster of filaments at the tip.
    const tip = path[4]!;
    const nf = [3, 5, 7][detail]!;
    for (let f = 0; f < nf; f++) {
      const fa = (f / nf) * Math.PI * 2 + i;
      const fl = H * (0.09 + 0.06 * hash1(i + f * 2.1));
      b.sweep({
        path: [
          tip,
          [
            tip[0] + Math.cos(fa) * fl * 0.45,
            tip[1] + fl * 0.75,
            tip[2] + Math.sin(fa) * fl * 0.45,
          ],
          [tip[0] + Math.cos(fa) * fl * 0.9, tip[1] + fl * 1.1, tip[2] + Math.sin(fa) * fl * 0.9],
        ],
        rings: 4,
        sides: 3,
        radius: (t) => H * 0.011 * (1 - 0.7 * t) + 1e-4,
        color: (t) => mixRgb(cPlume, [0.9, 0.2, 0.15], t * 0.3),
        anim: (t) => [Math.min(1, (len / H) * 1.6 + t * 0.35), 0, 0],
      });
    }
  }
  return b.toGeometry();
}

export function buildCrinoid(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const H = size;
  const cStalk = col(look, 'cStalk', 0xe6d27a);
  const cArm = col(look, 'cArm', 0xf0dc74);
  const arms = Math.round(num(look, 'arms', 10));
  const stalkFrac = num(look, 'stalk', 0.55);
  const b = new Builder();
  const top: V3 = [0.02 * H, H * stalkFrac, 0];
  b.sweep({
    path: [[0, 0, 0], [0.03 * H, H * stalkFrac * 0.5, 0.01 * H], top],
    rings: [6, 9, 12][detail]!,
    sides: [5, 6, 8][detail]!,
    radius: (t) => H * 0.012 * (1 - 0.3 * t) + 1e-4,
    color: (t) => scaleRgb(cStalk, 0.85 + 0.15 * Math.sin(t * 50)),
    anim: (t) => [t * stalkFrac * 1.4, 0, 0],
    caps: true,
  });
  b.ellipsoid([top[0], top[1] + H * 0.02, top[2]], [H * 0.03, H * 0.035, H * 0.03], 6, 5, cArm, [
    stalkFrac * 1.4,
    0,
    0,
  ]);
  const crown = H * (1 - stalkFrac);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2;
    const path: V3[] = [];
    for (let k = 0; k <= 5; k++) {
      const u = k / 5;
      const out = crown * 0.62 * Math.sin(u * 1.35);
      path.push([
        top[0] + Math.cos(a) * out,
        top[1] + crown * (0.15 + 0.78 * u - 0.32 * u * u),
        top[2] + Math.sin(a) * out,
      ]);
    }
    const w = [stalkFrac * 1.4 + 0.1, 1];
    b.sweep({
      path,
      rings: [7, 10, 14][detail]!,
      sides: 3,
      radius: (t) => H * 0.008 * (1 - 0.7 * t) + 1e-4,
      color: (t) => scaleRgb(cArm, 0.85 + 0.25 * t),
      anim: (t) => [Math.min(1, w[0]! + t * 0.4), 0, 0],
    });
    if (detail > 0) {
      // Feathery pinnules along both edges.
      const np = detail === 1 ? 6 : 10;
      for (let p = 1; p <= np; p++) {
        const u = p / (np + 1);
        const c = path[Math.min(5, Math.floor(u * 5))]!;
        const c2 = path[Math.min(5, Math.floor(u * 5) + 1)]!;
        const f = u * 5 - Math.floor(u * 5);
        const px = c[0] + (c2[0] - c[0]) * f;
        const py = c[1] + (c2[1] - c[1]) * f;
        const pz = c[2] + (c2[2] - c[2]) * f;
        const len = crown * 0.11 * (1 - 0.55 * u);
        for (const sd of [-1, 1]) {
          const nx = -Math.sin(a) * sd;
          const nz = Math.cos(a) * sd;
          b.poly(
            [
              [px, py, pz],
              [px + nx * len, py + len * 0.35, pz + nz * len],
              [px + nx * len * 0.3, py + len * 0.1, pz + nz * len * 0.3],
            ],
            scaleRgb(cArm, 0.9),
            [Math.min(1, stalkFrac * 1.4 + 0.1 + u * 0.4), 0, 0],
          );
        }
      }
    }
  }
  return b.toGeometry();
}

export function buildSeaPen(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const H = size;
  const cStalk = col(look, 'cStalk', 0xe9c7c4);
  const cPolyp = col(look, 'cPolyp', 0xf2a6a8);
  const b = new Builder();
  const stalkTop: V3 = [H * 0.05, H * 0.8, 0];
  b.sweep({
    path: [[0, -H * 0.03, 0], [H * 0.02, H * 0.4, H * 0.01], stalkTop],
    rings: [8, 12, 16][detail]!,
    sides: [5, 6, 8][detail]!,
    radius: (t) => H * 0.011 * (1 - 0.5 * t) + 1e-4,
    color: (t) => mixRgb(cStalk, scaleRgb(cStalk, 0.7), t),
    anim: (t) => [t * 0.9, 0, 0],
    caps: true,
  });
  const n = [10, 16, 24][detail]!;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tilt = 0.5 + 0.3 * hash1(i);
    const len = H * 0.17;
    b.sweep({
      path: [
        stalkTop,
        [
          stalkTop[0] + Math.cos(a) * len * 0.5,
          stalkTop[1] + len * (0.55 + tilt * 0.3),
          stalkTop[2] + Math.sin(a) * len * 0.5,
        ],
        [
          stalkTop[0] + Math.cos(a) * len,
          stalkTop[1] + len * (0.8 + tilt * 0.35),
          stalkTop[2] + Math.sin(a) * len,
        ],
      ],
      rings: 5,
      sides: 4,
      radius: (t) => H * 0.013 * (0.6 + 0.6 * Math.sin(t * 2.4)) + 1e-4,
      color: (t) => mixRgb(cStalk, cPolyp, smooth(0.1, 0.8, t)),
      anim: (t) => [Math.min(1, 0.85 + t * 0.3), 0, 0],
      caps: true,
    });
  }
  return b.toGeometry();
}

export function buildGorgonian(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const H = size;
  const kind = str(look, 'kind', 'fan');
  const cStem = col(look, 'cStem', 0xd6b25a);
  const cPolyp = col(look, 'cPolyp', 0xf0d68a);
  const b = new Builder();
  const rad = H * 0.012 * num(look, 'thick', 1);
  if (kind === 'spiral') {
    // Iridogorgia: the whole stem winds in a wide, open corkscrew.
    const path: V3[] = [[0, 0, 0]];
    const turns = 3.2;
    const N = 16;
    for (let k = 1; k <= N; k++) {
      const u = k / N;
      const rr = H * 0.16 * Math.sin(Math.min(1, u * 1.6) * 1.2);
      path.push([
        Math.cos(u * turns * Math.PI * 2) * rr,
        H * u,
        Math.sin(u * turns * Math.PI * 2) * rr,
      ]);
    }
    b.sweep({
      path,
      rings: [18, 28, 40][detail]!,
      sides: [4, 5, 6][detail]!,
      radius: (t) => rad * (1 - 0.6 * t) + 1e-4,
      color: (t) => mixRgb(cStem, cPolyp, t * 0.5),
      anim: (t) => [t, 0, 0],
      caps: true,
    });
    return b.toGeometry();
  }
  if (kind === 'spiralPolyps') {
    // Chrysogorgia: a straight zig-zag stem with a spiral of curved polyp branches.
    const stem: V3[] = [];
    const N = 10;
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      stem.push([Math.sin(u * 5) * H * 0.02, H * u, Math.cos(u * 4) * H * 0.02]);
    }
    b.sweep({
      path: stem,
      rings: [14, 20, 28][detail]!,
      sides: [4, 5, 6][detail]!,
      radius: (t) => rad * (1 - 0.65 * t) + 1e-4,
      color: (t) => mixRgb(cStem, cPolyp, t * 0.4),
      anim: (t) => [t, 0, 0],
      caps: true,
    });
    const nb = [9, 14, 20][detail]!;
    for (let i = 0; i < nb; i++) {
      const u = 0.18 + 0.78 * (i / (nb - 1));
      const a = i * 2.4;
      const p = stem[Math.min(N, Math.round(u * N))]!;
      const len = H * 0.2 * (1 - 0.45 * u);
      b.sweep({
        path: [
          p,
          [p[0] + Math.cos(a) * len * 0.5, p[1] + len * 0.2, p[2] + Math.sin(a) * len * 0.5],
          [p[0] + Math.cos(a) * len, p[1] + len * 0.05, p[2] + Math.sin(a) * len],
        ],
        rings: 6,
        sides: 3,
        radius: (t) => rad * 0.55 * (1 - 0.5 * t) + 1e-4,
        color: (t) => mixRgb(cStem, cPolyp, t),
        anim: (t) => [Math.min(1, u + t * 0.25), 0, 0],
      });
      b.ellipsoid(
        [p[0] + Math.cos(a) * len, p[1] + len * 0.05, p[2] + Math.sin(a) * len],
        [H * 0.014, H * 0.02, H * 0.014],
        5,
        4,
        cPolyp,
        [Math.min(1, u + 0.25), 0, 0],
      );
    }
    return b.toGeometry();
  }
  // A planar fan of branching twigs (Paramuricea, Stylaster, gorgonian fans).
  const facing = 1;
  const branch = (o: V3, dir: V3, len: number, depth: number, seed: number): void => {
    const end: V3 = [o[0] + dir[0] * len, o[1] + dir[1] * len, o[2] + dir[2] * len];
    const mid: V3 = [
      (o[0] + end[0]) / 2 + Math.sin(seed) * len * 0.06,
      (o[1] + end[1]) / 2,
      (o[2] + end[2]) / 2 + Math.cos(seed) * len * 0.05 * facing,
    ];
    const w0 = o[1] / H;
    const w1 = end[1] / H;
    b.sweep({
      path: [o, mid, end],
      rings: 5,
      sides: depth > 1 ? 3 : 4,
      radius: (t) => rad * (0.32 + 0.22 * depth) * (1 - 0.45 * t) + 1e-4,
      color: (t) => mixRgb(cStem, cPolyp, (1 - depth / 4) * 0.7 + 0.3 * t),
      anim: (t) => [Math.min(1, w0 + (w1 - w0) * t), 0, 0],
    });
    if (depth <= 0) {
      b.ellipsoid(end, [rad * 0.9, rad * 1.3, rad * 0.9], 4, 4, cPolyp, [Math.min(1, w1), 0, 0]);
      return;
    }
    const kids = depth > 2 ? 2 : 3;
    for (let k = 0; k < kids; k++) {
      const spread = (k - (kids - 1) / 2) * (0.55 + 0.1 * depth);
      const c = Math.cos(spread);
      const s = Math.sin(spread);
      // Rotate the direction within the fan plane (x-y), with a slight depth wobble.
      const nd: V3 = [
        dir[0] * c - dir[1] * s,
        dir[0] * s + dir[1] * c,
        dir[2] + Math.sin(seed * 3 + k) * 0.18,
      ];
      const l = Math.hypot(nd[0], nd[1], nd[2]);
      branch(
        end,
        [nd[0] / l, nd[1] / l, nd[2] / l],
        len * (0.62 + 0.08 * hash1(seed + k)),
        depth - 1,
        seed + k * 1.7 + 1,
      );
    }
  };
  const levels = [2, 3, 3][detail]! + (detail > 0 ? num(look, 'moreLevels', 0) : 0);
  b.sweep({
    path: [
      [0, -H * 0.02, 0],
      [0, H * 0.08, 0],
    ],
    rings: 4,
    sides: 5,
    radius: () => rad * 1.1,
    color: cStem,
    anim: [0, 0, 0],
    caps: true,
  });
  // A bush of fans (cold-water coral) or a single fan (gorgonians).
  const fans = Math.max(1, Math.round(num(look, 'fans', 1)));
  for (let i = 0; i < fans; i++) {
    const ang = i * 2.4 + 0.6;
    const tilt = i === 0 ? 0 : 0.4;
    const d: V3 = [Math.cos(ang) * tilt, 1, Math.sin(ang) * tilt];
    const l = Math.hypot(d[0], d[1], d[2]);
    branch(
      [0, H * 0.08, 0],
      [d[0] / l, d[1] / l, d[2] / l],
      H * (0.34 - 0.03 * i),
      levels,
      1.3 + i * 2.1,
    );
  }
  return b.toGeometry();
}

export function buildAnemone(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const H = size;
  const cCol = col(look, 'cCol', 0xf2efe6);
  const cTent = col(look, 'cTent', 0xfaf7ee);
  const b = new Builder();
  const path: V3[] = [];
  for (let k = 0; k < 6; k++) path.push([0, H * 0.4 * (k / 5), 0]);
  b.sweep({
    path,
    rings: 6,
    sides: [8, 10, 14][detail]!,
    radius: (t) => H * (0.13 - 0.03 * Math.sin(t * 3) + 0.04 * t) * (t < 0.03 ? 1.3 : 1),
    color: (t) => scaleRgb(cCol, 0.85 + 0.2 * t),
    anim: (t) => [t * 0.35, 0, 0],
    caps: true,
  });
  const n = [14, 26, 44][detail]!;
  for (let i = 0; i < n; i++) {
    const ring = i % 2 ? 0.55 : 1;
    const a = i * 2.399;
    const r0 = H * 0.15 * ring;
    const len = H * (0.3 + 0.2 * hash1(i * 2.7)) * (ring === 1 ? 1 : 0.7);
    b.sweep({
      path: [
        [Math.cos(a) * r0 * 0.6, H * 0.4, Math.sin(a) * r0 * 0.6],
        [Math.cos(a) * (r0 + len * 0.3), H * 0.4 + len * 0.55, Math.sin(a) * (r0 + len * 0.3)],
        [
          Math.cos(a) * (r0 + len * 0.6) + Math.sin(i) * len * 0.1,
          H * 0.4 + len * 0.95,
          Math.sin(a) * (r0 + len * 0.6),
        ],
      ],
      rings: 5,
      sides: 3,
      radius: (t) => H * 0.034 * (1 - 0.75 * t) + 1e-4,
      color: (t) => scaleRgb(cTent, 0.9 + 0.2 * t),
      anim: (t) => [0.35 + 0.5 * t, 0, 0],
    });
  }
  return b.toGeometry();
}

export function buildSponge(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const H = size;
  const cSp = col(look, 'cSp', 0xf4f2ea);
  const b = new Builder();
  const path: V3[] = [];
  const rings = [8, 12, 16][detail]!;
  for (let k = 0; k < rings; k++) path.push([0, H * (k / (rings - 1)), 0]);
  b.sweep({
    path,
    rings,
    sides: [10, 16, 24][detail]!,
    radius: (t, ang) => {
      const vase =
        0.12 + 0.34 * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.4 * t) + (t > 0.94 ? 0.03 : 0);
      return H * vase * (1 + 0.05 * Math.sin(ang * 7 + t * 5));
    },
    color: (_t, _s, _c, p) => {
      const lat = 0.5 + 0.5 * Math.sin(((p[1] * 70) / H) * 0.5 + Math.atan2(p[2], p[0]) * 14);
      return scaleRgb(cSp, 0.8 + 0.22 * lat);
    },
    anim: (t) => [t * 0.15, 0, 0],
    caps: false,
  });
  return b.toGeometry();
}

export function buildCoralDome(look: Look, size: number, detail: 0 | 1 | 2): THREE.BufferGeometry {
  const D = size;
  const cA = col(look, 'cA', 0xa88a5a);
  const cB = col(look, 'cB', 0x5f4a30);
  const b = new Builder();
  const rings = [8, 12, 16][detail]!;
  const path: V3[] = [];
  for (let k = 0; k < rings; k++)
    path.push([0, D * 0.36 * Math.sin((Math.PI / 2) * (k / (rings - 1))), 0]);
  b.sweep({
    path,
    rings,
    sides: [12, 20, 28][detail]!,
    radius: (t) => D * 0.5 * Math.cos((Math.PI / 2) * t * 0.98) + 1e-4,
    color: (t, _s, _c, p) => {
      // Meandering brain-groove pattern from layered sines in the surface plane.
      const f =
        Math.sin(((p[0] * 60) / D) * 0.6 + Math.sin(((p[2] * 45) / D) * 0.6) * 1.6) +
        Math.sin(((p[2] * 58) / D) * 0.6 + Math.cos(((p[0] * 40) / D) * 0.6) * 1.4);
      return mixRgb(cA, cB, smooth(-0.6, 0.8, f) * 0.85 + 0.1 * t);
    },
    anim: [0, 0, 0],
    caps: false,
  });
  // A rocky footing.
  b.ellipsoid(
    [0, -D * 0.02, 0],
    [D * 0.44, D * 0.05, D * 0.44],
    10,
    4,
    [0.12, 0.1, 0.08],
    [0, 0, 0],
  );
  return b.toGeometry();
}
