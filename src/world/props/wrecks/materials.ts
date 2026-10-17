/**
 * Shared wreck materials and the weathering paint pass.
 *
 * Materials are cached per (kind, tier detail), so every wreck and scatter kit
 * on a site shares one steel, one wood, one void and one growth material:
 * fewer shader programs and state changes. All are MeshStandardMaterial (or
 * basic, for the unlit void) so fog and the headlights act on them like the
 * terrain; none of them glow (art-direction §4).
 *
 * The paint pass turns each piece's base colour (black hull paint, white
 * superstructure paint, grey warship paint, teak, varnished oak) into a
 * weathered one: rust blotches and gravity-fed streaks, patchy growth, a
 * darker mud line and silt on up-facing surfaces. It is a pure function of
 * position and normal, so it is deterministic and testable headlessly.
 */

import * as THREE from 'three';
import type { WreckDetail } from './detail.js';
import { steelMaps, woodMaps } from './textures.js';
import { valueNoise3 } from './shared.js';

const cache = new Map<string, THREE.Material>();

function cachedMat<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

/** Wreck palette (art-direction §0 plus the paint colours of the real ships). */
export const WRECK_COLORS = {
  rust: 0x7a3b22,
  rustDark: 0x3e1c10,
  rustOrange: 0xa2542c,
  growth: 0x4e5a3e,
  silt: 0x5e554b,
  mud: 0x3d352e,
  blackPaint: 0x2a2320, // Titanic / Endurance hull
  whitePaint: 0x9c8468, // Titanic superstructure, a century on: rust-stained tan
  greyPaint: 0x5d5e5b, // Kriegsmarine grey
  teak: 0x6f6454, // weathered deck planking
  oak: 0x4a3a2a, // varnished rails and deckhouses, darkened
  interior: 0x120c09, // torn-open decks and holds
  brass: 0x8a7440,
} as const;

function withMean(mat: THREE.MeshStandardMaterial, map: THREE.Texture | null): void {
  const mean = (map?.userData as { meanLinear?: number } | undefined)?.meanLinear ?? 1;
  mat.color.setScalar(1 / Math.max(0.2, mean));
}

/**
 * Plate-scale tone and rust streaks in texture space, on top of the vertex paint
 * (too coarse to resolve a plate at close range). One cell = one plate of the
 * detail map (four strakes, two plates per repeat; see `steelMaps`): its own brightness and
 * saturation, a darker stain band under the upper seam and thin rust streaks
 * running down. A handful of ALU ops per fragment, identical on every tier.
 */
function plateStains(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), f.x),
             mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
#ifdef USE_MAP
{
  vec2 g = vec2(vMapUv.x * 2.0, vMapUv.y * 4.0);
  vec2 cell = vec2(floor(g.x + floor(g.y) * 0.37), floor(g.y));
  float h1 = pHash(cell);
  float h2 = pHash(cell + 17.3);
  float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  // Per-plate brightness; some plates bleached grey-brown, a few sprung dark.
  float tone = 0.7 + 0.5 * h1 - 0.25 * smoothstep(0.82, 0.97, h2);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum), (0.3 + 0.35 * smoothstep(0.3, 0.9, h2))) * tone * vec3(1.0, 0.95, 0.9);
  // Stain band below the plate's upper seam, and long thin streaks running down.
  float down = 1.0 - fract(g.y);
  float band = smoothstep(0.0, 0.5, down) * (1.0 - smoothstep(0.5, 1.0, down));
  float streak = pNoise(vec2(vMapUv.x * 50.0, vMapUv.y * 3.0 + h1 * 9.0));
  float stain = clamp(band * (0.35 + h2) * 0.5 + smoothstep(0.6, 0.95, streak) * 0.4, 0.0, 0.75);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.09, 0.05), stain);
}
#endif`,
      );
  };
  mat.customProgramCacheKey = () => 'wreck-steel-plates';
}

/** Rusted steel: vertex colours carry the hue; a neutral riveted-plate map adds detail. */
export function steelMaterial(detail: WreckDetail): THREE.MeshStandardMaterial {
  return cachedMat(`steel:${detail.textureSize}:${detail.normalMap}`, () => {
    const maps = steelMaps(detail.textureSize, detail.normalMap);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: maps?.map ?? null,
      normalMap: maps?.normal ?? null,
      roughness: 0.9,
      metalness: 0.12,
    });
    if (mat.normalMap) mat.normalScale.set(0.8, 0.8);
    withMean(mat, mat.map);
    if (mat.map) plateStains(mat);
    mat.name = 'wreck-steel';
    return mat;
  });
}

