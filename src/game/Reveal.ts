import { MathUtils, Sphere, Vector3 } from 'three';
import type { PlacedPoi } from './Pois.js';

/** Two complete sentences, within the card's reading budget. */
export function revealExcerpt(text: string, max = 220, sentences = 2): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const parts = clean.match(/.+?[.!?]+(?:[”"’']+)?(?=\s|$)/g) ?? [];
  let result = '';
  for (const part of parts.slice(0, sentences)) {
    const next = `${result} ${part.trim()}`.trim();
    if (next.length > max) break;
    result = next;
  }
  if (result) return result;
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

export function revealFrame(
  poi: PlacedPoi,
  pilot: Vector3,
  fov: number,
  aspect: number,
  sphere?: Sphere,
) {
  const settings = poi.def.reveal;
  const target = sphere?.center.clone() ?? poi.position.clone().add(new Vector3(0, 5, 0));
  if (settings?.target_offset) target.add(new Vector3(...settings.target_offset));
  const halfFov = MathUtils.degToRad(fov / 2);
  const fit = sphere
    ? sphere.radius / Math.sin(Math.atan(Math.tan(halfFov) * Math.min(1, aspect) * 0.6))
    : 0;
  const fallback = poi.kind === 'wreck' ? 70 : /vent|tower|chimney/.test(poi.kind) ? 45 : 25;
  return {
    target,
    distance: settings?.distance_m ?? (sphere ? Math.max(10, fit) : fallback),
    elevation: MathUtils.degToRad(settings?.elevation_deg ?? 12),
    azimuth:
      settings?.azimuth_deg !== undefined
        ? MathUtils.degToRad(settings.azimuth_deg)
        : Math.atan2(pilot.x - target.x, pilot.z - target.z),
    sweep: MathUtils.degToRad(settings?.sweep_deg ?? 40),
  };
}

/** FIFO with dive-local deduplication, independent of persistent Journal unlocks. */
export class RevealQueue {
  private seen = new Set<string>();
  private pending: PlacedPoi[] = [];
  current: PlacedPoi | null = null;
  enqueue(poi: PlacedPoi): boolean {
    if (this.seen.has(poi.id)) return false;
    this.seen.add(poi.id);
    this.pending.push(poi);
    return true;
  }
  get active(): boolean {
    return this.current !== null || this.pending.length > 0;
  }
  next(): PlacedPoi | null {
    return (this.current = this.pending.shift() ?? null);
  }
  reset(): void {
    this.seen.clear();
    this.pending = [];
    this.current = null;
  }
}

export interface RevealController {
  readonly active: boolean;
  skip(): void;
}
