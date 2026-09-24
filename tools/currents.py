#!/usr/bin/env python3
"""Fetch fixed GOFS 3.1 point samples or validate the checked-in offline grids.

No game runtime request uses this endpoint. Python 3.9 standard library only.
"""

import argparse
import csv
import io
import json
import math
import pathlib
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = "https://ncss.hycom.org/thredds/ncss/GLBy0.08/expt_93.0"
SAMPLED_AT = "2024-01-15T12:00:00Z"
LICENSE = "DoD Distribution A: approved for public release; distribution unlimited"
SCALE_FACTOR = 0.001  # water_u / water_v are packed Int16 in the HYCOM DAS.
FILL = -30000
GRID_SIZE = 3
# Representative model depth, rather than a claim of a measured bottom current.
# At coastal sites the 1/12-degree model cannot resolve the dive feature.
DEPTHS = {
    "axial-seamount-ashes": 1000,
    "beebe-vent-field": 3000,
    "bismarck": 3000,
    "blake-plateau-corals": 500,
    "challenger-deep": 5000,
    "endurance": 2000,
    "great-blue-hole": 50,
    "hudson-canyon": 100,
    "hunga-tonga-caldera": 100,
    "kamaehuakanaloa": 1000,
    "lost-city": 700,
    "monterey-canyon": 100,
    "titanic": 3000,
}


def sites():
    index = json.loads((ROOT / "data/landmarks/index.json").read_text())
    for site in index["landmarks"]:
        mission = json.loads((ROOT / "data/landmarks" / site / "mission.json").read_text())
        yield site, mission["tile"]


