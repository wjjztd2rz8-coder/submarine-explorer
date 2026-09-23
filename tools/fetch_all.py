#!/usr/bin/env python3
"""Batch-fetch bathymetry tiles for the Tier-2 landmark list. Stdlib only.

For every landmark id in TIER2 this:

  1. plans a bbox from the landmark's `bbox` in data/landmarks.json -- small
     wreck/vent boxes are expanded to at least MIN_SPAN_DEG (so there is terrain
     to fly over) and giant boxes are shrunk around the landmark point so the
     tile stays <= MAX_SIDE_CELLS per side at GMRT's native ~61 m spacing;
  2. asks GMRT's metadata endpoint how big each resolution would be and picks
     the finest one that fits MAX_TILE_BYTES (float32) and MAX_SIDE_HARD;
  3. downloads the ESRI ASCII grid (sequential, >= 2 s between requests, retry
     with exponential backoff) into .cache/gmrt-raw/ -- a cache, so re-runs are free;
  4. writes the tile through tools/fetch_tile.py -> tools/tile_writer.py, which
     also regenerates data/tiles/index.json.

If GMRT fails for a landmark, the documented fallback (NOAA ETOPO 2022 15" via
ERDDAP, see docs/data-sources.md) is tried; if that fails too the landmark is
reported as missing. Nothing is ever synthesised for a real landmark.

Tile id == landmark id (src/game/ContentPath.ts relies on that by default).

Examples:
    python3 tools/fetch_all.py --dry-run             # plan only, no network
    python3 tools/fetch_all.py --dry-run --probe     # plan + GMRT size probes
    python3 tools/fetch_all.py --skip-existing       # fetch what is missing
    python3 tools/fetch_all.py --only bismarck --only endurance
    python3 tools/fetch_all.py --report              # size / depth table only
"""

import argparse
import array
import hashlib
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fetch_tile  # noqa: E402
from esri_ascii import EsriAsciiError, parse_esri_ascii  # noqa: E402
from tile_writer import METERS_PER_DEG_LAT, meters_per_deg_lon, update_index  # noqa: E402

# Owner-approved Tier-2 list (plan/DECISIONS.md), as landmark ids.
TIER2 = [
    "titanic",
    "challenger-deep",
    "lost-city",
    "monterey-canyon",
    "endurance",
    "axial-seamount-ashes",
    "hudson-canyon",
    "kamaehuakanaloa",
    "beebe-vent-field",
    "great-blue-hole",
    "bismarck",
    "hunga-tonga-caldera",
    "blake-plateau-corals",
]

# GMRT's finest ESRI ASCII cell where multibeam exists: 360 / 2^16 / 10 deg,
# ~61 m north-south. Observed at Titanic, Monterey and Lost City.
NATIVE_CELL_DEG = 360.0 / 655360.0

MIN_SPAN_DEG = 0.3  # ~33 km N-S; titanic's existing tile is 0.3 deg
MAX_SIDE_CELLS = 1200  # planning target per side at the native cell size
MAX_SPAN_DEG = MAX_SIDE_CELLS * NATIVE_CELL_DEG  # ~0.659 deg
MAX_SIDE_HARD = 1500  # accept a grid up to this many cells per side
MAX_TILE_BYTES = 8 * 1000 * 1000  # float32 heightmap.bin budget per tile

MIN_SLEEP_S = 2.0  # etiquette floor between any two HTTP requests
DEFAULT_SLEEP_S = 2.5
DEFAULT_RETRIES = 3
BACKOFF_BASE_S = 5.0  # 5, 10, 20 s ...

GMRT_LADDER = ["max", "high", "med", "low"]

