#!/usr/bin/env python3
"""Fetch a bathymetry subset from the GMRT GridServer and write it as a tile.

Python 3.9 stdlib only -- no numpy, no GDAL, no requests.

GMRT GridServer parameters (verified against
https://www.gmrt.org/services/gridserverinfo.php on 2026-09-16):

    north, south, east, west   bbox in decimal degrees (WGS84)
    layer                      "topo" (elevation) | "topo-mask" (ocean only)
    format                     "esriascii" for ARC/INFO ASCII Grid
    resolution                 "low" | "med" | "high" | "max"  (default: auto)

There is also a sibling metadata endpoint,
    https://www.gmrt.org/services/GridServer/metadata?...&mformat=json
which we query FIRST so we can apply the cell-count guard before downloading a
potentially huge grid.

Examples:
    python3 tools/fetch_tile.py --id titanic \\
        --north 41.88 --south 41.58 --east -49.80 --west -50.10
    python3 tools/fetch_tile.py --from-landmarks data/landmarks.json --id titanic
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from esri_ascii import EsriAsciiError, fill_nodata, parse_esri_ascii  # noqa: E402
from tile_writer import build_meta, write_tile  # noqa: E402

GRID_URL = "https://www.gmrt.org/services/GridServer"
METADATA_URL = "https://www.gmrt.org/services/GridServer/metadata"

# Refuse grids larger than this many cells unless --force. 4M cells of Float32
# is 16 MB on disk and ~4M vertices in the renderer, which is our stated budget.
MAX_CELLS = 4_000_000

# Fallback ladder used when GMRT errors or the grid is too large.
RESOLUTIONS = ["max", "high", "med", "low"]


def build_url(base, north, south, east, west, resolution, layer, fmt, **extra):
    params = {
        "north": north,
        "south": south,
        "east": east,
        "west": west,
        "layer": layer,
        "format": fmt,
    }
    if resolution:
        params["resolution"] = resolution
    params.update(extra)
    return base + "?" + urllib.parse.urlencode(params)


def http_get(url, timeout=300):
    req = urllib.request.Request(url, headers={"User-Agent": "submarine-explorer/0.1"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def metadata_url(north, south, east, west, resolution):
    """URL of GMRT's size/metadata probe for a bbox (see probe_metadata)."""
    params = {
        "north": north, "south": south, "east": east, "west": west,
        "format": "esriascii", "mformat": "json",
    }
    if resolution:
        params["resolution"] = resolution
    return METADATA_URL + "?" + urllib.parse.urlencode(params)


def probe_metadata(north, south, east, west, resolution):
    """Ask GMRT how big this grid would be. Returns a dict or None on failure.

    NOTE: the metadata endpoint must NOT be sent a `layer` parameter -- if you
    include one it silently returns the actual grid data instead of the JSON
    metadata. Verified 2026-09-16.
    """
    url = metadata_url(north, south, east, west, resolution)
    try:
        return json.loads(http_get(url, timeout=60))
    except (urllib.error.URLError, ValueError, OSError) as exc:
        print("  [warn] metadata probe failed (%s); continuing blind" % exc)
        return None


def fetch_grid(north, south, east, west, resolution, layer, timeout):
    url = build_url(
        GRID_URL, north, south, east, west, resolution, layer, "esriascii"
    )
    print("  GET %s" % url)
    text = http_get(url, timeout=timeout)
    if not text.lstrip().lower().startswith("ncols"):
        # GMRT returns an HTML error page with HTTP 200 for some failures.
        raise EsriAsciiError("response is not an ESRI ASCII grid: %r" % text[:200])
    return parse_esri_ascii(text.splitlines()), url


def fetch_with_fallback(north, south, east, west, resolution, layer, force, timeout):
    """Try `resolution`, then progressively coarser ones on error / size guard."""
    start = RESOLUTIONS.index(resolution) if resolution in RESOLUTIONS else 0
    ladder = RESOLUTIONS[start:] or ["low"]
    last_exc = None
    for res in ladder:
        print("[fetch] resolution=%s" % res)
        md = probe_metadata(north, south, east, west, res)
        if md and "width" in md and "height" in md:
            cells = int(md["width"]) * int(md["height"])
            print("  metadata: %sx%s = %d cells, %s m/node"
                  % (md["width"], md["height"], cells, md.get("meters_per_node", "?")))
            if cells > MAX_CELLS and not force:
                print("  [guard] %d cells > %d limit; trying a coarser resolution"
                      % (cells, MAX_CELLS))
                last_exc = SystemExit(
                    "all resolutions exceed the %d-cell guard; use --force" % MAX_CELLS
                )
                continue
        try:
            grid, url = fetch_grid(north, south, east, west, res, layer, timeout)
        except (urllib.error.URLError, EsriAsciiError, OSError) as exc:
            print("  [warn] %s" % exc)
            last_exc = exc
            continue
        cells = grid.ncols * grid.nrows
        if cells > MAX_CELLS and not force:
            print("  [guard] downloaded %d cells > %d limit; trying coarser" % (cells, MAX_CELLS))
            last_exc = SystemExit("grid too large; use --force")
            continue
        return grid, url, res
    raise SystemExit("GMRT fetch failed for every resolution: %s" % last_exc)


