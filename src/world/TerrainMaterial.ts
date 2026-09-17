/**
 * The seabed material: a `MeshStandardMaterial` with triplanar texturing and a
 * depth-ramp LUT patched in through `onBeforeCompile`.
 *
 * Why patch instead of a raw ShaderMaterial: the scene's exponential fog, the
 * sub's spotlight, the ambient/directional rig and ACES tone mapping all come
 * for free from Three's standard lighting chunks. Re-implementing them in a
 * custom shader would be a large amount of code for no gain, and would break the
 * moment `Water.ts` (A2) changes the lighting model.
 *
 * Textures are generated procedurally as `DataTexture`s rather than downloaded.
 * `docs/assets.md` lists CC0 sets on Poly Haven / ambientCG, but (a) the brief
 * allows procedural when download is problematic and this build has no network
 * at asset-fetch time, (b) generated noise tiles seamlessly by construction,
 * which matters a lot for a surface the player flies 5 m above, (c) it keeps the
 * repo free of binary assets and the attribution surface at zero, and (d) it is
 * `document`-free, so the unit tests can still construct a Terrain under Node.
 * Swapping in real PBR maps later is a change to `makeSeabedTexture` only.
 */

import * as THREE from 'three';
import type { GraphicsTier, TerrainConfig } from '../core/Config.js';
import vertGlsl from '../shaders/terrain.vert.glsl?raw';
import fragGlsl from '../shaders/terrain.frag.glsl?raw';
import { valueNoise2 } from './TerrainNoise.js';

/** Mean luminance the generated albedo textures are centred on. */
const ALBEDO_MEAN = 0.85;

export interface TerrainMaterialOptions {
  config: TerrainConfig;
  tier: GraphicsTier;
  /** Vertical exaggeration, so the shader can recover true depth from world Y. */
  exaggeration: number;
  /** Depth -> colour, used to bake the ramp LUT. Normally `Terrain.colorForDepth`. */
  colorForDepth: (depth: number, out: THREE.Color) => THREE.Color;
  /** Deepest and shallowest ramp stops, in metres. */
  rampMinDepth: number;
  rampMaxDepth: number;
}

export interface TerrainMaterialResult {
  material: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  /** Edge length of the generated albedo textures, for the debug readout. */
  textureSize: number;
}

export function createTerrainMaterial(opts: TerrainMaterialOptions): TerrainMaterialResult {
  const { config, tier, exaggeration } = opts;
  const size = config.tiers[tier].textureSize;

  // Warm grey silt, dark blue-grey basalt, bright carbonate sand. These are
  // modulation patterns, not colours: the hue comes from the depth ramp.
  const sediment = makeSeabedTexture(size, 0.14, 2.5, 4, 11, [1.0, 0.99, 0.96]);
  const rock = makeSeabedTexture(size, 0.34, 1.2, 5, 27, [0.94, 0.96, 1.0]);
  const sand = makeSeabedTexture(size, 0.1, 5.0, 3, 53, [1.03, 1.0, 0.93]);
  const grad = makeGradientTexture(size, 3.0, 4, 71);
  const ramp = makeRampTexture(opts);

  const uniforms: Record<string, THREE.IUniform> = {
    tSediment: { value: sediment },
    tRock: { value: rock },
    tSand: { value: sand },
    tDetailGrad: { value: grad },
    tRamp: { value: ramp },
    uTexScale: { value: config.materialTextureScaleM },
    uGradScale: { value: config.materialGradScaleM },
    uNormalStrength: { value: config.materialNormalStrength },
    uAlbedoGain: { value: 1 / ALBEDO_MEAN },
    uCosRockStart: { value: Math.cos((config.rockSlopeHiDeg * Math.PI) / 180) },
    uCosRockEnd: { value: Math.cos((config.rockSlopeLoDeg * Math.PI) / 180) },
    uSandDeep: { value: config.sandDepthDeep },
    uSandShallow: { value: config.sandDepthShallow },
    uRampMinDepth: { value: opts.rampMinDepth },
    uRampSpan: { value: opts.rampMaxDepth - opts.rampMinDepth },
    uExaggeration: { value: exaggeration },
  };

  const vert = splitSections(vertGlsl, ['@body']);
  const frag = splitSections(fragGlsl, ['@albedo', '@rough', '@normal']);

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.96,
    metalness: 0.02,
    side: THREE.FrontSide,
  });
  material.name = 'seabed';
  material.userData.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    // Inject into Three's source FIRST, then prepend our declarations. Doing it
    // the other way round would let the `#include <...>` names quoted in the
    // .glsl header comments win the `String.replace` race.
    shader.vertexShader =
      vert.head + '\n' + after(shader.vertexShader, 'begin_vertex', vert.sections[0] as string);
    let frg = after(shader.fragmentShader, 'map_fragment', frag.sections[0] as string);
    frg = after(frg, 'roughnessmap_fragment', frag.sections[1] as string);
    frg = after(frg, 'normal_fragment_begin', frag.sections[2] as string);
    shader.fragmentShader = frag.head + '\n' + frg;
  };

  return { material, textures: [sediment, rock, sand, grad, ramp], textureSize: size };
}

/** Insert `code` immediately after a Three shader chunk include. */
function after(source: string, chunk: string, code: string): string {
  const tag = `#include <${chunk}>`;
  if (!source.includes(tag)) {
    throw new Error(`terrain material: Three's shader no longer contains ${tag}`);
  }
  return source.replace(tag, `${tag}\n${code}`);
}

