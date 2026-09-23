/**
 * Points of interest: the scan targets of a landmark.
 *
 * Schema: `data/landmarks/<landmark>/pois.json` (plan/PHASE-B-CONTRACTS.md §2.1,
 * docs/discovery.md). B2 authors the files; this module is the loader, the
 * validator and the world placement. The file is untrusted and optional:
 * malformed entries are dropped with a warning and a missing file is "no POIs".
 *
 * Depth convention: `depth_m` is a POSITIVE magnitude ("3800 m deep"); world Y
 * is `-depth_m`. `snap_to_seabed: true` samples the terrain instead. A POI is
 * never placed below the seabed -- it would be unreachable.
 */

import { Vector3 } from 'three';
import type { ScanConfig } from '../core/Config.js';
import { bboxContains, latLonToWorld } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';
import { contentUrl, fetchContentJson, type FetchJson } from './ContentPath.js';

export const POI_KINDS = [
  'wreck',
  'debris',
  'vent',
  'geology',
  'biology',
  'artifact',
  'memorial',
  'other',
] as const;
export type PoiKind = (typeof POI_KINDS)[number];

export type Confidence = 'high' | 'medium' | 'low';

/** One entry of `pois.json`, after validation. */
export interface PoiDef {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Positive magnitude in metres. Absent when `snap_to_seabed` is set. */
  depth_m?: number;
  snap_to_seabed?: boolean;
  radius_m?: number;
  kind: PoiKind;
  primary: boolean;
  scan_seconds?: number;
  /** Key into `guide.json.entries[].id`. */
  guide_entry?: string;
  confidence?: Confidence;
  /** What the player sees here is a placed prop, not survey data. */
  reconstruction?: boolean;
  sources?: string[];
}

export interface PoisFile {
  version: number;
  landmark: string;
  pois: PoiDef[];
}

/** A POI resolved into world space, ready for the {@link Scanner}. */
export interface PlacedPoi {
  id: string;
  name: string;
  landmarkId: string;
  kind: PoiKind;
  primary: boolean;
  guideEntry: string | null;
  position: Vector3;
  /** Scan radius, metres. */
  radius: number;
  /** Beam time needed, seconds. */
  scanSeconds: number;
  def: PoiDef;
}

/** Narrow terrain interface (satisfied by `Terrain` and test stubs). */
export interface SeabedSampler {
  sampleHeight(x: number, z: number): number;
}

type Warn = (message: string) => void;
const defaultWarn: Warn = (m) => console.warn(`[pois] ${m}`);

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

/**
 * Validate a parsed `pois.json`. Accepts the contract shape `{ pois: [...] }`
 * or a bare array. Entries without an id or numeric lat/lon are dropped;
 * duplicate ids keep the first.
 */
export function parsePois(doc: unknown, warn: Warn = defaultWarn): PoiDef[] {
  let list: unknown[] = [];
  if (Array.isArray(doc)) list = doc;
  else if (typeof doc === 'object' && doc !== null) {
    const pois = (doc as Record<string, unknown>).pois;
    if (Array.isArray(pois)) list = pois;
  }

  const out: PoiDef[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    if (typeof raw !== 'object' || raw === null) continue;
    const o = raw as Record<string, unknown>;
    const id = str(o.id);
    const lat = num(o.lat);
    const lon = num(o.lon);
    if (!id || lat === undefined || lon === undefined) {
      warn(`dropping POI without id/lat/lon: ${JSON.stringify(raw).slice(0, 80)}`);
      continue;
    }
    if (seen.has(id)) {
      warn(`duplicate POI id "${id}" ignored`);
      continue;
    }
    seen.add(id);

    const kind = POI_KINDS.includes(o.kind as PoiKind) ? (o.kind as PoiKind) : 'other';
    const depth = num(o.depth_m);
    const radius = num(o.radius_m);
    const seconds = num(o.scan_seconds);
    const conf = o.confidence;
    const def: PoiDef = {
      id,
      name: str(o.name) ?? id,
      lat,
      lon,
      kind,
      primary: o.primary === true,
    };
    if (o.snap_to_seabed === true) def.snap_to_seabed = true;
    if (depth !== undefined) def.depth_m = depth;
    if (radius !== undefined && radius > 0) def.radius_m = radius;
    if (seconds !== undefined && seconds > 0) def.scan_seconds = seconds;
    const guide = str(o.guide_entry);
    if (guide) def.guide_entry = guide;
    if (conf === 'high' || conf === 'medium' || conf === 'low') def.confidence = conf;
    if (o.reconstruction === true) def.reconstruction = true;
    if (Array.isArray(o.sources)) {
      def.sources = o.sources.filter((s): s is string => typeof s === 'string');
    }
    out.push(def);
  }
  return out;
}

