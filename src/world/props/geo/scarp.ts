/**
 * Scarps: a wall of rock extruded from a side profile, with gullies, strata
 * terraces, sediment drape and a talus apron of instanced boulders. One
 * builder, three presets:
 *
 *   tuff    Hunga Tonga caldera wall: banded pyroclastic tuff, steep and gullied
 *   canyon  Monterey Canyon wall: terraced mudstone with an overhanging shelf
 *   hadal   Challenger Deep wall: dark silty, fractured slope with slump blocks
 *
 * dims = [width, depth (toe to crest), height]. The face looks toward local -Z;
 * the rock lies behind it (+Z). The profile is (y, z) as fractions of height and
 * depth; z < 0 is toward the viewer.
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial } from './materials.js';
import { shimmerPlume } from './plume.js';
import type { GeoTexKind } from './textures.js';
import {
  boxCH,
  fbm3,
  impostorFromBoxes,
  instanced,
  lump,
  mulberry32,
  paint,
  projectUVs,
  smooth,
  type BuiltProp,
  type InstanceSpec,
} from './shared.js';
import type { GeoBuildInput } from './types.js';

export type ScarpPresetId = 'tuff' | 'canyon' | 'hadal';

interface Preset {
  tex: GeoTexKind;
  /** (y / H, z / D) control points, bottom to top. */
  profile: [number, number][];
  /** Strata bands over the height. */
  bands: number;
  /** Strata ledge amplitude, gully amplitude (m per 30 m of height). */
  ledge: number;
  gully: number;
  gullyFreq: number;
  base: THREE.Color;
  band: THREE.Color;
  crest: THREE.Color;
  drape: THREE.Color;
  boulder: THREE.Color;
  boulders: number;
  rough: number;
}

const PRESETS: Record<ScarpPresetId, Preset> = {
  tuff: {
    tex: 'strata',
    profile: [
      [-0.12, -0.55],
      [0, -0.5],
      [0.12, -0.32],
      [0.28, -0.13],
      [0.42, -0.03],
      [0.78, 0],
      [0.92, -0.05],
      [1, 0],
      [1.02, 0.4],
    ],
    bands: 9,
    ledge: 0.9,
    gully: 2.6,
    gullyFreq: 0.16,
    base: new THREE.Color(0x8d7d63), // tan tuff
    band: new THREE.Color(0x5d5a4c), // darker ash bands, greenish
    crest: new THREE.Color(0xa89679),
    drape: new THREE.Color(0x6f6555),
    boulder: new THREE.Color(0x77705f),
    boulders: 110,
    rough: 0.95,
  },
  canyon: {
    tex: 'strata',
    profile: [
      [-0.12, -0.5],
      [0, -0.42],
      [0.16, -0.3],
      [0.2, -0.17],
      [0.4, -0.14],
      [0.43, -0.02],
      [0.6, 0],
      [0.63, -0.24],
      [0.7, -0.26],
      [0.73, -0.02],
      [1, 0.05],
      [1.02, 0.5],
    ],
    bands: 12,
    ledge: 1.4,
    gully: 1.8,
    gullyFreq: 0.2,
    base: new THREE.Color(0x6d6b57), // olive-grey mudstone
    band: new THREE.Color(0x4c4a3d),
    crest: new THREE.Color(0x8a866f),
    drape: new THREE.Color(0x7e7666), // pale silt on ledges
    boulder: new THREE.Color(0x5f5c4e),
    boulders: 70,
    rough: 0.97,
  },
  hadal: {
    tex: 'rock',
    profile: [
      [-0.12, -0.75],
      [0, -0.65],
      [0.22, -0.34],
      [0.45, -0.14],
      [0.78, -0.02],
      [1, 0.08],
      [1.02, 0.5],
    ],
    bands: 5,
    ledge: 0.7,
    gully: 3.2,
    gullyFreq: 0.11,
    base: new THREE.Color(0x5d5850), // dark silty grey-brown, lifted for readability
    band: new THREE.Color(0x42403c),
    crest: new THREE.Color(0x7d766a),
    drape: new THREE.Color(0x8a8272), // pale hadal silt
    boulder: new THREE.Color(0x4e4b45),
    boulders: 80,
    rough: 0.98,
  },
};

/** Resample a polyline (absolute metres) into `n + 1` points of equal arc length. */
function resample(pts: [number, number][], n: number): [number, number][] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  }
  const total = cum[cum.length - 1]!;
  const out: [number, number][] = [];
  let seg = 1;
  for (let j = 0; j <= n; j++) {
    const s = (j / n) * total;
    while (seg < pts.length - 1 && cum[seg]! < s) seg++;
    const t = (s - cum[seg - 1]!) / Math.max(1e-6, cum[seg]! - cum[seg - 1]!);
    out.push([
      pts[seg - 1]![0] + (pts[seg]![0] - pts[seg - 1]![0]) * t,
      pts[seg - 1]![1] + (pts[seg]![1] - pts[seg - 1]![1]) * t,
    ]);
  }
  return out;
}