def bbox_from_landmarks(path, tile_id):
    """Read a bbox for `tile_id` out of data/landmarks.json, if that file exists.

    The landmark file is owned by another agent and may not exist yet, so every
    failure path here is a clean message rather than a traceback. We accept a few
    plausible shapes: a top-level list, {"landmarks": [...]}, or {"<id>": {...}},
    and either an explicit bbox or a lat/lon (+ optional span_deg) point.
    """
    if not os.path.isfile(path):
        raise SystemExit(
            "landmark file %s does not exist yet -- pass explicit "
            "--north/--south/--east/--west instead" % path
        )
    try:
        with open(path) as fh:
            doc = json.load(fh)
    except ValueError as exc:
        raise SystemExit("could not parse %s: %s" % (path, exc))

    if isinstance(doc, dict) and "landmarks" in doc:
        items = doc["landmarks"]
    elif isinstance(doc, list):
        items = doc
    elif isinstance(doc, dict):
        items = [dict(v, id=v.get("id", k)) for k, v in doc.items() if isinstance(v, dict)]
    else:
        raise SystemExit("unrecognised structure in %s" % path)

    for item in items:
        if not isinstance(item, dict):
            continue
        if item.get("id") != tile_id and item.get("tile") != tile_id:
            continue
        bbox = item.get("bbox") or item.get("bounds")
        if isinstance(bbox, dict) and all(k in bbox for k in ("north", "south", "east", "west")):
            return {k: float(bbox[k]) for k in ("north", "south", "east", "west")}
        lat = item.get("lat", item.get("latitude"))
        lon = item.get("lon", item.get("lng", item.get("longitude")))
        if lat is not None and lon is not None:
            span = float(item.get("span_deg", 0.3))
            lat, lon = float(lat), float(lon)
            return {
                "north": lat + span / 2, "south": lat - span / 2,
                "east": lon + span / 2, "west": lon - span / 2,
            }
        raise SystemExit("landmark %r has neither a bbox nor lat/lon" % tile_id)
    raise SystemExit("no landmark with id %r in %s" % (tile_id, path))


def write_grid_tile(out_root, tile_id, grid, url, source, extra=None):
    """Fill NODATA in a parsed EsriGrid and write it as tile `tile_id`.

    Shared by this CLI and tools/fetch_all.py. Returns the written meta dict.
    """
    print("[grid] %d cols x %d rows, cellsize %g deg" % (grid.ncols, grid.nrows, grid.cellsize))
    values, nodata_count = fill_nodata(
        list(grid.values), grid.ncols, grid.nrows, grid.nodata_value
    )
    if nodata_count:
        print("[nodata] filled %d cells (%.3f%%)"
              % (nodata_count, 100.0 * nodata_count / len(values)))

    # Use the grid's OWN bounds, not the requested ones -- GMRT snaps to its
    # internal tile grid, so the returned extent differs by up to a cell.
    actual_bbox = {"north": grid.north, "south": grid.south,
                   "east": grid.east, "west": grid.west}

    meta = build_meta(
        tile_id, values, grid.ncols, grid.nrows, actual_bbox, grid.cellsize,
        nodata_count, source, url, extra=extra,
    )
    tile_dir = write_tile(out_root, meta, values)
    print("[write] %s" % tile_dir)
    print("[stats] cols=%d rows=%d min=%.1fm max=%.1fm nodata=%d"
          % (meta["cols"], meta["rows"], meta["min_m"], meta["max_m"], meta["nodata_count"]))
    print("[stats] cellsize %.1f m x  %.1f m y" % (meta["cellsize_m_x"], meta["cellsize_m_y"]))
    return meta


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True, help="tile id (directory name)")
    ap.add_argument("--north", type=float)
    ap.add_argument("--south", type=float)
    ap.add_argument("--east", type=float)
    ap.add_argument("--west", type=float)
    ap.add_argument("--from-landmarks", metavar="PATH",
                    help="read the bbox for --id from this landmarks JSON file")
    ap.add_argument("--resolution", default="high",
                    choices=["low", "med", "high", "max"])
    ap.add_argument("--layer", default="topo", choices=["topo", "topo-mask"])
    ap.add_argument("--out", default="data/tiles", help="output root (default data/tiles)")
    ap.add_argument("--timeout", type=int, default=300)
    ap.add_argument("--force", action="store_true",
                    help="bypass the %d-cell size guard" % MAX_CELLS)
    args = ap.parse_args(argv)

    if args.from_landmarks:
        bbox = bbox_from_landmarks(args.from_landmarks, args.id)
        print("[bbox] from %s: %s" % (args.from_landmarks, bbox))
    else:
        if None in (args.north, args.south, args.east, args.west):
            ap.error("give --north/--south/--east/--west, or --from-landmarks")
        bbox = {"north": args.north, "south": args.south,
                "east": args.east, "west": args.west}

    if bbox["north"] <= bbox["south"]:
        ap.error("--north must be greater than --south")
    if bbox["east"] <= bbox["west"]:
        ap.error("--east must be greater than --west (no antimeridian support)")

    grid, url, used_res = fetch_with_fallback(
        bbox["north"], bbox["south"], bbox["east"], bbox["west"],
        args.resolution, args.layer, args.force, args.timeout,
    )

    write_grid_tile(args.out, args.id, grid, url, "GMRT",
                    extra={"requested_bbox": bbox, "resolution": used_res,
                           "layer": args.layer})
    return 0


if __name__ == "__main__":
    sys.exit(main())
