interface Position {
  x: number;
  y: number;
  z: number;
}

/** Debug spawns face a POI horizontally; seabed relief also requires pitch. */
export function scanAim(
  from: Position,
  target: Position,
  maxPitch: number,
): { yaw: number; pitch: number } {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  return {
    yaw: Math.atan2(dx, -dz),
    pitch: Math.max(
      -maxPitch,
      Math.min(maxPitch, Math.atan2(target.y - from.y, Math.hypot(dx, dz))),
    ),
  };
}
