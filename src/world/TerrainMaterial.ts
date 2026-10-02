/**
 * The seabed material: a `MeshStandardMaterial` with a biome-driven PBR
 * triplanar blend patched in through `onBeforeCompile`.
 *
 * Why patch instead of a raw ShaderMaterial: the scene's exponential fog, the
 * sub's spotlight, the ambient/directional rig and the filmic tone mapping all
 * come for free from Three's standard lighting chunks, and keep following
 * `Water.ts` and the post stack when they change.
 *
 * Textures are three slots (A soft bottom, B patch, C hard substrate) filled by
 * the site's `Biome` (`TerrainBiome.ts`) from five CC0 sets shipped as compact
 * JPGs in `public/assets/terrain/` (ambientCG and Poly Haven, see
 * ATTRIBUTION.md; packed by tools/make_terrain_textures.py). `<set>_a.jpg` is a
 * luminance pattern with AO baked in, `<set>_n.jpg` holds tangent normal x/y and
 * roughness. They load asynchronously; until each arrives a neutral 1x1
 * placeholder stands in, so the sea floor is never black and a slow network only
 * delays the fine detail. Under Node (unit tests) nothing is fetched.
 * Tier switches: `pbrNormals` compiles the normal path and loads the `_n` maps;
 * `textureBreakup` adds the second larger albedo sample.
 */

import * as THREE from 'three';
import type { GraphicsTier, TerrainConfig } from '../core/Config.js';
import { publicUrl } from '../util/publicUrl.js';
import vertGlsl from '../shaders/terrain.vert.glsl?raw';
import fragGlsl from '../shaders/terrain.frag.glsl?raw';
import { SET_CONTRAST, type Biome, type TerrainSet } from './TerrainBiome.js';

export interface TerrainMaterialOptions {
  config: TerrainConfig;
  tier: GraphicsTier;
  biome: Biome;
  /** Vertical exaggeration, so the shader can recover true depth from world Y. */
  exaggeration: number;
}

export interface TerrainMaterialResult {
  material: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  /** Edge length of the shipped albedo textures, for the debug readout. */
  textureSize: number;
  /** The site's slot C (hard substrate) albedo, resolved once loaded; null under Node. */
  rockTexture: Promise<THREE.Texture | null>;
}

export function createTerrainMaterial(opts: TerrainMaterialOptions): TerrainMaterialResult {
  const { config, tier, biome, exaggeration } = opts;
  const tierCfg = config.tiers[tier];
  const textures: THREE.Texture[] = [];
  const loadable = typeof document !== 'undefined';
  let rockTexture: Promise<THREE.Texture | null> = Promise.resolve(null);

  const albPlaceholder = solidTexture(128, 128, 128);
  const nrPlaceholder = solidTexture(128, 128, 210);
  textures.push(albPlaceholder, nrPlaceholder);

  const uniforms: Record<string, THREE.IUniform> = {
    tAlbA: { value: albPlaceholder },
    tNrmA: { value: nrPlaceholder },
    tAlbB: { value: albPlaceholder },
    tNrmB: { value: nrPlaceholder },
    tAlbC: { value: albPlaceholder },
    tNrmC: { value: nrPlaceholder },
    uColA: { value: new THREE.Color(biome.colorA) },
    uColB: { value: new THREE.Color(biome.colorB) },
    uColC: { value: new THREE.Color(biome.colorC) },
    uStain: { value: new THREE.Color(biome.stain) },
    uStainAmount: { value: biome.stainAmount },
    uPatch: { value: biome.patch },
    uRipple: { value: biome.ripple },
    uRippleLen: { value: biome.rippleLenM },
    uRippleDir: { value: new THREE.Vector2(Math.cos(biome.rippleDir), Math.sin(biome.rippleDir)) },
    uBurrow: { value: biome.burrow },
    uRockBias: { value: biome.rockBias },
    uTexScale: { value: config.materialTextureScaleM },
    uMacroScale: { value: config.materialMacroScaleM },
    uNormalStrength: { value: config.materialNormalStrength * (biome.detail ?? 1) },
    uFadeNormal: { value: new THREE.Vector2(...config.detailFadeNormalM) },
    uFadeRipple: { value: new THREE.Vector2(...config.detailFadeRippleM) },
    uFadeBurrow: { value: new THREE.Vector2(...config.detailFadeBurrowM) },
    uContrast: {
      value: new THREE.Vector3(
        SET_CONTRAST[biome.a],
        SET_CONTRAST[biome.b],
        SET_CONTRAST[biome.c],
      ).multiplyScalar(config.materialContrast * (biome.contrast ?? 1)),
    },
    uRockLo: { value: 1 - Math.cos((config.rockSlopeLoDeg * Math.PI) / 180) },
    uRockHi: { value: 1 - Math.cos((config.rockSlopeHiDeg * Math.PI) / 180) },
    uExaggeration: { value: exaggeration },
  };

  if (loadable) {
    const slots: Array<[string, string, TerrainSet]> = [
      ['tAlbA', 'tNrmA', biome.a],
      ['tAlbB', 'tNrmB', biome.b],
      ['tAlbC', 'tNrmC', biome.c],
    ];
    const cache = new Map<string, Promise<THREE.Texture>>();
    const fetch = (file: string, srgb: boolean, uniform: string): Promise<THREE.Texture> => {
      let p = cache.get(file);
      if (!p) {
        const tex = loadSeabedTexture(file, srgb);
        textures.push(tex);
        p = tex.userData.ready as Promise<THREE.Texture>;
        cache.set(file, p);
      }
      // Bind only once the image is there: an unloaded texture samples as black.
      void p.then((tex) => {
        (uniforms[uniform] as THREE.IUniform).value = tex;
      });
      return p;
    };
    for (const [ua, un, set] of slots) {
      const p = fetch(`${set}_a.jpg`, true, ua);
      if (ua === 'tAlbC') rockTexture = p;
      if (tierCfg.pbrNormals) void fetch(`${set}_n.jpg`, false, un);
    }
  }

  const vert = splitSections(vertGlsl, ['@body']);
  const frag = splitSections(fragGlsl, ['@albedo', '@rough', '@normal']);
  const defines: string[] = [];
  if (tierCfg.pbrNormals) defines.push('#define TERRAIN_PBR_NORMALS');
  if (tierCfg.textureBreakup) defines.push('#define TERRAIN_BREAKUP');

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.FrontSide,
  });
  material.name = 'seabed';
  material.userData.uniforms = uniforms;
  material.customProgramCacheKey = () => `seabed-${defines.join('')}`;

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
    shader.fragmentShader = defines.join('\n') + '\n' + frag.head + '\n' + frg;
  };

  return { material, textures, textureSize: tierCfg.textureSize, rockTexture };
}

/** A 1x1 stand-in shown until the real map arrives. */
function solidTexture(r: number, g: number, b: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Start loading one packed seabed map; the returned texture fills in when it arrives. */
function loadSeabedTexture(file: string, srgb: boolean): THREE.Texture {
  const tex = new THREE.Texture();
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.userData.ready = new Promise<THREE.Texture>((resolve) => {
    const img = new Image();
    img.onload = () => {
      tex.image = img;
      tex.needsUpdate = true;
      resolve(tex);
    };
    // A missing map leaves the neutral placeholder in place.
    img.onerror = () => console.warn(`[terrain] could not load seabed map ${file}`);
    img.src = publicUrl(`assets/terrain/${file}`);
  });
  return tex;
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
