/**
 * Globe mission select (C1): the pure half. No DOM, no Three.js, so vitest
 * (node environment) can cover it; `Globe.ts` owns the canvas and the pins.
 *
 * - {@link latLonToUnit}: lat/lon -> point on the globe, in the frame of
 *   `THREE.SphereGeometry`'s default UV mapping of an equirectangular texture
 *   (u = 0 at lon -180, v = 0 at the north pole):
 *       lon 0 -> +X, lon 90 E -> -Z, north pole -> +Y.
 * - {@link resolvePinState}: mission / tile / catalogue (docs/globe.md).
 * - {@link clusterPins}: pins whose hit areas would overlap merge into one
 *   counted cluster pin; every other pin sits exactly on its location.
 * - {@link OrbitState}: drag / wheel / keyboard orbit with inertia, idle
 *   auto-rotate and an eased "turn to face this pin".
 * - {@link loadGlobeCatalog}: landmarks.json + index.json + mission summaries
 *   -> the pin list. Never throws; every file is optional.
 */

import type { GlobeConfig } from '../core/Config.js';
import { publicUrl } from '../util/publicUrl.js';
import { fetchContentJson, type FetchJson } from '../game/ContentPath.js';
import {
  loadMissionSummaries,
  MISSION_INDEX_URL,
  parseMissionIndex,
  type MissionSummary,
} from '../game/Mission.js';

// ----------------------------------------------------------------- geometry

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const D2R = Math.PI / 180;

/** Unit-sphere point for a lat/lon, matching SphereGeometry's texture mapping. */
export function latLonToUnit(latDeg: number, lonDeg: number): Vec3 {
  const lat = latDeg * D2R;
  const lon = lonDeg * D2R;
  const c = Math.cos(lat);
  return { x: c * Math.cos(lon), y: Math.sin(lat), z: -c * Math.sin(lon) };
}

/** Inverse of {@link latLonToUnit} (any length; lon in (-180, 180]). */
export function unitToLatLon(v: Vec3): { lat: number; lon: number } {
  const r = Math.hypot(v.x, v.y, v.z) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, v.y / r))) / D2R;
  const lon = Math.atan2(-v.z, v.x) / D2R;
  return { lat, lon: lon === -180 ? 180 : lon };
}

/** Wrap an angle in degrees into (-180, 180]. */
export function wrapDeg(d: number): number {
  const w = ((((d + 180) % 360) + 360) % 360) - 180;
  return w === -180 ? 180 : w;
}

/**
 * True if a point on a sphere of radius `r` faces a camera at `cam`
 * (it is in front of the horizon plane): p . cam > r^2.
 */
export function facesCamera(p: Vec3, cam: Vec3, r = 1): boolean {
  return p.x * cam.x + p.y * cam.y + p.z * cam.z > r * r;
}

// --------------------------------------------------------------- pin states

/**
 * - `mission`: listed in data/landmarks/index.json and its mission.json loaded.
 * - `tile`: a bathymetry tile exists (free dive), no mission yet.
 * - `catalogue`: in the landmark catalogue only; card, not launchable.
 */
type PinState = 'mission' | 'tile' | 'catalogue';

export function resolvePinState(
  id: string,
  missionIds: ReadonlySet<string>,
  tileIds: ReadonlySet<string>,
): PinState {
  if (missionIds.has(id)) return 'mission';
  if (tileIds.has(id)) return 'tile';
  return 'catalogue';
}

/** Sort rank: launchable first, so Tab reaches missions before catalogue dots. */
const PIN_STATE_RANK: Record<PinState, number> = { mission: 0, tile: 1, catalogue: 2 };

/** The catalogue fields the globe reads from `data/landmarks.json`. */
export interface CatalogueLandmark {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  depthM: number | null;
  region: string;
  summary: string;
}