# Per-landmark planning overrides. Everything not listed uses the generic rule.
#   pinned: exact bbox (reproduces a tile fetched before this script existed)
#   min_span / max_span: degrees, replacing MIN_SPAN_DEG / MAX_SPAN_DEG
#   resolution: first rung of the GMRT ladder to try
OVERRIDES = {
    "titanic": {
        "pinned": {"north": 41.88, "south": 41.58, "east": -49.8, "west": -50.1},
        "resolution": "high",
    },
    "lost-city": {
        "pinned": {"north": 30.2, "south": 30.03, "east": -42.02, "west": -42.22},
        "resolution": "high",
    },
    "monterey-canyon": {
        "pinned": {"north": 36.95, "south": 36.6, "east": -121.75, "west": -122.2},
        "resolution": "high",
    },
    # Owner brief: "~0.5 deg box around the deep" -- shows the trench walls
    # either side of the Challenger Deep pools rather than just the floor.
    "challenger-deep": {"min_span": 0.5, "max_span": 0.5},
    # 0.4 deg fits the whole Axial edifice (caldera + both rift zones' tops).
    "axial-seamount-ashes": {"min_span": 0.4},
}

ETOPO_URL = "https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.esriAscii"
ETOPO_ATTRIBUTION = (
    "NOAA National Centers for Environmental Information (2022): ETOPO 2022 "
    "15 Arc-Second Global Relief Model. doi:10.25921/fd45-gt74"
)


# --------------------------------------------------------------------------
# Landmarks and planning
# --------------------------------------------------------------------------


def load_landmarks(path):
    with open(path) as fh:
        doc = json.load(fh)
    items = doc["landmarks"] if isinstance(doc, dict) else doc
    return {it["id"]: it for it in items if isinstance(it, dict) and "id" in it}


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def plan_bbox(landmark, override=None):
    """Return (bbox, note) for a landmark. Pure function; see module docstring.

    Per axis: if the landmark's span already satisfies the limits, its bbox
    edges are kept as-is (the author may have placed the site off-centre on
    purpose); otherwise the new span is centred on the landmark's lat/lon.
    The longitude minimum is widened by 1/cos(lat) so an expanded box is
    roughly square on the ground, but never beyond the max span.
    """
    ov = override or {}
    if "pinned" in ov:
        return dict(ov["pinned"]), "pinned to the existing tile's bbox"

    b = landmark.get("bbox")
    lat0 = landmark.get("lat")
    lon0 = landmark.get("lon")
    if not b:
        if lat0 is None or lon0 is None:
            raise ValueError("landmark %r has neither bbox nor lat/lon" % landmark.get("id"))
        b = {"north": lat0, "south": lat0, "east": lon0, "west": lon0}
    if lat0 is None or lon0 is None:
        lat0 = (b["north"] + b["south"]) / 2.0
        lon0 = (b["east"] + b["west"]) / 2.0
    lat0, lon0 = float(lat0), float(lon0)

    min_span = float(ov.get("min_span", MIN_SPAN_DEG))
    max_span = float(ov.get("max_span", MAX_SPAN_DEG))
    lat_span0 = b["north"] - b["south"]
    lon_span0 = b["east"] - b["west"]

    lat_span = _clamp(lat_span0, min_span, max_span)
    cos_lat = max(0.05, math.cos(math.radians(lat0)))
    lon_min = min(min_span / cos_lat, max_span)
    lon_span = _clamp(lon_span0, lon_min, max_span)

    out = {}
    notes = []
    if abs(lat_span - lat_span0) < 1e-9:
        out["north"], out["south"] = b["north"], b["south"]
    else:
        out["north"] = lat0 + lat_span / 2.0
        out["south"] = lat0 - lat_span / 2.0
    if abs(lon_span - lon_span0) < 1e-9:
        out["east"], out["west"] = b["east"], b["west"]
    else:
        out["east"] = lon0 + lon_span / 2.0
        out["west"] = lon0 - lon_span / 2.0

    grew = lat_span > lat_span0 + 1e-9 or lon_span > lon_span0 + 1e-9
    shrank = lat_span < lat_span0 - 1e-9 or lon_span < lon_span0 - 1e-9
    orig = "%.2f x %.2f deg" % (lat_span0, lon_span0)
    if grew and shrank:
        notes.append("resized from %s" % orig)
    elif grew:
        notes.append("expanded from %s" % orig)
    elif shrank:
        notes.append("shrunk from %s" % orig)
    else:
        notes.append("landmark bbox used as-is")

    out["north"] = min(out["north"], 85.0)
    out["south"] = max(out["south"], -85.0)
    out = {k: round(v, 4) for k, v in out.items()}
    return out, "; ".join(notes)


