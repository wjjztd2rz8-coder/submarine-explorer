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
  /** Billowing smoke: turbulent noise puffs, dense dark core fading to haze. */
  billow?: boolean;
  /** Colour of the dense core near the orifice (billow only). */
  core?: number;
}

/**
 * Black-smoker smoke: a narrow dense stem that billows into turbulent, irregular dark
 * grey haze, bending downstream. A small bright shimmer flickers at the orifice.
 * Animation is entirely in the vertex shader; `count` already includes the tier factor.
 */
export function smokePlume(
  height: number,
  baseRadius: number,
  count: number,
  seed: number,
): THREE.Points | null {
  const smoke = makePlume({
    height,
    baseRadius,
    spread: Math.max(1.6, height * 0.2),
    count,
    color: 0x5a5651,
    core: 0x141211,
    opacity: 0.7,
    size: Math.max(2, height * 0.24),
    speed: 0.08 + 1.1 / Math.max(6, height),
    drift: height * 0.34,
    seed,
    billow: true,
  });
  if (!smoke) return null;
  const glint = makePlume({
    height: 1.4,
    baseRadius: Math.max(0.1, baseRadius * 0.6),
    spread: 0.5,
    count: Math.round(count * 0.14),
    color: 0xf0dcc0,
    opacity: 0.4,
    size: 0.55,
    speed: 0.55,
    drift: 0.2,
    seed: seed + 5,
  });
  if (glint) {
    glint.name = 'plume-orifice-shimmer';
    glint.renderOrder = 3;
    smoke.add(glint);
  }
  return smoke;
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

/**
 * CPU mirror of the billow vertex shader's radial offset (m) for one particle at rise
 * phase `t` (0..1), used by tests to check the outline is irregular. Keep in sync with
 * the shader's `rad` expression (time-independent part, lobe term at its mean).
 */
export function billowRadius(
  o: Pick<PlumeOpts, 'baseRadius' | 'spread'>,
  seed: readonly number[],
  t: number,
): number {
  const [, y = 0, z = 0, w = 0] = seed;
  const h = 1 - Math.pow(1 - t, 1.7);
  const lobe = 0.62 + 0.55 * Math.sin(h * 20 + y * 9) + 0.25 * Math.sin(h * 40 - z * 17);
  const rr = Math.pow(z, 0.8) * (0.25 + 0.75 * w);
  return o.baseRadius * (0.4 + z) + o.spread * Math.pow(t, 1.25) * rr * Math.max(0.3, lobe) * 1.6;
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
  const reach = o.height + o.spread * (o.billow ? 2.2 : 1) + (o.drift ?? 0);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, o.height * 0.5, 0), reach);

  const billow = o.billow === true;
  const map = billow ? null : softDot();
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
    uCore: { value: new THREE.Color(o.core ?? o.color) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const head = `attribute vec4 aSeed;
uniform float uTime, uHeight, uBase, uSpread, uSpeed, uDrift;
varying float vFade;
varying float vRise;
varying float vSeed;
`;
    const flat = `float t = fract(aSeed.x + uTime * uSpeed * (0.85 + 0.3 * aSeed.w));
float ang = aSeed.y * 6.2831853 + t * (1.5 + aSeed.z);
float rad = uBase * aSeed.z + uSpread * t * (0.35 + 0.65 * aSeed.w);
vec3 transformed = vec3(cos(ang) * rad + t * t * uDrift, t * uHeight, sin(ang) * rad + t * t * uDrift * 0.3);
vRise = t;
vSeed = aSeed.y;
vFade = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.5, 1.0, t));`;
    // Billow: buoyant jet (fast out of the orifice, slowing), radius swelling faster than
    // linearly, a per-particle radial bias plus height-dependent lobes and swirl so the
    // outline is ragged, and a drift that grows with height.
    const bill = `float t = fract(aSeed.x + uTime * uSpeed * (0.85 + 0.3 * aSeed.w));
float h = uHeight * (1.0 - pow(1.0 - t, 1.7));
float lobe = 0.62 + 0.55 * sin(h * 0.55 + aSeed.y * 9.0 + uTime * 0.31)
                  + 0.25 * sin(h * 1.3 - aSeed.z * 17.0 - uTime * 0.47);
float rr = pow(aSeed.z, 0.8) * (0.25 + 0.75 * aSeed.w);
float rad = uBase * (0.4 + aSeed.z) + uSpread * pow(t, 1.25) * rr * max(0.3, lobe) * 1.6;
float ang = aSeed.y * 6.2831853 + uTime * (0.25 + 0.5 * aSeed.w) * (0.3 + t);
vec3 transformed = vec3(cos(ang) * rad, h, sin(ang) * rad);
float wob = uSpread * 0.22 * t;
transformed.x += sin(uTime * 0.8 + aSeed.w * 41.0 + h * 0.31) * wob + sin(h * 0.17 + aSeed.y * 3.0) * wob * 0.8;
transformed.z += cos(uTime * 0.65 + aSeed.z * 29.0 + h * 0.23) * wob;
float dr = pow(t, 1.6) * uDrift;
transformed.x += dr * (0.94 + 0.12 * sin(h * 0.11 + aSeed.y * 5.0));
transformed.z += dr * 0.34;
vRise = t;
vSeed = aSeed.y + aSeed.w;
vFade = smoothstep(0.0, 0.035, t) * (1.0 - smoothstep(0.58, 1.0, t));`;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${head}void main() {`)
      .replace('#include <begin_vertex>', billow ? bill : flat)
      .replace(
        'gl_PointSize = size;',
        billow
          ? 'gl_PointSize = size * (0.28 + 1.5 * sqrt(vRise)) * (0.55 + 0.9 * fract(vSeed * 7.31));'
          : 'gl_PointSize = size * (0.35 + 1.5 * vRise);',
      );
    const fhead = `varying float vFade;\nvarying float vRise;\nvarying float vSeed;\nuniform vec3 uCore;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}
void main() {`;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', fhead)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade;');
    if (billow)
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `{
  vec2 d = (gl_PointCoord - 0.5) * 2.0;
  float rot = vSeed * 6.2831853;
  d = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * d;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  vec2 q = d * 1.9 + vSeed * 31.0;
  float n = vn(q) * 0.6 + vn(q * 2.3 + vn(q) * 1.6) * 0.4;
  float body = smoothstep(0.0, 0.5, 1.0 - r2 * (0.55 + 0.9 * n) - 0.3 * (1.0 - n));
  if (body <= 0.003) discard;
  float dense = pow(1.0 - vRise, 1.6);
  diffuseColor.rgb = mix(diffuse, uCore, dense * (0.55 + 0.6 * n)) * (0.75 + 0.5 * n);
  diffuseColor.a *= body * (0.55 + 0.45 * dense);
}`,
      );
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