/**
 * Split a .glsl file on `// @marker` lines. Everything before the first marker is
 * the declaration block; each following span is one injection site.
 */
function splitSections(source: string, markers: string[]): { head: string; sections: string[] } {
  let rest = source;
  const sections: string[] = [];
  const head = cut(markers[0] as string);
  for (let i = 1; i < markers.length; i++) sections.push(cut(markers[i] as string));
  sections.push(rest);
  return { head, sections };

  function cut(marker: string): string {
    // The marker must be a line of its own; the files mention the markers in
    // their own header comments, and those must not be mistaken for one.
    const re = new RegExp(`^[ \\t]*// ${marker}[ \\t]*$`, 'm');
    const m = re.exec(rest);
    if (!m) throw new Error(`terrain shader is missing the "${marker}" marker line`);
    const before = rest.slice(0, m.index);
    rest = rest.slice(m.index + m[0].length);
    return before;
  }
}

// --------------------------------------------------------------- generators

/** Seamlessly tiling value noise: the lattice wraps every `period` units. */
function tilingNoise(x: number, y: number, period: number, octaves: number, seed: number): number {
  let sum = 0;
  let norm = 0;
  let amp = 1;
  let p = period;
  for (let o = 0; o < octaves; o++) {
    // Wrapping the sample coordinate into [0, period) gives a torus-periodic
    // lattice because valueNoise2's hash is only ever fed integer corners.
    sum += amp * wrappedValueNoise(x * p, y * p, p, seed + o * 7919);
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return norm > 0 ? sum / norm : 0.5;
}

function wrappedValueNoise(x: number, y: number, period: number, seed: number): number {
  const wrap = (v: number): number => ((v % period) + period) % period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  // valueNoise2 evaluates the same hash at integer corners; sampling it at the
  // wrapped corner keeps tiling exact.
  const a = valueNoise2(wrap(ix) + 0.5, wrap(iy) + 0.5, seed);
  const b = valueNoise2(wrap(ix + 1) + 0.5, wrap(iy) + 0.5, seed);
  const c = valueNoise2(wrap(ix) + 0.5, wrap(iy + 1) + 0.5, seed);
  const d = valueNoise2(wrap(ix + 1) + 0.5, wrap(iy + 1) + 0.5, seed);
  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;
  return top + (bottom - top) * uy;
}

/**
 * A tiling albedo modulation map centred on ALBEDO_MEAN.
 * `contrast` is the peak deviation, `baseFreq` the lattice period at octave 0.
 */
function makeSeabedTexture(
  size: number,
  contrast: number,
  baseFreq: number,
  octaves: number,
  seed: number,
  tint: [number, number, number],
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = tilingNoise(x / size, y / size, baseFreq, octaves, seed) * 2 - 1;
      const v = ALBEDO_MEAN * (1 + contrast * n);
      const i = (y * size + x) * 4;
      data[i] = clamp255(v * tint[0] * 255);
      data[i + 1] = clamp255(v * tint[1] * 255);
      data[i + 2] = clamp255(v * tint[2] * 255);
      data[i + 3] = 255;
    }
  }
  return finishTexture(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
}

/**
 * A tiling slope map: R and G hold d(height)/dx and d(height)/dy of a noise
 * field, biased to 0.5. The fragment shader adds them to the surface gradient,
 * which is the cheapest correct way to bump a height field.
 */
function makeGradientTexture(
  size: number,
  baseFreq: number,
  octaves: number,
  seed: number,
): THREE.DataTexture {
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      height[y * size + x] = tilingNoise(x / size, y / size, baseFreq, octaves, seed);
    }
  }
  const data = new Uint8Array(size * size * 4);
  // Scaled so a full-contrast feature yields roughly a +-1 slope before the
  // shader's uNormalStrength.
  const gain = size / 24;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = (x - 1 + size) % size;
      const xr = (x + 1) % size;
      const yu = (y - 1 + size) % size;
      const yd = (y + 1) % size;
      const gx = ((height[y * size + xr] as number) - (height[y * size + xl] as number)) * gain;
      const gy = ((height[yd * size + x] as number) - (height[yu * size + x] as number)) * gain;
      const i = (y * size + x) * 4;
      data[i] = clamp255((gx * 0.5 + 0.5) * 255);
      data[i + 1] = clamp255((gy * 0.5 + 0.5) * 255);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return finishTexture(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
}

/** 256x1 depth -> colour LUT, replacing the per-vertex colour attribute. */
function makeRampTexture(opts: TerrainMaterialOptions): THREE.DataTexture {
  const n = 256;
  const data = new Uint8Array(n * 4);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const depth = opts.rampMinDepth + ((opts.rampMaxDepth - opts.rampMinDepth) * i) / (n - 1);
    opts.colorForDepth(depth, c);
    // The shader decodes sRGB itself, so store the display-referred bytes: an
    // 8-bit linear LUT would band badly at the dark abyssal end.
    data[i * 4] = clamp255(linearToSrgb(c.r) * 255);
    data[i * 4 + 1] = clamp255(linearToSrgb(c.g) * 255);
    data[i * 4 + 2] = clamp255(linearToSrgb(c.b) * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function finishTexture(tex: THREE.DataTexture): THREE.DataTexture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  // These are multipliers and slopes, not colours: keep them out of the sRGB path.
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}
