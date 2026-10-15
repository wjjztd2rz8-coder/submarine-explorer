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

import { Headlights } from '../Headlights.js';
import { MarineSnow, type SnowFieldConfig } from '../MarineSnow.js';

import * as THREE from 'three';
import { buildVehicle, type Vehicle } from '../../vehicles/index.js';
import type { GraphicsTier } from '../../core/Config.js';

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

export type TitleTier = GraphicsTier;
export type TitleLayout = 'desktop' | 'portrait' | 'short-landscape';

interface TitleSceneOptions {
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
const TITLE_LAMPS = {
  headlightColor: 0xffd79a,
  headlightIntensity: 250,
  headlightDistance: 150,
  headlightAngleDeg: (0.62 / Math.PI) * 180,
  headlightSeparationM: 5.2,
  headlightConeOpacity: 0.5,
};
const TITLE_BEAMS = {
  penumbra: 0.85,
  decay: 1.3,
  surfaceBeam: { color: 0xffd29a, strength: 0.5, segments: 28, angle: 0.42, lengthScale: 1.08 },
};
const TITLE_SNOW = {
  box: new THREE.Vector3(170, 80, 170),
  seed: 0x51ed27,
  sprite: {
    color: 0xdff1f2,
    size: 0.55,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    fog: true,
  },
  drift: {
    lateralM: 1.2,
    xRate: 0.11,
    zRate: 0.09,
    phaseStep: 0.37,
    sinkMps: 0.45,
    sinkBase: 0.7,
    sinkSpread: 0.6,
    sinkCycle: 7,
  },
} satisfies SnowFieldConfig;
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

const MIN_FRAME_S = 1 / TITLE_SHOT.maxFps - 1e-9;

/** Pixel rectangle (CSS px, origin top-left) the shot is drawn into. */
interface TitleRegion {
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
  private readonly headlights: Headlights;
  private snow: MarineSnow | null = null;
  private readonly hemi = new THREE.HemisphereLight(0x4a9cc4, 0x0e2c3c, 1.2);
  private readonly rim = new THREE.DirectionalLight(0x8fd0ea, 5);
  private sky: THREE.Mesh | null = null;
  private contact: THREE.Mesh | null = null;

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
    this.headlights = new Headlights(
      TITLE_LAMPS,
      { headlightCones: true, beamDetail: 0 },
      undefined,
      TITLE_BEAMS,
    );
    this.headlights.lights.forEach((lamp, i) => {
      const side = i === 0 ? -1 : 1;
      lamp.name = `titleLamp${side}`;
      lamp.position.set(side * 2.6, -1.6, -12);
      this.headlights.beams[i]!.name = `titleBeam${side}`;
    });
    this.rig.add(this.headlights.group);
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
    if (this.snow?.points) this.snow.points.visible = !b;
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
    const viewport = renderer.getViewport(new THREE.Vector4());
    const scissor = renderer.getScissor(new THREE.Vector4());
    const scissorTest = renderer.getScissorTest();
    const glY = this.height - r.y - r.h; // GL origin is bottom-left
    renderer.setViewport(r.x, glY, r.w, r.h);
    renderer.setScissor(r.x, glY, r.w, r.h);
    renderer.setScissorTest(true);
    try {
      renderer.render(this.scene, this.camera);
      this.stats.calls = renderer.info.render.calls;
      this.stats.triangles = renderer.info.render.triangles;
    } finally {
      renderer.setViewport(viewport.x, viewport.y, viewport.z, viewport.w);
      renderer.setScissor(scissor.x, scissor.y, scissor.z, scissor.w);
      renderer.setScissorTest(scissorTest);
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
    this.snow?.dispose();
    this.snow = null;
    this.headlights.dispose();
    if (this.sky) {
      this.sky.geometry.dispose();
      (this.sky.material as THREE.Material).dispose();
    }
    this.snowTex?.dispose();
    this.snowTex = null;
    this.hemi.dispose();
    this.rim.dispose();
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
    const tex = radialTexture(64, [2, 8, 12], 0.78);
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
    this.headlights.lights.forEach((lamp, k) => {
      lamp.getWorldPosition(lampWorld);
      const side = lamp.position.x > 0 ? 1 : -1;
      // Outward is rig-local +x for the right lamp.
      const out = new THREE.Vector3(side, 0, 0).applyQuaternion(this.rig.quaternion);
      const tx = lampWorld.x + fx * POOL_AHEAD_M + out.x * 2.5;
      const tz = lampWorld.z + fz * POOL_AHEAD_M + out.z * 2.5;
      targetWorld.set(tx, this.floorAt(tx, tz) + 0.2, tz);
      this.headlights.aimAt(k, targetWorld);
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
    this.snow?.dispose();
    this.snow = new MarineSnow(
      { ...TITLE_SNOW, sprite: { ...TITLE_SNOW.sprite, map: this.snowSprite() } },
      { snowCount: TITLE_SHOT.snowCount[this.tier] },
    );
    const points = this.snow.points!;
    points.name = 'titleSnow';
    points.visible = !this.reduced;
    this.scene.add(points);
  }

  private snowTex: THREE.DataTexture | null = null;
  private snowSprite(): THREE.DataTexture {
    return (this.snowTex ??= radialTexture(16, [255, 255, 255], 1));
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
    // Assets can change the anchor immediately before draw, without an update.
    this.snow?.place(this.basePos, this.time);
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
