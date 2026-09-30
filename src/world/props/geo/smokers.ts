/**
 * `feature: "smoker-cluster"` (Axial ASHES, Beebe): a low sulfide mound with a
 * tight group of black-smoker chimneys, animated smoke plumes, diffuse shimmer,
 * pale bacterial mats and a colonising fauna (tubeworms, or shrimp swarms with
 * `"variant": "shrimp"`). dims = [mound length, mound width, tallest chimney].
 */

import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial } from './materials.js';
import { shimmerPlume, smokePlume } from './plume.js';
import {
  boxCH,
  clamp01,
  column,
  fbm3,
  heightMesh,
  impostorFromBoxes,
  instanced,
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
const RUST = new THREE.Color(0x9a5a30);
const ANHYDRITE = new THREE.Color(0xcfc4b2);
const SULFIDE = new THREE.Color(0x231f1e);
const MOUND = new THREE.Color(0x4c4038);
const MAT = new THREE.Color(0xb9ad98);

export function buildSmokerCluster(input: GeoBuildInput): BuiltProp {
  const { dims, seed, tier, def } = input;
  const d = geoDetail(tier);
  const [L, W, H] = dims;
  const rnd = mulberry32(seed);
  const shrimp = def.raw.variant === 'shrimp';
  const moundH = THREE.MathUtils.clamp(H * 0.32, 0.8, 5);

  const mound = (x: number, z: number): number => {
    const r = Math.hypot(x / (L / 2), z / (W / 2));
    if (r >= 1) return -1.4;
    const base = moundH * Math.pow(1 - r * r, 0.75);
    const n = (fbm3(x * 0.25, 3, z * 0.25, seed, 3) - 0.5) * moundH * 0.6;
    return Math.max(-1.4, base + n * clamp01(base / moundH) - smooth(0.82, 1, r) * 0.5);
  };

  interface Stack {
    x: number;
    z: number;
    y: number;
    h: number;
    r0: number;
  }
  const n = THREE.MathUtils.clamp(Math.round(2 + H / 2.4), 3, 7);
  const stacks: Stack[] = [];
  for (let i = 0; i < n; i++) {
    const ring = i === 0 ? 0 : 0.14 + rnd() * 0.24;
    const a = i * 2.4 + rnd() * 0.8;
    const x = Math.cos(a) * ring * L * 0.5;
    const z = Math.sin(a) * ring * W * 0.5;
    const h = i === 0 ? H : H * (0.32 + rnd() * 0.45);
    stacks.push({ x, z, y: mound(x, z) - 0.25, h, r0: h * 0.115 + 0.28 });
  }

  // ---- geometry: mound + chimneys, one mesh.
  const pieces: THREE.BufferGeometry[] = [
    heightMesh(L, W, Math.round(30 * d.meshDensity), Math.round(30 * d.meshDensity), mound),
  ];
  for (const [i, s] of stacks.entries()) {
    const c = column({
      h: s.h,
      r0: s.r0,
      topFrac: 0.42,
      seed: seed + i * 7,
      segs: 12 * d.meshDensity + 4,
      rings: (s.h / 0.8) * d.meshDensity + 4,
      wobble: 0.24,
      ridges: 3,
      lip: 0.3,
      flare: 0.55,
    });
    pieces.push(place(c, { x: s.x, y: s.y, z: s.z }));
    // Side spire and a small parasitic vent on the taller stacks.
    if (s.h > 3) {
      const a = rnd() * 6.28;
      const sh = s.h * (0.28 + rnd() * 0.2);
      const sp = column({
        h: sh,
        r0: s.r0 * 0.4,
        topFrac: 0.4,
        seed: seed + i * 13 + 5,
        segs: 8,
        rings: 6,
        wobble: 0.3,
        lip: 0.25,
        flare: 0.4,
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
      clamp01((moundH * 1.5 - y) / (moundH * 1.5)) *
      (1 - smooth(0.8, 1, Math.hypot(x / (L / 2), z / (W / 2))) * 0);
    // Chimney body: charcoal sulfide; oxidised rust bands; pale anhydrite near the lips.
    let best = 0;
    let hh = 0;
    for (const s of stacks) {
      const d2 = Math.hypot(x - s.x, z - s.z);
      if (d2 < s.r0 * 2.2 && y > s.y) {
        const t = clamp01((y - s.y) / s.h);
        if (t > best) {
          best = t;
          hh = t;
        }
      }
    }
    if (best > 0) {
      out.copy(SULFIDE).lerp(ROCK, nz);
      out.lerp(RUST, smooth(0.5, 0.85, nz + hh * 0.1) * 0.5);
      out.lerp(ANHYDRITE, smooth(0.86, 1, hh + (nz - 0.5) * 0.2) * 0.55);
    } else {
      out.copy(MOUND).multiplyScalar(0.8 + 0.6 * nz);
      out.lerp(RUST, smooth(0.55, 0.85, nz) * 0.35 * onMound);
    }
    out.lerp(c1.copy(MOUND).multiplyScalar(1.1), (1 - smooth(0, 0.6, y - 0)) * 0.3 * (1 - best));
    if (ny > 0.85 && best === 0) out.multiplyScalar(1.08);
  });
  projectUVs(geom, 3);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  const full = new THREE.Group();
  full.name = 'smoker-cluster';
  const body = new THREE.Mesh(geom, geoMaterial('rock', d, { roughness: 0.9 }));
  body.name = 'smoker-body';
  full.add(body);

  // ---- instanced life.
  const bounds = geom.boundingBox!.clone();
  const items: InstanceSpec[] = [];
  const wormGeom = shrimp
    ? new THREE.IcosahedronGeometry(1, 0)
    : new THREE.CylinderGeometry(0.04, 0.05, 1, 5, 2).translate(0, 0.5, 0);
  paint(wormGeom, (_x, y, _z, _ny, out) => {
    if (shrimp) out.set(0xf0d6c8);
    else if (y > 0.7) out.set(0xd0303a);
    else out.set(0xeae2d2);
  });
  const perStack = Math.round((shrimp ? 260 : 110) * d.growth);
  for (const s of stacks) {
    for (let i = 0; i < perStack; i++) {
      if (shrimp) {
        const t = 0.12 + rnd() * 0.8;
        const a = rnd() * 6.283;
        const r = s.r0 * (1 - 0.58 * t) * 1.03;
        items.push({
          t: {
            x: s.x + Math.cos(a) * r,
            y: s.y + t * s.h,
            z: s.z + Math.sin(a) * r,
            ry: -a,
            sx: 0.11,
            sy: 0.035,
            sz: 0.035,
          },
        });
      } else {
        const a = rnd() * 6.283;
        const r = s.r0 * (1.1 + rnd() * 2.6);
        const x = s.x + Math.cos(a) * r;
        const z = s.z + Math.sin(a) * r;
        const len = 0.25 + rnd() * 0.55;
        items.push({
          t: {
            x,
            y: mound(x, z) - 0.05,
            z,
            rx: (rnd() - 0.5) * 0.7,
            rz: (rnd() - 0.5) * 0.7,
            sx: 0.8 + rnd() * 0.6,
            sy: len,
            sz: 0.8 + rnd() * 0.6,
          },
        });
      }
    }
  }
  if (items.length) {
    const wm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 });
    full.add(instanced(wormGeom, wm, items, shrimp ? 'shrimp' : 'tubeworms'));
  }
  // Pale bacterial mats: flat cream discs on the mound.
  const matItems: InstanceSpec[] = [];
  const nMats = Math.round(26 * d.growth);
  for (let i = 0; i < nMats; i++) {
    const a = rnd() * 6.283;
    const rr = Math.sqrt(rnd()) * 0.85;
    const x = Math.cos(a) * rr * L * 0.5;
    const z = Math.sin(a) * rr * W * 0.5;
    matItems.push({
      t: {
        x,
        y: mound(x, z) + 0.04,
        z,
        ry: rnd() * 3,
        sx: 0.5 + rnd() * 1.1,
        sz: 0.5 + rnd() * 0.9,
      },
      color: new THREE.Color().copy(MAT).multiplyScalar(0.8 + rnd() * 0.3),
    });
  }
  if (matItems.length) {
    const disc = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
    full.add(
      instanced(
        disc,
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
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
    const smoke = smokePlume(ph, s.r0 * 0.3, Math.round(120 * d.plume), seed + 31 * i);
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

  // ---- colliders and impostor.
  const colliders: THREE.Box3[] = [boxCH(0, moundH * 0.3, 0, L * 0.36, moundH * 0.35, W * 0.36)];
  for (const s of stacks) {
    const lo = s.h * 0.45;
    colliders.push(boxCH(s.x, s.y + lo, s.z, s.r0 * 0.9, lo, s.r0 * 0.9));
    colliders.push(boxCH(s.x, s.y + s.h * 0.78, s.z, s.r0 * 0.55, s.h * 0.22, s.r0 * 0.55));
  }
  const impostor = impostorFromBoxes(colliders, bounds, 0x3b322d);
  return { full, impostor, bounds, colliders };
}
