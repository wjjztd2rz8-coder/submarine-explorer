/**
 * The underwater post stack.
 *
 * Hand-rolled rather than pulled from three/examples/EffectComposer so the
 * dependency surface stays small and the data flow is obvious:
 *
 *   1. the scene renders into a half-float target that also keeps a depth
 *      texture (optionally multisampled);
 *   2. bloom: a soft-knee bright pass into a quarter-resolution target, a
 *      separable blur, and (on the top tiers) a second, eighth-resolution level;
 *   3. one full-screen pass composites everything and grades it: light
 *      scattering that follows the view direction, god-ray shafts, bloom,
 *      chromatic fringing, the depth-band colour grade with a readability
 *      floor, vignette, filmic tone mapping and a touch of dither.
 *
 * Everything is a function of the tier's {@link PostTier}: `bloomLevels` and
 * `rayOctaves` pick the shader variants, `msaa` the target's sample count. The
 * `low` tier skips this whole stack (see `app/systems/render.ts`).
 */

import * as THREE from 'three';

export const underwaterVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** The tier knobs the post stack reads (a subset of `AtmosphereTier`). */
export interface PostTier {
  bloomLevels: 0 | 1 | 2;
  rayOctaves: 0 | 1 | 2;
  msaa: 0 | 2 | 4;
}

/** Everything the composite needs for one frame. */
export interface PostFrame {
  elapsed: number;
  /** Camera depth in metres, negative below sea level. */
  depthM: number;
  /** 0 at the surface, 1 at the deepest stop. */
  depth01: number;
  /** 1 in the sunlit shallows, easing to 0 below the caustic zone. */
  photic: number;
  tint: THREE.Color;
  gain: number;
  saturation: number;
  vignette: number;
  fogColor: THREE.Color;
  fogDensity: number;
  /** Chromatic aberration in UV units (already tier-scaled). */
  aberration: number;
  /** God-ray strength, already faded with depth. */
  rayStrength: number;
  /** Bloom amount added to the frame. */
  bloomStrength: number;
  camera: THREE.PerspectiveCamera;
}

/** Bright pass with a soft knee, into the first (quarter-resolution) target. */
const PREFILTER_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uTexel;      // texel size of the *source*
uniform float uThreshold;
varying vec2 vUv;

vec3 knee(vec3 c) {
  c = min(c, vec3(12.0));               // no fireflies from a single hot texel
  float br = max(c.r, max(c.g, c.b));
  float k = 0.5;
  float soft = clamp(br - uThreshold + k, 0.0, 2.0 * k);
  soft = soft * soft / (4.0 * k + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  return c * contrib;
}

void main() {
  // Four bilinear taps cover a 4x4 source footprint: enough for a 1/4 downsample.
  vec3 a = texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  vec3 b = texture2D(tSrc, vUv + uTexel * vec2( 1.0, -1.0)).rgb;
  vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-1.0,  1.0)).rgb;
  vec3 d = texture2D(tSrc, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  gl_FragColor = vec4(knee(a) * 0.25 + knee(b) * 0.25 + knee(c) * 0.25 + knee(d) * 0.25, 1.0);
}
`;

/** Plain 4-tap downsample, for the second bloom level. */
const DOWNSAMPLE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb
         + texture2D(tSrc, vUv + uTexel * vec2( 1.0, -1.0)).rgb
         + texture2D(tSrc, vUv + uTexel * vec2(-1.0,  1.0)).rgb
         + texture2D(tSrc, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  gl_FragColor = vec4(s * 0.25, 1.0);
}
`;