/**
 * World Y of a POI: `-depth_m` (a negative `depth_m` is taken as an elevation
 * already, matching Landmarks.ts), or the seabed when snapping or when no depth
 * is given. Clamped to never sit below the seabed.
 */
export function poiElevation(def: PoiDef, seabedY: number): number {
  if (def.snap_to_seabed || def.depth_m === undefined) return seabedY;
  const y = def.depth_m > 0 ? -def.depth_m : def.depth_m;
  return Math.max(y, seabedY);
}

/** Resolve validated POIs into world space. POIs outside the tile are skipped. */
export function placePois(
  defs: PoiDef[],
  meta: TileMeta,
  seabed: SeabedSampler,
  scan: Pick<ScanConfig, 'defaultRadiusM' | 'defaultSeconds'>,
  landmarkId: string,
  warn: Warn = defaultWarn,
): PlacedPoi[] {
  const out: PlacedPoi[] = [];
  for (const def of defs) {
    if (!bboxContains(meta.bbox, def.lat, def.lon)) {
      warn(`POI "${def.id}" is outside tile "${meta.id}"; skipped`);
      continue;
    }
    const { x, z } = latLonToWorld(meta, def.lat, def.lon);
    const y = poiElevation(def, seabed.sampleHeight(x, z));
    out.push({
      id: def.id,
      name: def.name,
      landmarkId,
      kind: def.kind,
      primary: def.primary,
      guideEntry: def.guide_entry ?? null,
      position: new Vector3(x, y, z),
      radius: def.radius_m ?? scan.defaultRadiusM,
      scanSeconds: def.scan_seconds ?? scan.defaultSeconds,
      def,
    });
  }
  return out;
}

/** Fetch and validate `pois.json` for a landmark. Never throws; missing = []. */
export async function loadPois(
  landmarkId: string,
  fetchFn?: FetchJson,
  warn: Warn = defaultWarn,
): Promise<PoiDef[]> {
  const doc = await fetchContentJson(contentUrl(landmarkId, 'pois.json'), fetchFn);
  return doc === null ? [] : parsePois(doc, warn);
}

export interface SpawnPose {
  x: number;
  y: number;
  z: number;
  /** Radians, the sub's convention: 0 faces north (-Z), +PI/2 faces east. */
  yaw: number;
}

/**
 * `?poi=<id>` debug spawn: a point `spawnDistanceM` from the POI (capped so
 * the POI is well inside its scan radius) on `spawnBearingDeg`, at the POI's
 * depth but never lower than the sub's own seabed floor there, facing the POI.
 *
 * @param floorOffset metres above the seabed the sub's physics keeps its
 *   centre (`hullRadius + seabedClearance`); the spawn adds `spawnClearanceM`.
 */
export function spawnPoseForPoi(
  poi: Pick<PlacedPoi, 'position' | 'radius'>,
  seabed: SeabedSampler,
  scan: Pick<ScanConfig, 'spawnDistanceM' | 'spawnBearingDeg' | 'spawnClearanceM'>,
  floorOffset: number,
): SpawnPose {
  const b = (scan.spawnBearingDeg * Math.PI) / 180;
  // Compass bearing -> world: north is -Z, east is +X.
  const ux = Math.sin(b);
  const uz = -Math.cos(b);
  const p = poi.position;
  let dist = Math.min(scan.spawnDistanceM, poi.radius * 0.8);
  let x = 0;
  let y = 0;
  let z = 0;
  // Clamping up out of the seabed lengthens the 3D range; pull in until the
  // POI is comfortably inside the radius (a few iterations at most).
  for (let i = 0; i < 8; i++) {
    x = p.x + ux * dist;
    z = p.z + uz * dist;
    const floor = seabed.sampleHeight(x, z) + floorOffset + scan.spawnClearanceM;
    y = Math.min(-floorOffset, Math.max(p.y, floor));
    const range = Math.hypot(x - p.x, y - p.y, z - p.z);
    if (range <= poi.radius * 0.9) break;
    dist *= 0.75;
  }
  // Face the POI horizontally. Forward at yaw is (sin yaw, -cos yaw) in XZ.
  const yaw = Math.atan2(p.x - x, -(p.z - z));
  return { x, y, z, yaw };
}
