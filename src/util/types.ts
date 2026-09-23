/**
 * Shared data contracts.
 *
 * These types mirror the on-disk tile format documented in docs/tile-format.md.
 * If you change anything here you MUST update that document and tools/tile_writer.py.
 */

/** Geographic bounding box in decimal degrees (WGS84). */
export interface BBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

/** Contents of `data/tiles/<id>/meta.json`. */
export interface TileMeta {
  id: string;
  source: string;
  source_url: string;
  /** ISO-8601 UTC timestamp of when the tile was fetched. */
  fetched_at: string;
  /** The ACTUAL bounds of the grid (GMRT snaps to its own grid). */
  bbox: BBox;
  cols: number;
  rows: number;
  cellsize_deg: number;
  /** Cell width in metres, evaluated at the bbox centre latitude. */
  cellsize_m_x: number;
  /** Cell height in metres (latitude is very nearly constant scale). */
  cellsize_m_y: number;
  min_m: number;
  max_m: number;
  nodata_count: number;
  center: LatLon;
  attribution: string;
  /** Present on synthetic tiles produced by tools/make_synthetic_tile.py. */
  synthetic?: boolean;
  resolution?: string;
  layer?: string;
  /**
   * Present only when tools/compress_tiles.py --quant16 wrote the optional
   * `heightmap16.bin` (uint16 LE): metres = quant_min_m + q * quant_scale.
   * Float32 `heightmap.bin` stays canonical and is what the loader reads by default.
   */
  quant_min_m?: number;
  quant_scale?: number;
}

/** A loaded tile: metadata plus its heightmap. */
export interface Tile {
  meta: TileMeta;
  /**
   * `cols * rows` Float32 depths in metres (negative = below sea level),
   * row-major, ROW 0 = NORTH edge. Index with `row * cols + col`.
   */
  heights: Float32Array;
}

/** One entry of `data/tiles/index.json`. */
export interface TileIndexEntry {
  id: string;
  source?: string;
  bbox?: BBox;
  cols?: number;
  rows?: number;
  min_m?: number;
  max_m?: number;
  center?: LatLon;
}

export interface TileIndex {
  tiles: TileIndexEntry[];
}

/**
 * A landmark from `data/landmarks.json` (owned by another agent, so every field
 * beyond an identifier and a position is treated as optional).
 */
export interface Landmark {
  id: string;
  name?: string;
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  depth_m?: number;
  description?: string;
  tile?: string;
  [key: string]: unknown;
}
