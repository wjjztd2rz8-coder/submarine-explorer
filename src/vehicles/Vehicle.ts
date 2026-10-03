/**
 * A built vehicle (F1-VEHICLES): merged static meshes plus the few moving
 * parts, animated from the pilot's commands.
 *
 * - Propellers: one `InstancedMesh` for every thruster; each spins toward its
 *   own commanded thrust with a short spool-up, so a turn visibly speeds one
 *   aft prop and slows the other.
 * - Manipulators: four rigid links per arm (turret, upper arm, forearm,
 *   wrist/jaw). Stowed by default; they unfold and work gently while the
 *   scanner is running.
 * - Pan/tilt camera: a slow survey sweep, pointed ahead while scanning.
 * - Strobe: a short xenon-style flash every two seconds with a halo sprite.
 * - Lamp lenses follow the headlights on/off; viewports always glow.
 * - Wash: particulates and bubbles from each duct (see `Wash.ts`).
 *
 * On the low LOD the arms and camera are baked into the static frame and the
 * wash, decals and halo are dropped, which keeps the vehicle at 8 draw calls
 * or fewer.
 */

import * as THREE from 'three';
import { PartBuilder } from './kit.js';
import { VehicleMaterials, type Slot, type VehicleLook } from './materials.js';
import {
  armGeometry,
  cameraHeadGeometry,
  cameraYokeGeometry,
  propellerGeometry,
  strobeGeometry,
  type ArmSpec,
  type PropSpec,
} from './parts.js';
import { addDecals, decalAtlas, type DecalSpec, type DecalText } from './decals.js';
import { Wash, type WashEmitter } from './Wash.js';

export type VehicleLod = 'low' | 'high';

/** Pilot commands and state the animation reads. All optional. */
export interface VehicleDrive {
  /** -1..1 forward thrust. */
  throttle?: number;
  /** -1..1, + turns to starboard. */
  yaw?: number;
  /** -1..1, + rises (ballast blow). */
  vertical?: number;
  /** -1..1 pitch command, + noses up. */
  pitch?: number;
  /** The scanner beam is running (manipulators deploy). */
  scanning?: boolean;
  /** Headlights on (lamp lenses glow). Default true. */
  lightsOn?: boolean;
}

/** Everything a hull-class builder produces, in vehicle metres. */
export interface Blueprint {
  id: string;
  label: string;
  /** Static parts, merged per slot. */
  parts: PartBuilder;
  props: PropSpec[];
  arms: ArmSpec[];
  camera: { pos: THREE.Vector3; size: number } | null;
  strobe: { pos: THREE.Vector3; radius: number } | null;
  decals: DecalSpec[];
  decalText: DecalText | null;
  /** Pilot eye for the cockpit view, inside the pressure sphere. */
  cockpitEye: THREE.Vector3;
  /** Where the ROV tether leaves the vehicle. */
  tetherAnchor: THREE.Vector3;
  /** Blade count for this vehicle's propellers. */
  blades?: number;
}

export interface VehicleStats {
  drawCalls: number;
  triangles: number;
}

interface ArmRig {
  spec: ArmSpec;
  joints: [THREE.Object3D, THREE.Object3D, THREE.Object3D, THREE.Object3D];
}

const SPIN_MAX_RPS = 3.2;
const SPOOL_PER_S = 3.5;
const STROBE_PERIOD_S = 2.0;
const STROBE_FLASH_S = 0.07;

export class Vehicle {
  /** Suppress the navigation strobe; lamps remain steady. */
  reduceMotion = false;
  /** The model, scaled from vehicle metres to world metres. */
  readonly root = new THREE.Group();
  readonly id: string;
  readonly label: string;
  readonly lod: VehicleLod;
  /** Cockpit eye and tether anchor in the parent (world-scale, boat-local) frame. */
  readonly cockpitEye: THREE.Vector3;
  readonly tetherAnchor: THREE.Vector3;
  readonly materials: VehicleMaterials;
  readonly props: THREE.InstancedMesh;
  readonly propSpecs: PropSpec[];
  /** Current spin rate of each propeller (rev/s, signed). */
  readonly propRps: Float32Array;
  readonly wash: Wash | null;
  readonly strobe: THREE.Mesh | null;
  /** 0 stowed .. 1 working. */
  armDeploy = 0;
  private readonly propAngle: Float32Array;
  private readonly arms: ArmRig[] = [];
  private readonly camPan: THREE.Object3D | null = null;
  private readonly camTilt: THREE.Object3D | null = null;
  private readonly halo: THREE.Sprite | null = null;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly emitters: WashEmitter[];
  private time = 0;
  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly q2 = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private readonly yAxis = new THREE.Vector3(0, 1, 0);