export interface GlobeSite extends CatalogueLandmark {
  state: PinState;
  /** Mission title when `state === 'mission'`. */
  missionTitle?: string;
  /** Listed in index.json but its mission.json has not loaded (content coming). */
  missionPending: boolean;
  tileAvailable: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim() ? v.trim() : fallback;

/**
 * Parse `data/landmarks.json` (`{ landmarks: [...] }` or a bare array) into
 * the fields the globe needs. Entries without an id or a valid lat/lon are
 * dropped; duplicate ids keep the first.
 */
export function parseCatalogue(doc: unknown): CatalogueLandmark[] {
  const list = Array.isArray(doc)
    ? doc
    : isObj(doc) && Array.isArray(doc.landmarks)
      ? doc.landmarks
      : [];
  const out: CatalogueLandmark[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const id = str(raw.id);
    const lat = num(raw.lat ?? raw.latitude);
    const lon = num(raw.lon ?? raw.longitude);
    if (!id || seen.has(id) || lat === null || lon === null) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    seen.add(id);
    const depth = num(raw.depth_m);
    out.push({
      id,
      name: str(raw.name, id),
      type: str(raw.type, 'other'),
      lat,
      lon,
      depthM: depth === null ? null : Math.abs(depth),
      region: str(raw.region),
      summary: str(raw.summary),
    });
  }
  return out;
}

/**
 * Combine the catalogue with what can actually be launched right now.
 * Mission ids match landmark ids (the content folder is the landmark id).
 */
export function buildSites(
  catalogue: readonly CatalogueLandmark[],
  tileIds: readonly string[],
  indexIds: readonly string[],
  missions: readonly MissionSummary[],
): GlobeSite[] {
  const tiles = new Set(tileIds);
  const missionById = new Map(missions.map((m) => [m.id, m]));
  const missionIds = new Set(missionById.keys());
  const indexed = new Set(indexIds);
  const sites = catalogue.map((l): GlobeSite => {
    const state = resolvePinState(l.id, missionIds, tiles);
    const site: GlobeSite = {
      ...l,
      state,
      missionPending: indexed.has(l.id) && !missionIds.has(l.id),
      tileAvailable: tiles.has(l.id),
    };
    const m = missionById.get(l.id);
    if (m) site.missionTitle = m.title;
    return site;
  });
  return sites.sort(
    (a, b) =>
      PIN_STATE_RANK[a.state] - PIN_STATE_RANK[b.state] || a.lon - b.lon || (a.id < b.id ? -1 : 1),
  );
}

export interface GlobeCatalog {
  sites: GlobeSite[];
  missions: MissionSummary[];
  /** index.json ids without a loaded mission.json (MissionSelect: "content coming"). */
  pending: Array<{ id: string; name: string; tileAvailable: boolean }>;
}

/** URL of the landmark catalogue. */
const CATALOGUE_URL = publicUrl('/data/landmarks.json');

/**
 * Load everything the globe needs. `loadMissionSummaries` runs with a silent
 * warn: main.ts already loads the summaries for the MISSIONS list, which
 * warns once per missing mission.json; the globe must not double that up.
 */
export async function loadGlobeCatalog(
  tileIds: readonly string[],
  fetchFn?: FetchJson,
): Promise<GlobeCatalog> {
  const [catDoc, indexDoc, missions] = await Promise.all([
    fetchContentJson(CATALOGUE_URL, fetchFn),
    fetchContentJson(MISSION_INDEX_URL, fetchFn),
    loadMissionSummaries(fetchFn, () => {}),
  ]);
  const catalogue = parseCatalogue(catDoc);
  const indexIds = parseMissionIndex(indexDoc);
  const sites = buildSites(catalogue, tileIds, indexIds, missions);
  const loaded = new Set(missions.map((m) => m.id));
  const names = new Map(catalogue.map((l) => [l.id, l.name]));
  const tiles = new Set(tileIds);
  const pending = indexIds
    .filter((id) => !loaded.has(id))
    .map((id) => ({ id, name: names.get(id) ?? id, tileAvailable: tiles.has(id) }));
  return { sites, missions, pending };
}

// ------------------------------------------------------------ pin clusters

/**
 * Greedy proximity clustering of screen pins, for pins drawn at their true
 * position with a `hitPx` square hit area. Walks the pins in order (so
 * missions seed before free dives); an unassigned eligible pin becomes a seed
 * and absorbs every later unassigned eligible pin closer than `hitPx` to it.
 * `out[i]` is the seed index of pin i's group (its own index when alone) or -1
 * when the pin is not eligible (hidden, catalogue, forced single). Seeding
 * rather than chaining keeps a long row of pins from merging into one blob.
 * Allocation-free: `out` is the caller's `Int32Array`.
 */
export function clusterPins(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  eligible: ArrayLike<number>,
  n: number,
  hitPx: number,
  out: Int32Array,
): void {
  out.fill(-1, 0, n);
  const h2 = hitPx * hitPx;
  for (let i = 0; i < n; i++) {
    if (!eligible[i] || out[i] >= 0) continue;
    out[i] = i;
    for (let j = i + 1; j < n; j++) {
      if (!eligible[j] || out[j] >= 0) continue;
      const dx = x[i] - x[j];
      const dy = y[i] - y[j];
      if (dx * dx + dy * dy < h2) out[j] = i;
    }
  }
}

/**
 * Camera distance (globe radii) at which two surface points `thetaRad` apart,
 * viewed head-on, sit `hitPx * margin` apart on screen. Used to zoom a cluster
 * in until its members separate. Not clamped.
 */
export function distanceToSeparate(
  thetaRad: number,
  hitPx: number,
  viewportHeightPx: number,
  fovDeg: number,
  margin = 1.15,
): number {
  const focalPx = viewportHeightPx / 2 / Math.tan((fovDeg * D2R) / 2);
  return Math.cos(thetaRad) + (focalPx * Math.sin(thetaRad)) / (hitPx * margin);
}

/**
 * Short on-globe label: first of "A / B" or "A – B", parentheticals dropped,
 * trailing "Hydrothermal Vent Field" style words dropped.
 */
export function shortName(name: string): string {
  const first = name.split(/\s+[/–]\s+/)[0].replace(/\s*\([^)]*\)/g, '');
  const trimmed = first.replace(/\s+(?:Hydrothermal\s+)?(?:Vent\s+)?(?:Field|Vents)$/i, '').trim();
  return trimmed || name;
}