/** Separable Gaussian, five linear-filtered taps per axis (a 9-tap kernel). */
const BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uDir;        // texel-sized step along the blur axis
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tSrc, vUv).rgb * 0.2270270270;
  s += texture2D(tSrc, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  s += texture2D(tSrc, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  s += texture2D(tSrc, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  s += texture2D(tSrc, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(s, 1.0);
}
`;

export const underwaterFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform sampler2D tBloom1;
uniform sampler2D tBloom2;
uniform float uTime;
uniform float uDepthFactor;   // 0 at the surface, 1 in the deep
uniform float uPhotic;        // 1 in the sunlit shallows
uniform vec3  uTint;
uniform float uGain;
uniform float uSaturation;
uniform float uVignette;
uniform vec3  uFogColor;
uniform float uFogDensity;
uniform float uAberration;
uniform float uRayStrength;
uniform float uBloomStrength;
uniform float uNear;
uniform float uFar;
uniform vec3  uCamRight;
uniform vec3  uCamUp;
uniform vec3  uCamFwd;
uniform vec2  uTanHalf;       // tan(fov/2) * aspect, tan(fov/2)

varying vec2 vUv;

const vec3 SUN = vec3(0.2306, 0.9226, 0.1384);
const float TAU = 6.28318530718;

float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453); }

// Seamless 1D value noise around a circle of N cells.
float ringNoise(float x, float cells) {
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash11(mod(i, cells) + cells * 0.37);
  float b = hash11(mod(i + 1.0, cells) + cells * 0.37);
  return mix(a, b, f);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;

  // A slow, very small UV wobble reads as light refracting through water.
  vec2 uv = vUv;
  uv.x += sin(uv.y * 40.0 + uTime * 0.6) * 0.0009 * (1.0 - uDepthFactor);
  uv.y += cos(uv.x * 32.0 + uTime * 0.45) * 0.0009 * (1.0 - uDepthFactor);

  // Chromatic fringing grows toward the frame edge, like a real lens.
  vec2 fringe = ndc * dot(ndc, ndc) * uAberration;
  vec3 color;
  color.r = texture2D(tDiffuse, uv + fringe).r;
  color.g = texture2D(tDiffuse, uv).g;
  color.b = texture2D(tDiffuse, uv - fringe).b;

  // View ray in world space, and how far away the pixel's geometry is.
  vec3 dir = normalize(uCamFwd + ndc.x * uTanHalf.x * uCamRight + ndc.y * uTanHalf.y * uCamUp);
  float z = texture2D(tDepth, uv).x;
  float dist = uFar;
  if (z < 0.99999) {
    float zn = z * 2.0 - 1.0;
    dist = 2.0 * uNear * uFar / (uFar + uNear - zn * (uFar - uNear));
  }
  float fogAmt = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);

  // Scattering follows the view direction: the water is brighter looking up
  // toward the light, darker looking down. Weighted by the fog fraction, so
  // near geometry is untouched and the far terrain still melts into the same
  // colour as the open water.
  float veil = (0.55 * uPhotic + 0.18) * (dir.y - 0.1);
  color += uFogColor * fogAmt * veil;

  #if RAY_OCTAVES > 0
    // God rays: shafts radiate from the sun's direction. Noise around the sun
    // axis makes the stripes; looking sideways they read as near-vertical curtains.
    float rayGate = uRayStrength;
    if (rayGate > 0.001) {
      vec3 e1 = normalize(cross(SUN, vec3(0.0, 0.0, 1.0)));
      vec3 e2 = cross(SUN, e1);
      float phi = atan(dot(dir, e2), dot(dir, e1)) / TAU + 0.5;   // 0..1 around the axis
      float t = uTime;
      float shafts = ringNoise(phi * 11.0 + t * 0.05, 11.0) * 0.6
                   + ringNoise(phi * 29.0 - t * 0.09, 29.0) * 0.4;
      #if RAY_OCTAVES > 1
        shafts = shafts * 0.7 + ringNoise(phi * 71.0 + t * 0.13, 71.0) * 0.3;
      #endif
      shafts = smoothstep(0.32, 0.9, shafts);
      // Strongest looking up, still present toward the horizon, gone looking down.
      float aim = smoothstep(-0.35, 0.75, dir.y);
      // Rays live in the open water: fade them on close geometry.
      float open = 0.2 + 0.8 * smoothstep(0.0, 0.6, fogAmt);
      vec3 rayColor = mix(vec3(0.42, 0.78, 0.95), vec3(0.95, 0.98, 0.9), aim * 0.4);
      color += rayColor * shafts * aim * open * rayGate;
    }
  #endif

  // Bloom: additive in linear light, before tone mapping, so it rolls off nicely.
  #if BLOOM_LEVELS > 0
    vec3 bloom = texture2D(tBloom1, uv).rgb * 0.7;
    #if BLOOM_LEVELS > 1
      bloom += texture2D(tBloom2, uv).rgb * 0.9;
    #endif
    color += bloom * uBloomStrength;
  #endif

  // ---- depth-band grade ----
  color *= uGain;
  // Water absorbs red first, then green. Gentle: this sits on top of an
  // already fogged scene, and a strong multiply turns the abyss black.
  color *= mix(vec3(1.0), uTint, uDepthFactor * 0.55);
  float l = luma(color);
  color = mix(vec3(l), color, uSaturation);
  // Sunlit shallows: warm highlights over blue-green shadows.
  float hi = smoothstep(0.25, 1.4, l);
  color *= mix(vec3(1.0), mix(vec3(0.94, 0.99, 1.04), vec3(1.07, 1.02, 0.92), hi), uPhotic * 0.6);
  // Readability floor: shadows never fall below a faint lift in the water's own
  // hue, so terrain and hulls stay legible outside the lamps, without flattening
  // the lit areas.
  vec3 floorHue = uFogColor / max(luma(uFogColor), 1e-3);
  float floorAmt = 0.011 * (1.0 - smoothstep(0.0, 0.05, luma(color)));
  color += floorHue * floorAmt;

  // Vignette. dot(d,d) peaks at 0.5 in the corners, so keep uVignette small.
  vec2 d = vUv - 0.5;
  float vig = 1.0 - uVignette * dot(d, d) * (1.0 + 0.35 * uDepthFactor);
  color *= clamp(vig, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);

  // The scene was rendered into a linear half-float target, where Three skips
  // tone mapping and output encoding. Apply both here, once, on the way to the
  // screen -- without these the frame is shown as raw linear values, which
  // crushes the darks and over-saturates every mid-tone (QA-B #4).
  #include <tonemapping_fragment>
  #include <colorspace_fragment>

  // A hair of dither hides banding in the long dark gradients.
  float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime), vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor.rgb += (n - 0.5) / 255.0;
}
`;

export interface UnderwaterPassOptions {
  tint?: THREE.ColorRepresentation;
  vignette?: number;
  tier?: PostTier;
}

const DEFAULT_TIER: PostTier = { bloomLevels: 1, rayOctaves: 1, msaa: 0 };

/** A full-screen pass: one material on the shared quad. */
class FullscreenMaterial {
  readonly material: THREE.ShaderMaterial;
  constructor(fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: underwaterVertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
  }
}

function makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    depthBuffer: false,
  });
}