def bbox_extent_km(bbox):
    lat_c = (bbox["north"] + bbox["south"]) / 2.0
    ew = (bbox["east"] - bbox["west"]) * meters_per_deg_lon(lat_c) / 1000.0
    ns = (bbox["north"] - bbox["south"]) * METERS_PER_DEG_LAT / 1000.0
    return ew, ns


def estimate_grid(bbox, cell_deg=NATIVE_CELL_DEG):
    """(cols, rows, float32_bytes) for an ESRI ASCII grid over `bbox`."""
    cols = int(math.ceil((bbox["east"] - bbox["west"]) / cell_deg - 1e-6))
    rows = int(math.ceil((bbox["north"] - bbox["south"]) / cell_deg - 1e-6))
    return cols, rows, cols * rows * 4


def estimate_from_metadata(md):
    """(cols, rows, bytes, cell_deg) from a GMRT metadata JSON, or None.

    GMRT's `height` counts Mercator rows, but the ESRI ASCII output is on a
    square-degree grid (e.g. Titanic: metadata 547x733, actual 548x546). So we
    take the cell size from width / lon-extent and derive rows from lat-extent.
    """
    try:
        width = int(md["width"])
        gb = md["grid_bounds"]
        west, east = float(gb["west"]), float(gb["east"])
        south, north = float(gb["south"]), float(gb["north"])
    except (KeyError, TypeError, ValueError):
        return None
    if width <= 0 or east <= west:
        return None
    cell = (east - west) / width
    rows = int(round((north - south) / cell))
    return width, rows, width * rows * 4, cell


def fits_budget(cols, rows, max_bytes=MAX_TILE_BYTES, max_side=MAX_SIDE_HARD):
    return cols * rows * 4 <= max_bytes and max(cols, rows) <= max_side


# --------------------------------------------------------------------------
# HTTP: throttled, retried, cached
# --------------------------------------------------------------------------


class FetchError(Exception):
    pass


class Throttle:
    """Guarantees >= `interval` seconds between the starts of two requests."""

    def __init__(self, interval, sleep=time.sleep, clock=time.monotonic):
        self.interval = max(MIN_SLEEP_S, float(interval))
        self._sleep = sleep
        self._clock = clock
        self._last = None
        self.requests = 0

    def wait(self):
        if self._last is not None:
            delay = self._last + self.interval - self._clock()
            if delay > 0:
                self._sleep(delay)
        self._last = self._clock()
        self.requests += 1


def get_with_retry(url, throttle, timeout, retries, validate=None,
                   http_get=None, sleep=time.sleep):
    """GET `url` (text) with throttling and exponential backoff.

    `validate(text)` may raise ValueError to treat an HTTP-200 body (GMRT's HTML
    error pages) as a failure. HTTP 4xx other than 408/429 is not retried.
    """
    getter = http_get or fetch_tile.http_get
    last = None
    for attempt in range(retries + 1):
        if attempt:
            backoff = BACKOFF_BASE_S * (2 ** (attempt - 1))
            print("  [retry %d/%d] in %.0fs after: %s" % (attempt, retries, backoff, last))
            sleep(backoff)
        throttle.wait()
        try:
            text = getter(url, timeout=timeout)
            if validate:
                validate(text)
            return text
        except urllib.error.HTTPError as exc:
            last = exc
            if 400 <= exc.code < 500 and exc.code not in (408, 429):
                break
        except (urllib.error.URLError, OSError, ValueError) as exc:
            last = exc
    raise FetchError("%s (after %d attempt(s))" % (last, attempt + 1))


