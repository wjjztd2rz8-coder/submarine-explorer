/**
 * Globe mission select (C1): the pure half. No DOM, no Three.js, so vitest
 * (node environment) can cover it; `Globe.ts` owns the canvas and the pins.
 *
 * - {@link latLonToUnit}: lat/lon -> point on the globe, in the frame of
 *   `THREE.SphereGeometry`'s default UV mapping of an equirectangular texture
 *   (u = 0 at lon -180, v = 0 at the north pole):
 *       lon 0 -> +X, lon 90 E -> -Z, north pole -> +Y.
 * - {@link resolvePinState}: mission / tile / catalogue (docs/globe.md).
 * - {@link spreadOverlaps}: pins closer than N screen pixels are grouped and
 *   fanned out on a small ring, so the Mid-Atlantic and Pacific vent clusters
 *   stay individually clickable at any zoom.
 * - {@link OrbitState}: drag / wheel / keyboard orbit with inertia, idle
 *   auto-rotate and an eased "turn to face this pin".
 * - {@link loadGlobeCatalog}: landmarks.json + index.json + mission summaries
 *   -> the pin list. Never throws; every file is optional.
 */

import type { GlobeConfig } from '../core/Config.js';
import { publicUrl } from '../util/publicUrl.js';
import { CONTENT_ROOT, fetchContentJson, type FetchJson } from '../game/ContentPath.js';
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
export type PinState = 'mission' | 'tile' | 'catalogue';

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
export const PIN_STATE_RANK: Record<PinState, number> = { mission: 0, tile: 1, catalogue: 2 };

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
export const CATALOGUE_URL = publicUrl('/data/landmarks.json');

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

/** Where a landmark's content lives (for docs and the card). */
export const contentFolder = (id: string): string => `${CONTENT_ROOT}/${id}/`;

// ------------------------------------------------------------ overlap spread

export interface ScreenPin {
  x: number;
  y: number;
  /** Only visible pins take part; hidden ones pass through unchanged. */
  visible: boolean;
}

export interface SpreadPin {
  x: number;
  y: number;
  /** Size of the overlap group this pin was fanned out in (1 = alone). */
  group: number;
}

/**
 * Group visible pins whose screen distance is below `minPx` (transitively),
 * then place each group of n > 1 on a ring around its centroid whose chord
 * between neighbours is `minPx`: R = minPx / (2 sin(pi / n)). Deterministic:
 * ring order follows input order, starting at 12 o'clock.
 */
export function spreadOverlaps(pins: readonly ScreenPin[], minPx: number): SpreadPin[] {
  const n = pins.length;
  const parent = pins.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const min2 = minPx * minPx;
  for (let i = 0; i < n; i++) {
    const a = pins[i];
    if (!a.visible) continue;
    for (let j = i + 1; j < n; j++) {
      const b = pins[j];
      if (!b.visible) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy < min2) {
        const ra = find(i);
        const rb = find(j);
        if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
      }
    }
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (!pins[i].visible) continue;
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(i);
    else groups.set(r, [i]);
  }
  const out: SpreadPin[] = pins.map((p) => ({ x: p.x, y: p.y, group: 1 }));
  for (const members of groups.values()) {
    const k = members.length;
    if (k < 2) continue;
    let cx = 0;
    let cy = 0;
    for (const i of members) {
      cx += pins[i].x;
      cy += pins[i].y;
    }
    cx /= k;
    cy /= k;
    const radius = minPx / (2 * Math.sin(Math.PI / k));
    members.forEach((i, m) => {
      const a = -Math.PI / 2 + (2 * Math.PI * m) / k;
      out[i] = { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), group: k };
    });
  }
  return out;
}

// -------------------------------------------------------------------- orbit

export type OrbitTunables = Pick<
  GlobeConfig,
  | 'minDistance'
  | 'maxDistance'
  | 'startDistance'
  | 'dragDegPerPx'
  | 'inertiaDamping'
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
  private focus: { lat: number; lon: number } | null = null;
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
      // Smoothed release velocity.
      this.vLon = 0.5 * this.vLon + 0.5 * (dLon / dt);
      this.vLat = 0.5 * this.vLat + 0.5 * (dLat / dt);
    }
    this.idle = 0;
  }

  endDrag(): void {
    this.dragging = false;
    this.idle = 0;
  }

  /** Multiply the altitude above the surface by `factor` (> 1 zooms out). */
  zoomBy(factor: number): void {
    const alt = (this.distance - 1) * factor;
    this.distance = Math.min(this.t.maxDistance, Math.max(this.t.minDistance, 1 + alt));
    this.idle = 0;
  }

  /** Held arrow keys: -1..1 per axis (x: east/west, y: north/south). */
  setHeld(x: number, y: number): void {
    this.held = { lon: x, lat: y };
    if (x || y) {
      this.idle = 0;
      this.focus = null;
    }
  }

  /** Ease the camera over a lat/lon (Tab focus). */
  faceLatLon(lat: number, lon: number): void {
    this.focus = { lat: this.clampLat(lat), lon };
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
      if (Math.abs(dLon) < 0.01 && Math.abs(dLat) < 0.01) this.focus = null;
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
