/** Lost City's carbonate only: metre-scaled surface detail without mesh UVs. */
import * as THREE from 'three';
import { publicUrl } from '../util/publicUrl.js';
import { ALBEDO, vertexGlow } from './props/geo/materials.js';

export const LOST_CITY_SURFACE = {
  repeatM: 2.4,
  contrast: 0.32,
  normalStrength: 0.65,
  normalFadeM: [5, 65],
  poreM: 0.065,
  poreStrength: 0.16,
  poreFadeM: [3, 18],
} as const;

const declarations = /* glsl */ `
varying vec3 vCarbonatePosition;
uniform sampler2D carbonateAlbedo;
uniform float carbonateRepeat;
uniform float carbonateContrast;
#ifdef LOST_CITY_NORMALS
uniform sampler2D carbonatePacked;
uniform float carbonateNormalStrength;
uniform vec2 carbonateNormalFade;
uniform float carbonatePoreSize;
uniform float carbonatePoreStrength;
uniform vec2 carbonatePoreFade;

float carbonateHash(vec3 p) {
  uvec3 v = uvec3(ivec3(p)) * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return float(v.x >> 8u) * (1.0 / 16777216.0);
}

// Analytic 3D value-noise gradient: stable pores on walls, tops and undersides.
vec3 carbonatePores(vec3 p) {
  vec3 cell = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  vec3 gradient = vec3(0.0);
  for (int z = 0; z < 2; z++) {
    for (int y = 0; y < 2; y++) {
      for (int x = 0; x < 2; x++) {
        vec3 corner = vec3(float(x), float(y), float(z));
        vec3 weight = mix(1.0 - u, u, corner);
        vec3 slope = (corner * 2.0 - 1.0) * du;
        gradient += carbonateHash(cell + corner) * slope * weight.yzx * weight.zxy;
      }
    }
  }
  return gradient;
}
#endif
`;

const surface = /* glsl */ `
vec3 carbonateWorldNormal = inverseTransformDirection(normal, viewMatrix);
vec3 carbonateWeights = pow(abs(carbonateWorldNormal), vec3(4.0));
carbonateWeights /= max(dot(carbonateWeights, vec3(1.0)), 0.0001);
vec3 carbonateP = vCarbonatePosition / carbonateRepeat;
float carbonateDistance = length(vViewPosition);
float carbonateMip = 2.5 * smoothstep(5.0, 45.0, carbonateDistance);
vec3 carbonatePattern = vec3(0.0);
vec3 carbonatePerturbed = carbonateWorldNormal;
float carbonateRoughness = 0.86;
#ifdef LOST_CITY_NORMALS
float carbonateGain = carbonateNormalStrength *
  (1.0 - smoothstep(carbonateNormalFade.x, carbonateNormalFade.y, carbonateDistance));
carbonateRoughness = 0.0;
#endif
// Same packed convention and UDN projection as TerrainMaterial: RG = tangent
// normal XY, B = roughness (it is not a conventional RGB normal map).
if (carbonateWeights.x > 0.02) {
  carbonatePattern += texture2D(carbonateAlbedo, carbonateP.zy, carbonateMip).rgb * carbonateWeights.x;
#ifdef LOST_CITY_NORMALS
  vec3 texel = texture2D(carbonatePacked, carbonateP.zy).rgb;
  vec2 d = (texel.rg * 2.0 - 1.0) * carbonateGain;
  carbonatePerturbed += vec3(0.0, d.y, d.x) * carbonateWeights.x;
  carbonateRoughness += texel.b * carbonateWeights.x;
#endif
}
if (carbonateWeights.y > 0.02) {
  carbonatePattern += texture2D(carbonateAlbedo, carbonateP.xz, carbonateMip).rgb * carbonateWeights.y;
#ifdef LOST_CITY_NORMALS
  vec3 texel = texture2D(carbonatePacked, carbonateP.xz).rgb;
  vec2 d = (texel.rg * 2.0 - 1.0) * carbonateGain;
  carbonatePerturbed += vec3(d.x, 0.0, d.y) * carbonateWeights.y;
  carbonateRoughness += texel.b * carbonateWeights.y;
#endif
}
if (carbonateWeights.z > 0.02) {
  carbonatePattern += texture2D(carbonateAlbedo, carbonateP.xy, carbonateMip).rgb * carbonateWeights.z;
#ifdef LOST_CITY_NORMALS
  vec3 texel = texture2D(carbonatePacked, carbonateP.xy).rgb;
  vec2 d = (texel.rg * 2.0 - 1.0) * carbonateGain;
  carbonatePerturbed += vec3(d.x, d.y, 0.0) * carbonateWeights.z;
  carbonateRoughness += texel.b * carbonateWeights.z;
#endif
}
diffuseColor.rgb *= max(vec3(0.3), 1.0 + (carbonatePattern * 4.6 - 1.0) * carbonateContrast);
roughnessFactor = clamp(carbonateRoughness, 0.72, 0.98);
#ifdef LOST_CITY_NORMALS
vec3 porePosition = vCarbonatePosition / carbonatePoreSize;
// Fade before subpixel pores alias, including the smaller second octave.
float poreFootprint = max(length(dFdx(porePosition)), length(dFdy(porePosition)));
float poreFade = (1.0 - smoothstep(carbonatePoreFade.x, carbonatePoreFade.y, carbonateDistance)) *
  (1.0 - smoothstep(0.25, 0.8, poreFootprint));
if (poreFade > 0.001) {
  vec3 pores = carbonatePores(porePosition);
  float fineFade = 1.0 - smoothstep(0.25, 0.8, poreFootprint * 2.7);
  pores += carbonatePores(porePosition * 2.7 + 17.3) * 0.35 * fineFade;
  pores -= carbonateWorldNormal * dot(pores, carbonateWorldNormal);
  carbonatePerturbed -= pores * carbonatePoreStrength * poreFade;
}
// Project the texture slopes into the surface tangent plane; keeps back faces
// and thin flange undersides pointing toward their geometric hemisphere.
vec3 carbonateSlope = carbonatePerturbed - carbonateWorldNormal;
carbonateSlope -= carbonateWorldNormal * dot(carbonateSlope, carbonateWorldNormal);
normal = normalize((viewMatrix * vec4(normalize(carbonateWorldNormal + carbonateSlope), 0.0)).xyz);
#endif
`;