/** Wooden planking (Endurance hull and decks, Bismarck's teak). */
export function woodMaterial(detail: WreckDetail): THREE.MeshStandardMaterial {
  return cachedMat(`wood:${detail.textureSize}:${detail.normalMap}`, () => {
    const maps = woodMaps(detail.textureSize, detail.normalMap);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: maps?.map ?? null,
      normalMap: maps?.normal ?? null,
      roughness: 0.95,
      metalness: 0,
    });
    if (mat.normalMap) mat.normalScale.set(0.6, 0.6);
    withMean(mat, mat.map);
    mat.name = 'wreck-wood';
    return mat;
  });
}

/** Untextured vertex-coloured material for small instanced fittings, debris and railings. */
export function fittingMaterial(): THREE.MeshStandardMaterial {
  return cachedMat('fitting', () => {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.15,
    });
    m.name = 'wreck-fitting';
    return m;
  });
}

/** Mud and slide blocks: vertex-coloured, fully rough, not metallic. */
export function sedimentMaterial(): THREE.MeshStandardMaterial {
  return cachedMat('sediment', () => {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 1,
      metalness: 0,
    });
    m.name = 'wreck-sediment';
    return m;
  });
}

/** Rusticles and sessile animals: soft, matte, vertex + instance coloured. */
export function growthMaterial(): THREE.MeshStandardMaterial {
  return cachedMat('growth', () => {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.97,
      metalness: 0,
    });
    m.name = 'wreck-growth';
    return m;
  });
}

/** Near-black for openings into the hull (Grand Staircase well, barbettes, hatches). Fogged. */
export function voidMaterial(): THREE.MeshBasicMaterial {
  return cachedMat('void', () => {
    const m = new THREE.MeshBasicMaterial({ color: 0x030202 });
    m.name = 'wreck-void';
    return m;
  });
}

/** Flat material for the far silhouette. */
export function silhouetteMaterial(color: number): THREE.MeshStandardMaterial {
  return cachedMat(`sil:${color}`, () => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.05 });
    m.name = 'wreck-silhouette';
    return m;
  });
}

// ------------------------------------------------------------------ paint

interface PaintOptions {
  seed: number;
  /** 0 = original paint shows through, 1 = rust everywhere. */
  rustiness: number;
  /** Strength of the patchy growth overlay (0..1). */
  growth: number;
  /** Silt on up-facing surfaces (0..1). */
  silt: number;
  /** Height of the darker mud-splashed band above y = 0 (m). */
  mudBand: number;
  /**
   * Plate-by-plate variation for riveted hulls: (plate height m, plate length m,
   * strength 0..1). Each staggered plate gets its own tone and rust, with a
   * few plates sprung darker, so the strakes stop repeating.
   */
  plates?: readonly [number, number, number];
  /**
   * Pull the weathered colour toward a grey-brown of the same brightness (0..1),
   * for hulls whose orange rust reads too warm under the lights.
   */
  muted?: number;
  /** Wood keeps its grain colour; no rust streaking. */
  wood?: boolean;
  /**
   * Strake-by-strake plank colour on top of `wood`: tannin-stained brown to
   * bleached grey, with long patches along the hull (mean brightness kept).
   */
  plankTone?: boolean;
  /** Extra per-vertex brightness multiplier (the dark torn interior, say). */
  shadeAt?: (x: number, y: number, z: number) => number;
}

const _base = new THREE.Color();
const _c = new THREE.Color();
const _r = new THREE.Color();
const RUST = new THREE.Color(WRECK_COLORS.rust);
const RUST_DARK = new THREE.Color(WRECK_COLORS.rustDark);
const RUST_ORANGE = new THREE.Color(WRECK_COLORS.rustOrange);
const GROWTH = new THREE.Color(WRECK_COLORS.growth);
const SILT = new THREE.Color(WRECK_COLORS.silt);
const MUD = new THREE.Color(WRECK_COLORS.mud);
/** Plank tone multipliers: tannin-stained oak, and silvery weathered grey. */
const TANNIN = new THREE.Color(0.7, 0.54, 0.4);
const GREY = new THREE.Color(1.08, 1.12, 1.15);