/**
 * The post stack. Usage:
 *
 *     pass.setSize(w, h);
 *     renderer.setRenderTarget(pass.target);
 *     renderer.render(scene, camera);
 *     pass.render(renderer, frame);
 */
export class UnderwaterPass {
  readonly target: THREE.WebGLRenderTarget;
  readonly material: THREE.ShaderMaterial;
  readonly tier: PostTier;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.Mesh;
  private readonly prefilter: FullscreenMaterial;
  private readonly downsample: FullscreenMaterial;
  private readonly blur: FullscreenMaterial;
  private readonly bloomTargets: THREE.WebGLRenderTarget[] = [];
  private width = 1;
  private height = 1;
  private readonly black: THREE.DataTexture;
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();

  constructor(width: number, height: number, options: UnderwaterPassOptions = {}) {
    const tier = (this.tier = options.tier ?? DEFAULT_TIER);
    const depthTexture = new THREE.DepthTexture(
      Math.max(1, width),
      Math.max(1, height),
      THREE.UnsignedIntType,
    );
    depthTexture.minFilter = THREE.NearestFilter;
    depthTexture.magFilter = THREE.NearestFilter;
    this.target = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      // Linear HDR: an 8-bit linear target bands badly in the abyss and clips
      // the headlight hot spot before the tone mapper can roll it off.
      type: THREE.HalfFloatType,
      depthBuffer: true,
      depthTexture,
      samples: tier.msaa,
    });

    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.black.needsUpdate = true;

    for (let i = 0; i < tier.bloomLevels; i++) {
      this.bloomTargets.push(makeTarget(1, 1), makeTarget(1, 1));
    }
    this.prefilter = new FullscreenMaterial(PREFILTER_FRAG, {
      tSrc: { value: this.target.texture },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uThreshold: { value: 0.9 },
    });
    this.downsample = new FullscreenMaterial(DOWNSAMPLE_FRAG, {
      tSrc: { value: null },
      uTexel: { value: new THREE.Vector2(1, 1) },
    });
    this.blur = new FullscreenMaterial(BLUR_FRAG, {
      tSrc: { value: null },
      uDir: { value: new THREE.Vector2(1, 0) },
    });

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        tDepth: { value: depthTexture },
        tBloom1: { value: this.bloomTargets[0]?.texture ?? this.black },
        tBloom2: { value: this.bloomTargets[2]?.texture ?? this.black },
        uTime: { value: 0 },
        uDepthFactor: { value: 0 },
        uPhotic: { value: 1 },
        uTint: { value: new THREE.Color(options.tint ?? 0x7fd6e8) },
        uGain: { value: 1 },
        uSaturation: { value: 1 },
        uVignette: { value: options.vignette ?? 0.35 },
        uFogColor: { value: new THREE.Color(0x2a5568) },
        uFogDensity: { value: 0 },
        uAberration: { value: 0 },
        uRayStrength: { value: 0 },
        uBloomStrength: { value: 0.3 },
        uNear: { value: 0.5 },
        uFar: { value: 60000 },
        uCamRight: { value: new THREE.Vector3(1, 0, 0) },
        uCamUp: { value: new THREE.Vector3(0, 1, 0) },
        uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
        uTanHalf: { value: new THREE.Vector2(1, 1) },
      },
      defines: { RAY_OCTAVES: tier.rayOctaves, BLOOM_LEVELS: tier.bloomLevels },
      vertexShader: underwaterVertexShader,
      fragmentShader: underwaterFragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.setSize(width, height);
  }

  setSize(width: number, height: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.target.setSize(this.width, this.height);
    // Level 1 is 1/4 resolution, level 2 is 1/8.
    let div = 4;
    for (let i = 0; i < this.tier.bloomLevels; i++) {
      const w = Math.max(1, Math.round(this.width / div));
      const h = Math.max(1, Math.round(this.height / div));
      this.bloomTargets[i * 2]!.setSize(w, h);
      this.bloomTargets[i * 2 + 1]!.setSize(w, h);
      div *= 2;
    }
  }

  /**
   * Draw calls of the scene render that preceded the last `render()`. The
   * pass's own `renderer.render` auto-resets `renderer.info`, so without this
   * the debug readout only ever sees the post quad (QA-B #8).
   */
  sceneDrawCalls = 0;
  sceneTriangles = 0;

  private run(
    renderer: THREE.WebGLRenderer,
    pass: FullscreenMaterial | null,
    to: THREE.WebGLRenderTarget | null,
  ): void {
    this.quad.material = pass ? pass.material : this.material;
    renderer.setRenderTarget(to);
    renderer.render(this.scene, this.camera);
  }

  render(renderer: THREE.WebGLRenderer, f: PostFrame): void {
    this.sceneDrawCalls = renderer.info.render.calls;
    this.sceneTriangles = renderer.info.render.triangles;

    // Bloom chain.
    const t = this.bloomTargets;
    if (t.length) {
      const pu = this.prefilter.material.uniforms;
      (pu.uTexel!.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
      this.run(renderer, this.prefilter, t[0]!);
      const bu = this.blur.material.uniforms;
      const blur = (a: THREE.WebGLRenderTarget, b: THREE.WebGLRenderTarget): void => {
        bu.tSrc!.value = a.texture;
        (bu.uDir!.value as THREE.Vector2).set(1 / a.width, 0);
        this.run(renderer, this.blur, b);
        bu.tSrc!.value = b.texture;
        (bu.uDir!.value as THREE.Vector2).set(0, 1 / b.height);
        this.run(renderer, this.blur, a);
      };
      blur(t[0]!, t[1]!);
      if (t.length > 2) {
        const du = this.downsample.material.uniforms;
        du.tSrc!.value = t[0]!.texture;
        (du.uTexel!.value as THREE.Vector2).set(0.5 / t[0]!.width, 0.5 / t[0]!.height);
        this.run(renderer, this.downsample, t[2]!);
        blur(t[2]!, t[3]!);
      }
    }

    const u = this.material.uniforms;
    const cam = f.camera;
    u.uTime!.value = f.elapsed;
    u.uDepthFactor!.value = Math.min(1, Math.max(0, f.depth01));
    u.uPhotic!.value = f.photic;
    (u.uTint!.value as THREE.Color).copy(f.tint);
    u.uGain!.value = f.gain;
    u.uSaturation!.value = f.saturation;
    u.uVignette!.value = f.vignette;
    (u.uFogColor!.value as THREE.Color).copy(f.fogColor);
    u.uFogDensity!.value = f.fogDensity;
    u.uAberration!.value = f.aberration;
    u.uRayStrength!.value = f.rayStrength;
    u.uBloomStrength!.value = f.bloomStrength;
    u.uNear!.value = cam.near;
    u.uFar!.value = cam.far;
    cam.matrixWorld.extractBasis(this.right, this.up, this.fwd);
    (u.uCamRight!.value as THREE.Vector3).copy(this.right);
    (u.uCamUp!.value as THREE.Vector3).copy(this.up);
    (u.uCamFwd!.value as THREE.Vector3).copy(this.fwd).negate();
    const th = Math.tan((cam.fov * Math.PI) / 360);
    (u.uTanHalf!.value as THREE.Vector2).set(th * cam.aspect, th);
    this.run(renderer, null, null);
  }

  dispose(): void {
    this.target.depthTexture?.dispose();
    this.target.dispose();
    for (const b of this.bloomTargets) b.dispose();
    this.black.dispose();
    this.prefilter.material.dispose();
    this.downsample.material.dispose();
    this.blur.material.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
