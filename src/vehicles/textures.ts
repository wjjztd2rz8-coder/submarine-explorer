/**
 * Procedural surface textures for the vehicles (F1-VEHICLES).
 *
 * Everything here is generated into `DataTexture`s from a seeded noise, so it
 * needs no canvas, no download and no attribution, and it runs unchanged in
 * the node unit tests. Three sets are built once and cached for the page:
 *
 * - `foam`: syntactic-foam fairing panels. A 2 m x 2 m tile with staggered
 *   panel seams, fastener rows, soft grime and a little orange-peel bump.
 * - `frame`: painted / anodised frame metal. Mottled roughness and a faint
 *   hammered bump, no seams.
 * - `metal`: titanium and machined parts. Fine brushed streaks.
 *
 * Geometry built by `kit.ts` carries UVs in metres, so a material samples the
 * tile with `repeat = 1 / tileM`.
 */

import * as THREE from 'three';

export interface SurfaceSet {
  /** sRGB albedo multiplier (mostly white, darker in seams and grime). */
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
  /** Metres covered by one texture tile. */
  tileM: number;
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise on a `cells` x `cells` lattice, sampled at 0..1. */
function tileNoise(seed: number, cells: number): (u: number, v: number) => number {
  const r = rng(seed);
  const lattice = new Float32Array(cells * cells);
  for (let i = 0; i < lattice.length; i++) lattice[i] = r();
  const at = (x: number, y: number): number =>
    lattice[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)]!;
  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

/** Tileable fractal noise, 0..1. */
function fbm(seed: number, base: number, octaves: number): (u: number, v: number) => number {
  const layers = Array.from({ length: octaves }, (_, i) => tileNoise(seed + i * 101, base << i));
  return (u, v) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (const n of layers) {
      sum += n(u, v) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

/** Height field -> tangent-space normal map (RGBA8), wrapping at the edges. */
function normalsFromHeight(h: Float32Array, size: number, strength: number): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const at = (x: number, y: number): number =>
    h[((y + size) % size) * size + ((x + size) % size)]!;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      out[i + 3] = 255;
    }
  }
  return out;
}

function dataTexture(data: Uint8Array, size: number, srgb: boolean): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface SurfaceRecipe {
  seed: number;
  size: number;
  tileM: number;
  /** Returns height (for the normal map), albedo 0..1 and roughness 0..1 at u, v. */
  sample: (u: number, v: number) => { h: number; a: number; r: number };
  normalStrength: number;
}

function buildSurface(recipe: SurfaceRecipe): SurfaceSet {
  const { size } = recipe;
  const height = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);
  const rough = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = recipe.sample((x + 0.5) / size, (y + 0.5) / size);
      const i = y * size + x;
      height[i] = s.h;
      const a = Math.round(Math.min(1, Math.max(0, s.a)) * 255);
      albedo[i * 4] = albedo[i * 4 + 1] = albedo[i * 4 + 2] = a;
      albedo[i * 4 + 3] = 255;
      // glTF convention, which three follows: roughness in G, metalness in B.
      const r = Math.round(Math.min(1, Math.max(0, s.r)) * 255);
      rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = r;
      rough[i * 4 + 3] = 255;
    }
  }
  return {
    map: dataTexture(albedo, size, true),
    normalMap: dataTexture(normalsFromHeight(height, size, recipe.normalStrength), size, false),
    roughnessMap: dataTexture(rough, size, false),
    tileM: recipe.tileM,
  };
}

/**
 * Foam fairing: a 2 m tile holding four staggered panels (seams at u = 0 and
 * u = 0.5, with the horizontal seam offset per column), a fastener row 4 cm
 * inside every seam, low-frequency grime and orange-peel paint.
 */
