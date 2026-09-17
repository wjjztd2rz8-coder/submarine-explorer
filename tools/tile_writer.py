"""Shared tile-writing helpers -- Python 3.9 stdlib only.

Writes the on-disk tile format documented in docs/tile-format.md:

    data/tiles/<tile-id>/heightmap.bin   little-endian Float32, row-major,
                                         FIRST ROW = NORTH edge, metres (neg = below sea level)
    data/tiles/<tile-id>/meta.json       metadata (see build_meta)
    data/tiles/index.json                list of available tiles for the UI
"""

import datetime
import json
import math
import os
import struct
from typing import Dict, List, Optional, Sequence

# Metres per degree of latitude (spherical approximation used throughout the
# project -- see docs/tile-format.md; good to ~0.5% and plenty for a game).
METERS_PER_DEG_LAT = 111320.0

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

    bin_path = os.path.join(tile_dir, "heightmap.bin")
    with open(bin_path, "wb") as fh:
        # "<" = little-endian, "f" = 32-bit float. Row-major, north row first.
        fh.write(struct.pack("<%df" % len(values), *values))

    with open(os.path.join(tile_dir, "meta.json"), "w") as fh:
        json.dump(meta, fh, indent=2)
        fh.write("\n")

    update_index(out_root)
    return tile_dir


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