def _is_esri(text):
    if not text.lstrip().lower().startswith("ncols"):
        raise ValueError("not an ESRI ASCII grid: %r" % text.lstrip()[:120])


def _is_json(text):
    json.loads(text)


def cache_path(raw_dir, tile_id, kind, url, ext):
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:10]
    return os.path.join(raw_dir, "%s__%s__%s.%s" % (tile_id, kind, digest, ext))


def cached_get(url, path, throttle, timeout, retries, validate, http_get=None,
               sleep=time.sleep):
    """Return (text, from_cache). Writes atomically so a crash never leaves a
    truncated file that a later run would trust."""
    if os.path.isfile(path):
        with open(path) as fh:
            text = fh.read()
        try:
            validate(text)
            return text, True
        except ValueError:
            print("  [cache] ignoring invalid %s" % path)
    text = get_with_retry(url, throttle, timeout, retries, validate, http_get, sleep)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".part"
    with open(tmp, "w") as fh:
        fh.write(text)
    os.replace(tmp, path)
    return text, False


# --------------------------------------------------------------------------
# Sources
# --------------------------------------------------------------------------


def gmrt_grid_url(bbox, res):
    return fetch_tile.build_url(fetch_tile.GRID_URL, bbox["north"], bbox["south"],
                                bbox["east"], bbox["west"], res, "topo", "esriascii")


def gmrt_metadata_url(bbox, res):
    return fetch_tile.metadata_url(bbox["north"], bbox["south"], bbox["east"],
                                   bbox["west"], res)


def etopo_url(bbox):
    """ERDDAP griddap URL; this dataset's longitude axis is 0-360."""
    west, east = bbox["west"] % 360.0, bbox["east"] % 360.0
    if east <= west:
        raise FetchError("bbox crosses the ERDDAP 0/360 seam; not supported")
    query = "z[(%s):(%s)][(%s):(%s)]" % (bbox["south"], bbox["north"],
                                         round(west, 6), round(east, 6))
    return ETOPO_URL + "?" + urllib.parse.quote(query, safe="():,")


def fetch_gmrt(tile_id, bbox, start_res, ctx):
    """Return (grid, url, res, meters_per_node) or raise FetchError."""
    ladder = GMRT_LADDER[GMRT_LADDER.index(start_res):] if start_res in GMRT_LADDER else GMRT_LADDER
    errors = []
    for res in ladder:
        murl = gmrt_metadata_url(bbox, res)
        mpn = None
        try:
            text, hit = cached_get(murl, cache_path(ctx["raw"], tile_id, "meta-" + res, murl, "json"),
                                   ctx["throttle"], 60, ctx["retries"], _is_json,
                                   ctx.get("http_get"), ctx["sleep"])
            md = json.loads(text)
            mpn = md.get("meters_per_node")
            est = estimate_from_metadata(md)
            if est:
                cols, rows, nbytes, _ = est
                print("  [probe %s%s] ~%dx%d cells, %.2f MB, %s m/node"
                      % (res, " cached" if hit else "", cols, rows, nbytes / 1e6, mpn))
                if not fits_budget(cols, rows):
                    errors.append("%s: estimated %dx%d exceeds budget" % (res, cols, rows))
                    continue
        except FetchError as exc:
            print("  [warn] metadata probe failed (%s); downloading blind" % exc)

        gurl = gmrt_grid_url(bbox, res)
        try:
            text, hit = cached_get(gurl, cache_path(ctx["raw"], tile_id, "gmrt-" + res, gurl, "asc"),
                                   ctx["throttle"], ctx["timeout"], ctx["retries"], _is_esri,
                                   ctx.get("http_get"), ctx["sleep"])
            print("  [grid %s%s] %s" % (res, " cached" if hit else "", gurl))
            grid = parse_esri_ascii(text.splitlines())
        except (FetchError, EsriAsciiError) as exc:
            print("  [warn] %s" % exc)
            errors.append("%s: %s" % (res, exc))
            continue
        if not fits_budget(grid.ncols, grid.nrows):
            errors.append("%s: got %dx%d, over budget" % (res, grid.ncols, grid.nrows))
            continue
        return grid, gurl, res, mpn
    raise FetchError("GMRT: " + " | ".join(errors or ["no resolution attempted"]))


