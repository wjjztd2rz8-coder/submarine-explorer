/**
 * Bioluminescent sparks: one `Points` draw call for every flash, trail and
 * wake glint. A fixed ring buffer of particles; each has a position, a slow
 * drift, an age, a size in metres and a colour. Additive, soft-edged, faded
 * by the scene's fog so a distant flash dims like everything else.
 *
 * Real bioluminescence is blue-green and only shows in the dark; callers
 * decide when to emit (the renderer scales by depth).
 */

import * as THREE from 'three';

const VERT = /* glsl */ `
attribute vec3 aSpark; // age 0..1, size (m), intensity
attribute vec3 aColor;
uniform float uScale;
uniform float uFog;
varying vec3 vCol;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float dist = max( -mv.z, 0.1 );
  float age = aSpark.x;
  float fade = smoothstep( 0.0, 0.06, age ) * pow( max( 1.0 - age, 0.0 ), 1.6 );
  gl_PointSize = clamp( aSpark.y * uScale / dist, 1.5, 54.0 ) * ( 1.0 + 0.35 * ( 1.0 - age ) );
  vAlpha = fade * aSpark.z * exp( -uFog * uFog * dist * dist ) * step( 0.0001, aSpark.y );
  vCol = aColor;
}
`;

const FRAG = /* glsl */ `
varying vec3 vCol;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length( c ) * 2.0;
  float a = pow( clamp( 1.0 - r, 0.0, 1.0 ), 2.0 );
  float core = pow( clamp( 1.0 - r * 1.8, 0.0, 1.0 ), 2.0 );
  gl_FragColor = vec4( vCol * ( 0.7 + 1.6 * core ), a * vAlpha );
}
`;

export class Sparks {
  readonly points: THREE.Points;
  readonly capacity: number;
  private readonly pos: Float32Array;
  private readonly spark: Float32Array;
  private readonly color: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly age: Float32Array;
  private readonly size: Float32Array;
  private readonly peak: Float32Array;
  private readonly material: THREE.ShaderMaterial;
  private head = 0;
  private active = 0;
  private readonly c = new THREE.Color();

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    const n = this.capacity;
    this.pos = new Float32Array(n * 3);
    this.spark = new Float32Array(n * 3);
    this.color = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.age = new Float32Array(n).fill(1);
    this.size = new Float32Array(n);
    this.peak = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    const posA = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    const sparkA = new THREE.BufferAttribute(this.spark, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posA);
    geo.setAttribute('aSpark', sparkA);
    geo.setAttribute(
      'aColor',
      new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 800 }, uFog: { value: 0 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.name = 'life:sparks';
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  get activeCount(): number {
    return this.active;
  }

  /** One spark. `hex` is an sRGB colour; `size` is its diameter in metres. */
  emit(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    size: number,
    hex: number,
    intensity = 1,
  ): void {
    const i = this.head;
    this.head = (this.head + 1) % this.capacity;
    const i3 = i * 3;
    this.pos[i3] = x;
    this.pos[i3 + 1] = y;
    this.pos[i3 + 2] = z;
    this.vel[i3] = vx;
    this.vel[i3 + 1] = vy;
    this.vel[i3 + 2] = vz;
    this.life[i] = life;
    this.age[i] = 0;
    this.size[i] = size;
    this.peak[i] = intensity;
    this.c.setHex(hex);
    this.color[i3] = this.c.r;
    this.color[i3 + 1] = this.c.g;
    this.color[i3 + 2] = this.c.b;
  }

  /** Age and move every spark; `scale` converts metres to pixels at distance 1. */
  update(dt: number, scale: number, fogDensity: number, drift?: { x: number; z: number }): void {
    let active = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.age[i]! >= 1) {
        this.spark[i * 3 + 1] = 0;
        continue;
      }
      active++;
      const a = this.age[i]! + dt / this.life[i]!;
      this.age[i] = a;
      const i3 = i * 3;
      const damp = Math.exp(-0.9 * dt);
      this.vel[i3] = this.vel[i3]! * damp;
      this.vel[i3 + 1] = this.vel[i3 + 1]! * damp;
      this.vel[i3 + 2] = this.vel[i3 + 2]! * damp;
      this.pos[i3] = this.pos[i3]! + (this.vel[i3]! + (drift?.x ?? 0)) * dt;
      this.pos[i3 + 1] = this.pos[i3 + 1]! + this.vel[i3 + 1]! * dt;
      this.pos[i3 + 2] = this.pos[i3 + 2]! + (this.vel[i3 + 2]! + (drift?.z ?? 0)) * dt;
      this.spark[i3] = Math.min(1, a);
      this.spark[i3 + 1] = this.size[i]!;
      this.spark[i3 + 2] = this.peak[i]!;
    }
    this.active = active;
    this.points.visible = active > 0;
    if (active === 0) return;
    const g = this.points.geometry;
    (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('aSpark') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
    const u = this.material.uniforms as { uScale: { value: number }; uFog: { value: number } };
    u.uScale.value = scale;
    u.uFog.value = fogDensity;
  }

  clear(): void {
    this.age.fill(1);
    this.active = 0;
    this.points.visible = false;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