  constructor(
    bp: Blueprint,
    opts: { scale: number; lod: VehicleLod; look: VehicleLook; washCount: number },
  ) {
    this.id = bp.id;
    this.label = bp.label;
    this.lod = opts.lod;
    const low = opts.lod === 'low';
    this.root.name = `vehicle-${bp.id}`;
    this.root.scale.setScalar(opts.scale);
    this.cockpitEye = bp.cockpitEye.clone().multiplyScalar(opts.scale);
    this.tetherAnchor = bp.tetherAnchor.clone().multiplyScalar(opts.scale);
    this.materials = new VehicleMaterials(opts.look, !low, !low);
    const mats = this.materials;
    const frameMat = mats.bySlot.frame;

    // Moving parts first: on the low LOD they are baked into the static frame.
    for (const spec of bp.arms) {
      const links = armGeometry(spec, low);
      const joints = [0, 1, 2, 3].map(() => new THREE.Object3D()) as ArmRig['joints'];
      joints[0].position.copy(spec.mount);
      joints[2].position.set(0, 0, -spec.upper);
      joints[3].position.set(0, 0, -spec.fore);
      for (let i = 0; i < 3; i++) joints[i]!.add(joints[i + 1]!);
      const rig: ArmRig = { spec, joints };
      this.poseArm(rig, 0, 0);
      if (low) {
        joints[0].updateMatrixWorld(true);
        links.forEach((g, i) => bp.parts.add('frame', g, joints[i]!.matrixWorld.clone()));
      } else {
        links.forEach((g, i) => {
          const mesh = new THREE.Mesh(g, frameMat);
          mesh.name = `arm-link-${i}`;
          this.geometries.push(g);
          joints[i]!.add(mesh);
        });
        this.root.add(joints[0]);
        this.arms.push(rig);
      }
    }
    if (bp.camera) {
      const yokeG = cameraYokeGeometry(bp.camera.size);
      const headG = cameraHeadGeometry(bp.camera.size);
      const pan = new THREE.Object3D();
      pan.position.copy(bp.camera.pos);
      const tilt = new THREE.Object3D();
      pan.add(tilt);
      tilt.rotation.x = -0.25;
      if (low) {
        pan.updateMatrixWorld(true);
        bp.parts.add('frame', yokeG, pan.matrixWorld.clone());
        bp.parts.add('frame', headG, tilt.matrixWorld.clone());
      } else {
        const yoke = new THREE.Mesh(yokeG, frameMat);
        const head = new THREE.Mesh(headG, frameMat);
        yoke.name = 'camera-yoke';
        head.name = 'camera-head';
        pan.add(yoke);
        tilt.add(head);
        this.geometries.push(yokeG, headG);
        this.root.add(pan);
        this.camPan = pan;
        this.camTilt = tilt;
      }
    }
    // Decals (browser only, not on the low LOD).
    if (!low && bp.decalText && bp.decals.length) {
      const atlas = decalAtlas(bp.decalText);
      if (atlas) {
        mats.makeDecal(atlas);
        addDecals(bp.parts, bp.decals);
      }
    }

    // Static meshes, one per slot.
    const merged = bp.parts.build();
    const order: Slot[] = ['frame', 'metal', 'foam', 'glow', 'lens', 'decal', 'acrylic'];
    for (const slot of order) {
      const g = merged.get(slot);
      if (!g) continue;
      const mat = slot === 'decal' ? mats.decal : mats.bySlot[slot as Exclude<Slot, 'decal'>];
      if (!mat) {
        g.dispose();
        continue;
      }
      const mesh = new THREE.Mesh(g, mat);
      mesh.name = `vehicle-${slot}`;
      // The acrylic sphere is see-through: draw it after everything inside it.
      if (slot === 'acrylic') mesh.renderOrder = 2;
      this.geometries.push(g);
      this.root.add(mesh);
    }

    // Propellers: one instanced draw.
    this.propSpecs = bp.props;
    const propG = propellerGeometry(bp.blades ?? 5, low);
    this.geometries.push(propG);
    this.props = new THREE.InstancedMesh(
      propG,
      low ? mats.bySlot.frame : mats.bySlot.metal,
      bp.props.length,
    );
    this.props.name = 'vehicle-props';
    this.props.frustumCulled = false;
    this.root.add(this.props);
    this.propRps = new Float32Array(bp.props.length);
    this.propAngle = new Float32Array(bp.props.length);
    this.writeProps();

    // Strobe (+ halo on the high LOD).
    if (bp.strobe) {
      const g = strobeGeometry(bp.strobe.radius);
      this.geometries.push(g);
      this.strobe = new THREE.Mesh(g, mats.strobe);
      this.strobe.name = 'vehicle-strobe';
      this.strobe.position.copy(bp.strobe.pos);
      this.root.add(this.strobe);
      if (mats.halo) {
        this.halo = new THREE.Sprite(mats.halo);
        this.halo.name = 'vehicle-strobe-halo';
        this.halo.position.copy(bp.strobe.pos).add(new THREE.Vector3(0, bp.strobe.radius * 1.1, 0));
        this.halo.scale.setScalar(bp.strobe.radius * 16);
        this.halo.renderOrder = 4;
        this.root.add(this.halo);
      }
    } else this.strobe = null;

    this.emitters = bp.props.map(() => ({
      pos: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      radius: 0,
      strength: 0,
    }));
    this.wash = opts.washCount > 0 && !low ? new Wash(opts.washCount, opts.scale) : null;
    if (this.wash) this.root.add(this.wash.points);
  }

