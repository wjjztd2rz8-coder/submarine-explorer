/**
 * Thruster wash (F1-VEHICLES): small particulates stirred out of each duct in
 * proportion to its thrust, plus the odd bubble rising and wobbling away.
 *
 * One `THREE.Points` draw call, simulated on the CPU in world space so the
 * wash trails behind a moving boat. The object sits inside the vehicle group
 * (it hides and disposes with it) but opts out of the parent transform:
 * `matrixWorldAutoUpdate = false` keeps its world matrix at identity.
 * The pool size is tier-scaled; the low tier has none.
 */

import * as THREE from 'three';
import { rng } from './textures.js';

export interface WashEmitter {
  /** World-space exit point and wash direction (unit). */
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  /** Duct radius (world metres). */
  radius: number;
  /** 0..1 thrust magnitude this frame. */
  strength: number;
}

const VERT = /* glsl */ `
attribute float aAlpha;
attribute float aSize;
attribute float aKind;
uniform float uScale;
varying float vAlpha;
varying float vKind;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uScale / max(0.1, -mv.z), 0.0, 48.0);
  // Fade out very close to the camera so first person never sees a blob.
  vAlpha = aAlpha * smoothstep(0.8, 3.0, -mv.z);
  vKind = aKind;
}
`;

const FRAG = /* glsl */ `
precision mediump float;
varying float vAlpha;
varying float vKind;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float a;
  vec3 c;
  if (vKind > 0.5) {
    // Bubble: bright rim, faint core, a specular dot.
    float rim = smoothstep(0.45, 0.9, r) * (1.0 - smoothstep(0.9, 1.0, r));
    float spec = 1.0 - smoothstep(0.0, 0.08, dot(p - vec2(-0.35, 0.35), p - vec2(-0.35, 0.35)));
    a = rim * 0.9 + 0.12 + spec;
    c = vec3(0.78, 0.92, 1.0);
  } else {
    a = exp(-r * 3.0);
    c = vec3(0.72, 0.74, 0.68);
  }
  gl_FragColor = vec4(c, clamp(a * vAlpha, 0.0, 1.0));
}
`;

export class Wash {
  readonly points: THREE.Points;
  private readonly count: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly alpha: Float32Array;
  private readonly size: Float32Array;
  private readonly kind: Float32Array;
  private readonly rand = rng(9151);
  private cursor = 0;
  private carry = 0;
  private readonly material: THREE.ShaderMaterial;
  private readonly tmp = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly up = new THREE.Vector3();