// -------------------------------------------------------------------- orbit

type OrbitTunables = Pick<
  GlobeConfig,
  | 'minDistance'
  | 'maxDistance'
  | 'startDistance'
  | 'dragDegPerPx'
  | 'inertiaDamping'
  | 'maxFlingDegPerS'
  | 'flingStaleS'
  | 'autoRotateDegPerS'
  | 'idleBeforeAutoRotateS'
  | 'keyRotateDegPerS'
  | 'maxLatDeg'
  | 'focusLerpPerS'
>;

/**
 * The camera orbits a fixed globe: it sits at (lat, lon) at `distance` globe
 * radii from the centre, looking at the origin. Dragging moves the surface
 * with the pointer (drag right -> the camera moves west).
 */
export class OrbitState {
  lat = 20;
  lon = -40;
  distance: number;
  /** Angular velocity from a released drag, deg/s. */
  private vLat = 0;
  private vLon = 0;
  private idle = 0;
  private dragging = false;
  private focus: { lat: number; lon: number; distance: number | null } | null = null;
  /** Embedded globes: the distance that fits the whole globe in its box (0 = n/a). */
  private fit = 0;
  private held = { lat: 0, lon: 0 };

  constructor(private readonly t: OrbitTunables) {
    this.distance = t.startDistance;
  }

  /** Degrees per pixel scale with altitude, so the surface tracks the pointer. */
  private degPerPx(): number {
    return this.t.dragDegPerPx * ((this.distance - 1) / (this.t.startDistance - 1));
  }

  beginDrag(): void {
    this.dragging = true;
    this.focus = null;
    this.vLat = 0;
    this.vLon = 0;
    this.idle = 0;
  }

  /** Pointer moved by (dx, dy) px over `dt` seconds while dragging. */
  drag(dx: number, dy: number, dt: number): void {
    const k = this.degPerPx();
    const dLon = -dx * k;
    const dLat = dy * k;
    this.lon = wrapDeg(this.lon + dLon);
    this.lat = this.clampLat(this.lat + dLat);
    if (dt > 0) {
      // Smoothed release velocity. Coalesced or synthetic pointer events can
      // arrive a millisecond apart, so dt is floored at one 120 Hz frame.
      const step = Math.max(dt, 1 / 120);
      this.vLon = 0.5 * this.vLon + 0.5 * (dLon / step);
      this.vLat = 0.5 * this.vLat + 0.5 * (dLat / step);
    }
    this.idle = 0;
  }

  /**
   * Release. `sinceLastMoveS`: time between the last pointer move and the
   * release; a pointer that stopped before letting go does not fling.
   */
  endDrag(sinceLastMoveS = 0): void {
    this.dragging = false;
    this.idle = 0;
    if (sinceLastMoveS > this.t.flingStaleS) {
      this.vLon = 0;
      this.vLat = 0;
      return;
    }
    const speed = Math.hypot(this.vLon, this.vLat);
    const max = this.t.maxFlingDegPerS;
    if (speed > max) {
      this.vLon *= max / speed;
      this.vLat *= max / speed;
    }
  }

  /**
   * Embedded globes show the whole disc at `fit` and zoom in from there. While
   * the view is at the previous fit it follows the new one (a resize).
   */
  setFitDistance(fit: number): void {
    if (fit === this.fit) return;
    if (this.distance >= this.fit - 1e-6) this.distance = fit;
    this.fit = fit;
  }