def fetch_etopo(tile_id, bbox, ctx):
    url = etopo_url(bbox)
    text, hit = cached_get(url, cache_path(ctx["raw"], tile_id, "etopo15s", url, "asc"),
                           ctx["throttle"], ctx["timeout"], ctx["retries"], _is_esri,
                           ctx.get("http_get"), ctx["sleep"])
    print("  [etopo%s] %s" % (" cached" if hit else "", url))
    try:
        return parse_esri_ascii(text.splitlines()), url
    except EsriAsciiError as exc:
        raise FetchError("ETOPO: %s" % exc)


def fetch_one(tile_id, landmark, ctx):
    """Plan, fetch and write one tile. Returns the written meta dict."""
    ov = OVERRIDES.get(tile_id, {})
    bbox, note = plan_bbox(landmark, ov)
    print("[%s] bbox N%.4f S%.4f E%.4f W%.4f (%s)"
          % (tile_id, bbox["north"], bbox["south"], bbox["east"], bbox["west"], note))
    try:
        grid, url, res, _ = fetch_gmrt(tile_id, bbox, ov.get("resolution", "max"), ctx)
        return fetch_tile.write_grid_tile(
            ctx["out"], tile_id, grid, url, "GMRT",
            extra={"requested_bbox": bbox, "resolution": res, "layer": "topo"})
    except FetchError as exc:
        if not ctx.get("fallback", True):
            raise
        print("  [fallback] %s -- trying ETOPO 2022 15\" via ERDDAP" % exc)
        gmrt_err = exc
    try:
        grid, url = fetch_etopo(tile_id, bbox, ctx)
    except FetchError as exc:
        raise FetchError("%s; ETOPO: %s" % (gmrt_err, exc))
    return fetch_tile.write_grid_tile(
        ctx["out"], tile_id, grid, url, "ETOPO 2022",
        extra={"requested_bbox": bbox, "resolution": "15s",
               "attribution": ETOPO_ATTRIBUTION})


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------


def read_heights(tile_dir, meta):
    arr = array.array("f")
    with open(os.path.join(tile_dir, "heightmap.bin"), "rb") as fh:
        arr.frombytes(fh.read())
    if sys.byteorder == "big":
        arr.byteswap()
    if len(arr) != meta["cols"] * meta["rows"]:
        raise ValueError("heightmap size mismatch for %s" % meta["id"])
    return arr


def _cell_of(meta, lat, lon):
    b = meta["bbox"]
    if not (b["south"] <= lat <= b["north"] and b["west"] <= lon <= b["east"]):
        return None
    cell = meta["cellsize_deg"]
    c = min(meta["cols"] - 1, int((lon - b["west"]) / cell))
    r = min(meta["rows"] - 1, int((b["north"] - lat) / cell))
    return r, c


def sample_depth(meta, heights, lat, lon):
    """Tile value (m) at lat/lon, or None if the point is outside the tile."""
    rc = _cell_of(meta, lat, lon)
    return None if rc is None else heights[rc[0] * meta["cols"] + rc[1]]