/**
 * Weather the base colours of a merged wreck geometry in place (its `color`
 * attribute). Pure maths on position and normal.
 */
export function paintWreck(geom: THREE.BufferGeometry, o: PaintOptions): void {
  const pos = geom.getAttribute('position');
  const nrm = geom.getAttribute('normal');
  const col = geom.getAttribute('color') as THREE.BufferAttribute;
  const S = THREE.MathUtils.smoothstep;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    _base.fromBufferAttribute(col, i);
    const big = valueNoise3(x * 0.07, y * 0.07, z * 0.07, o.seed);
    const mid = valueNoise3(x * 0.35, y * 0.35, z * 0.35, o.seed ^ 0x1b);
    // Vertical streaks: fast across, slow down the height.
    const streak = valueNoise3(x * 1.3 + 3.1, y * 0.06, z * 1.3, o.seed ^ 0x77);
    if (o.wood) {
      _c.copy(_base).multiplyScalar(0.75 + 0.45 * mid);
      if (o.plankTone) {
        // Each strake (0.45 m of height) has its own tone; slow patches run along the hull.
        const strake = valueNoise3(Math.floor(y / 0.45) * 7.13 + 0.5, 1.5, 2.5, o.seed ^ 0x3c);
        const patch = valueNoise3(x * 0.1, y * 0.05, z * 0.16, o.seed ^ 0x6d);
        _r.copy(TANNIN).lerp(GREY, S(0.55 * strake + 0.45 * patch, 0.3, 0.7));
        _c.multiply(_r);
      }
    } else {
      const rustMix = THREE.MathUtils.clamp(
        o.rustiness + (big - 0.5) * 0.9 + (streak - 0.5) * 0.5,
        0,
        1,
      );
      _r.copy(RUST_DARK)
        .lerp(RUST, S(mid, 0.15, 0.6))
        .lerp(RUST_ORANGE, S(streak, 0.62, 0.92) * 0.8);
      _c.copy(_base)
        .lerp(_r, rustMix)
        .multiplyScalar(0.8 + 0.35 * mid);
    }
    // Before the plates, so their rust and sprung-dark tints keep their hue.
    if (o.muted) {
      const lum = _c.r * 0.3 + _c.g * 0.59 + _c.b * 0.11;
      _c.lerp(_r.setRGB(lum * 0.9, lum * 0.89, lum * 0.82), o.muted);
    }
    if (o.plates) {
      const [ph, pl, amt] = o.plates;
      const row = Math.floor(y / ph);
      // Stagger each row; hull length runs along z, width folds in via x.
      const along = Math.floor((z + x * 0.5) / pl + row * 0.37);
      const h = valueNoise3(row * 7.7 + 0.5, along * 3.1 + 0.5, 4.5, o.seed ^ 0x2d);
      const h2 = valueNoise3(row * 2.3 + 9.5, along * 5.9 + 0.5, 1.5, o.seed ^ 0x4e);
      _c.multiplyScalar(0.74 + amt * (h - 0.5) * 0.9);
      _c.lerp(RUST_DARK, amt * S(h2, 0.55, 0.85) * 0.6);
      _c.lerp(RUST_ORANGE, amt * S(h2, 0.1, 0.32) * 0.3);
    }
    const g = S(valueNoise3(x * 0.12, y * 0.2, z * 0.12, o.seed ^ 0x9e), 0.58, 0.85) * o.growth;
    _c.lerp(GROWTH, g * 0.7);
    // Mud line: a dark splashed band near the seabed, darkest at y = 0.
    if (o.mudBand > 0) {
      const edge = o.mudBand * (0.7 + 0.6 * big);
      const m = 1 - S(y, 0, edge);
      if (m > 0) _c.lerp(MUD, m * 0.85).multiplyScalar(1 - 0.35 * m);
    }
    const up = S(nrm.getY(i), 0.55, 0.9);
    if (up > 0 && o.silt > 0) {
      _c.lerp(
        SILT,
        up * o.silt * (0.35 + 0.65 * valueNoise3(x * 0.11, 5.3, z * 0.11, o.seed ^ 0x5)),
      );
    }
    if (o.shadeAt) _c.multiplyScalar(o.shadeAt(x, y, z));
    col.setXYZ(i, _c.r, _c.g, _c.b);
  }
  col.needsUpdate = true;
}
