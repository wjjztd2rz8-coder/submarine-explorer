/** Viewport rectangles, in CSS pixels; independent of the DOM for regression tests. */
export interface CreditsRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Find a scrollable credits slot without covering an active HUD panel or control.
 * Keep the full-size panel beside its chip when it fits. On crowded phones,
 * use the largest available reading area, then prefer the slot nearest the chip.
 */
export function placeDataCredits(
  viewport: CreditsRect,
  anchor: CreditsRect,
  obstacles: readonly CreditsRect[],
  preferredWidth: number,
  preferredHeight: number,
  /** Minimum obstacle clearance in CSS pixels; crowded HUDs can use a tighter gap. */
  gap = 8,
): CreditsRect | null {
  const minWidth = 120;
  const minHeight = 48;
  const lefts = new Set([
    viewport.left,
    Math.max(viewport.left, anchor.right - preferredWidth),
    ...obstacles.map((r) => r.right + gap),
  ]);
  let best: CreditsRect | null = null;
  let bestArea = 0;
  let bestDistance = Infinity;
  for (const left of lefts) {
    const rights = new Set([
      Math.min(viewport.right, left + preferredWidth),
      ...obstacles.map((r) => Math.min(viewport.right, r.left - gap)),
    ]);
    for (const right of rights) {
      const width = right - left;
      if (width < minWidth || width > preferredWidth) continue;
      // Merge the blocked vertical intervals for this horizontal span.
      const blocked = obstacles
        .filter((r) => left < r.right + gap && right > r.left - gap)
        .map((r) => ({ top: r.top - gap, bottom: r.bottom + gap }))
        .sort((a, b) => a.top - b.top);
      let top = viewport.top;
      for (const interval of [...blocked, { top: viewport.bottom, bottom: viewport.bottom }]) {
        const bottom = Math.min(interval.top, viewport.bottom);
        const available = bottom - top;
        if (available >= minHeight) {
          // Narrower text wraps more; permit it to use a taller free slot.
          const height = Math.min(available, (preferredHeight * preferredWidth) / width);
          const y = Math.max(top, Math.min(bottom - height, anchor.top - gap - height));
          const area = width * height;
          const distance = Math.hypot(right - anchor.right, y + height - (anchor.top - gap));
          if (
            area > bestArea + 0.01 ||
            (Math.abs(area - bestArea) <= 0.01 && distance < bestDistance)
          ) {
            best = { left, right, top: y, bottom: y + height };
            bestArea = area;
            bestDistance = distance;
          }
        }
        top = Math.max(top, interval.bottom);
      }
    }
  }
  return best;
}