interface CarbonateMap {
  texture: THREE.Texture;
  ready: Promise<THREE.Texture | null>;
  users: number;
}

// The whole field shares two GPU maps; Low acquires only albedo. Reference
// counting lets scene teardown release them without breaking another chimney.
const mapCache = new Map<string, CarbonateMap>();
function acquireMap(
  file: string,
  srgb: boolean,
): {
  ready: Promise<THREE.Texture | null>;
  release: () => void;
} {
  let entry = mapCache.get(file);
  if (!entry) {
    const texture = new THREE.Texture();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    const created: CarbonateMap = { texture, ready: Promise.resolve(null), users: 0 };
    created.ready = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        if (created.users > 0) {
          texture.image = image;
          texture.needsUpdate = true;
          resolve(texture);
        } else resolve(null);
      };
      image.onerror = () => {
        console.warn(`[lost-city] could not load ${file}`);
        resolve(null);
      };
      image.src = publicUrl(`assets/terrain/${file}`);
    });
    entry = created;
    mapCache.set(file, entry);
  }
  entry.users++;
  const acquired = entry;
  return {
    ready: entry.ready,
    release: () => {
      if (--acquired.users === 0) {
        mapCache.delete(file);
        acquired.texture.dispose();
      }
    },
  };
}

export function createLostCityCarbonateMaterial(tier: string): THREE.MeshStandardMaterial {
  const detailed = tier !== 'low';
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setScalar(ALBEDO * 1.5),
    vertexColors: true,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });
  material.name = `lost-city-carbonate-${detailed ? 'detail' : 'low'}`;
  vertexGlow(material, 0.22, 0xb4c8cc, 0.25);
  const glowCompile = material.onBeforeCompile;
  const textures: THREE.Texture[] = [];
  const releases: Array<() => void> = [];
  let disposed = false;
  const placeholder = (r: number, g: number, b: number): THREE.DataTexture => {
    const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
    t.needsUpdate = true;
    textures.push(t);
    return t;
  };
  const uniforms = {
    carbonateAlbedo: { value: placeholder(55, 55, 55) as THREE.Texture },
    carbonatePacked: { value: placeholder(128, 128, 220) as THREE.Texture },
    carbonateRepeat: { value: LOST_CITY_SURFACE.repeatM },
    carbonateContrast: { value: LOST_CITY_SURFACE.contrast },
    carbonateNormalStrength: { value: LOST_CITY_SURFACE.normalStrength },
    carbonateNormalFade: { value: new THREE.Vector2(...LOST_CITY_SURFACE.normalFadeM) },
    carbonatePoreSize: { value: LOST_CITY_SURFACE.poreM },
    carbonatePoreStrength: { value: LOST_CITY_SURFACE.poreStrength },
    carbonatePoreFade: { value: new THREE.Vector2(...LOST_CITY_SURFACE.poreFadeM) },
  };
  const load = (file: string, uniform: { value: THREE.Texture }, srgb: boolean): Promise<void> => {
    if (typeof Image === 'undefined') return Promise.resolve();
    const acquired = acquireMap(file, srgb);
    releases.push(acquired.release);
    return acquired.ready.then((texture) => {
      // Leave the neutral fallback bound on failure; never resurrect a disposed material.
      if (texture && !disposed) {
        uniform.value.dispose();
        uniform.value = texture;
      }
    });
  };
  const ready = [load('carbonate_a.jpg', uniforms.carbonateAlbedo, true)];
  if (detailed) ready.push(load('carbonate_n.jpg', uniforms.carbonatePacked, false));
  material.userData.texturesReady = Promise.all(ready);
  material.userData.uniforms = uniforms;
  material.addEventListener('dispose', () => {
    if (disposed) return;
    disposed = true;
    for (const texture of textures) texture.dispose();
    for (const release of releases) release();
  });
  material.onBeforeCompile = (shader, renderer) => {
    glowCompile.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vCarbonatePosition;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvCarbonatePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader =
      `${detailed ? '#define LOST_CITY_NORMALS\n' : ''}${declarations}\n${shader.fragmentShader}`.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n${surface}`,
      );
  };
  material.customProgramCacheKey = () => `lost-city-carbonate-820-${detailed ? 'detail' : 'low'}`;
  return material;
}
