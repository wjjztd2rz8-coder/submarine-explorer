import { Vector3 } from 'three';
import { deepOpeningFor, DEFAULT_CAMERA, type CameraConfig } from '../core/Config.js';
import { CameraRig } from '../sub/CameraRig.js';
import type { Props } from '../world/Props.js';
import type { SeabedSampler, SpawnPose } from './Pois.js';
import {
  composedFreeDiveSpawn as baseFreeSpawn,
  composedMissionSpawn as baseMissionSpawn,
  type SpawnSettings,
} from './Spawn.js';

/** Keep the shared bearing search; shorten only these sites' already-safe approach. */
function reframe(
  site: string,
  pose: SpawnPose | null,
  seabed: SeabedSampler,
  props: Pick<Props, 'placed' | 'collide'>,
  settings: SpawnSettings,
  safeDepth: number,
  camera: CameraConfig,
): SpawnPose | null {
  const tuning = deepOpeningFor(site);
  const hero = props.placed.find((p) => p.def.id === tuning?.hero);
  if (!pose || !tuning || !hero || hero.localBounds.isEmpty()) return pose;
  hero.root.updateMatrixWorld(true);
  const centre = hero.localBounds.getCenter(new Vector3());
  const target = hero.root.localToWorld(centre.clone());
  const direction = new Vector3(pose.x - target.x, 0, pose.z - target.z).normalize();
  const local = hero.root.worldToLocal(target.clone().add(direction)).sub(centre);
  const half = hero.localBounds.getSize(new Vector3()).multiplyScalar(0.5);
  const edge = Math.min(
    half.x / Math.max(Math.abs(local.x), 1e-6),
    half.z / Math.max(Math.abs(local.z), 1e-6),
  );
  const p = target.clone().addScaledVector(direction, edge + tuning.opening.range);
  let floor = seabed.sampleHeight(p.x, p.z);
  for (let i = 1; i <= 8; i++) {
    const t = i / 10;
    floor = Math.max(
      floor,
      seabed.sampleHeight(p.x + (target.x - p.x) * t, p.z + (target.z - p.z) * t),
    );
  }
  p.y = Math.max(
    floor + settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM,
    hero.root.position.y + tuning.opening.altitude,
    safeDepth + settings.hullRadius,
  );
  if (
    p.y > -settings.hullRadius ||
    props.collide(p.clone(), settings.hullRadius + 4, new Vector3())
  )
    return pose;
  const yaw =
    Math.atan2(target.x - p.x, -(target.z - p.z)) + (tuning.opening.yawOffset * Math.PI) / 180;
  const rig = new CameraRig(camera, 16 / 9, {
    sampleHeight: (x, z) => seabed.sampleHeight(x, z),
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  });
  const opening = tuning.opening;
  rig.setChaseRadiusDefault(opening.chaseRadius, opening.chaseOffsetX, opening.chaseOffsetY);
  rig.snap(p, yaw, 0);
  for (let i = 1; i <= 6; i++)
    if (props.collide(p.clone().lerp(rig.camera.position, i / 6), 6, new Vector3())) return pose;
  return {
    x: p.x,
    y: p.y,
    z: p.z,
    yaw,
    chaseRadius: opening.chaseRadius,
    chaseOffsetX: opening.chaseOffsetX,
    chaseOffsetY: opening.chaseOffsetY,
    portraitChaseOffset: opening.portraitChaseOffset,
  };
}

export function composedFreeDiveSpawn(...args: Parameters<typeof baseFreeSpawn>): SpawnPose | null {
  const pose = baseFreeSpawn(...args);
  return reframe(args[0], pose, args[2], args[3], args[4], args[5], args[6] ?? DEFAULT_CAMERA);
}

export function composedMissionSpawn(
  ...args: Parameters<typeof baseMissionSpawn>
): SpawnPose | null {
  const pose = baseMissionSpawn(...args);
  const framed = reframe(
    args[0],
    pose,
    args[3],
    args[4],
    args[5],
    args[6],
    args[7] ?? DEFAULT_CAMERA,
  );
  return framed &&
    args[1].some(
      ({ position: p }) => Math.hypot(p.x - framed.x, p.y - framed.y, p.z - framed.z) <= 300,
    )
    ? framed
    : pose;
}
