/**
 * Canvas-generated detail textures for the geology (no binary assets): neutral
 * grey (luminance only) maps so vertex colours carry the hue. Every map tiles
 * seamlessly and records its mean linear value in `userData.meanLinear`, which
 * the material divides back out. Cached per (kind, size). Without a DOM (unit
 * tests) every factory returns null.
 */

import * as THREE from 'three';
import { mulberry32 } from './shared.js';

export type GeoTexKind = 'rock' | 'flow' | 'pillow' | 'strata' | 'sediment';

/** Texture contrast per kind (0.5 = full range around mid grey); gentle for smooth carbonate and strata. */
const CONTRAST: Record<GeoTexKind, number> = {
  rock: 0.5,
  flow: 0.28,
  pillow: 0.5,
  strata: 0.3,
  sediment: 0.4,
};

const cache = new Map<string, THREE.Texture | null>();

const srgbToLinear = (v: number): number =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

// --------------------------------------------------- periodic noise (tileable)

function hash2(x: number, y: number, seed: number): number {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Value noise on a px x py periodic lattice; u, v in lattice units. */
function pnoise(u: number, v: number, px: number, py: number, seed: number): number {
  const xi = Math.floor(u);
  const yi = Math.floor(v);
  const fx = u - xi;
  const fy = v - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const w = (a: number): number => ((a % px) + px) % px;
  const z = (b: number): number => ((b % py) + py) % py;
  const a = hash2(w(xi), z(yi), seed);
  const b = hash2(w(xi + 1), z(yi), seed);
  const c = hash2(w(xi), z(yi + 1), seed);
  const d = hash2(w(xi + 1), z(yi + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Tileable fBm; (u, v) in [0, 1). */
function pfbm(u: number, v: number, px: number, py: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let fx = px;
  let fy = py;
  for (let i = 0; i < octaves; i++) {
    sum += amp * pnoise(u * fx, v * fy, fx, fy, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    fx *= 2;
    fy *= 2;
  }
  return sum / norm;
}

/** Height field in [0, 1] for a texture kind. */
function heightField(kind: GeoTexKind, size: number, seed: number): Float32Array {
  const h = new Float32Array(size * size);
  const rnd = mulberry32(seed);
  // Worley points for pillows: a 5 x 5 jittered periodic grid.
  const G = 5;
  const pts: [number, number][] = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) pts.push([i + rnd(), j + rnd()]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let val: number;
      switch (kind) {
        case 'rock': {
          const base = pfbm(u, v, 8, 8, 5, seed);
          const crack =
            1 - THREE.MathUtils.smoothstep(Math.abs(pfbm(u, v, 5, 5, 3, seed + 9) - 0.5), 0, 0.02);
          val = base * 0.9 - crack * 0.14 + 0.1;
          break;
        }
        case 'flow': {
          // Flowstone: vertical drips and ridges.
          const streak = pfbm(u, v, 14, 2, 4, seed);
          const ridge =
            0.5 + 0.5 * Math.sin((v * 3 + pfbm(u, v, 3, 2, 3, seed + 5) * 2.2) * Math.PI * 2);
          val = streak * 0.65 + ridge * 0.25 + 0.1;
          break;
        }
        case 'pillow': {
          const gx = u * G;
          const gy = v * G;
          let f1 = 9;
          let f2 = 9;
          for (const [px, py] of pts) {
            for (const ox of [-G, 0, G]) {
              for (const oy of [-G, 0, G]) {
                const dx = gx - (px + ox);
                const dy = gy - (py + oy);
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < f1) {
                  f2 = f1;
                  f1 = d;
                } else if (d < f2) f2 = d;
              }
            }
          }
          const bulge = 1 - THREE.MathUtils.smoothstep(f1, 0, 0.75);
          const seam = THREE.MathUtils.smoothstep(f2 - f1, 0, 0.12);
          val =
            (0.25 + 0.7 * bulge) * (0.3 + 0.7 * seam) +
            (pfbm(u, v, 12, 12, 3, seed + 3) - 0.5) * 0.18;
          break;
        }
        case 'strata': {
          const band =
            0.5 + 0.5 * Math.sin((v * 3 + pfbm(u, v, 4, 1, 3, seed) * 1.6) * Math.PI * 2);
          val = band * 0.5 + pfbm(u, v, 10, 10, 4, seed + 1) * 0.45 + 0.05;
          break;
        }
        default: {
          val = pfbm(u, v, 8, 8, 4, seed) * 0.6 + pfbm(u, v, 24, 24, 2, seed + 4) * 0.4;
        }
      }
      h[y * size + x] = Math.min(1, Math.max(0, val));
    }
  }
  return h;
}

/** Neutral grey detail texture, or null without a DOM. */
export function detailTexture(kind: GeoTexKind, size: number): THREE.Texture | null {
  const key = `${kind}:${size}`;
  if (cache.has(key)) return cache.get(key)!;
  let tex: THREE.Texture | null = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    if (ctx) {
      const h = heightField(kind, size, 0x9e01 + kind.length * 101);
      const contrast = CONTRAST[kind];
      const img = ctx.createImageData(size, size);
      let sum = 0;
      for (let i = 0; i < h.length; i++) {
        const g = 1 - contrast + contrast * h[i]!;
        const b = Math.round(g * 255);
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = b;
        img.data[i * 4 + 3] = 255;
        sum += srgbToLinear(g);
      }
      ctx.putImageData(img, 0, 0);
      tex = new THREE.CanvasTexture(c);
      tex.userData.meanLinear = sum / h.length;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 4;
    }
  }
  cache.set(key, tex);
  return tex;
}

/** Soft round sprite for particles, or null without a DOM. */
export function softDot(): THREE.Texture | null {
  const key = 'dot';
  if (cache.has(key)) return cache.get(key)!;
  let tex: THREE.Texture | null = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      tex = new THREE.CanvasTexture(c);
    }
  }
  cache.set(key, tex);
  return tex;
}
