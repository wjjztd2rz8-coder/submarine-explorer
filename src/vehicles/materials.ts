/**
 * Vehicle materials (F1-VEHICLES).
 *
 * One small set per built vehicle, one material per "slot". `kit.ts` merges
 * every static part by slot, so the slot count is the static draw-call count.
 *
 * Readability in dark water. Below ~300 m the only light is the boat's own,
 * and it points away from the hull, so a physically lit model is a black
 * cut-out (QA-B #6). Documentary footage solves this with a light on the
 * camera; the lit slots do the same in the shader:
 *
 * - a soft "camera key": a view-space light from above and behind the camera
 *   that shades albedo (with a small gloss term), so the livery, panel lines
 *   and shape read at chase distance;
 * - the fresnel rim from `Config.submarine.hullRim*`, which separates the
 *   silhouette from the seabed and the water behind it.
 *
 * Both are added to the emissive term, so they cost no scene lights and do
 * not light the terrain. `VehicleLook.key` scales the key for the preview.
 */

import * as THREE from 'three';
import { vehicleEnvironment, vehicleSurfaces, type SurfaceSet } from './textures.js';
import type { HullPaint } from '../game/Cosmetics.js';

/** Material slots. Static geometry is merged per slot. */
export type Slot =
  | 'foam' // syntactic-foam fairings (vertex colours carry the livery)
  | 'frame' // painted frame, skids, ducts, arms (vertex colours)
  | 'metal' // titanium sphere, machined housings, hubs
  | 'lens' // lamp lenses: follow the headlights on/off
  | 'glow' // viewport interior, screens, status LEDs: always on
  | 'decal' // hull numbers and badges (canvas atlas)
  | 'acrylic'; // Class A transparent pressure sphere

export interface VehicleLook {
  /** Fresnel rim colour and strength (Config.submarine.hullRim*). 0 disables. */
  rimColor: number;
  rimStrength: number;
  /** Constant emissive floor (Config.submarine.hullEmissive). */
  emissive: number;
  /** Camera-key strength, 0..1. */
  key: number;
}

export const DEFAULT_LOOK: VehicleLook = {
  rimColor: 0x6f93a3,
  rimStrength: 0.55,
  emissive: 0x0b1318,
  key: 0.55,
};

/** Shared uniforms: every lit vehicle material points at the same objects. */
export interface LitUniforms {
  uRimColor: { value: THREE.Color };
  uKeyColor: { value: THREE.Color };
  uKeyDir: { value: THREE.Vector3 };
}

function litUniforms(look: VehicleLook): LitUniforms {
  return {
    uRimColor: { value: new THREE.Color(look.rimColor).multiplyScalar(look.rimStrength) },
    // Slightly cool key, like an HMI on a companion vehicle filtered by water.
    uKeyColor: { value: new THREE.Color(0xcfe6f0).multiplyScalar(look.key) },
    uKeyDir: { value: new THREE.Vector3(0.35, 0.82, 0.45).normalize() },
  };
}

/**
 * Inject the camera key and rim into a standard material. `normal`,
 * `vViewPosition`, `diffuseColor`, `roughnessFactor` and `metalnessFactor` are
 * all in scope at `emissivemap_fragment` in MeshStandard/MeshPhysical.
 */
