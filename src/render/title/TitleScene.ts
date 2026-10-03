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
  /** Renderable objects in the scene (draw calls per frame). */
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
  vehicleAboveFloorM: 35,
  cameraOffset: new THREE.Vector3(-85, 35, 115),
  lookOffset: new THREE.Vector3(35, -8, -35),
  clearanceM: 12,
  swayPeriodS: 40,
  swayHorizontalM: 0.9, // circle radius: <= 2 m travel
  swayYawDeg: 0.45, // amplitude: <= 1 degree swing
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
const FRAMING: Record<TitleLayout, { x: number; y: number; silhouette: number | null }> = {
  desktop: { x: 0.72, y: 0.55, silhouette: null },
  portrait: { x: 0.64, y: 0.5, silhouette: 0.24 },
  'short-landscape': { x: 0.5, y: 0.66, silhouette: 0.3 },
};

const SNOW_BOX = new THREE.Vector3(260, 120, 260);
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
  private readonly hemi = new THREE.HemisphereLight(0x7fb4d4, 0x0b2230, 1.1);
  private readonly rim = new THREE.DirectionalLight(0x8fd0e6, 0.9);

  // Scratch.
  private readonly basePos = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly lookAt = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly yawQ = new THREE.Quaternion();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly lookM = new THREE.Matrix4();

  constructor(opts: TitleSceneOptions) {
    this.tier = opts.tier;
    this.reduced = opts.reducedMotion;

    this.scene.background = new THREE.Color(TITLE_SHOT.fallbackColor);
    this.scene.fog = new THREE.FogExp2(0x07182a, 0.0035);

    this.rim.position.set(-60, 90, -120);
    this.rim.target.position.set(0, 0, 0);
    this.scene.add(this.hemi, this.rim, this.rim.target);

    for (const side of [-1, 1]) {
      const lamp = new THREE.SpotLight(0xfff3dd, 700, 170, 0.42, 0.7, 1.35);
      lamp.name = `titleLamp${side}`;
      lamp.position.set(side * 2.6, -1.6, -12);
      lamp.target.position.set(side * 5, -34, -30);
      this.lamps.push(lamp);
      this.rig.add(lamp, lamp.target);
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
    this.vehicle.dispose();
    this.disposeSnow();
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
    v.update({ lightsOn: true }, 0);
    this.rig.add(v.root);
    return v;
  }

  private releaseCrop(): void {
    const c = this.crop;
    this.crop = null;
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
      color: 0xdfe9ec,
      size: 0.9,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
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
      anchor + TITLE_SHOT.vehicleAboveFloorM,
      this.floorNear(0, 0) + TITLE_SHOT.clearanceM,
    );
    this.basePos.set(0, vehicleY, 0);
    this.rig.position.set(0, vehicleY + hover, 0);
    this.rig.rotation.y = -(Math.PI / 2 - TITLE_SHOT.headingAwayRad);
    this.rig.updateMatrixWorld(true);

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
    this.lookM.lookAt(this.camera.position, this.lookAt, this.up);
    this.camera.quaternion.setFromRotationMatrix(this.lookM);
    this.yawQ.setFromAxisAngle(this.up, yaw);
    this.camera.quaternion.premultiply(this.yawQ);
    this.camera.updateMatrixWorld(true);
  }

  /**
   * Compose the shot for the current region: aspect, optional zoom to hold the
   * silhouette on narrow layouts, and a view offset that puts the vehicle at
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
    this.lookM.lookAt(cam.position, this.lookAt, this.up);
    cam.quaternion.setFromRotationMatrix(this.lookM);
    cam.updateMatrixWorld(true);

    const spec = FRAMING[this.layout];
    if (spec.silhouette !== null) {
      const box = new THREE.Box3().setFromObject(this.vehicle.root);
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < 8; i++) {
        this.tmp
          .set(
            i & 1 ? box.max.x : box.min.x,
            i & 2 ? box.max.y : box.min.y,
            i & 4 ? box.max.z : box.min.z,
          )
          .project(cam);
        lo = Math.min(lo, this.tmp.x);
        hi = Math.max(hi, this.tmp.x);
      }
      const frac = Math.max(1e-4, (hi - lo) / 2);
      cam.zoom = Math.min(3, Math.max(1, spec.silhouette / frac));
      cam.updateProjectionMatrix();
    }

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
      if (!(m.isMesh || isPoints)) return;
      calls++;
      if (isPoints) return;
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