  /**
   * @param count  particle pool (0 disables the system; `points` stays empty)
   * @param scale  world metres per vehicle metre, sizes and speeds follow it
   */
  constructor(
    count: number,
    private readonly scale: number,
  ) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.age = new Float32Array(count).fill(1);
    this.life = new Float32Array(count).fill(1);
    this.alpha = new Float32Array(count);
    this.size = new Float32Array(count);
    this.kind = new Float32Array(count);
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage),
    );
    g.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage),
    );
    g.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage),
    );
    g.setAttribute('aKind', new THREE.BufferAttribute(this.kind, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.name = 'vehicle-wash';
    this.points.frustumCulled = false;
    this.points.matrixAutoUpdate = false;
    this.points.matrixWorldAutoUpdate = false;
    this.points.renderOrder = 3;
    this.points.visible = count > 0;
    const size = new THREE.Vector2();
    this.points.onBeforeRender = (renderer, _scene, camera) => {
      renderer.getDrawingBufferSize(size);
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 60;
      this.material.uniforms.uScale!.value = size.y / (2 * Math.tan((fov * Math.PI) / 360));
    };
  }

  /** Live particle count (for tests and the perf readout). */
  get alive(): number {
    let n = 0;
    for (let i = 0; i < this.count; i++) if (this.age[i]! < this.life[i]!) n++;
    return n;
  }

  update(emitters: WashEmitter[], dt: number): void {
    if (this.count === 0 || dt <= 0) return;
    const k = this.scale;
    // Emission: ~60 particles/s per fully loaded thruster at a 200-particle pool.
    const perSecond = (this.count / 200) * 60;
    for (const e of emitters) {
      if (e.strength < 0.04) continue;
      this.carry += perSecond * e.strength * dt;
      while (this.carry >= 1) {
        this.carry -= 1;
        this.spawn(e, k);
      }
    }
    const drag = Math.exp(-1.6 * dt);
    for (let i = 0; i < this.count; i++) {
      if (this.age[i]! >= this.life[i]!) {
        this.alpha[i] = 0;
        continue;
      }
      this.age[i]! += dt;
      const t = this.age[i]! / this.life[i]!;
      const j = i * 3;
      if (this.kind[i]! > 0.5) {
        // Bubbles: buoyant, lightly damped, wobbling.
        this.vel[j]! *= drag;
        this.vel[j + 2]! *= drag;
        this.vel[j + 1] = this.vel[j + 1]! * drag + (1 - drag) * 1.1 * k;
        this.pos[j]! += (this.vel[j]! + Math.sin(this.age[i]! * 9 + i) * 0.12 * k) * dt;
        this.pos[j + 1]! += this.vel[j + 1]! * dt;
        this.pos[j + 2]! += (this.vel[j + 2]! + Math.cos(this.age[i]! * 8 + i) * 0.12 * k) * dt;
        this.alpha[i] = Math.min(1, t * 8) * (1 - t) * 0.9;
      } else {
        // Particulates: thrown out, then hang and settle in the water.
        this.vel[j]! *= drag;
        this.vel[j + 1] = this.vel[j + 1]! * drag - 0.02 * k * dt;
        this.vel[j + 2]! *= drag;
        this.pos[j]! += this.vel[j]! * dt;
        this.pos[j + 1]! += this.vel[j + 1]! * dt;
        this.pos[j + 2]! += this.vel[j + 2]! * dt;
        this.alpha[i] = Math.min(1, t * 6) * (1 - t) * 0.55;
      }
    }
    const g = this.points.geometry;
    g.getAttribute('position').needsUpdate = true;
    g.getAttribute('aAlpha').needsUpdate = true;
    g.getAttribute('aSize').needsUpdate = true;
    g.getAttribute('aKind').needsUpdate = true;
  }

  private spawn(e: WashEmitter, k: number): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const r = this.rand;
    // A random point on the duct exit disc.
    this.up.set(0, 1, 0);
    if (Math.abs(e.dir.y) > 0.9) this.up.set(1, 0, 0);
    this.side.crossVectors(e.dir, this.up).normalize();
    this.up.crossVectors(this.side, e.dir).normalize();
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * e.radius * 0.85;
    this.tmp
      .copy(e.pos)
      .addScaledVector(this.side, Math.cos(a) * rr)
      .addScaledVector(this.up, Math.sin(a) * rr);
    const j = i * 3;
    this.pos[j] = this.tmp.x;
    this.pos[j + 1] = this.tmp.y;
    this.pos[j + 2] = this.tmp.z;
    const bubble = r() < 0.12;
    const speed = (1.2 + r() * 1.8) * k * (0.4 + e.strength * 0.6);
    const spread = 0.35;
    this.tmp
      .copy(e.dir)
      .addScaledVector(this.side, (r() - 0.5) * spread)
      .addScaledVector(this.up, (r() - 0.5) * spread)
      .normalize()
      .multiplyScalar(bubble ? speed * 0.5 : speed);
    this.vel[j] = this.tmp.x;
    this.vel[j + 1] = this.tmp.y;
    this.vel[j + 2] = this.tmp.z;
    this.age[i] = 0;
    this.life[i] = bubble ? 2.2 + r() * 1.6 : 1.6 + r() * 2.2;
    this.kind[i] = bubble ? 1 : 0;
    this.size[i] = (bubble ? 0.035 + r() * 0.05 : 0.03 + r() * 0.05) * k;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