function addKeyAndRim(mat: THREE.MeshStandardMaterial, u: LitUniforms, rimScale = 1): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = u.uRimColor;
    shader.uniforms.uKeyColor = u.uKeyColor;
    shader.uniforms.uKeyDir = u.uKeyDir;
    shader.uniforms.uRimScale = { value: rimScale };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uRimColor;\nuniform vec3 uKeyColor;\nuniform vec3 uKeyDir;\nuniform float uRimScale;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        [
          '#include <emissivemap_fragment>',
          '{',
          '  vec3 vDir = normalize( vViewPosition );',
          '  float vRim = 1.0 - saturate( dot( normal, vDir ) );',
          '  totalEmissiveRadiance += uRimColor * uRimScale * ( vRim * vRim * vRim );',
          '  float kLam = saturate( dot( normal, uKeyDir ) );',
          '  float kWrap = kLam * 0.8 + 0.2;',
          '  vec3 kHalf = normalize( uKeyDir + vDir );',
          '  float kSpec = pow( saturate( dot( normal, kHalf ) ), mix( 90.0, 6.0, roughnessFactor ) );',
          '  vec3 kSpecCol = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );',
          '  totalEmissiveRadiance += uKeyColor * ( diffuseColor.rgb * kWrap * ( 1.0 - 0.65 * metalnessFactor )',
          '    + kSpecCol * kSpec * ( 1.0 - roughnessFactor ) * 1.6 );',
          '}',
        ].join('\n'),
      )
      .replace(
        '#include <opaque_fragment>',
        [
          // Highlight shoulder: pale livery under a close headlight (the ROV
          // 30 m ahead of the boat, the bow inside its own beams) would clip
          // to flat white. Compress the top of the range, keeping hue.
          '{',
          '  float hi = max( max( outgoingLight.r, outgoingLight.g ), outgoingLight.b );',
          '  if ( hi > 0.5 ) {',
          // tanh can overflow its positive exponential on software GPUs
          // under hull-close lamps. This equivalent uses only exp(x <= 0).
          '    float shoulderDecay = exp( -2.0 * ( hi - 0.5 ) / 0.4 );',
          '    float sh = 0.5 + 0.4 * ( 1.0 - shoulderDecay ) / ( 1.0 + shoulderDecay );',
          '    outgoingLight *= sh / hi;',
          '  }',
          '}',
          '#include <opaque_fragment>',
        ].join('\n'),
      );
  };
  mat.customProgramCacheKey = () => `vehicle-key-rim-stable-shoulder-${rimScale}`;
}

/** Owns one vehicle's materials. */
export class VehicleMaterials {
  readonly uniforms: LitUniforms;
  readonly bySlot: Record<Exclude<Slot, 'decal'>, THREE.Material>;
  readonly strobe: THREE.MeshBasicMaterial;
  readonly halo: THREE.SpriteMaterial | null;
  decal: THREE.MeshStandardMaterial | null = null;
  private readonly lensBase = new THREE.Color(1, 1, 1);
  private lensesOn = true;
  readonly paintUniforms = {
    uHullPaint: { value: 0 },
    uHullBase: { value: new THREE.Color(1, 1, 1) },
    uHullAccent: { value: new THREE.Color(1, 1, 1) },
  };
  private readonly extra: THREE.Material[] = [];

