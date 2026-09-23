"""Shared tile-writing helpers -- Python 3.9 stdlib only.

Writes the on-disk tile format documented in docs/tile-format.md:

    data/tiles/<tile-id>/heightmap.bin   little-endian Float32, row-major,
                                         FIRST ROW = NORTH edge, metres (neg = below sea level)
    data/tiles/<tile-id>/meta.json       metadata (see build_meta)
    data/tiles/index.json                list of available tiles for the UI

Optional derived files (tools/compress_tiles.py; float32 stays canonical):

    data/tiles/<tile-id>/heightmap16.bin little-endian uint16, same order;
                                         metres = quant_min_m + q * quant_scale
    data/tiles/<tile-id>/*.gz, *.br      byte-identical compressed copies
"""

import array
import datetime
import json
import math
import os
import struct
import sys
from typing import Dict, List, Optional, Sequence

# Metres per degree of latitude (spherical approximation used throughout the
# project -- see docs/tile-format.md; good to ~0.5% and plenty for a game).
METERS_PER_DEG_LAT = 111320.0

# 16-bit quantisation: q in [0, QUANT16_MAX] maps linearly onto [min_m, max_m].
QUANT16_MAX = 65535
HEIGHTMAP16 = "heightmap16.bin"

# Files derived from heightmap.bin. write_tile() deletes them so a re-fetched
# tile can never be served next to a stale compressed/quantised copy.
DERIVED_FILES = (
    "heightmap.bin.gz",
    "heightmap.bin.br",
    HEIGHTMAP16,
    HEIGHTMAP16 + ".gz",
    HEIGHTMAP16 + ".br",
)

GMRT_ATTRIBUTION = (
    "Bathymetry from the Global Multi-Resolution Topography (GMRT) Synthesis. "
    "Ryan, W.B.F., et al. (2009), Global Multi-Resolution Topography synthesis, "
    "Geochem. Geophys. Geosyst., 10, Q03014, doi:10.1029/2008GC002332."
)


def meters_per_deg_lon(lat_deg: float) -> float:
    return METERS_PER_DEG_LAT * math.cos(math.radians(lat_deg))


def utc_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_meta(
    tile_id: str,
    values: Sequence[float],
    cols: int,
    rows: int,
    bbox: Dict[str, float],
    cellsize_deg: float,
    nodata_count: int,
    source: str,
    source_url: str,
    extra: Optional[Dict] = None,
) -> Dict:
    center_lat = (bbox["north"] + bbox["south"]) / 2.0
    center_lon = (bbox["east"] + bbox["west"]) / 2.0
    meta = {
        "id": tile_id,
        "source": source,
        "source_url": source_url,
        "fetched_at": utc_now_iso(),
        "bbox": {
            "north": bbox["north"],
            "south": bbox["south"],
            "east": bbox["east"],
            "west": bbox["west"],
        },
        "cols": cols,
        "rows": rows,
        "cellsize_deg": cellsize_deg,
        # Cell size in metres, evaluated at the bbox CENTRE latitude. The tile is
        # treated as a flat local plane in the game; error across a <1 deg tile
        # is small enough to ignore.
        "cellsize_m_x": cellsize_deg * meters_per_deg_lon(center_lat),
        "cellsize_m_y": cellsize_deg * METERS_PER_DEG_LAT,
        "min_m": min(values),
        "max_m": max(values),
        "nodata_count": nodata_count,
        "center": {"lat": center_lat, "lon": center_lon},
        "attribution": GMRT_ATTRIBUTION if source == "GMRT" else source,
    }
    if extra:
        meta.update(extra)
    return meta


def write_tile(out_root: str, meta: Dict, values: Sequence[float]) -> str:
    """Write heightmap.bin + meta.json for one tile; returns the tile directory."""
    tile_dir = os.path.join(out_root, meta["id"])
    os.makedirs(tile_dir, exist_ok=True)

    for name in DERIVED_FILES:
        stale = os.path.join(tile_dir, name)
        if os.path.isfile(stale):
            os.remove(stale)

    bin_path = os.path.join(tile_dir, "heightmap.bin")
    with open(bin_path, "wb") as fh:
        # "<" = little-endian, "f" = 32-bit float. Row-major, north row first.
        fh.write(struct.pack("<%df" % len(values), *values))

    _write_meta(tile_dir, meta)
    update_index(out_root)
    return tile_dir


def _write_meta(tile_dir: str, meta: Dict) -> None:
    with open(os.path.join(tile_dir, "meta.json"), "w") as fh:
        json.dump(meta, fh, indent=2)
        fh.write("\n")


def quantize16(values: Sequence[float], lo: float, hi: float) -> "tuple[array.array, float, float]":
    """Return (uint16 array, quant_min_m, quant_scale) for `values` in [lo, hi].

    Max reconstruction error is quant_scale / 2 (e.g. 0.05 m over an 7 km range).
    """
    lo = min(lo, min(values))
    hi = max(hi, max(values))
    scale = (hi - lo) / QUANT16_MAX if hi > lo else 1.0
    inv = 1.0 / scale
    q = array.array("H", (min(QUANT16_MAX, max(0, int(round((v - lo) * inv)))) for v in values))
    return q, lo, scale


def dequantize16(q: Sequence[int], quant_min_m: float, quant_scale: float) -> List[float]:
    return [quant_min_m + x * quant_scale for x in q]


def write_heightmap16(tile_dir: str, meta: Dict, values: Sequence[float]) -> Dict:
    """Write heightmap16.bin next to heightmap.bin and add its meta keys.

    Returns the updated meta. Float32 heightmap.bin remains the canonical data;
    the loader only uses this file when explicitly asked to.
    """
    q, lo, scale = quantize16(values, meta["min_m"], meta["max_m"])
    if sys.byteorder == "big":
        q.byteswap()
    with open(os.path.join(tile_dir, HEIGHTMAP16), "wb") as fh:
        fh.write(q.tobytes())
    meta = dict(meta, quant_min_m=lo, quant_scale=scale)
    _write_meta(tile_dir, meta)
    return meta


def update_index(out_root: str) -> List[Dict]:
    """Rebuild data/tiles/index.json from whatever tiles exist on disk."""
    entries = []
    if os.path.isdir(out_root):
        for name in sorted(os.listdir(out_root)):
            meta_path = os.path.join(out_root, name, "meta.json")
            if not os.path.isfile(meta_path):
                continue
            try:
                with open(meta_path) as fh:
                    m = json.load(fh)
            except (OSError, ValueError):
                continue
            entries.append(
                {
                    "id": m["id"],
                    "source": m.get("source"),
                    "bbox": m.get("bbox"),
                    "cols": m.get("cols"),
                    "rows": m.get("rows"),
                    "min_m": m.get("min_m"),
                    "max_m": m.get("max_m"),
                    "center": m.get("center"),
                }
            )
    os.makedirs(out_root, exist_ok=True)
    with open(os.path.join(out_root, "index.json"), "w") as fh:
        json.dump({"tiles": entries}, fh, indent=2)
        fh.write("\n")
    return entries
