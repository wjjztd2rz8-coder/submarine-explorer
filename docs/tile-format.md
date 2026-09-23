# Tile format

A **tile** is one rectangular patch of ocean-floor bathymetry, produced by
`tools/fetch_tile.py` and consumed by `src/world/TileLoader.ts`.

> **This document is the contract.** If you change the binary layout, the
> metadata keys, or the row order, you must update, in the same change:
> `tools/tile_writer.py`, `tools/inspect_tile.py`, `src/util/types.ts`,
> `src/world/TileLoader.ts`, and this file.

## On-disk layout

```
data/
  tiles/
    index.json                 list of every tile (rewritten on every tile write)
    <tile-id>/
      meta.json                metadata for one tile
      heightmap.bin            the elevation grid (canonical)
      heightmap16.bin          optional 16-bit quantised copy (see below)
      heightmap*.bin.gz / .br  optional pre-compressed copies (gitignored)
```

Tile ids are directory names: lowercase, `[a-z0-9-]`, e.g. `titanic`,
`monterey-canyon`.

Vite serves `data/` at the URL path `/data/` through the symlink
`public/data -> ../data`, so the browser fetches
`/data/tiles/<id>/meta.json` and `/data/tiles/<id>/heightmap.bin`.

## `heightmap.bin`

| Property     | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| Element type | IEEE-754 32-bit float, **little-endian**                          |
| Order        | row-major, `index = row * cols + col`                             |
| First row    | the **NORTH** edge of the bbox                                    |
| First column | the **WEST** edge of the bbox                                     |
| Units        | metres relative to mean sea level; **negative = below sea level** |
| Length       | exactly `cols * rows * 4` bytes                                   |
| NODATA       | never present — see below                                         |

There is no header. `meta.json` is the only place the dimensions live, so the
loader validates `byteLength === cols * rows * 4` and refuses the tile otherwise.

### NODATA handling

GMRT marks gaps with a sentinel (`-2147483648` in its ESRI ASCII output).
The pipeline never writes that sentinel. `esri_ascii.fill_nodata()` replaces
every hole by iterative nearest-valid-neighbour dilation: each pass averages a
hole cell's already-valid 4-neighbours, so holes fill inward from their edges.
If a pass makes no progress at all (e.g. the entire grid is NODATA) the
remaining cells fall back to the grid minimum, or `0.0` if there is no valid
value anywhere.

The number of cells that _were_ holes is recorded in `meta.nodata_count`, so a
consumer can tell how much of a tile is interpolated rather than measured.

## `meta.json`

```json
{
  "id": "titanic",
  "source": "GMRT",
  "source_url": "https://www.gmrt.org/services/GridServer?north=41.88&...",
  "fetched_at": "2026-09-17T00:58:36Z",
  "bbox": { "north": 41.8801, "south": 41.5798, "east": -49.7994, "west": -50.101 },
  "cols": 548,
  "rows": 546,
  "cellsize_deg": 0.00054931640625,
  "cellsize_m_x": 45.63,
  "cellsize_m_y": 61.15,
  "min_m": -3977.5,
  "max_m": -3338.7,
  "nodata_count": 0,
  "center": { "lat": 41.7299, "lon": -49.9502 },
  "attribution": "Bathymetry from the Global Multi-Resolution Topography (GMRT) Synthesis. Ryan, W.B.F., et al. (2009), ... doi:10.1029/2008GC002332.",
  "requested_bbox": { "north": 41.88, "south": 41.58, "east": -49.8, "west": -50.1 },
  "resolution": "high",
  "layer": "topo"
}
```