  /**
   * @param withHalo  strobe halo sprite (not on the low LOD)
   * @param textured  tiling albedo/normal/roughness maps; the low tier skips
   *                  them and keeps vertex paint only (no texture memory)
   */
  constructor(look: VehicleLook, withHalo: boolean, textured = true) {
    this.uniforms = litUniforms(look);
    const surf = textured ? vehicleSurfaces() : null;
    const env = vehicleEnvironment();
    const emissive = new THREE.Color(look.emissive);

    const withTiling = (set: SurfaceSet | undefined, m: THREE.MeshStandardMaterial): void => {
      if (!set) return;
      // The textures are shared between materials; the repeat lives on each
      // material's own clone of the texture object (same image, no re-upload).
      const rep = 1 / set.tileM;
      const map = set.map.clone();
      const normalMap = set.normalMap.clone();
      const roughnessMap = set.roughnessMap.clone();
      for (const t of [map, normalMap, roughnessMap]) t.repeat.set(rep, rep);
      m.map = map;
      m.normalMap = normalMap;
      m.roughnessMap = roughnessMap;
    };

    const foam = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      emissive,
      envMap: env,
      envMapIntensity: 0.55,
    });
    withTiling(surf?.foam, foam);
    foam.normalScale.set(0.9, 0.9);
    addKeyAndRim(foam, this.uniforms);

    const frame = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 1,
      metalness: 0.35,
      emissive,
      envMap: env,
      envMapIntensity: 0.7,
    });
    withTiling(surf?.frame, frame);
    addKeyAndRim(frame, this.uniforms);

    const metal = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.75,
      emissive,
      envMap: env,
      envMapIntensity: 1.1,
    });
    withTiling(surf?.metal, metal);
    addKeyAndRim(metal, this.uniforms);

    // Unlit and HDR: vertex colours above 1 feed the bloom pass where there is one.
    const lens = new THREE.MeshBasicMaterial({ vertexColors: true, color: this.lensBase });
    const glow = new THREE.MeshBasicMaterial({ vertexColors: true });

    const acrylic = new THREE.MeshStandardMaterial({
      color: 0xdfeff5,
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      envMap: env,
      envMapIntensity: 2.2,
      side: THREE.FrontSide,
    });
    addKeyAndRim(acrylic, this.uniforms, 2.2);

    this.bySlot = { foam, frame, metal, lens, glow, acrylic };
    this.strobe = new THREE.MeshBasicMaterial({ color: 0x9fb9c4 });
    this.halo = withHalo
      ? new THREE.SpriteMaterial({
          map: haloTexture(),
          color: 0xe8f4ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      : null;
    // Keep the original vertex pattern and dark fittings; recolour fairings only.
    // Uniforms work on textured and low-tier materials without rebuilding geometry.
    const compileFoam = foam.onBeforeCompile;
    foam.onBeforeCompile = (shader, renderer) => {
      compileFoam.call(foam, shader, renderer);
      Object.assign(shader.uniforms, this.paintUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform float uHullPaint;\nuniform vec3 uHullBase;\nuniform vec3 uHullAccent;',
        )
        .replace(
          '#include <color_fragment>',
          [
            '#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )',
            '  vec3 sourcePaint = vColor.rgb;',
            '  float bright = max(max(sourcePaint.r, sourcePaint.g), sourcePaint.b);',
            '  float shade = min(min(sourcePaint.r, sourcePaint.g), sourcePaint.b);',
            '  vec3 rewardPaint = bright < 0.25 ? sourcePaint :',
            '    (bright - shade > 0.18 ? uHullAccent : uHullBase * clamp(bright / 0.9, 0.65, 1.1));',
            '  diffuseColor *= vec4(mix(sourcePaint, rewardPaint, uHullPaint), vColor.a);',
            '#endif',
          ].join('\n'),
        );
    };
    foam.customProgramCacheKey = () => 'vehicle-key-rim-stable-shoulder-hull-paint-v1';
  }

  /** Lens tint is visual only: scene lights and their range/intensity stay intact. */
  setCosmetics(paint: HullPaint | null, trim: number | null): void {
    this.paintUniforms.uHullPaint.value = paint ? 1 : 0;
    this.paintUniforms.uHullBase.value.setHex(paint?.base ?? 0xffffff);
    this.paintUniforms.uHullAccent.value.setHex(paint?.accent ?? 0xffffff);
    this.lensBase.setHex(trim ?? 0xffffff);
    this.setLensesOn(this.lensesOn);
  }

  /** Lamp lenses dim when the headlights are switched off. */
  setLensesOn(on: boolean): void {
    this.lensesOn = on;
    (this.bySlot.lens as THREE.MeshBasicMaterial).color
      .copy(this.lensBase)
      .multiplyScalar(on ? 1 : 0.08);
  }

  /** Decal material over a canvas atlas (browser only). */
  makeDecal(texture: THREE.Texture): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.55,
      metalness: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      envMap: vehicleEnvironment(),
      envMapIntensity: 0.5,
    });
    addKeyAndRim(m, this.uniforms, 0);
    this.decal = m;
    return m;
  }

  /** Track a material created elsewhere so dispose() frees it too. */
  own<T extends THREE.Material>(m: T): T {
    this.extra.push(m);
    return m;
  }

  dispose(): void {
    const disposeTex = (m: THREE.Material): void => {
      const s = m as THREE.MeshStandardMaterial;
      // Clones of the shared textures: dispose the wrapper objects only when
      // they are not the cached originals (the GPU image is shared by source).
      for (const t of [s.map, s.normalMap, s.roughnessMap]) if (t && t !== haloCache) t.dispose?.();
    };
    for (const m of Object.values(this.bySlot)) {
      disposeTex(m);
      m.dispose();
    }
    this.strobe.dispose();
    this.halo?.dispose();
    if (this.decal) {
      this.decal.map?.dispose();
      this.decal.dispose();
    }
    for (const m of this.extra) m.dispose();
  }
}

let haloCache: THREE.DataTexture | null = null;

/** Radial falloff sprite for the strobe flash. */
function haloTexture(): THREE.DataTexture {
  if (haloCache) return haloCache;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const core = Math.exp(-d * d * 18);
      const glow = Math.max(0, 1 - d) ** 3 * 0.45;
      const a = Math.min(1, core + glow);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  haloCache = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  haloCache.magFilter = THREE.LinearFilter;
  haloCache.minFilter = THREE.LinearFilter;
  haloCache.needsUpdate = true;
  return haloCache;
}
