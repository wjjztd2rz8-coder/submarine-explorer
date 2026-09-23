/**
 * Minimal underwater post-process.
 *
 * Deliberately hand-rolled rather than pulled from three/examples/EffectComposer
 * so the dependency surface stays small and the data flow is obvious: render the
 * scene into a WebGLRenderTarget, then draw a full-screen triangle sampling it.
 *
 * The current effect is a subtle blue-green tint, vignette and depth-driven
 * murk. It is structured (uniforms + a single fragment function) so that caustics,
 * god rays or particulate can be layered in later without touching main.ts.
 */

import * as THREE from 'three';

export const underwaterVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const underwaterFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uDepthFactor;   // 0 at the surface, 1 in the deep
uniform vec3  uTint;
uniform float uVignette;

varying vec2 vUv;

void main() {
  // A slow, very small UV wobble reads as light refracting through water.
  vec2 uv = vUv;
  uv.x += sin(uv.y * 40.0 + uTime * 0.6) * 0.0009 * (1.0 - uDepthFactor);
  uv.y += cos(uv.x * 32.0 + uTime * 0.45) * 0.0009 * (1.0 - uDepthFactor);

  vec3 color = texture2D(tDiffuse, uv).rgb;

  // Water absorbs red first, then green: shift the balance with depth.
  // Kept gentle -- this is a grade on top of an already fogged scene, and a
  // strong multiply here turns the abyss into a black screen.
  vec3 absorb = mix(vec3(1.0), uTint, uDepthFactor * 0.55);
  color *= absorb;

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
}
`;

export interface UnderwaterPassOptions {
  tint?: THREE.ColorRepresentation;
  vignette?: number;
}

/**
 * A single full-screen post-process pass. Usage:
 *
 *     pass.setSize(w, h);
 *     renderer.setRenderTarget(pass.target);
 *     renderer.render(scene, camera);
 *     renderer.setRenderTarget(null);
 *     pass.render(renderer, elapsed, depthFactor);
 */
export class UnderwaterPass {
  readonly target: THREE.WebGLRenderTarget;
  readonly material: THREE.ShaderMaterial;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.Mesh;

  constructor(width: number, height: number, options: UnderwaterPassOptions = {}) {
    this.target = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      // Linear HDR: an 8-bit linear target bands badly in the abyss and clips
      // the headlight hot spot before ACES can roll it off.
      type: THREE.HalfFloatType,
      depthBuffer: true,
    });

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uTime: { value: 0 },
        uDepthFactor: { value: 0 },
        uTint: { value: new THREE.Color(options.tint ?? 0x7fd6e8) },
        uVignette: { value: options.vignette ?? 0.35 },
      },
      vertexShader: underwaterVertexShader,
      fragmentShader: underwaterFragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  setSize(width: number, height: number): void {
    this.target.setSize(Math.max(1, width), Math.max(1, height));
  }

  /**
   * Draw calls of the scene render that preceded the last `render()`. The
   * pass's own `renderer.render` auto-resets `renderer.info`, so without this
   * the debug readout only ever sees the post quad (QA-B #8).
   */
  sceneDrawCalls = 0;
  sceneTriangles = 0;

  /** @param depthFactor 0 at the surface, 1 at maximum murk. */
  render(renderer: THREE.WebGLRenderer, elapsed: number, depthFactor: number): void {
    this.sceneDrawCalls = renderer.info.render.calls;
    this.sceneTriangles = renderer.info.render.triangles;
    this.material.uniforms.uTime!.value = elapsed;
    this.material.uniforms.uDepthFactor!.value = Math.min(1, Math.max(0, depthFactor));
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