/**
 * Extrude a (y, z) profile along x. `disp(x, y, z0)` returns extra z offset in
 * metres. The ends pinch down so the wall does not stop abruptly. Returns an
 * indexed, smooth-shaded geometry.
 */
export function extrudeProfile(
  profile: [number, number][],
  width: number,
  nx: number,
  ny: number,
  disp: (x: number, y: number, z: number) => number,
  height: number,
): THREE.BufferGeometry {
  const pts = resample(profile, ny);
  const pos = new Float32Array((nx + 1) * (ny + 1) * 3);
  const idx: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = (i / nx - 0.5) * width;
    const edge = smooth(0.78, 1, Math.abs(x) / (width / 2));
    for (let j = 0; j <= ny; j++) {
      const [y0, z0] = pts[j]!;
      const y = y0 > 0 ? y0 * (1 - 0.7 * edge * edge) : y0;
      const z = (z0 + disp(x, y0, z0) * (1 - edge * 0.6)) * (1 - edge * 0.55);
      const k = (i * (ny + 1) + j) * 3;
      pos[k] = x;
      pos[k + 1] = y;
      pos[k + 2] = z;
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const a = i * (ny + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (ny + 1) + j;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Face the normals toward -Z (the open side): flip if the winding came out backwards.
  const n = g.getAttribute('normal');
  let sum = 0;
  for (let i = 0; i < n.count; i++) sum += n.getZ(i);
  if (sum > 0) {
    const ix = g.getIndex()!;
    for (let i = 0; i < ix.count; i += 3) {
      const t = ix.getX(i + 1);
      ix.setX(i + 1, ix.getX(i + 2));
      ix.setX(i + 2, t);
    }
    g.computeVertexNormals();
  }
  void height;
  return g;
}

export function buildScarp(id: ScarpPresetId, input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier } = input;
  const d = geoDetail(tier);
  const P = PRESETS[id];
  const [W, D, H] = dims;
  const rnd = mulberry32(seed);
  const profile = P.profile.map(([y, z]): [number, number] => [y * H, z * D]);
  const scale = Math.max(0.6, H / 30);
  const disp = (x: number, y: number, z: number): number => {
    const env = smooth(-0.05 * H, 0.2 * H, y);
    const gully = (fbm3(x * P.gullyFreq, y * 0.025, seed + 1, seed, 4) - 0.5) * 2 * P.gully * scale;
    const s = (y / H) * P.bands + (fbm3(x * 0.03, 5, seed, seed + 7, 2) - 0.5) * 1.2;
    const saw = s - Math.floor(s);
    const ledge = -Math.pow(saw, 3) * P.ledge * scale; // strata protrude, then step back
    const fine = (fbm3(x * 0.9, y * 0.9, z * 0.9, seed + 4, 3) - 0.5) * 0.6 * scale;
    return (gully + ledge) * env + fine;
  };
  const nx = Math.round(Math.max(24, W / 1.4) * d.meshDensity);
  const ny = Math.round(Math.max(28, H * 1.3) * d.meshDensity);
  const wall = extrudeProfile(profile, W, Math.min(nx, 170), Math.min(ny, 110), disp, H);
  paint(wall, (x, y, z, ny_, out) => {
    const s = (y / H) * P.bands + (fbm3(x * 0.03, 5, seed, seed + 7, 2) - 0.5) * 1.2;
    const saw = s - Math.floor(s);
    const tone = fbm3(x * 0.25, y * 0.2, z * 0.25, seed ^ 0x3c, 4);
    out.copy(P.base).lerp(P.band, smooth(0.55, 0.95, saw) * 0.75 * (0.5 + tone));
    out.multiplyScalar(0.8 + 0.5 * tone);
    out.lerp(P.crest, smooth(0.75, 1, y / H) * 0.6);
    // Sediment drape on gentle slopes and at the toe; exposed rock on steep faces.
    out.lerp(P.drape, smooth(0.45, 0.85, ny_) * 0.75 * (0.6 + 0.4 * tone));
    out.lerp(P.drape, (1 - smooth(-0.05 * H, 0.22 * H, y)) * 0.6);
  });
  projectUVs(wall, 4);
  wall.computeBoundingBox();
  const full = new THREE.Group();
  full.name = `scarp-${id}`;
  full.add(
    new THREE.Mesh(wall, geoMaterial(P.tex, d, { roughness: P.rough, side: THREE.DoubleSide })),
  );

  // Talus: boulders on the lower apron (instanced).
  if (d.rubble) {
    const count = Math.round(P.boulders * d.growth);
    const tmpl = [0, 1, 2].map((k) => {
      const g = lump(d.sphereDetail, seed + k * 5, 0.32, 1.7);
      projectUVs(g, 1.2);
      return g;
    });
    const groups: InstanceSpec[][] = [[], [], []];
    const lower = profile.filter((p) => p[0] < 0.4 * H);
    for (let i = 0; i < count; i++) {
      const x = (rnd() - 0.5) * W * 0.86;
      const j = Math.floor(rnd() * (lower.length - 1));
      const t = rnd();
      const y0 = lower[j]![0] + (lower[j + 1]![0] - lower[j]![0]) * t;
      const z0 = lower[j]![1] + (lower[j + 1]![1] - lower[j]![1]) * t;
      const edge = smooth(0.78, 1, Math.abs(x) / (W / 2));
      const s = (0.35 + rnd() * rnd() * 2.4) * scale * (id === 'hadal' ? 1.3 : 1);
      const c = new THREE.Color()
        .copy(P.boulder)
        .lerp(P.drape, rnd() * 0.4)
        .multiplyScalar(0.8 + rnd() * 0.5);
      groups[i % 3]!.push({
        t: {
          x,
          y: y0 * (1 - 0.7 * edge * edge) + s * 0.15,
          z: (z0 + disp(x, y0, z0) * 0.3) * (1 - edge * 0.55),
          rx: rnd() * 3,
          ry: rnd() * 6,
          rz: rnd() * 3,
          sx: s * (0.8 + rnd() * 0.6),
          sy: s * (0.55 + rnd() * 0.4),
          sz: s * (0.8 + rnd() * 0.6),
        },
        color: c,
      });
    }
    const bm = geoMaterial('rock', d, { roughness: 0.96, vertexColors: false });
    groups.forEach((g, k) => {
      if (g.length) full.add(instanced(tmpl[k]!, bm, g, `boulders-${k}`));
    });
  }

  // A faint seep of clear fluid on the caldera wall (Hunga Tonga is volcanically active).
  if (id === 'tuff') {
    for (let i = 0; i < 3; i++) {
      const x = (rnd() - 0.5) * W * 0.6;
      const sh = shimmerPlume(4, 0.6, Math.round(34 * d.plume), seed + 40 + i);
      if (sh) {
        sh.position.set(x, H * (0.05 + rnd() * 0.2), -D * 0.14);
        full.add(sh);
      }
    }
  }

  const bounds = wall.boundingBox!.clone();
  const colliders = profileColliders(profile, W, D, H, 9);
  return {
    full,
    impostor: impostorFromBoxes(colliders, bounds, P.base.getHex()),
    bounds,
    colliders,
  };
}

/** One box per height slice at the slice's most protruding profile point (a stepped wall collider). */
export function profileColliders(
  profile: [number, number][],
  W: number,
  D: number,
  H: number,
  slices: number,
): THREE.Box3[] {
  const out: THREE.Box3[] = [];
  const thick = Math.max(2, D * 0.35);
  for (let s = 0; s < slices; s++) {
    const y0 = -0.1 * H + (s / slices) * 1.1 * H;
    const y1 = -0.1 * H + ((s + 1) / slices) * 1.1 * H;
    let zMin = 0.4 * D;
    for (const [py, pz] of profile) if (py >= y0 && py <= y1) zMin = Math.min(zMin, pz);
    // Include the profile at each slice edge so a slope does not leave gaps.
    zMin = Math.min(zMin, interp(profile, y0), interp(profile, y1));
    const zBack = Math.max(zMin + 1, 0.2 * D) + thick * 0.5;
    out.push(
      boxCH(0, (y0 + y1) / 2, (zMin + zBack) / 2, W * 0.4, (y1 - y0) / 2, (zBack - zMin) / 2),
    );
  }
  return out;
}

/** z of the profile at height y (first crossing). */
export function interp(profile: [number, number][], y: number): number {
  for (let i = 1; i < profile.length; i++) {
    const [y0, z0] = profile[i - 1]!;
    const [y1, z1] = profile[i]!;
    if ((y >= y0 && y <= y1) || (y <= y0 && y >= y1)) {
      const t = (y - y0) / (y1 - y0 || 1);
      return z0 + (z1 - z0) * t;
    }
  }
  return profile[profile.length - 1]![1];
}
