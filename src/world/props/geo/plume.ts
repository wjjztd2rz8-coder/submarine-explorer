/**
 * Animated hydrothermal plumes and shimmer: a THREE.Points cloud whose motion
 * runs entirely in the vertex shader (rise, swirl, widening, current drift), so
 * an animated plume costs no CPU per frame beyond one uniform write from the
 * mesh's `onBeforeRender`. Built on PointsMaterial, so scene fog applies like
 * everything else. Counts scale with the quality tier (`GeoDetail.plume`).
 */

import * as THREE from 'three';
import { mulberry32 } from './shared.js';
import { softDot } from './textures.js';

export interface PlumeOpts {
  /** Rise height (m). */
  height: number;
  /** Radius (m) of the source orifice. */
  baseRadius: number;
  /** Radius (m) reached at the top of the rise, relative to the source. */
  spread: number;
  /** Particle count at full detail (the caller multiplies by the tier factor). */
  count: number;
  color: number;
  opacity: number;
  /** Sprite size (m) at mid rise. */
  size: number;
  /** Rises per second. */
  speed: number;
  /** Sideways drift (m) accumulated over the rise. */
  drift?: number;
  seed: number;
}

/** Black-smoker smoke: dark charcoal, widening and fading with height. */
export function smokePlume(
  height: number,
  baseRadius: number,
  count: number,
  seed: number,
): THREE.Points | null {
  return makePlume({
    height,
    baseRadius,
    spread: Math.max(1.2, height * 0.16),
    count,
    color: 0x44403d,
    opacity: 0.62,
    size: Math.max(1.6, height * 0.2),
    speed: 0.09 + 1.2 / Math.max(6, height),
    drift: height * 0.28,
    seed,
  });
}

/** Clear-fluid shimmer: faint pale flecks wobbling up (Lost City, low-temperature vents). */
export function shimmerPlume(
  height: number,
  baseRadius: number,
  count: number,
  seed: number,
): THREE.Points | null {
  return makePlume({
    height,
    baseRadius,
    spread: baseRadius * 1.2 + 0.4,
    count,
    color: 0xb8cfd4,
    opacity: 0.16,
    size: Math.max(0.4, height * 0.12),
    speed: 0.16,
    drift: height * 0.2,
    seed,
  });
}

export function makePlume(o: PlumeOpts): THREE.Points | null {
  const n = Math.round(o.count);
  if (n < 4) return null;
  const rnd = mulberry32(o.seed);
  const seeds = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    seeds[i * 4] = i / n + rnd() * (0.6 / n); // phase, evenly spread so the column is continuous
    seeds[i * 4 + 1] = rnd();
    seeds[i * 4 + 2] = rnd();
    seeds[i * 4 + 3] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const reach = o.height + o.spread + (o.drift ?? 0);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, o.height * 0.5, 0), reach);

  const map = softDot();
  const mat = new THREE.PointsMaterial({
    color: o.color,
    size: o.size,
    sizeAttenuation: true,
    map,
    transparent: true,
    opacity: o.opacity,
    depthWrite: false,
    fog: true,
  });
  const uniforms = {
    uTime: { value: 0 },
    uHeight: { value: o.height },
    uBase: { value: o.baseRadius },
    uSpread: { value: o.spread },
    uSpeed: { value: o.speed },
    uDrift: { value: o.drift ?? 0 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        `attribute vec4 aSeed;
uniform float uTime, uHeight, uBase, uSpread, uSpeed, uDrift;
varying float vFade;
varying float vRise;
void main() {`,
      )
      .replace(
        '#include <begin_vertex>',
        `float t = fract(aSeed.x + uTime * uSpeed * (0.85 + 0.3 * aSeed.w));
float ang = aSeed.y * 6.2831853 + t * (1.5 + aSeed.z);
float rad = uBase * aSeed.z + uSpread * t * (0.35 + 0.65 * aSeed.w);
vec3 transformed = vec3(cos(ang) * rad + t * t * uDrift, t * uHeight, sin(ang) * rad + t * t * uDrift * 0.3);
vRise = t;
vFade = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.5, 1.0, t));`,
      )
      .replace('gl_PointSize = size;', 'gl_PointSize = size * (0.35 + 1.5 * vRise);');
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'varying float vFade;\nvoid main() {')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade;');
  };
  const pts = new THREE.Points(g, mat);
  pts.name = 'plume';
  pts.renderOrder = 2;
  pts.raycast = () => undefined; // particles are placed by the shader; never pick them
  pts.onBeforeRender = () => {
    uniforms.uTime.value = performance.now() / 1000;
  };
  return pts;
}