| Key                          | Meaning                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                         | tile id; must equal the directory name                                                                                                                             |
| `source`                     | `"GMRT"` for fetched tiles, `"ETOPO 2022"` for the fetch_all.py fallback, `"synthetic"` for generated ones                                                         |
| `source_url`                 | the exact request URL (or the generator script path)                                                                                                               |
| `fetched_at`                 | ISO-8601 UTC, second precision                                                                                                                                     |
| `bbox`                       | the **actual** grid bounds. GMRT snaps requests to its own grid, so this differs from what you asked for by up to a cell — always use this, never `requested_bbox` |
| `cols`, `rows`               | grid dimensions; `cols * rows * 4` must equal the heightmap size                                                                                                   |
| `cellsize_deg`               | cell size in degrees (square in GMRT's ESRI ASCII output)                                                                                                          |
| `cellsize_m_x`               | `cellsize_deg * 111320 * cos(center.lat)`                                                                                                                          |
| `cellsize_m_y`               | `cellsize_deg * 111320`                                                                                                                                            |
| `min_m`, `max_m`             | elevation extremes **after** NODATA filling                                                                                                                        |
| `nodata_count`               | number of cells that were holes in the source data                                                                                                                 |
| `center`                     | bbox centre; the world-space origin (see below)                                                                                                                    |
| `attribution`                | human-readable credit; the HUD renders this verbatim                                                                                                               |
| `requested_bbox`             | optional; what the CLI was asked for                                                                                                                               |
| `resolution`, `layer`        | optional; the GMRT parameters actually used                                                                                                                        |
| `synthetic`, `seed`          | optional; present only on `make_synthetic_tile.py` output                                                                                                          |
| `quant_min_m`, `quant_scale` | optional; present only when `heightmap16.bin` exists (`tools/compress_tiles.py --quant16`). metres = `quant_min_m + q * quant_scale`                               |

### Metres per degree

The whole project uses one spherical approximation, defined in
`tools/tile_writer.py` and mirrored in `src/util/geo.ts`:

```
1 degree of latitude  = 111320 m
1 degree of longitude = 111320 * cos(latitude) m
```

Longitude scale is evaluated **once, at the bbox centre latitude**, and the tile
is then treated as a flat local plane. Across a sub-degree tile the resulting
error is well under a metre.

## Optional derived files

Written by `tools/compress_tiles.py`; `heightmap.bin` stays the canonical
data and the loader reads it by default. `tile_writer.write_tile()` deletes all
of these whenever it rewrites a tile, so they can never go stale silently.

### `heightmap16.bin` (16-bit quantised variant)

| Property     | Value                                                                 |
| ------------ | --------------------------------------------------------------------- |
| Element type | unsigned 16-bit integer, **little-endian**                            |
| Order        | identical to `heightmap.bin` (row-major, north row first)             |
| Decoding     | `metres = quant_min_m + q * quant_scale` (both keys in meta)          |
| Encoding     | `q = round((v - quant_min_m) / quant_scale)`, clamped to 0…65535      |
| Scale        | `quant_scale = (max_m - min_m) / 65535` (1.0 for a flat tile)         |
| Error        | at most `quant_scale / 2` (≈ 0.04 m for Challenger Deep's 5 km range) |
| Length       | exactly `cols * rows * 2` bytes                                       |

`TileLoader` uses it only when constructed with `{ prefer16: true }` **and**
`meta.json` has both quant keys; on any fetch/decode failure it falls back to
`heightmap.bin`. `python3 tools/inspect_tile.py <id> --variant u16` decodes it
and prints the max error against float32.

### `*.gz` / `*.br`

Byte-identical gzip (level 9, `mtime=0`) / brotli (quality 11) copies of
`heightmap.bin` and `heightmap16.bin`, for static hosts that serve
pre-compressed files with `Content-Encoding` (the browser then hands the loader
the decompressed bytes, so no loader change is involved). Not committed.

## `index.json`

```json
{ "tiles": [ { "id": "titanic", "source": "GMRT", "bbox": {...},
               "cols": 548, "rows": 546, "min_m": -3977.5, "max_m": -3338.7,
               "center": { "lat": 41.73, "lon": -49.95 } } ] }
```

Rebuilt from scratch by `tile_writer.update_index()` every time a tile is
written, by scanning `data/tiles/*/meta.json`. `src/ui/MissionSelect.ts` renders
it. A missing or malformed `index.json` is not fatal: the loader returns an
empty list and the UI says so.

## World-space mapping

The renderer converts a tile into world metres as follows (see `src/util/geo.ts`
and `src/world/Terrain.ts`):

```
+X = EAST   metres
+Z = SOUTH  metres     <-- NOT north
+Y = UP     metres, sea level = 0, seabed values are negative
origin (0, *, 0) = the tile centre (meta.center)
```

`+Z = south` is chosen so that looking straight down gives a conventional
north-up map with +Z running down the screen. It also means grid **row index
increases with +Z** and grid **column index increases with +X**, so the
heightmap needs no flipping anywhere in the engine — the on-disk row order and
the world axes agree by construction.

Grid cell `(col, row)` sits at:

```
x = col * cellsize_m_x - (cols - 1) * cellsize_m_x / 2
z = row * cellsize_m_y - (rows - 1) * cellsize_m_y / 2
y = heights[row * cols + col] * terrain.verticalExaggeration
```

## Size guard

`fetch_tile.py` refuses grids over **4,000,000 cells** unless `--force`, and
falls back down the resolution ladder (`max` → `high` → `med` → `low`) when a
grid is too large or GMRT errors. 4M cells is 16 MB on disk and 4M vertices in
the renderer, which is the stated performance budget in `docs/architecture.md`.
