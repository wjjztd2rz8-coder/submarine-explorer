/**
 * The player's submarine model (F1-VEHICLES): a detailed procedural
 * deep-submergence vehicle from `src/vehicles/`, one of three hull classes,
 * plus the cockpit viewport shown in the first-person view.
 *
 * Convention: the model faces local -Z; {@link SubMesh.setPose} turns it so the
 * nose follows Submarine.getForward (north at yaw 0, east at yaw +pi/2).
 *
 * The hull class follows the physics hull that is fitted (`setHullClass`,
 * called every frame by the submarine system; a rebuild only happens on a
 * change). Detail follows the graphics tier: the low tier builds the
 * simplified LOD (no textures, arms baked in, no wash, no decals).
 */

import * as THREE from 'three';
import {
  buildVehicle,
  type Vehicle,
  type VehicleDrive,
  type VehicleLook,
} from '../vehicles/index.js';
import { CockpitView } from '../vehicles/cockpit.js';
import {
  HULL_PAINTS,
  LIGHT_TRIMS,
  defaultCosmetics,
  type CosmeticSelection,
} from '../game/Cosmetics.js';

export interface SubMeshOptions {
  /** Overall length in world metres (scales the model; 26 = the tuned size). */
  length?: number;
  /** `Config.submarine.hullClasses` key: A coastal, B deep ocean, C full ocean depth. */
  hullClass?: string;
  /** Graphics tier (`low` | `medium` | `high` | `ultra`). */
  tier?: string;
  /**
   * QA-B #6: below ~300 m the only light is the boat's own, which points
   * away from the hull, so the model rendered as a pure black cut-out. A
   * faint view-dependent (fresnel) rim plus a small emissive floor keeps its
   * outline readable without making it glow. `Config.submarine.hullRim*`.
   */
  rimColor?: number;
  /** 0 disables the rim. */
  rimStrength?: number;
  /** Constant emissive floor on every hull material. */
  emissive?: number;
}

/** Camera modes SubMesh distinguishes (mirrors CameraRig's CameraMode). */
export type SubView = 'chase' | 'first-person' | 'orbit';

export class SubMesh {
  readonly group = new THREE.Group();
  /** The cockpit viewport frame, visible in the first-person view. */
  readonly cockpit: CockpitView;
  private vehicleRef: Vehicle;
  private readonly options: SubMeshOptions & { length: number; hullClass: string; tier: string };
  private readonly drive: VehicleDrive = {};
  private cosmetics = defaultCosmetics();

  constructor(options: SubMeshOptions = {}) {
    this.options = { length: 24, hullClass: 'B', tier: 'high', ...options };
    this.group.name = 'submarine';
    this.vehicleRef = this.build(this.options.hullClass);
    this.cockpit = new CockpitView(this.options.tier !== 'low');
    this.group.add(this.cockpit.object);
  }

  private build(hullClass: string): Vehicle {
    const o = this.options;
    const look: Partial<VehicleLook> = {};
    if (o.rimColor !== undefined) look.rimColor = o.rimColor;
    if (o.rimStrength !== undefined) look.rimStrength = o.rimStrength;
    if (o.emissive !== undefined) look.emissive = o.emissive;
    const v = buildVehicle(hullClass, o.tier, { scaleFactor: o.length / 26, look });
    this.applyCosmetics(v);
    this.group.add(v.root);
    return v;
  }

  /** The current vehicle (hull class, stats, animation state). */
  get vehicle(): Vehicle {
    return this.vehicleRef;
  }

  setCosmetics(selection: CosmeticSelection): void {
    if (selection.paint === this.cosmetics.paint && selection.trim === this.cosmetics.trim) return;
    this.cosmetics = { ...selection };
    this.applyCosmetics(this.vehicleRef);
  }

  private applyCosmetics(vehicle: Vehicle): void {
    const paint = HULL_PAINTS.find((def) => def.id === this.cosmetics.paint)?.colors ?? null;
    const trim = LIGHT_TRIMS.find((def) => def.id === this.cosmetics.trim)?.color ?? null;
    vehicle.materials.setCosmetics(paint, trim);
  }

  /** Hull class shown ('A' | 'B' | 'C'). */
  get hullClass(): string {
    return this.vehicleRef.id;
  }

  /** Spinning propellers (one instanced mesh for all thrusters). */
  get propeller(): THREE.Object3D {
    return this.vehicleRef.props;
  }

  /** Swap the model to another hull class; a no-op if it is already shown. */
  setHullClass(id: string): void {
    const want = id === 'A' || id === 'C' ? id : 'B';
    if (want === this.vehicleRef.id) return;
    const visible = this.vehicleRef.root.visible;
    this.vehicleRef.dispose();
    this.vehicleRef = this.build(want);
    this.vehicleRef.root.visible = visible;
  }

  /**
   * Show the hull for chase and photo views, or the cockpit viewport for the
   * first-person view (the hull would otherwise fill the screen).
   */
  setView(view: SubView): void {
    const fp = view === 'first-person';
    this.vehicleRef.root.visible = !fp;
    this.cockpit.object.visible = fp;
  }

  /** Where the ROV tether leaves the hull, in world space. */
  tetherAnchor(out: THREE.Vector3): THREE.Vector3 {
    this.group.updateMatrixWorld();
    return out.copy(this.vehicleRef.tetherAnchor).applyMatrix4(this.group.matrixWorld);
  }

  /**
   * Place the model from the physics pose. `yaw` is the physics compass angle
   * (+yaw = toward east, Submarine.getForward), so the Three.js Y rotation is
   * `-yaw`; pitch and the cosmetic roll are applied in the hull's own frame
   * (Euler order YXZ), and a negative roll (starboard turn) dips the
   * starboard side, i.e. the hull leans into the turn.
   */
  setPose(position: THREE.Vector3, yaw: number, pitch: number, roll: number): void {
    this.group.position.copy(position);
    this.group.rotation.set(pitch, -yaw, roll, 'YXZ');
  }

  /**
   * Animate thrusters, arms, camera, strobe and wash. `throttle` is -1..1,
   * `dt` seconds; `drive` adds the other commands (yaw, vertical, scanning,
   * lights) when the caller has them.
   */
  update(throttle: number, dt: number, drive: Omit<VehicleDrive, 'throttle'> = {}): void {
    Object.assign(this.drive, drive);
    this.drive.throttle = throttle;
    this.vehicleRef.update(this.drive, dt);
  }

  dispose(): void {
    this.vehicleRef.dispose();
    this.cockpit.dispose();
    this.group.removeFromParent();
  }
}