def nearest_match_km(meta, heights, lat, lon, lo, hi, max_km=5.0):
    """Distance (km) from lat/lon to the nearest cell with lo <= value <= hi.

    Landmark coordinates are often rounded to ~0.01 deg (~1 km) and a 61 m grid
    smooths steep walls, so "the right depth exists within a few hundred metres"
    is the useful plausibility test, not the single cell under the pin.
    """
    rc = _cell_of(meta, lat, lon)
    if rc is None:
        return None
    r0, c0 = rc
    cols, rows = meta["cols"], meta["rows"]
    mx, my = meta["cellsize_m_x"], meta["cellsize_m_y"]
    rr_max = int(max_km * 1000 / my) + 1
    cc_max = int(max_km * 1000 / mx) + 1
    best = None
    for r in range(max(0, r0 - rr_max), min(rows, r0 + rr_max + 1)):
        dy = (r - r0) * my
        base = r * cols
        for c in range(max(0, c0 - cc_max), min(cols, c0 + cc_max + 1)):
            v = heights[base + c]
            if lo <= v <= hi:
                d = math.hypot((c - c0) * mx, dy)
                if best is None or d < best:
                    best = d
    return None if best is None or best > max_km * 1000 else best / 1000.0


def target_interval(landmark):
    """(lo, hi, tol) in tile elevation metres from depth_range_m / depth_m."""
    rng = landmark.get("depth_range_m")
    if not (isinstance(rng, list) and len(rng) == 2):
        d = landmark.get("depth_m")
        if d is None:
            return None
        rng = [d, d]
    deep, shallow = max(abs(float(x)) for x in rng), min(abs(float(x)) for x in rng)
    tol = max(75.0, 0.05 * deep)
    return -deep - tol, -shallow + tol, tol


def depth_check(meta, heights, landmark):
    """Plausibility of the landmark's published depth against the tile."""
    iv = target_interval(landmark)
    if iv is None:
        return "n/a", None
    lo, hi, _ = iv
    if hi < meta["min_m"] or lo > meta["max_m"]:
        return "CHECK: published depth outside tile range", None
    lat, lon = landmark.get("lat"), landmark.get("lon")
    if lat is None or lon is None:
        return "ok (range only)", None
    point = sample_depth(meta, heights, float(lat), float(lon))
    if point is None:
        return "CHECK: landmark outside tile", None
    if lo <= point <= hi:
        return "ok", point
    km = nearest_match_km(meta, heights, float(lat), float(lon), lo, hi)
    if km is None:
        return "CHECK: no matching depth within 5 km", point
    return ("ok (match %.1f km away)" if km <= 2.0 else "CHECK (match %.1f km away)") % km, point


COVERAGE_HALF_SPAN_DEG = 0.05  # ~11 km box around the pin; ~150 KB of text


def coverage_bbox(landmark):
    lat, lon = float(landmark["lat"]), float(landmark["lon"])
    dlon = COVERAGE_HALF_SPAN_DEG / max(0.05, math.cos(math.radians(lat)))
    return {"north": round(lat + COVERAGE_HALF_SPAN_DEG, 4),
            "south": round(lat - COVERAGE_HALF_SPAN_DEG, 4),
            "east": round(lon + dlon, 4), "west": round(lon - dlon, 4)}


def multibeam_fraction(tile_id, landmark, ctx):
    """Share of cells near the landmark with real multibeam (not GEBCO fill).

    Uses GMRT's `topo-mask` layer, which is NODATA wherever the `topo` layer
    was filled from GEBCO. Cached in .cache/gmrt-raw like everything else.
    """
    bbox = coverage_bbox(landmark)
    url = fetch_tile.build_url(fetch_tile.GRID_URL, bbox["north"], bbox["south"],
                               bbox["east"], bbox["west"], "max", "topo-mask", "esriascii")
    text, _ = cached_get(url, cache_path(ctx["raw"], tile_id, "mask", url, "asc"),
                         ctx["throttle"], ctx["timeout"], ctx["retries"], _is_esri,
                         ctx.get("http_get"), ctx["sleep"])
    grid = parse_esri_ascii(text.splitlines())
    nd = grid.nodata_value
    valid = sum(1 for v in grid.values if v == v and v != nd)
    return valid / float(len(grid.values))


