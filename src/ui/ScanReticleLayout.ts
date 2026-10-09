/** Reticles remain anchored to the contact; omit them behind an interactive control. */
export function reticleClearOfControls(
  point: { x: number; y: number },
  size: number,
  controls: readonly { left: number; right: number; top: number; bottom: number }[],
): boolean {
  const half = size / 2;
  return controls.every(
    (r) =>
      point.x + half <= r.left ||
      point.x - half >= r.right ||
      point.y + half <= r.top ||
      point.y - half >= r.bottom,
  );
}
