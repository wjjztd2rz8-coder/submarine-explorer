import { Box3, Camera, MathUtils, Sphere, Vector3 } from 'three';
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

/** Share of the screen height a bottom-docked card covers; the subject sits in the rest. */
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

/** Part of the screen the reveal card leaves clear, as fractions (0..1, y down). */
export interface RevealViewRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * The visible area beside the discovery card, mirroring `discovery-reveal.css`:
 * short landscape screens (phones) dock the card as a 30% rail on the right;
 * everything else has it along the bottom, covering about a third.
 */
export function revealVisibleRect(width: number, height: number): RevealViewRect {
  if (height <= 500 && width >= height) return { x0: 0, x1: 0.7, y0: 0, y1: 1 };
  return { x0: 0, x1: 1, y0: 0, y1: 1 - REVEAL_CARD_SHARE };
}

/** The camera's vertical half-angle tangent at an aspect, as `CameraRig.setAspect` sets it. */
function tanHalfV(baseFovDeg: number, aspect: number): number {
  return Math.tan(MathUtils.degToRad(baseFovDeg / 2)) / Math.min(1, aspect);
}

/** Viewports the authored `reveal` framing was tuned at; there the distance is unchanged. */
export const REVEAL_REFERENCE_VIEWPORTS = {
  landscape: [1280, 720],
  portrait: [390, 844],
} as const;

/** The subject may fill up to this share of the clear area before the camera backs off. */
const REVEAL_FILL_LIMIT = 0.9;

/**
 * How the reveal adapts to this viewport. `screen` puts the subject in the
 * middle of the clear area (normalized device coordinates). `scale` multiplies
 * the authored distance so the subject fills no more of the clear area than it
 * did at the reference viewport of the same orientation (or 90% of it,
 * whichever is more). `subject` is the subject's half extent at the authored
 * distance in tangent units (metres / distance); without it the clear area's
 * shrink is applied in full.
 */
export function revealViewFit(
  width: number,
  height: number,
  baseFovDeg: number,
  rect: RevealViewRect = revealVisibleRect(width, height),
  subject?: { w: number; h: number },
): { scale: number; screen: { x: number; y: number } } {
  const screen = { x: rect.x0 + rect.x1 - 1, y: 1 - (rect.y0 + rect.y1) };
  if (!(width > 0 && height > 0)) return { scale: 1, screen };
  const [rw, rh] = REVEAL_REFERENCE_VIEWPORTS[height > width ? 'portrait' : 'landscape'];
  const ref = halfExtents(rw, rh, baseFovDeg, revealVisibleRect(rw, rh));
  const cur = halfExtents(width, height, baseFovDeg, rect);
  const axis = (refA: number, curA: number, s: number | undefined): number => {
    if (!(curA > 0)) return 1;
    if (s === undefined) return refA / curA;
    return s / (curA * Math.max(s / refA, REVEAL_FILL_LIMIT));
  };
  const scale = Math.max(1, axis(ref.w, cur.w, subject?.w), axis(ref.h, cur.h, subject?.h));
  return { scale: Math.min(scale, 2.5), screen };
}

/** Half extents (tangent units) of a clear area at a viewport. */
function halfExtents(width: number, height: number, baseFovDeg: number, r: RevealViewRect) {
  const aspect = width / height;
  const tv = tanHalfV(baseFovDeg, aspect);
  return { w: Math.max(0, r.x1 - r.x0) * tv * aspect, h: Math.max(0, r.y1 - r.y0) * tv };
}

/**
 * The subject's half width and half height (metres) as seen around `target`
 * from `azimuth` to `azimuth + sweep` at `elevation`, from its bounding box.
 */
export function revealSubjectExtent(
  box: Box3,
  target: Vector3,
  azimuth: number,
  sweep: number,
  elevation: number,
): { w: number; h: number } {
  let w = 0;
  let h = 0;
  const ce = Math.cos(elevation);
  const se = Math.sin(elevation);
  for (const a of [azimuth, azimuth + sweep / 2, azimuth + sweep]) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let i = 0; i < 8; i++) {
      const x = (i & 1 ? box.max.x : box.min.x) - target.x;
      const y = (i & 2 ? box.max.y : box.min.y) - target.y;
      const z = (i & 4 ? box.max.z : box.min.z) - target.z;
      // Right is (cos a, 0, -sin a); toward the camera is (sin a, 0, cos a).
      w = Math.max(w, Math.abs(x * ca - z * sa));
      h = Math.max(h, Math.abs(y * ce - (x * sa + z * ca) * se));
    }
  }
  return { w, h };
}

export function revealFrame(
  poi: PlacedPoi,
  pilot: Vector3,
  fov: number,
  aspect: number,
  sphere?: Sphere,
  view?: {
    width: number;
    height: number;
    baseFovDeg: number;
    /** Measured clear area beside the card (defaults to the CSS model). */
    rect?: RevealViewRect;
    /** The matched prop's bounds, for the subject's real extent. */
    box?: Box3;
  },
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
  const authored = settings?.distance_m ?? (sphere ? fit : fallback);
  const elevation = MathUtils.degToRad(settings?.elevation_deg ?? 10);
  const azimuth =
    settings?.azimuth_deg !== undefined
      ? MathUtils.degToRad(settings.azimuth_deg)
      : Math.atan2(pilot.x - target.x, pilot.z - target.z);
  const sweep = MathUtils.degToRad(settings?.sweep_deg ?? 40);
  let subject: { w: number; h: number } | undefined;
  if (view?.box && !view.box.isEmpty()) {
    const e = revealSubjectExtent(view.box, target, azimuth, sweep, elevation);
    subject = { w: e.w / authored, h: e.h / authored };
  }
  const fitView = view
    ? revealViewFit(view.width, view.height, view.baseFovDeg, view.rect, subject)
    : { scale: 1, screen: { x: 0, y: REVEAL_CARD_SHARE } };
  const distance = authored * fitView.scale;
  // Orbiting must stay clear of the subject: the camera keeps outside most of
  // its bounding sphere (never farther than the authored framing requires).
  const subjectGuard = sphere ? sphere.radius * 0.35 + sphere.center.distanceTo(target) : 0;
  return {
    target,
    // The card covers part of the view, so the subject sits in the middle of what is left.
    screen: fitView.screen,
    distance,
    minDistance: Math.min(distance, Math.max(distance * REVEAL_ZOOM_MIN, subjectGuard)),
    maxDistance: distance * REVEAL_ZOOM_MAX,
    elevation,
    azimuth,
    sweep,
    /** How much the viewport rule moved the authored distance (QA). */
    scale: fitView.scale,
  };
}

/** Pinch / wheel limits as multiples of the framed reveal distance. */
export const REVEAL_ZOOM_MIN = 0.6;
export const REVEAL_ZOOM_MAX = 2.5;

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