  /** Farthest the camera may sit. */
  get maxDistance(): number {
    return Math.max(this.t.maxDistance, this.fit);
  }

  /** Multiply the altitude above the surface by `factor` (> 1 zooms out). */
  zoomBy(factor: number): void {
    const alt = (this.distance - 1) * factor;
    this.distance = Math.min(this.maxDistance, Math.max(this.t.minDistance, 1 + alt));
    if (this.focus) this.focus.distance = null;
    this.idle = 0;
  }

  /** Closest the camera may sit. */
  get minDistance(): number {
    return this.t.minDistance;
  }

  /** Held arrow keys: -1..1 per axis (x: east/west, y: north/south). */
  setHeld(x: number, y: number): void {
    this.held = { lon: x, lat: y };
    if (x || y) {
      this.idle = 0;
      this.focus = null;
    }
  }

  /** Ease the camera over a lat/lon, and to `distance` when given (clamped). */
  faceLatLon(lat: number, lon: number, distance?: number): void {
    this.focus = {
      lat: this.clampLat(lat),
      lon,
      distance:
        distance === undefined
          ? null
          : Math.min(this.maxDistance, Math.max(this.t.minDistance, distance)),
    };
    this.vLat = 0;
    this.vLon = 0;
    this.idle = 0;
  }

  /** Any user interaction resets the idle clock (hover counts). */
  poke(): void {
    this.idle = 0;
  }

  get autoRotating(): boolean {
    return !this.dragging && !this.focus && this.idle >= this.t.idleBeforeAutoRotateS;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    const t = this.t;
    if (this.held.lat || this.held.lon) {
      const s = t.keyRotateDegPerS * ((this.distance - 1) / (t.startDistance - 1));
      this.lon = wrapDeg(this.lon + this.held.lon * s * dt);
      this.lat = this.clampLat(this.lat + this.held.lat * s * dt);
      return;
    }
    if (this.dragging) return;
    if (this.focus) {
      const a = 1 - Math.exp(-t.focusLerpPerS * dt);
      const dLon = wrapDeg(this.focus.lon - this.lon);
      const dLat = this.focus.lat - this.lat;
      this.lon = wrapDeg(this.lon + dLon * a);
      this.lat = this.clampLat(this.lat + dLat * a);
      let settled = Math.abs(dLon) < 0.01 && Math.abs(dLat) < 0.01;
      if (this.focus.distance !== null) {
        // Ease the altitude geometrically, so a zoom-in feels even.
        const dAlt = Math.log((this.focus.distance - 1) / (this.distance - 1));
        this.distance = 1 + (this.distance - 1) * Math.exp(dAlt * a);
        settled &&= Math.abs(dAlt) < 0.002;
      }
      if (settled) this.focus = null;
      this.idle = 0;
      return;
    }
    const decay = Math.exp(-t.inertiaDamping * dt);
    if (Math.abs(this.vLon) > 0.01 || Math.abs(this.vLat) > 0.01) {
      this.lon = wrapDeg(this.lon + this.vLon * dt);
      this.lat = this.clampLat(this.lat + this.vLat * dt);
      this.vLon *= decay;
      this.vLat *= decay;
      this.idle = 0;
      return;
    }
    this.vLon = 0;
    this.vLat = 0;
    this.idle += dt;
    if (this.autoRotating) {
      // The camera drifts west, so the globe appears to spin eastward (Earth's sense).
      this.lon = wrapDeg(this.lon - t.autoRotateDegPerS * dt);
    }
  }

  /** Camera position in globe radii. */
  cameraPosition(): Vec3 {
    const u = latLonToUnit(this.lat, this.lon);
    return { x: u.x * this.distance, y: u.y * this.distance, z: u.z * this.distance };
  }

  private clampLat(lat: number): number {
    const m = this.t.maxLatDeg;
    return Math.max(-m, Math.min(m, lat));
  }
}

// --------------------------------------------------------------- formatting

export function pinBadge(site: GlobeSite): string {
  if (site.state === 'mission') return 'MISSION';
  if (site.state === 'tile')
    return site.missionPending ? 'FREE DIVE · MISSION COMING' : 'FREE DIVE';
  return 'CATALOGUE ONLY';
}

export function pinAction(site: GlobeSite): string {
  if (site.state === 'mission') return 'ENTER · START MISSION';
  if (site.state === 'tile') return 'ENTER · FREE DIVE ON THE SURVEY TILE';
  return 'No bathymetry tile yet: not launchable';
}

export function formatDepth(m: number | null): string {
  return m === null ? 'depth unknown' : `${Math.round(m).toLocaleString('en-US')} m`;
}