  /** Commanded thrust (-1..1) for each propeller from the pilot's inputs. */
  static thrustFor(channel: PropSpec['channel'], d: VehicleDrive): number {
    const throttle = d.throttle ?? 0;
    const yaw = d.yaw ?? 0;
    const vertical = d.vertical ?? 0;
    const pitch = d.pitch ?? 0;
    const c = (x: number): number => Math.max(-1, Math.min(1, x));
    switch (channel) {
      case 'port':
        return c(throttle + yaw * 0.7);
      case 'starboard':
        return c(throttle - yaw * 0.7);
      case 'vertical':
        return c(vertical);
      case 'vertical-fore':
        return c(vertical + pitch * 0.6);
      case 'vertical-aft':
        return c(vertical - pitch * 0.6);
      case 'lateral':
        return c(yaw * 0.8);
    }
  }

  /** Advance the animation. `dt` in seconds (0 while paused is fine). */
  update(drive: VehicleDrive, dt: number): void {
    this.time += dt;
    const t = this.time;
    const spool = 1 - Math.exp(-SPOOL_PER_S * dt);
    for (let i = 0; i < this.propSpecs.length; i++) {
      const spec = this.propSpecs[i]!;
      const target = Vehicle.thrustFor(spec.channel, drive) * SPIN_MAX_RPS;
      this.propRps[i] = this.propRps[i]! + (target - this.propRps[i]!) * spool;
      this.propAngle[i] =
        (this.propAngle[i]! + this.propRps[i]! * spec.hand * Math.PI * 2 * dt) % (Math.PI * 2);
    }
    this.writeProps();

    // Manipulators.
    const want = drive.scanning ? 1 : 0;
    const rate = dt * (want ? 0.9 : 0.6);
    this.armDeploy += Math.max(-rate, Math.min(rate, want - this.armDeploy));
    for (const arm of this.arms) this.poseArm(arm, this.armDeploy, t);

    // Pan/tilt camera: survey sweep, or straight ahead and down while scanning.
    if (this.camPan && this.camTilt) {
      const survey = 1 - this.armDeploy;
      this.camPan.rotation.y = Math.sin(t * 0.21) * 0.55 * survey - (drive.yaw ?? 0) * 0.35;
      this.camTilt.rotation.x = -0.2 + Math.sin(t * 0.33) * 0.12 * survey - 0.3 * this.armDeploy;
    }

    // Strobe.
    const phase = t % STROBE_PERIOD_S;
    const flash = !this.reduceMotion && phase < STROBE_FLASH_S ? 1 - phase / STROBE_FLASH_S : 0;
    if (this.strobe) {
      (this.strobe.material as THREE.MeshBasicMaterial).color.setRGB(
        0.55 + flash * 7,
        0.62 + flash * 7.5,
        0.7 + flash * 8,
      );
    }
    if (this.halo) (this.halo.material as THREE.SpriteMaterial).opacity = flash * 0.95;

    this.materials.setLensesOn(drive.lightsOn ?? true);

    // Wash, in world space.
    if (this.wash) {
      this.root.updateWorldMatrix(true, false);
      const mw = this.root.matrixWorld;
      const s = this.root.getWorldScale(this.v).x;
      for (let i = 0; i < this.propSpecs.length; i++) {
        const spec = this.propSpecs[i]!;
        const e = this.emitters[i]!;
        const thrust = this.propRps[i]! / SPIN_MAX_RPS;
        const sign = thrust >= 0 ? 1 : -1;
        e.dir.copy(spec.axis).multiplyScalar(sign).transformDirection(mw);
        e.pos
          .copy(spec.axis)
          .multiplyScalar(sign * spec.radius * 0.9)
          .add(spec.pos)
          .applyMatrix4(mw);
        e.radius = spec.radius * s;
        e.strength = Math.abs(thrust);
      }
      this.wash.update(this.emitters, dt);
    }
  }