function foamRecipe(): SurfaceRecipe {
  const size = 256;
  const grime = fbm(11, 4, 4);
  const peel = fbm(23, 32, 2);
  const streak = tileNoise(37, 16);
  const px = 1 / size;
  const seamW = 1.4 * px;
  const distToSeam = (u: number, v: number): { d: number; along: number } => {
    const col = u < 0.5 ? 0 : 1;
    const du = Math.min(Math.abs(u - 0), Math.abs(u - 0.5), Math.abs(u - 1));
    const hSeam = col === 0 ? 0.3 : 0.8;
    const dv = Math.min(Math.abs(v - hSeam), Math.abs(v - hSeam + 1), Math.abs(v - hSeam - 1));
    return du < dv ? { d: du, along: v } : { d: dv, along: u };
  };
  return {
    seed: 1,
    size,
    tileM: 2,
    normalStrength: 6,
    sample: (u, v) => {
      const { d, along } = distToSeam(u, v);
      const seam = Math.max(0, 1 - d / seamW);
      // Fasteners: small domes every 6 cm, 4 cm in from the seam.
      const fDist = Math.abs(d - 8 * px);
      const fPhase = (along * size) % 12;
      const fastener =
        fDist < 1.6 * px && Math.abs(fPhase - 6) < 1.6
          ? 1 - Math.hypot(fDist / (1.6 * px), (fPhase - 6) / 1.6)
          : 0;
      const g = grime(u, v);
      const drip = Math.pow(streak(u * 3, v * 0.35), 3);
      const h = -seam * 1.0 + Math.max(0, fastener) * 0.6 + (peel(u, v) - 0.5) * 0.05;
      const a = 0.97 - seam * 0.45 - Math.max(0, g - 0.45) * 0.28 - drip * 0.08;
      const r = 0.52 + (g - 0.5) * 0.24 + seam * 0.25 - Math.max(0, fastener) * 0.2;
      return { h, a, r };
    },
  };
}

function frameRecipe(): SurfaceRecipe {
  const mottle = fbm(51, 8, 4);
  const hammer = fbm(67, 24, 2);
  return {
    seed: 2,
    size: 128,
    tileM: 1,
    normalStrength: 3,
    sample: (u, v) => {
      const m = mottle(u, v);
      return {
        h: (hammer(u, v) - 0.5) * 0.4,
        a: 0.86 + (m - 0.5) * 0.3,
        r: 0.48 + (m - 0.5) * 0.35,
      };
    },
  };
}

function metalRecipe(): SurfaceRecipe {
  const brush = tileNoise(89, 64);
  const brushFine = tileNoise(97, 128);
  const blotch = fbm(103, 4, 3);
  return {
    seed: 3,
    size: 128,
    tileM: 0.5,
    normalStrength: 1.5,
    sample: (u, v) => {
      // Stretched along u: brushed streaks.
      const s = brush(u, v * 0.06) * 0.6 + brushFine(u, v * 0.03) * 0.4;
      const b = blotch(u, v);
      return {
        h: (s - 0.5) * 0.3,
        a: 0.9 + (s - 0.5) * 0.12 - Math.max(0, b - 0.6) * 0.2,
        r: 0.3 + (s - 0.5) * 0.18 + (b - 0.5) * 0.12,
      };
    },
  };
}

let cache: { foam: SurfaceSet; frame: SurfaceSet; metal: SurfaceSet } | null = null;

/** The shared surface textures, built on first use and kept for the page. */
export function vehicleSurfaces(): { foam: SurfaceSet; frame: SurfaceSet; metal: SurfaceSet } {
  cache ??= {
    foam: buildSurface(foamRecipe()),
    frame: buildSurface(frameRecipe()),
    metal: buildSurface(metalRecipe()),
  };
  return cache;
}

let envCache: THREE.DataTexture | null = null;

/**
 * A tiny equirectangular "underwater studio" environment used only by vehicle
 * materials: a soft blue-green overhead, a dark blue horizon and a near-black
 * floor. It gives metals and gloss something to reflect in open water, where
 * the scene itself has no environment. Three.js PMREM-filters it on upload.
 */
export function vehicleEnvironment(): THREE.DataTexture {
  if (envCache) return envCache;
  const w = 64;
  const h = 32;
  const data = new Uint8Array(w * h * 4);
  const top = new THREE.Color(0x6f9fb0);
  const mid = new THREE.Color(0x173446);
  const low = new THREE.Color(0x03080c);
  const c = new THREE.Color();
  for (let y = 0; y < h; y++) {
    // Row 0 is the bottom of the image (DataTexture, flipY false): v = 0 is straight down.
    const el = (y / (h - 1)) * 2 - 1; // -1 down .. +1 up
    for (let x = 0; x < w; x++) {
      if (el > 0) c.copy(mid).lerp(top, Math.pow(el, 0.8));
      else c.copy(mid).lerp(low, Math.pow(-el, 0.6));
      // One soft brighter patch overhead-forward, like a lamp on a companion vehicle.
      const az = (x / w) * Math.PI * 2;
      const patch = Math.exp(-((az - Math.PI) ** 2) * 1.5 - ((el - 0.55) * 3) ** 2);
      c.r += patch * 0.35;
      c.g += patch * 0.4;
      c.b += patch * 0.42;
      const i = (y * w + x) * 4;
      data[i] = Math.min(255, Math.round(c.r * 255));
      data[i + 1] = Math.min(255, Math.round(c.g * 255));
      data[i + 2] = Math.min(255, Math.round(c.b * 255));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  envCache = tex;
  return tex;
}