def tile_rows(out_root, ids, landmarks, coverage_ctx=None):
    rows = []
    for tid in ids:
        tile_dir = os.path.join(out_root, tid)
        meta_path = os.path.join(tile_dir, "meta.json")
        lm = landmarks.get(tid, {})
        if not os.path.isfile(meta_path):
            rows.append({"id": tid, "missing": True})
            continue
        with open(meta_path) as fh:
            meta = json.load(fh)
        heights = read_heights(tile_dir, meta)
        check, point = depth_check(meta, heights, lm)
        gz = os.path.join(tile_dir, "heightmap.bin.gz")
        cov = None
        if coverage_ctx is not None and lm.get("lat") is not None:
            try:
                cov = multibeam_fraction(tid, lm, coverage_ctx)
            except (FetchError, EsriAsciiError) as exc:
                print("  [coverage] %s: %s" % (tid, exc))
        rows.append({
            "id": tid,
            "missing": False,
            "meta": meta,
            "bytes": os.path.getsize(os.path.join(tile_dir, "heightmap.bin")),
            "gz_bytes": os.path.getsize(gz) if os.path.isfile(gz) else None,
            "published": lm.get("depth_m"),
            "point": point,
            "check": check,
            "coverage": cov,
        })
    return rows


def print_table(rows):
    hdr = "%-22s %11s %13s %19s %9s %9s %8s %9s  %s" % (
        "id", "cols x rows", "cell m (x/y)", "depth range m", "MB f32", "MB gz",
        "pub m", "at site", "depth check")
    print(hdr)
    print("-" * len(hdr))
    total = total_gz = 0
    for r in rows:
        if r["missing"]:
            print("%-22s %s" % (r["id"], "-- no tile --"))
            continue
        m = r["meta"]
        total += r["bytes"]
        total_gz += r["gz_bytes"] or 0
        print("%-22s %11s %13s %19s %9.2f %9s %8s %9s  %s" % (
            r["id"], "%dx%d" % (m["cols"], m["rows"]),
            "%.0f/%.0f" % (m["cellsize_m_x"], m["cellsize_m_y"]),
            "%.0f..%.0f" % (m["min_m"], m["max_m"]),
            r["bytes"] / 1e6,
            "%.2f" % (r["gz_bytes"] / 1e6) if r["gz_bytes"] else "-",
            "-%s" % r["published"] if r["published"] is not None else "-",
            "%.0f" % r["point"] if r["point"] is not None else "-",
            r["check"] + ("; multibeam at site %.0f%%" % (100 * r["coverage"])
                          if r.get("coverage") is not None else "")))
    print("-" * len(hdr))
    print("%-22s %11s %13s %19s %9.2f %9s" % ("TOTAL", "", "", "", total / 1e6,
                                             "%.2f" % (total_gz / 1e6) if total_gz else "-"))


def print_plan(ids, landmarks, raw_dir, probe_ctx=None):
    for tid in ids:
        ov = OVERRIDES.get(tid, {})
        bbox, note = plan_bbox(landmarks[tid], ov)
        cols, rows, nbytes = estimate_grid(bbox)
        ew, ns = bbox_extent_km(bbox)
        res = ov.get("resolution", "max")
        gurl = gmrt_grid_url(bbox, res)
        cached = os.path.isfile(cache_path(raw_dir, tid, "gmrt-" + res, gurl, "asc"))
        print("[%s] %s" % (tid, note))
        print("  bbox   N %.4f S %.4f E %.4f W %.4f  (%.1f x %.1f km)"
              % (bbox["north"], bbox["south"], bbox["east"], bbox["west"], ew, ns))
        print("  est    %dx%d cells @ native %.0f m -> %.2f MB float32%s"
              % (cols, rows, NATIVE_CELL_DEG * METERS_PER_DEG_LAT, nbytes / 1e6,
                 "" if fits_budget(cols, rows) else "  [over budget: coarser rung]"))
        print("  meta   %s" % gmrt_metadata_url(bbox, res))
        print("  grid   %s%s" % (gurl, "  [cached]" if cached else ""))
        if probe_ctx is not None:
            try:
                text, _ = cached_get(
                    gmrt_metadata_url(bbox, res),
                    cache_path(raw_dir, tid, "meta-" + res, gmrt_metadata_url(bbox, res), "json"),
                    probe_ctx["throttle"], 60, probe_ctx["retries"], _is_json)
                md = json.loads(text)
                est = estimate_from_metadata(md)
                if est:
                    print("  probe  %dx%d cells, %.2f MB, %s m/node"
                          % (est[0], est[1], est[2] / 1e6, md.get("meters_per_node")))
            except FetchError as exc:
                print("  probe  failed: %s" % exc)