def request_point(lat, lon, depth):
    query = urllib.parse.urlencode(
        {
            "var": ["water_u", "water_v"],
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "time": SAMPLED_AT,
            "vertCoord": depth,
            "accept": "csv",
        },
        doseq=True,
    )
    request = urllib.request.Request(SOURCE + "?" + query, headers={"User-Agent": "SubmarineExplorer-offline-grid/1"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                rows = list(csv.reader(io.StringIO(response.read().decode("utf-8"))))
            break
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(attempt + 1)
    if len(rows) != 2 or len(rows[1]) != 6 or not rows[0][4].startswith("water_u") or not rows[0][5].startswith("water_v"):
        raise ValueError("unexpected HYCOM NCSS CSV response")
    raw_u, raw_v = float(rows[1][4]), float(rows[1][5])
    if raw_u == FILL or raw_v == FILL:
        return None
    u, v = raw_u * SCALE_FACTOR, raw_v * SCALE_FACTOR
    if not all(math.isfinite(c) and abs(c) <= 3 for c in (u, v)):
        raise ValueError("HYCOM velocity outside the plausible range")
    return [round(u, 3), round(v, 3)]


def make_grid(site, tile, fetched_at):
    meta = json.loads((ROOT / "data/tiles" / tile / "meta.json").read_text())
    bbox = meta["bbox"]
    center = meta["center"]
    x_scale = 111320 * math.cos(math.radians(center["lat"]))
    latitudes = [bbox["north"] + (bbox["south"] - bbox["north"]) * i / (GRID_SIZE - 1) for i in range(GRID_SIZE)]
    longitudes = [bbox["west"] + (bbox["east"] - bbox["west"]) * i / (GRID_SIZE - 1) for i in range(GRID_SIZE)]
    depth = DEPTHS[site]
    points = [(lat, lon, depth) for lat in latitudes for lon in longitudes]
    with ThreadPoolExecutor(max_workers=2) as pool:
        samples = list(pool.map(lambda point: request_point(*point), points))
    if all(value is None for value in samples):
        raise ValueError(f"{site}: no wet HYCOM cells at {depth} m; choose a shallower representative depth")
    return {
        "version": 1,
        "site": site,
        "tile": tile,
        "source": {
            "name": "NRL HYCOM GOFS 3.1 GLBy0.08 expt_93.0",
            "url": SOURCE,
            "sampled_at": SAMPLED_AT,
            "fetched_at": fetched_at,
            "license": LICENSE,
            "depth_m": depth,
        },
        "bounds": {
            "x_min": round((bbox["west"] - center["lon"]) * x_scale, 3),
            "x_max": round((bbox["east"] - center["lon"]) * x_scale, 3),
            "z_min": round((center["lat"] - bbox["north"]) * 111320, 3),
            "z_max": round((center["lat"] - bbox["south"]) * 111320, 3),
        },
        "cols": GRID_SIZE,
        "rows": GRID_SIZE,
        "vectors": [samples[i : i + GRID_SIZE] for i in range(0, len(samples), GRID_SIZE)],
    }


def validate_grid(grid, site, tile, meta):
    """Reject malformed, uncredited or wrongly mapped local data."""
    if not isinstance(grid, dict) or (grid.get("version"), grid.get("site"), grid.get("tile")) != (1, site, tile):
        raise ValueError("version/site/tile mismatch")
    source = grid.get("source", {})
    for key in ("name", "url", "sampled_at", "fetched_at", "license"):
        if not isinstance(source.get(key), str) or not source[key].strip():
            raise ValueError(f"source.{key} missing")
    if source["url"] != SOURCE or source["sampled_at"] != SAMPLED_AT or source["license"] != LICENSE:
        raise ValueError("unexpected source, sampling date or license")
    if source.get("depth_m") != DEPTHS[site]:
        raise ValueError("representative depth mismatch")
    for key in ("sampled_at", "fetched_at"):
        try:
            datetime.fromisoformat(source[key].replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(f"bad source.{key}") from exc
    cols, rows = grid.get("cols"), grid.get("rows")
    if (cols, rows) != (GRID_SIZE, GRID_SIZE):
        raise ValueError("wrong grid dimensions")
    b = grid.get("bounds", {})
    if not all(isinstance(b.get(k), (int, float)) and math.isfinite(b[k]) for k in ("x_min", "x_max", "z_min", "z_max")):
        raise ValueError("invalid bounds")
    if not (b["x_min"] < b["x_max"] and b["z_min"] < b["z_max"]):
        raise ValueError("reversed bounds")
    width = (meta["cols"] - 1) * meta["cellsize_m_x"]
    height = (meta["rows"] - 1) * meta["cellsize_m_y"]
    if max(abs(b["x_min"]), abs(b["x_max"])) > width * 0.55 or max(abs(b["z_min"]), abs(b["z_max"])) > height * 0.55:
        raise ValueError("bounds outside tile")
    vectors = grid.get("vectors")
    if not isinstance(vectors, list) or len(vectors) != rows or any(not isinstance(r, list) or len(r) != cols for r in vectors):
        raise ValueError("invalid vector rows")
    valid = 0
    for row in vectors:
        for pair in row:
            if pair is None:
                continue
            if not isinstance(pair, list) or len(pair) != 2 or not all(type(c) in (int, float) and math.isfinite(c) and abs(c) <= 3 for c in pair):
                raise ValueError("invalid current vector")
            valid += 1
    if valid == 0:
        raise ValueError("entire grid masked")
    return valid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true", help="fetch archived HYCOM samples and overwrite derived grids")
    parser.add_argument("--resume", action="store_true", help="with --fetch, keep grids already downloaded")
    parser.add_argument("--site", choices=sorted(DEPTHS), help="limit fetching or validation to one site")
    parser.add_argument("--fetched-at", help="record an ISO UTC fetch timestamp (default: now)")
    args = parser.parse_args()
    selected = [(site, tile) for site, tile in sites() if args.site in (None, site)]
    if {site for site, _ in sites()} != set(DEPTHS):
        parser.error("DEPTHS must map every mission site")
    output = ROOT / "data/currents"
    if args.fetch:
        fetched_at = args.fetched_at or datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        output.mkdir(parents=True, exist_ok=True)
        for site, tile in selected:
            if args.resume and (output / (site + ".json")).exists():
                print(f"kept {site}", flush=True)
                continue
            grid = make_grid(site, tile, fetched_at)
            (output / (site + ".json")).write_text(json.dumps(grid, indent=2) + "\n")
            print(f"fetched {site}", flush=True)
    for site, tile in selected:
        path = output / (site + ".json")
        grid = json.loads(path.read_text())
        meta = json.loads((ROOT / "data/tiles" / tile / "meta.json").read_text())
        valid = validate_grid(grid, site, tile, meta)
        print(f"valid {site}: {valid}/{GRID_SIZE * GRID_SIZE} wet cells")
    if not args.site:
        extras = {p.stem for p in output.glob("*.json")} - {site for site, _ in selected}
        if extras:
            raise ValueError("unmapped current grids: " + ", ".join(sorted(extras)))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"currents: {exc}", file=sys.stderr)
        sys.exit(1)
