/**
 * F-TITLE-C: the Bathyline title shot.
 *
 * One scene, one perspective camera, no renderer of its own: the research
 * vehicle (class B, cream hull, two lamps) hovering beside a real canyon crop
 * supplied by TitleTerrain (package B) through the `TitleCropInput` shape.
 * Local metres: +X east, +Z south, +Y up, anchor floor at `anchorFloorY`.
 *
 * Ownership: this class owns the scene graph, vehicle, lights, snow, camera
 * and any crop handed to `setCrop` (the crop is disposed when replaced, when
 * set to null, on dispose, or immediately if it arrives after dispose). It
 * never touches the renderer's lifetime, only viewport/scissor during `draw`,
 * and restores both.
 */

import * as THREE from 'three';
import { buildVehicle, type Vehicle } from '../../vehicles/index.js';

/** What the terrain package hands over (type-only, defined locally). */
export interface TitleCropInput {
  mesh: THREE.Mesh;
  /** Seabed height at the anchor, in the same local space as `mesh`. */
  anchorFloorY: number;
  /** Seabed height at local (x, z). */
  sampleFloor(x: number, z: number): number;
  halfSize: number;
  dispose(): void;
}

export type TitleTier = 'low' | 'medium' | 'high';
export type TitleLayout = 'desktop' | 'portrait' | 'short-landscape';

export interface TitleSceneOptions {
  tier: TitleTier;
  reducedMotion: boolean;
}

export interface TitleStats {
  /** GPU counts from the last draw; geometry estimates until first draw. */
  calls: number;
  triangles: number;
  /** Frames actually presented by `draw`. */
  drawCount: number;
}

/** Spec §5 constants. */
export const TITLE_SHOT = {
  fov: 42,
  near: 1,
  far: 3000,
  /**
   * F-TITLE-LOOK: the hull hovers a few metres over the seabed (the skids sit
   * about 4 m up) so it reads as a vehicle working the bottom, with a camera
   * at roughly eye height beside it. `clearanceM` is the hard clipping guard
   * for both rig origin and camera over the sampled floor.
   */
  vehicleAboveFloorM: 8.8,
  cameraOffset: new THREE.Vector3(36, 17, 72),
  lookOffset: new THREE.Vector3(-5, 1, -40),
  /** Slight dutch angle so the slope reads as a diagonal. */
  rollDeg: -3,
  clearanceM: 7,
  swayPeriodS: 40,
  swayHorizontalM: 0.8, // circle radius: <= 2 m travel
  swayYawDeg: 0.3, // amplitude: <= 1 degree swing
  hoverM: 0.14, // amplitude: <= 0.3 m
  /** Vehicle heading: east, turned 15 degrees toward north (away). */
  headingAwayRad: (15 * Math.PI) / 180,
  maxFps: 30,
  maxDt: 0.1,
  fallbackColor: 0x06131f,
  snowCount: { low: 200, medium: 600, high: 600 } as Record<TitleTier, number>,
  budgets: {
    low: { calls: 35, triangles: 100_000 },
    medium: { calls: 60, triangles: 200_000 },
    high: { calls: 60, triangles: 200_000 },
  } as Record<TitleTier, { calls: number; triangles: number }>,
} as const;

/** Where the vehicle should sit in the render region, as screen fractions. */
const FRAMING: Record<TitleLayout, { x: number; y: number; silhouette: number }> = {
  desktop: { x: 0.6, y: 0.58, silhouette: 0.2 },
  portrait: { x: 0.5, y: 0.4, silhouette: 0.36 },
  'short-landscape': { x: 0.4, y: 0.62, silhouette: 0.36 },
};

const FOG_COLOR = 0x0f3a52;
const SKY_TOP = 0x0a2a42;
const SNOW_BOX = new THREE.Vector3(170, 80, 170);
/** Lamp pool lands this far ahead of each lamp, measured on the ground plane. */
const POOL_AHEAD_M = 9;

