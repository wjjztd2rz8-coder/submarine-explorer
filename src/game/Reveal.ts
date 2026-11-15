import { Camera, MathUtils, Sphere, Vector3 } from 'three';
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

/** Share of the half-frame height by which the subject is raised above centre. */
const REVEAL_CARD_SHARE = 0.34;

/** Seconds after the card appears before the reveal auto-continues. */
export const REVEAL_AUTO_DISMISS_S = 13;
/** Earliest moment the player may continue (camera has started the sweep). */
export const REVEAL_MIN_CONTINUE_S = 1;
/** Seconds into the reveal before a journal still is captured. */
export const REVEAL_STILL_CAPTURE_S = 3;

/** Normalized canvas Y (0 top, 1 bottom) for a reveal still when projection is unavailable. */
export function revealStillSubjectYFallback(): number {
  return 0.5 - REVEAL_CARD_SHARE * 0.35;
}

/** Where the framed subject sits in the canvas for a 4:3 thumbnail crop. */
export function revealStillSubjectY(camera: Camera, target: Vector3): number {
  camera.updateMatrixWorld();
  const v = target.clone().project(camera);
  if (v.z >= 1) return revealStillSubjectYFallback();
  return (1 - v.y) / 2;
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
  // Fill most of the frame: wide subjects set the distance in landscape, and
  // portrait accepts cropped ends because the sweep pans across them.
  const fill = Math.tan(halfFov) * MathUtils.clamp(aspect * 0.75, 0.8, 1.15);
  const wreck = poi.kind === 'wreck';
  const fit = sphere ? MathUtils.clamp(sphere.radius / fill, 12, wreck ? 150 : 80) : 0;
  const fallback = wreck ? 70 : /vent|tower|chimney/.test(poi.kind) ? 45 : 25;
  const distance = settings?.distance_m ?? (sphere ? fit : fallback);
  // The card covers the lower third, so aim below the subject to lift it clear.
  const look = target.clone();
  look.y -= distance * Math.tan(halfFov) * REVEAL_CARD_SHARE;
  return {
    target,
    look,
    distance,
    elevation: MathUtils.degToRad(settings?.elevation_deg ?? 10),
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
