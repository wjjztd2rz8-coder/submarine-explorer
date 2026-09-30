/**
 * Vehicles (F1-VEHICLES): public entry point.
 *
 *     const v = buildVehicle('B', 'high');
 *     scene.add(v.root);
 *     v.update({ throttle, yaw, vertical, scanning, lightsOn }, dt);
 *
 * `hullClass` is a `Config.submarine.hullClasses` key (A coastal, B deep
 * ocean, C full ocean depth); `tier` is the graphics tier. The low tier gets
 * the simplified LOD (<= 8 draw calls); every other tier gets the full model
 * (<= 25 draw calls) with a wash pool that grows with the tier.
 */

import { DEFAULT_LOOK, type VehicleLook } from './materials.js';
import { blueprintFor, type HullClassId } from './hulls.js';
import { Vehicle, type VehicleLod } from './Vehicle.js';
import { withDetail } from './kit.js';
import { rovBlueprint } from './rov.js';

export { Vehicle, type VehicleDrive, type VehicleLod, type VehicleStats } from './Vehicle.js';
export type { HullClassId } from './hulls.js';
export type { VehicleLook } from './materials.js';

/** Graphics tiers this module understands (F0-CORE adds `ultra`). */
export type VehicleTier = 'low' | 'medium' | 'high' | 'ultra';

/**
 * World metres per vehicle metre, per class. The in-game boat is drawn about
 * 3.3x life size (the physics hull radius is 8 m and the chase camera sits
 * ~100 m back), and the smaller classes are scaled up a little more so all
 * three read at chase distance.
 */
export const VEHICLE_SCALE: Record<HullClassId, number> = { A: 3.7, B: 3.3, C: 3.45 };

/** Wash particle pool per tier. */
export const WASH_PARTICLES: Record<VehicleTier, number> = {
  low: 0,
  medium: 120,
  high: 220,
  ultra: 360,
};

export function lodForTier(tier: string): VehicleLod {
  return tier === 'low' ? 'low' : 'high';
}

export interface BuildOptions {
  look?: Partial<VehicleLook>;
  /** Multiplies the class scale (SubMesh passes length / 26). */
  scaleFactor?: number;
}

/** Radial detail factor for the low LOD's cylinders, lathes and spheres. */
export const LOW_DETAIL = 0.5;

function washFor(tier: string): number {
  return WASH_PARTICLES[(tier in WASH_PARTICLES ? tier : 'high') as VehicleTier];
}

/** Build the vehicle for a hull class at a graphics tier. */
export function buildVehicle(
  hullClass: string,
  tier: string = 'high',
  opts: BuildOptions = {},
): Vehicle {
  const lod = lodForTier(tier);
  return withDetail(lod === 'low' ? LOW_DETAIL : 1, () => {
    const bp = blueprintFor(hullClass, lod === 'low');
    const id = bp.id as HullClassId;
    return new Vehicle(bp, {
      scale: VEHICLE_SCALE[id] * (opts.scaleFactor ?? 1),
      lod,
      look: { ...DEFAULT_LOOK, ...opts.look },
      washCount: washFor(tier),
    });
  });
}

/** Build the work ROV at a graphics tier (life size times `scale`). */
export function buildRov(tier: string = 'high', scale = 1, opts: BuildOptions = {}): Vehicle {
  const lod = lodForTier(tier);
  return withDetail(
    lod === 'low' ? LOW_DETAIL : 1,
    () =>
      new Vehicle(rovBlueprint(lod === 'low'), {
        scale: scale * (opts.scaleFactor ?? 1),
        lod,
        look: { ...DEFAULT_LOOK, ...opts.look },
        washCount: Math.round(washFor(tier) * 0.4),
      }),
  );
}
