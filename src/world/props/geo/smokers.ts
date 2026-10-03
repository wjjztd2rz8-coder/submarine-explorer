/**
 * `feature: "smoker-cluster"` (Axial ASHES, Beebe): a low sulfide mound with a
 * tight group of thick black-smoker chimneys, animated smoke plumes, diffuse
 * shimmer, talus, bacterial mats and a colonising fauna: tubeworm clumps and
 * mussel beds around the base, or shrimp swarms on the walls with
 * `"variant": "shrimp"`. dims = [mound length, mound width, tallest chimney].
 * `full.userData.ventTop` is the local height of the main orifice, where the
 * vent preset starts its smoke and glow.
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial, LIFE_TINT, vertexGlow } from './materials.js';
import { shimmerPlume, smokePlume } from './plume.js';
import { tieredSpire } from './spire.js';
import {
  boxCH,
  clamp01,
  fbm3,
  heightMesh,
  impostorFromBoxes,
  instanced,
  lump,
  mergeAll,
  mulberry32,
  paint,
  place,
  projectUVs,
  smooth,
  type BuiltProp,
  type InstanceSpec,
} from './shared.js';
import type { GeoBuildInput } from './types.js';

const ROCK = new THREE.Color(0x40352f);
const RUST = new THREE.Color(0x7a4a2c);
const ANHYDRITE = new THREE.Color(0xcfc4b2);
const SULFIDE = new THREE.Color(0x2c231e);
const MOUND = new THREE.Color(0x4c4038);
const MAT = new THREE.Color(0xb9ad98);

export function buildSmokerCluster(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier, def } = input;
  const gnd = input.groundHeight() ?? ((): number => 0);
  const d = geoDetail(tier);
  const [L, W, H0] = dims;
  const H = H0 * 1.5; // the hero stack stands taller than its nominal height
  const rnd = mulberry32(seed);
  const shrimp = def.raw.variant === 'shrimp';
  const moundH = THREE.MathUtils.clamp(H0 * 0.32, 0.8, 5);

  const shape = (x: number, z: number): number => {
    const r = Math.hypot(x / (L / 2), z / (W / 2));
    if (r >= 1) return -3;
    const base = moundH * Math.pow(1 - r * r, 0.9);
    const n = (fbm3(x * 0.4, 3, z * 0.4, seed, 3) - 0.5) * moundH * 0.9;
    return Math.max(-3, base + n * clamp01(base / moundH) - smooth(0.7, 1, r) * 1.2);
  };
  /** Mound surface: the shape lifted onto the terrain. */
  const mound = (x: number, z: number): number => shape(x, z) + gnd(x, z);

  interface Stack {
    x: number;
    z: number;
    y: number;
    h: number;
    r0: number;
  }
  const n = THREE.MathUtils.clamp(Math.round(2 + H / 2.6), 3, 6);
  const stacks: Stack[] = [];
  const radius = (h: number): number => h * 0.15 + 0.6;
  for (let i = 0; i < n; i++) {
    const h = i === 0 ? H : H * (0.34 + rnd() * 0.4);
    const r0 = radius(h);
    // Side stacks stand clear of the main column, on a loose ring.
    const ring = i === 0 ? 0 : radius(H) + r0 + 0.4 + rnd() * 0.12 * Math.min(L, W);
    const a = i * 2.4 + rnd() * 0.8;
    const x = Math.cos(a) * ring;
    const z = Math.sin(a) * ring;
    stacks.push({ x, z, y: mound(x, z) - 0.3, h, r0 });
  }

  // ---- geometry: mound + chimneys, one mesh.
  const pieces: THREE.BufferGeometry[] = [
    heightMesh(L, W, Math.round(34 * d.meshDensity), Math.round(34 * d.meshDensity), mound),
  ];
  for (const [i, s] of stacks.entries()) {
    const c = tieredSpire({
      h: s.h,
      r0: s.r0,
      topFrac: 0.45,
      seed: seed + i * 7,
      segs: 22 * d.meshDensity + 4,
      rings: (s.h / 0.7) * d.meshDensity + 6,
      tiers: Math.max(2, Math.round(s.h / 3.2)),
      ledge: 0.1,
      wobble: 0.2,
      rough: 0.07,
      ridges: 4,
      ridgeAmp: 0.08,
      flare: 0.75,
      lip: 0.3,
      crater: 0.7,
    });
    pieces.push(place(c, { x: s.x, y: s.y, z: s.z }));
    // Side spire and a small parasitic vent on the taller stacks.
    if (s.h > 3) {
      const a = rnd() * 6.28;
      const sh = s.h * (0.28 + rnd() * 0.2);
      const sp = tieredSpire({
        h: sh,
        r0: s.r0 * 0.42,
        topFrac: 0.45,
        seed: seed + i * 13 + 5,
        segs: 12,
        rings: sh / 0.8 + 4,
        wobble: 0.2,
        lip: 0.25,
        flare: 0.5,
        ridges: 3,
      });
      pieces.push(
        place(sp, {
          x: s.x + Math.cos(a) * s.r0 * 0.85,
          y: s.y + s.h * (0.15 + rnd() * 0.25),
          z: s.z + Math.sin(a) * s.r0 * 0.85,
          rz: Math.cos(a) * 0.35,
          rx: -Math.sin(a) * 0.35,
        }),
      );
    }
  }
  const geom = mergeAll(pieces);
  const c1 = new THREE.Color();
  paint(geom, (x, y, z, ny, out) => {
    const nz = fbm3(x * 0.6, y * 0.5, z * 0.6, seed ^ 0x51, 4);
    const onMound =
      clamp01((moundH * 1.5 - (y - gnd(x, z))) / (moundH * 1.5)) *
      (1 - smooth(0.8, 1, Math.hypot(x / (L / 2), z / (W / 2))) * 0);
    // Chimney body: charcoal sulfide; oxidised rust bands; pale anhydrite near the lips.
    let best = 0;
    let hh = 0;
    for (const s of stacks) {
      const d2 = Math.hypot(x - s.x, z - s.z);
      if (d2 < s.r0 * 2.4 && y > s.y) {
        const t = clamp01((y - s.y) / s.h);
        if (t > best) {
          best = t;
          hh = t;
        }
      }
    }
    if (best > 0) {
      out.copy(SULFIDE).lerp(ROCK, nz);
      out.lerp(RUST, smooth(0.45, 0.85, nz + hh * 0.15) * 0.55);
      out.lerp(ANHYDRITE, smooth(0.88, 1, hh + (nz - 0.5) * 0.2) * 0.45);
    } else {
      out.copy(MOUND).multiplyScalar(0.8 + 0.6 * nz);
      out.lerp(RUST, smooth(0.55, 0.85, nz) * 0.35 * onMound);
    }
    out.lerp(
      c1.copy(MOUND).multiplyScalar(1.1),
      (1 - smooth(0, 0.6, y - gnd(x, z))) * 0.3 * (1 - best),
    );
    if (ny > 0.85 && best === 0) out.multiplyScalar(1.08);
  });
  projectUVs(geom, 3);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  const full = new THREE.Group();
  full.name = 'smoker-cluster';
  const bodyMat = geoMaterial('rock', d, { roughness: 0.9 });
  // Black smokers are dark but not black: lift the albedo, and give the warm fluid a faint
  // self-lit tint that follows the pale and rusty parts of the crust.
  bodyMat.color.multiplyScalar(1.25);
  vertexGlow(bodyMat, 0.13, 0xff9a68, 0.5);
  const body = new THREE.Mesh(geom, bodyMat);
  body.name = 'smoker-body';
  full.add(body);
  const top = stacks[0]!;
  full.userData.ventTop = top.y + top.h;

  // ---- instanced life and talus.
  const bounds = geom.boundingBox!.clone();
  const items: InstanceSpec[] = [];
  const wormGeom = shrimp
    ? new THREE.IcosahedronGeometry(1, 0)
    : new THREE.CylinderGeometry(0.04, 0.05, 1, 5, 2).translate(0, 0.5, 0);
  paint(wormGeom, (_x, y, _z, _ny, out) => {
    if (shrimp) out.set(0xd9bfae);
    else if (y > 0.7) out.set(0xd0303a);
    else out.set(0xeae2d2);
  });
  // Shrimp (Rimicaris) pile in dense patches on the lower walls of each chimney.
  if (shrimp) {
    const patches = Math.max(2, Math.round(6 * d.growth));
    const perPatch = Math.max(8, Math.round(40 * d.growth));
    for (const s of stacks) {
      for (let k = 0; k < patches; k++) {
        const a = rnd() * 6.283;
        const t0 = 0.06 + rnd() * 0.3;
        for (let i = 0; i < perPatch; i++) {
          const t = Math.min(0.9, t0 + (rnd() - 0.5) * 0.12);
          const aa = a + (rnd() - 0.5) * 0.7;
          const r = s.r0 * (1 - 0.55 * t) * 1.04;
          items.push({
            t: {
              x: s.x + Math.cos(aa) * r,
              y: s.y + t * s.h,
              z: s.z + Math.sin(aa) * r,
              ry: -aa + (rnd() - 0.5),
              sx: 0.1,
              sy: 0.035,
              sz: 0.035,
            },
          });
        }
      }
    }
  }
  // Tubeworm clumps around every stack's base: tight bunches of white stalks, red plumes.
  const clumps = Math.max(2, Math.round(6 * d.growth));
  const worms = Math.max(5, Math.round(18 * d.growth));
  if (!shrimp) {
    for (const s of stacks) {
      for (let k = 0; k < clumps; k++) {
        const a = rnd() * 6.283;
        const r = s.r0 * (1.2 + rnd() * 1.1);
        const cx = s.x + Math.cos(a) * r;
        const cz = s.z + Math.sin(a) * r;
        for (let i = 0; i < worms; i++) {
          const wa = rnd() * 6.283;
          const wr = Math.sqrt(rnd()) * 0.5;
          const x = cx + Math.cos(wa) * wr;
          const z = cz + Math.sin(wa) * wr;
          const w = 1.2 + rnd() * 0.8;
          items.push({
            t: {
              x,
              y: mound(x, z) - 0.05,
              z,
              rx: Math.sin(wa) * 0.35 + (rnd() - 0.5) * 0.3,
              rz: -Math.cos(wa) * 0.35 + (rnd() - 0.5) * 0.3,
              sx: w,
              sy: 0.5 + rnd() * 0.9,
              sz: w,
            },
          });
        }
      }
    }
  }
  if (items.length) {
    const wm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 });
    full.add(instanced(wormGeom, wm, items, shrimp ? 'shrimp' : 'tubeworms'));
  }
  // Mussel beds: low dark-and-pale shells packed on the mound's flank.
  const musselBeds = shrimp ? 0 : Math.max(2, Math.round(5 * d.growth));
  const shells: InstanceSpec[] = [];
  for (let k = 0; k < musselBeds; k++) {
    const a = rnd() * 6.283;
    const rr = 0.35 + rnd() * 0.4;
    const cx = Math.cos(a) * rr * L * 0.5;
    const cz = Math.sin(a) * rr * W * 0.5;
    const count = Math.round(34 * d.growth) + 6;
    for (let i = 0; i < count; i++) {
      const sa = rnd() * 6.283;
      const sr = Math.sqrt(rnd()) * 1.1;
      const x = cx + Math.cos(sa) * sr;
      const z = cz + Math.sin(sa) * sr;
      shells.push({
        t: {
          x,
          y: mound(x, z) + 0.03,
          z,
          ry: rnd() * 6.283,
          rx: (rnd() - 0.5) * 0.5,
          sx: 0.13 + rnd() * 0.07,
          sy: 0.07,
          sz: 0.09,
        },
        color: new THREE.Color(rnd() < 0.3 ? 0x8a8576 : 0x3b4650).multiplyScalar(0.8 + rnd() * 0.4),
      });
    }
  }
  if (shells.length)
    full.add(
      instanced(
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({ color: LIFE_TINT, roughness: 0.55, metalness: 0.05 }),
        shells,
        'mussels',
      ),
    );
  // Sulfide talus: broken chimney chunks around the base and across the mound.
  const chunks: InstanceSpec[] = [];
  const nChunks = Math.round(70 * d.growth) + 10;
  for (let i = 0; i < nChunks; i++) {
    const a = rnd() * 6.283;
    const rr = Math.sqrt(rnd()) * 0.92;
    const x = Math.cos(a) * rr * L * 0.5;
    const z = Math.sin(a) * rr * W * 0.5;
    const sc = 0.12 + Math.pow(rnd(), 2.5) * 0.9;
    chunks.push({
      t: {
        x,
        y: mound(x, z) + sc * 0.1,
        z,
        rx: rnd() * 3,
        ry: rnd() * 3,
        sx: sc,
        sy: sc * (0.5 + rnd() * 0.3),
        sz: sc * (0.7 + rnd() * 0.5),
      },
      color: new THREE.Color(rnd() < 0.1 ? RUST : ROCK).multiplyScalar(0.7 + rnd() * 0.5),
    });
  }
  full.add(
    instanced(
      lump(1, seed + 3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.92, metalness: 0.05 }),
      chunks,
      'sulfide-talus',
    ),
  );
  // Pale bacterial mats: small flat cream patches by the stacks.
  const matItems: InstanceSpec[] = [];
  const nMats = Math.round(16 * d.growth);
  for (let i = 0; i < nMats; i++) {
    const s = stacks[i % stacks.length]!;
    const a = rnd() * 6.283;
    const rr = s.r0 * (1.4 + rnd() * 2.2);
    const x = s.x + Math.cos(a) * rr;
    const z = s.z + Math.sin(a) * rr;
    matItems.push({
      t: {
        x,
        y: mound(x, z) + 0.04,
        z,
        ry: rnd() * 3,
        sx: 0.3 + rnd() * 0.6,
        sz: 0.25 + rnd() * 0.5,
      },
      color: new THREE.Color().copy(MAT).multiplyScalar(0.7 + rnd() * 0.3),
    });
  }
  if (matItems.length) {
    const disc = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
    full.add(
      instanced(
        disc,
        new THREE.MeshStandardMaterial({
          color: LIFE_TINT,
          roughness: 0.9,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
        matItems,
        'bacterial-mats',
      ),
    );
  }

  // ---- plumes: smoke from the tallest stacks, shimmer from the mound.
  const byHeight = [...stacks].sort((a, b) => b.h - a.h);
  // The vent preset smokes the tallest stack (the origin); the next two get their own.
  byHeight.slice(1, 3).forEach((s, i) => {
    const ph = THREE.MathUtils.clamp(s.h * 2.6 + 4, 7, 34);
    const smoke = smokePlume(ph, s.r0 * 0.3, Math.round(150 * d.plume), seed + 31 * i);
    if (smoke) {
      smoke.position.set(s.x, s.y + s.h, s.z);
      full.add(smoke);
    }
  });
  for (let i = 0; i < 2; i++) {
    const sh = shimmerPlume(2.6, 0.9, Math.round(40 * d.plume), seed + 900 + i);
    if (sh) {
      const a = rnd() * 6.283;
      const x = Math.cos(a) * L * 0.22;
      const z = Math.sin(a) * W * 0.22;
      sh.position.set(x, mound(x, z), z);
      full.add(sh);
    }
  }

  // Culling bounds cover the smoke: the tallest stack's plume (from the vent preset) and the
  // two extra ones, each with its sideways spread and drift.
  for (const s of byHeight.slice(0, 3)) {
    const ph = THREE.MathUtils.clamp(s.h * 2.6 + 4, 7, 34);
    const reach = Math.max(1.6, ph * 0.2) * 1.6 + ph * 0.34;
    bounds.expandByPoint(new THREE.Vector3(s.x - reach, s.y + s.h + ph, s.z - reach));
    bounds.expandByPoint(new THREE.Vector3(s.x + reach, s.y + s.h + ph, s.z + reach));
  }

  // ---- colliders and impostor.
  const colliders: THREE.Box3[] = [
    boxCH(0, gnd(0, 0) + moundH * 0.3, 0, L * 0.36, moundH * 0.35, W * 0.36),
  ];
  for (const s of stacks) {
    const lo = s.h * 0.45;
    colliders.push(boxCH(s.x, s.y + lo, s.z, s.r0 * 0.9, lo, s.r0 * 0.9));
    colliders.push(boxCH(s.x, s.y + s.h * 0.78, s.z, s.r0 * 0.55, s.h * 0.22, s.r0 * 0.55));
  }
  const impostor = impostorFromBoxes(colliders, bounds, 0x3b322d);
  return { full, impostor, bounds, colliders };
}