/** Square RGBA texture with a soft round falloff; `rgb` 0..255, alpha peaks at `peak`. */
function radialTexture(
  size: number,
  rgb: [number, number, number],
  peak: number,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = ((x + 0.5) / size) * 2 - 1;
      const dy = ((y + 0.5) / size) * 2 - 1;
      const d = Math.min(1, Math.hypot(dx, dy));
      const f = (1 - d) * (1 - d) * (3 - 2 * (1 - d));
      const k = (y * size + x) * 4;
      data[k] = rgb[0];
      data[k + 1] = rgb[1];
      data[k + 2] = rgb[2];
      data[k + 3] = Math.round(255 * peak * f);
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const BEAM_VERT = `
varying float vAxis;
varying vec3 vN;
varying vec3 vV;
void main() {
  vAxis = position.z;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FRAG = `
uniform vec3 uColor;
uniform float uStrength;
varying float vAxis;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = abs(dot(normalize(vN), normalize(vV)));
  float a = pow(f, 1.6) * pow(1.0 - vAxis, 1.3) * smoothstep(0.02, 0.4, vAxis) * uStrength;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const MIN_FRAME_S = 1 / TITLE_SHOT.maxFps - 0.002;

/** Pixel rectangle (CSS px, origin top-left) the shot is drawn into. */
export interface TitleRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function regionFor(w: number, h: number, layout: TitleLayout): TitleRegion {
  if (layout === 'portrait') {
    const band = Math.min(h, Math.max(128, Math.min(190, 0.22 * h)));
    return { x: 0, y: 0, w, h: band };
  }
  if (layout === 'short-landscape') {
    return { x: 0, y: 0, w: Math.max(1, Math.round(w * 0.42)), h };
  }
  return { x: 0, y: 0, w, h };
}

export class TitleScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(
    TITLE_SHOT.fov,
    16 / 9,
    TITLE_SHOT.near,
    TITLE_SHOT.far,
  );
  readonly stats: TitleStats = { calls: 0, triangles: 0, drawCount: 0 };

  private tier: TitleTier;
  private reduced: boolean;
  private crop: TitleCropInput | null = null;
  private disposed = false;
  private dirty = true;
  private time = 0;
  private sinceDraw = Infinity;

  private layout: TitleLayout = 'desktop';
  private width = 1280;
  private height = 720;
  private region: TitleRegion = { x: 0, y: 0, w: 1280, h: 720 };

  /** Carries the vehicle and its lamps: position, heading, hover. */
  private readonly rig = new THREE.Group();
  private vehicle: Vehicle;
  private readonly lamps: THREE.SpotLight[] = [];
  private snow: THREE.Points | null = null;
  private snowBase: Float32Array | null = null;
  private readonly hemi = new THREE.HemisphereLight(0x4a9cc4, 0x0e2c3c, 1.2);
  private readonly rim = new THREE.DirectionalLight(0x8fd0ea, 5);
  private readonly beams: THREE.Mesh[] = [];
  private readonly beamMaterials: THREE.ShaderMaterial[] = [];
  private sky: THREE.Mesh | null = null;
  private contact: THREE.Mesh | null = null;
  private readonly fx: THREE.Texture[] = [];

  // Scratch.
  private readonly basePos = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly lookAt = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly yawQ = new THREE.Quaternion();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly lookM = new THREE.Matrix4();
  private readonly rollQ = new THREE.Quaternion();
  private readonly zAxis = new THREE.Vector3(0, 0, 1);

  constructor(opts: TitleSceneOptions) {
    this.tier = opts.tier;
    this.reduced = opts.reducedMotion;

    this.scene.background = new THREE.Color(TITLE_SHOT.fallbackColor);
    this.scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0018);

    this.rim.position.set(-300, 70, 80);
    this.rim.target.position.set(0, 0, 0);
    this.scene.add(this.hemi, this.rim, this.rim.target);

    this.buildSky();
    for (const side of [-1, 1]) {
      const lamp = new THREE.SpotLight(0xffd79a, 250, 150, 0.62, 0.85, 1.3);
      lamp.name = `titleLamp${side}`;
      lamp.position.set(side * 2.6, -1.6, -12);
      lamp.target.position.set(side * 5, -9, -30);
      this.lamps.push(lamp);
      this.rig.add(lamp, lamp.target);
      this.buildBeam(side);
    }
    this.scene.add(this.rig);

    this.vehicle = this.buildVehicle();
    this.rebuildSnow();
    this.applyMotion();
    this.frame();
    this.measure();
  }

  // -- public API ---------------------------------------------------------

  get terrainReady(): boolean {
    return this.crop !== null && !this.disposed;
  }

  /** True when the pose changes over time (so frames are drawn continuously). */
  get animated(): boolean {
    return !this.reduced && !this.disposed;
  }

  setCrop(c: TitleCropInput | null): void {
    if (this.disposed) {
      // Late async completion after teardown: take ownership so it cannot leak.
      c?.dispose();
      return;
    }
    if (c === this.crop) return;
    this.releaseCrop();
    this.crop = c;
    if (c) this.scene.add(c.mesh);
    this.applyMotion();
    this.buildContactShadow();
    this.frame();
    this.measure();
    this.dirty = true;
  }

  update(dt: number): void {
    if (this.disposed) return;
    const step = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), TITLE_SHOT.maxDt);
    if (this.reduced) return;
    this.time += step;
    this.sinceDraw += step;
    this.vehicle.update({ lightsOn: true }, step);
    this.updateSnow(step);
    this.applyMotion();
  }

  resize(w: number, h: number, layout: TitleLayout): void {
    if (this.disposed) return;
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.layout = layout;
    this.region = regionFor(this.width, this.height, layout);
    this.frame();
    this.dirty = true;
  }

  setQuality(tier: TitleTier): void {
    if (this.disposed || tier === this.tier) return;
    this.tier = tier;
    this.vehicle.dispose();
    this.vehicle = this.buildVehicle();
    this.rebuildSnow();
    this.applyMotion();
    this.frame();
    this.measure();
    this.dirty = true;
  }

  setReducedMotion(b: boolean): void {
    if (this.disposed || b === this.reduced) return;
    this.reduced = b;
    if (b) this.time = 0;
    this.sinceDraw = Infinity;
    if (this.snow) this.snow.visible = !b;
    this.vehicle.update({ lightsOn: true }, 0);
    this.applyMotion();
    this.frame();
    this.measure();
    this.dirty = true;
  }

  /** Request a presentation (enter, assets ready, modal closed, ...). */
  invalidate(): void {
    this.dirty = true;
  }

  draw(renderer: THREE.WebGLRenderer): void {
    if (this.disposed) return;
    if (this.animated) {
      if (!this.dirty && this.sinceDraw < MIN_FRAME_S) return;
    } else if (!this.dirty) {
      return;
    }

    const r = this.region;
    const partial = r.w !== this.width || r.h !== this.height;
    let viewport: THREE.Vector4 | null = null;
    let scissor: THREE.Vector4 | null = null;
    let scissorTest = false;
    if (partial) {
      viewport = renderer.getViewport(new THREE.Vector4());
      scissor = renderer.getScissor(new THREE.Vector4());
      scissorTest = renderer.getScissorTest();
      const glY = this.height - r.y - r.h; // GL origin is bottom-left
      renderer.setViewport(r.x, glY, r.w, r.h);
      renderer.setScissor(r.x, glY, r.w, r.h);
      renderer.setScissorTest(true);
    }
    try {
      renderer.render(this.scene, this.camera);
      this.stats.calls = renderer.info.render.calls;
      this.stats.triangles = renderer.info.render.triangles;
    } finally {
      if (partial && viewport && scissor) {
        renderer.setViewport(viewport.x, viewport.y, viewport.z, viewport.w);
        renderer.setScissor(scissor.x, scissor.y, scissor.z, scissor.w);
        renderer.setScissorTest(scissorTest);
      }
    }
    this.dirty = false;
    this.sinceDraw = 0;
    this.stats.drawCount++;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseCrop();
    this.disposeContact();
    this.vehicle.dispose();
    this.disposeSnow();
    for (const m of this.beamMaterials) m.dispose();
    for (const b of this.beams) b.geometry.dispose();
    if (this.sky) {
      this.sky.geometry.dispose();
      (this.sky.material as THREE.Material).dispose();
    }
    for (const t of this.fx) t.dispose();
    this.hemi.dispose();
    this.rim.dispose();
    for (const l of this.lamps) l.dispose();
    this.scene.remove(this.rig, this.hemi, this.rim, this.rim.target);
    this.scene.clear();
    this.stats.calls = 0;
    this.stats.triangles = 0;
  }

  // -- internals ----------------------------------------------------------

  private buildVehicle(): Vehicle {
    const v = buildVehicle('B', this.tier);
    // The gameplay model flashes its navigation strobe by default. This
    // decorative shot keeps the lenses steady even when camera sway is on.
    v.reduceMotion = true;
    v.update({ lightsOn: true }, 0);
    this.rig.add(v.root);
    return v;
  }

  private track<T extends THREE.Texture>(t: T): T {
    this.fx.push(t);
    return t;
  }

  /** Inverted gradient dome: fog colour at the horizon fading to deep navy overhead. */
  private buildSky(): void {
    const geo = new THREE.SphereGeometry(2600, 24, 12);
    const pos = geo.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const lo = new THREE.Color(FOG_COLOR);
    const hi = new THREE.Color(SKY_TOP);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, pos.getY(i) / 2600 / 0.45));
      c.copy(lo).lerp(hi, Math.pow(t, 0.7));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      depthTest: false,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.name = 'titleSky';
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    this.sky = sky;
    this.scene.add(sky);
  }

  /** Additive cone with fresnel and length falloff: a cheap volumetric lamp beam. */
  private buildBeam(side: number): void {
    const geo = new THREE.ConeGeometry(1, 1, 28, 1, true);
    geo.rotateX(Math.PI / 2); // axis along +z, base at z = 0.5
    geo.translate(0, 0, 0.5);
    // After the rotate the apex sits at z = 1 and the base at z = 0: flip so
    // z = 0 is the lamp and z = 1 the far end.
    const p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) p.setZ(i, 1 - p.getZ(i));
    const flipped = geo.index!;
    for (let i = 0; i < flipped.count; i += 3) {
      const b = flipped.getX(i + 1);
      flipped.setX(i + 1, flipped.getX(i + 2));
      flipped.setX(i + 2, b);
    }
    geo.computeVertexNormals();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xffd29a) }, uStrength: { value: 0.5 } },
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const beam = new THREE.Mesh(geo, mat);
    beam.name = `titleBeam${side}`;
    beam.frustumCulled = false;
    this.beams.push(beam);
    this.beamMaterials.push(mat);
    this.rig.add(beam);
  }

  /** Soft contact shadow draped over the real seabed beneath the hull. */
  private buildContactShadow(): void {
    this.disposeContact();
    if (!this.crop) return;
    const N = 14;
    const L = 17; // half length along heading, m
    const W = 12; // half width
    const heading = this.rig.rotation.y;
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    const pos = new Float32Array((N + 1) * (N + 1) * 3);
    const uv = new Float32Array((N + 1) * (N + 1) * 2);
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * 2 - 1;
        const v = (j / N) * 2 - 1;
        const lx = u * W;
        const lz = v * L;
        // Rig-local (x, z) to world about the rig yaw.
        const x = lx * cos + lz * sin;
        const z = -lx * sin + lz * cos;
        const k = j * (N + 1) + i;
        pos[k * 3] = x;
        pos[k * 3 + 1] = this.crop.sampleFloor(x, z) + 0.3;
        pos[k * 3 + 2] = z;
        uv[k * 2] = i / N;
        uv[k * 2 + 1] = 1 - j / N;
      }
    }
    const idx: number[] = [];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i;
        const b = a + N + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const tex = this.track(radialTexture(64, [2, 8, 12], 0.78));
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'titleContactShadow';
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    this.contact = mesh;
    this.scene.add(mesh);
  }

  private disposeContact(): void {
    const c = this.contact;
    if (!c) return;
    this.scene.remove(c);
    c.geometry.dispose();
    const m = c.material as THREE.MeshBasicMaterial;
    m.map?.dispose();
    m.dispose();
    this.contact = null;
  }

  /**
   * Aim each lamp at the real seabed a few metres ahead of the bow and stretch
   * its beam to meet it, so the pool lands on the sediment in front of the hull.
   */
  private aimLamps(): void {
    const fwd = this.tmp.set(0, 0, -1).applyQuaternion(this.rig.quaternion);
    const fx = fwd.x;
    const fz = fwd.z;
    const lampWorld = new THREE.Vector3();
    const targetWorld = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const zAxis = new THREE.Vector3(0, 0, 1);
    this.lamps.forEach((lamp, k) => {
      lamp.getWorldPosition(lampWorld);
      const side = lamp.position.x > 0 ? 1 : -1;
      // Outward is rig-local +x for the right lamp.
      const out = new THREE.Vector3(side, 0, 0).applyQuaternion(this.rig.quaternion);
      const tx = lampWorld.x + fx * POOL_AHEAD_M + out.x * 2.5;
      const tz = lampWorld.z + fz * POOL_AHEAD_M + out.z * 2.5;
      targetWorld.set(tx, this.floorAt(tx, tz) + 0.2, tz);
      lamp.target.position.copy(this.rig.worldToLocal(targetWorld.clone()));
      lamp.target.updateMatrixWorld(true);
      const beam = this.beams[k];
      if (!beam) return;
      dir.copy(targetWorld).sub(lampWorld);
      const len = dir.length() * 1.08;
      dir.normalize();
      // Beam lives in rig space: convert direction to local.
      const local = dir
        .clone()
        .transformDirection(new THREE.Matrix4().copy(this.rig.matrixWorld).invert());
      q.setFromUnitVectors(zAxis, local);
      beam.position.copy(lamp.position);
      beam.quaternion.copy(q);
      const r = len * Math.tan(0.42);
      beam.scale.set(r, r, len);
    });
  }

  private releaseCrop(): void {
    const c = this.crop;
    this.crop = null;
    this.disposeContact();
    if (!c) return;
    this.scene.remove(c.mesh);
    c.dispose();
  }

  private rebuildSnow(): void {
    this.disposeSnow();
    const count = TITLE_SHOT.snowCount[this.tier];
    const base = new Float32Array(count * 3);
    let rng = 0x51ed27;
    const rand = (): number => {
      rng = (rng * 1664525 + 1013904223) >>> 0;
      return rng / 0x100000000;
    };
    for (let i = 0; i < count; i++) {
      base[i * 3] = rand() * SNOW_BOX.x;
      base[i * 3 + 1] = rand() * SNOW_BOX.y;
      base[i * 3 + 2] = rand() * SNOW_BOX.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(base), 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    const mat = new THREE.PointsMaterial({
      color: 0xdff1f2,
      map: this.snowSprite(),
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.name = 'titleSnow';
    pts.frustumCulled = false;
    pts.visible = !this.reduced;
    this.snow = pts;
    this.snowBase = base;
    this.scene.add(pts);
    this.placeSnow(0);
  }

  private snowTex: THREE.DataTexture | null = null;
  private snowSprite(): THREE.DataTexture {
    return (this.snowTex ??= this.track(radialTexture(16, [255, 255, 255], 1)));
  }

  private disposeSnow(): void {
    const s = this.snow;
    if (!s) return;
    this.scene.remove(s);
    s.geometry.dispose();
    (s.material as THREE.Material).dispose();
    this.snow = null;
    this.snowBase = null;
  }

  private updateSnow(_step: number): void {
    this.placeSnow(this.time);
  }

  /** Slow sink plus lateral drift, wrapped into a box around the vehicle. */
  private placeSnow(t: number): void {
    const s = this.snow;
    const base = this.snowBase;
    if (!s || !base) return;
    const pos = (s.geometry.getAttribute('position') as THREE.BufferAttribute)
      .array as Float32Array;
    const cx = this.basePos.x;
    const cy = this.basePos.y;
    const cz = this.basePos.z;
    const wrap = (v: number, size: number): number => ((v % size) + size) % size;
    for (let i = 0; i < base.length; i += 3) {
      const phase = i * 0.37;
      const x = base[i]! + 1.2 * Math.sin(t * 0.11 + phase);
      const y = base[i + 1]! - 0.45 * t * (0.7 + 0.6 * ((i % 7) / 7));
      const z = base[i + 2]! + 1.2 * Math.cos(t * 0.09 + phase);
      pos[i] = cx + wrap(x, SNOW_BOX.x) - SNOW_BOX.x / 2;
      pos[i + 1] = cy + wrap(y, SNOW_BOX.y) - SNOW_BOX.y / 2;
      pos[i + 2] = cz + wrap(z, SNOW_BOX.z) - SNOW_BOX.z / 2;
    }
    (s.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private floorAt(x: number, z: number): number {
    return this.crop ? this.crop.sampleFloor(x, z) : 0;
  }

  /** Highest seabed within a few metres of (x, z): a cheap guard against ridges. */
  private floorNear(x: number, z: number): number {
    if (!this.crop) return 0;
    const r = 6;
    let f = this.floorAt(x, z);
    f = Math.max(f, this.floorAt(x + r, z), this.floorAt(x - r, z));
    f = Math.max(f, this.floorAt(x, z + r), this.floorAt(x, z - r));
    return Number.isFinite(f) ? f : 0;
  }

  /**
   * Pose vehicle, lamps and camera for the current time. Sway is a closed
   * 40 s loop (circle for the camera, 2x harmonic for hover), so it is
   * seamless. Clearance over sampled floor is enforced every call.
   */
  private applyMotion(): void {
    const phase = this.reduced ? 0 : (this.time / TITLE_SHOT.swayPeriodS) * Math.PI * 2;
    const swayX = this.reduced ? 0 : TITLE_SHOT.swayHorizontalM * Math.sin(phase);
    const swayZ = this.reduced ? 0 : TITLE_SHOT.swayHorizontalM * Math.cos(phase);
    const yaw = this.reduced ? 0 : ((TITLE_SHOT.swayYawDeg * Math.PI) / 180) * Math.sin(phase);
    const hover = this.reduced ? 0 : TITLE_SHOT.hoverM * Math.sin(phase * 2);

    const anchor = this.crop ? this.crop.anchorFloorY : 0;
    const vehicleY = Math.max(
      this.floorNear(0, 0) + TITLE_SHOT.vehicleAboveFloorM,
      anchor + TITLE_SHOT.clearanceM,
    );
    this.basePos.set(0, vehicleY, 0);
    this.rig.position.set(
      0,
      Math.max(vehicleY + hover, this.floorNear(0, 0) + TITLE_SHOT.clearanceM),
      0,
    );
    this.rig.rotation.y = -(Math.PI / 2 - TITLE_SHOT.headingAwayRad);
    this.rig.updateMatrixWorld(true);
    this.aimLamps();

    this.camPos.copy(this.basePos).add(TITLE_SHOT.cameraOffset);
    this.camPos.y = Math.max(
      this.camPos.y,
      this.floorNear(this.camPos.x, this.camPos.z) + TITLE_SHOT.clearanceM,
    );
    this.lookAt.copy(this.basePos).add(TITLE_SHOT.lookOffset);
    this.camera.position.set(this.camPos.x + swayX, this.camPos.y, this.camPos.z + swayZ);
    this.camera.position.y = Math.max(
      this.camera.position.y,
      this.floorNear(this.camera.position.x, this.camera.position.z) + TITLE_SHOT.clearanceM,
    );
    this.orient(this.camera.position);
    this.yawQ.setFromAxisAngle(this.up, yaw);
    this.camera.quaternion.premultiply(this.yawQ);
    this.camera.updateMatrixWorld(true);
    this.sky?.position.copy(this.camera.position);
  }

  /** Aim the camera at the look target from `from`, then roll it (dutch angle). */
  private orient(from: THREE.Vector3): void {
    this.lookM.lookAt(from, this.lookAt, this.up);
    this.camera.quaternion.setFromRotationMatrix(this.lookM);
    this.rollQ.setFromAxisAngle(this.zAxis, (TITLE_SHOT.rollDeg * Math.PI) / 180);
    this.camera.quaternion.multiply(this.rollQ);
  }

  /**
   * Compose the shot for the current region: aspect, zoom to hold the
   * silhouette at its authored size, and a view offset that puts the vehicle at
   * the layout's screen fraction. Measured from the un-swayed base pose so the
   * framing itself never moves.
   */
  private frame(): void {
    const cam = this.camera;
    const { w, h } = this.region;
    cam.aspect = w / h;
    cam.zoom = 1;
    cam.clearViewOffset();
    cam.updateProjectionMatrix();

    // Base (un-swayed) camera pose for measurement.
    const savedPos = cam.position.clone();
    const savedQuat = cam.quaternion.clone();
    cam.position.copy(this.camPos);
    cam.position.y = Math.max(
      cam.position.y,
      this.floorNear(cam.position.x, cam.position.z) + TITLE_SHOT.clearanceM,
    );
    this.orient(cam.position);
    cam.updateMatrixWorld(true);

    const spec = FRAMING[this.layout];
    // A world-aligned bounding box overestimates the diagonal hull's width.
    // Measure the actual geometry so the desktop silhouette meets 14–18%,
    // and the phone band retains a readable vehicle. This runs only on dirty
    // framing events, not during animated updates.
    let lo = Infinity;
    let hi = -Infinity;
    const instance = new THREE.Matrix4();
    const world = new THREE.Matrix4();
    this.vehicle.root.traverseVisible((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.getAttribute('position');
      const instanced = mesh as THREE.InstancedMesh;
      const count = instanced.isInstancedMesh ? instanced.count : 1;
      for (let j = 0; j < count; j++) {
        world.copy(mesh.matrixWorld);
        if (instanced.isInstancedMesh) {
          instanced.getMatrixAt(j, instance);
          world.multiply(instance);
        }
        for (let i = 0; i < positions.count; i++) {
          this.tmp.fromBufferAttribute(positions, i).applyMatrix4(world).project(cam);
          lo = Math.min(lo, this.tmp.x);
          hi = Math.max(hi, this.tmp.x);
        }
      }
    });
    const frac = Math.max(1e-4, (hi - lo) / 2);
    cam.zoom = Math.min(3, Math.max(0.6, spec.silhouette / frac));
    cam.updateProjectionMatrix();

    this.tmp.copy(this.basePos).project(cam);
    const px = ((this.tmp.x + 1) / 2) * w;
    const py = ((1 - this.tmp.y) / 2) * h;
    // View offset shifts the window; moving it by -delta moves content by +delta.
    cam.setViewOffset(w, h, px - spec.x * w, py - spec.y * h, w, h);

    cam.position.copy(savedPos);
    cam.quaternion.copy(savedQuat);
    cam.updateMatrixWorld(true);
  }

  /** Recount draw calls and triangles by walking the scene. */
  private measure(): void {
    let calls = 0;
    let triangles = 0;
    this.scene.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      const isPoints = (o as THREE.Points).isPoints === true;
      const isSprite = (o as THREE.Sprite).isSprite === true;
      if (!(m.isMesh || isPoints || isSprite)) return;
      calls++;
      if (isPoints) return;
      if (isSprite) {
        triangles += 2;
        return;
      }
      const g = m.geometry;
      const n = g.index ? g.index.count : g.getAttribute('position').count;
      const inst = (o as THREE.InstancedMesh).isInstancedMesh
        ? (o as THREE.InstancedMesh).count
        : 1;
      triangles += (n / 3) * inst;
    });
    this.stats.calls = calls;
    this.stats.triangles = Math.round(triangles);
  }
}