# --------------------------------------------------------------------------


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", action="append", metavar="ID",
                    help="restrict to this landmark id (repeatable, or comma-separated)")
    ap.add_argument("--skip-existing", action="store_true",
                    help="skip ids that already have data/tiles/<id>/meta.json")
    ap.add_argument("--dry-run", action="store_true",
                    help="print planned bboxes, requests and size estimates; no downloads")
    ap.add_argument("--probe", action="store_true",
                    help="with --dry-run: also query GMRT's metadata endpoint (cached)")
    ap.add_argument("--report", action="store_true",
                    help="print the size / depth-check table for existing tiles and exit")
    ap.add_argument("--coverage", action="store_true",
                    help="with --report: fetch GMRT topo-mask around each pin (cached) and "
                         "report the share of real multibeam vs GEBCO fill")
    ap.add_argument("--landmarks", default="data/landmarks.json")
    ap.add_argument("--out", default="data/tiles")
    ap.add_argument("--raw", default=".cache/gmrt-raw",
                    help="raw download cache (gitignored; kept outside data/ so vite build does not copy it)")
    ap.add_argument("--sleep", type=float, default=DEFAULT_SLEEP_S,
                    help="seconds between requests (floor %.0f)" % MIN_SLEEP_S)
    ap.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    ap.add_argument("--timeout", type=int, default=300)
    ap.add_argument("--no-fallback", action="store_true",
                    help="do not try ETOPO when GMRT fails")
    args = ap.parse_args(argv)

    landmarks = load_landmarks(args.landmarks)
    ids = list(TIER2)
    if args.only:
        wanted = [s.strip() for chunk in args.only for s in chunk.split(",") if s.strip()]
        unknown = [w for w in wanted if w not in TIER2]
        if unknown:
            ap.error("not in the Tier-2 list: %s" % ", ".join(unknown))
        ids = [i for i in ids if i in wanted]
    missing_lm = [i for i in ids if i not in landmarks]
    if missing_lm:
        raise SystemExit("landmark ids missing from %s: %s"
                         % (args.landmarks, ", ".join(missing_lm)))

    throttle = Throttle(args.sleep)
    if args.report:
        cov_ctx = None
        if args.coverage:
            cov_ctx = {"raw": args.raw, "throttle": throttle, "retries": args.retries,
                       "timeout": args.timeout, "sleep": time.sleep}
        print_table(tile_rows(args.out, ids, landmarks, cov_ctx))
        return 0

    if args.dry_run:
        print_plan(ids, landmarks, args.raw,
                   {"throttle": throttle, "retries": args.retries} if args.probe else None)
        return 0

    ctx = {"out": args.out, "raw": args.raw, "throttle": throttle, "retries": args.retries,
           "timeout": args.timeout, "sleep": time.sleep, "fallback": not args.no_fallback}
    failures = {}
    for tid in ids:
        if args.skip_existing and os.path.isfile(os.path.join(args.out, tid, "meta.json")):
            print("[%s] exists, skipping" % tid)
            continue
        try:
            fetch_one(tid, landmarks[tid], ctx)
        except (FetchError, EsriAsciiError, SystemExit) as exc:
            print("[%s] FAILED: %s" % (tid, exc))
            failures[tid] = str(exc)

    update_index(args.out)
    print()
    print("HTTP requests made: %d" % throttle.requests)
    print_table(tile_rows(args.out, ids, landmarks))
    if failures:
        print()
        for tid, why in failures.items():
            print("FAILED %s: %s" % (tid, why))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
