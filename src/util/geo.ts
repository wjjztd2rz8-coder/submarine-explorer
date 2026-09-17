/**
 * Geographic <-> world-space conversion.
 *
 * WORLD COORDINATE CONVENTION (used everywhere in this project):
 *
 *     +X = EAST   (metres)
 *     +Z = SOUTH  (metres)   <-- note: NOT north. Chosen so that looking down
 *                                the -Y axis gives a conventional north-up map
 *                                where +Z runs down the screen.
 *     +Y = UP     (metres), sea level = 0, so seafloor depths are NEGATIVE.
 *
 * The origin (0, *, 0) is the CENTRE of the tile. A tile is treated as a flat
 * local plane (equirectangular about the tile's centre latitude); across a
 * sub-degree tile the error is well under a metre, which is irrelevant here.
 */

import type { BBox, LatLon, TileMeta } from './types.js';

/** Metres per degree of latitude (spherical approximation). Matches tools/tile_writer.py. */
export const METERS_PER_DEG_LAT = 111320;

/** Metres per degree of longitude at a given latitude. */
export function metersPerDegLon(latDeg: number): number {
  return METERS_PER_DEG_LAT * Math.cos((latDeg * Math.PI) / 180);
}

export interface WorldXZ {
  x: number;
  z: number;
}

/** Convert a lat/lon to tile-local world metres (X east, Z south, origin = tile centre). */
export function latLonToWorld(meta: TileMeta, lat: number, lon: number): WorldXZ {
  const c = meta.center;
  return {
    x: (lon - c.lon) * metersPerDegLon(c.lat),
    // Latitude increases northward but +Z is SOUTH, hence the sign flip.
    z: (c.lat - lat) * METERS_PER_DEG_LAT,
  };
}

/** Inverse of {@link latLonToWorld}. */
export function worldToLatLon(meta: TileMeta, x: number, z: number): LatLon {
  const c = meta.center;
  return {
    lat: c.lat - z / METERS_PER_DEG_LAT,
    lon: c.lon + x / metersPerDegLon(c.lat),
  };
}

/** Full width (east-west) of a tile in metres. */
export function tileWidthMeters(meta: TileMeta): number {
  return meta.cols * meta.cellsize_m_x;
}

/** Full height (north-south) of a tile in metres. */
export function tileHeightMeters(meta: TileMeta): number {
  return meta.rows * meta.cellsize_m_y;
}

/** True if a lat/lon falls inside a bbox (inclusive). */
export function bboxContains(bbox: BBox, lat: number, lon: number): boolean {
  return lat >= bbox.south && lat <= bbox.north && lon >= bbox.west && lon <= bbox.east;
}

/** Normalise a heading to [0, 360). */
export function normalizeHeadingDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Compass heading (0 = north, 90 = east) from a world-space forward direction.
 * Remember +Z is SOUTH, so north is -Z.
 */
export function headingFromForward(dx: number, dz: number): number {
  return normalizeHeadingDeg((Math.atan2(dx, -dz) * 180) / Math.PI);
}

/** Format a latitude as e.g. `41.7300 N`. */
export function formatLat(lat: number, digits = 4): string {
  return `${Math.abs(lat).toFixed(digits)}° ${lat >= 0 ? 'N' : 'S'}`;
}

/** Format a longitude as e.g. `49.9500 W`. */
export function formatLon(lon: number, digits = 4): string {
  return `${Math.abs(lon).toFixed(digits)}° ${lon >= 0 ? 'E' : 'W'}`;
}