  /** Blend an arm between stowed and working, with a gentle working motion. */
  private poseArm(arm: ArmRig, deploy: number, t: number): void {
    const s = deploy * deploy * (3 - 2 * deploy);
    const a = arm.spec.stowed;
    const b = arm.spec.work;
    const lerp = (i: number): number => a[i]! + (b[i]! - a[i]!) * s;
    const wob = s * s;
    const [turret, upper, fore, wrist] = arm.joints;
    turret.rotation.set(
      0,
      (lerp(0) + Math.sin(t * 0.5 + arm.spec.side) * 0.12 * wob) * arm.spec.side,
      0,
    );
    upper.rotation.set(lerp(1) + Math.sin(t * 0.7) * 0.06 * wob, 0, 0);
    fore.rotation.set(lerp(2) + Math.sin(t * 0.9 + 1) * 0.1 * wob, 0, 0);
    wrist.rotation.set(lerp(3), 0, Math.sin(t * 1.3) * 0.6 * wob);
  }

  private writeProps(): void {
    for (let i = 0; i < this.propSpecs.length; i++) {
      const spec = this.propSpecs[i]!;
      this.q.setFromUnitVectors(this.yAxis, spec.axis);
      this.q2.setFromAxisAngle(this.yAxis, this.propAngle[i]!);
      this.q.multiply(this.q2);
      this.m4.compose(spec.pos, this.q, this.v.copy(this.one).multiplyScalar(spec.radius));
      this.props.setMatrixAt(i, this.m4);
    }
    this.props.instanceMatrix.needsUpdate = true;
  }

  /** Renderable objects and triangles currently visible in the model. */
  get stats(): VehicleStats {
    let drawCalls = 0;
    let triangles = 0;
    this.root.traverseVisible((o) => {
      const r = o as THREE.Mesh;
      if (!(r.isMesh || (o as THREE.Points).isPoints || (o as THREE.Sprite).isSprite)) return;
      drawCalls++;
      const g = r.geometry as THREE.BufferGeometry | undefined;
      if (!g || (o as THREE.Points).isPoints) return;
      const n = g.index ? g.index.count : g.getAttribute('position').count;
      const inst = (o as THREE.InstancedMesh).isInstancedMesh
        ? (o as THREE.InstancedMesh).count
        : 1;
      triangles += (n / 3) * inst;
    });
    return { drawCalls, triangles: Math.round(triangles) };
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    this.props.dispose();
    this.wash?.dispose();
    this.materials.dispose();
    this.root.removeFromParent();
  }
}
