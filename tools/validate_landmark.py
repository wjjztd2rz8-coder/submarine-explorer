#!/usr/bin/env python3
"""Validate a landmark content folder, data/landmarks/<id>/ (Phase B §2, Phase C §2-3).

    python3 tools/validate_landmark.py lost-city
    python3 tools/validate_landmark.py titanic challenger-deep --strict
    python3 tools/validate_landmark.py --all

Checks:
  * every *.json in the folder parses; mission.json, pois.json and guide.json exist
  * pois.json: required keys and types, unique ids, `kind`, `confidence`,
    `reconstruction`, positive `depth_m` or `snap_to_seabed`, every `guide_entry`
    exists in guide.json, lat/lon inside the tile bbox, and (when not snapping)
    `depth_m` within --depth-tolerance (60 m) of the terrain at that point
  * guide.json: an `overview` entry, titles/paragraphs/facts/sources shapes
  * mission.json: tile exists, spawn inside the bbox and above the seabed,
    briefing summary/facts/hazards, >= 2 primary objectives that reference
    existing POIs and have nonblank hints and substantive guide entries,
    `hull_class` A/B/C (read from
    src/core/Config.ts) whose crush depth clears the deepest POI, and
    `environment.preset` from the Phase C list
  * props.json: tools/validate_props.py rules plus `reconstruction: true`
  * species.json: the Phase C §3 shape

Terrain is read from data/tiles/<tile>/heightmap.bin (Float32 LE, row-major,
row 0 = north, col 0 = west; docs/tile-format.md) and sampled bilinearly.

Exit status: 0 = valid (warnings allowed unless --strict), 1 = errors,
2 = usage problem (unknown landmark folder). Python 3.9, standard library only.
"""

import argparse
import json
import math
import os
import re
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import validate_props  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

POI_KINDS = ("wreck", "debris", "vent", "geology", "biology", "artifact", "memorial", "other")
CONFIDENCE = ("high", "medium", "low")
PRESETS = ("vent", "brine", "canyon", "reef", "trench", "wreck", "seamount", "default")
OBJECTIVE_TYPES = ("scan",)
COMPLETIONS = ("all_primary",)
# Fallback when src/core/Config.ts cannot be read (values are crush depths, m, negative).
DEFAULT_HULLS = {"A": -1000, "B": -4500, "C": -11000}
DEFAULT_CRUSH_WARN_RATIO = 0.9
DEFAULT_DEPTH_TOLERANCE_M = 60.0
REQUIRED_FILES = ("mission.json", "pois.json", "guide.json")


def _is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def _nonempty_str(v):
    return isinstance(v, str) and v.strip() != ""


# --------------------------------------------------------------------------- tile / terrain


class Tile:
    """A tile's meta.json plus lazily-loaded heightmap with bilinear sampling."""

    def __init__(self, tile_dir):
        with open(os.path.join(tile_dir, "meta.json"), "r", encoding="utf-8") as f:
            self.meta = json.load(f)
        self.bbox = self.meta["bbox"]
        self.cols = int(self.meta["cols"])
        self.rows = int(self.meta["rows"])
        self._path = os.path.join(tile_dir, "heightmap.bin")
        self._h = None

    def inside(self, lat, lon):
        b = self.bbox
        return b["south"] <= lat <= b["north"] and b["west"] <= lon <= b["east"]

    def heights(self):
        if self._h is None:
            with open(self._path, "rb") as f:
                raw = f.read()
            n = self.cols * self.rows
            if len(raw) != n * 4:
                raise ValueError("heightmap.bin is %d bytes, expected %d" % (len(raw), n * 4))
            self._h = struct.unpack("<%df" % n, raw)
        return self._h

    def elevation(self, lat, lon):
        """Elevation (m, negative below sea level) at lat/lon, bilinear between cell centres."""
        b = self.bbox
        fx = (lon - b["west"]) / (b["east"] - b["west"]) * self.cols - 0.5
        fy = (b["north"] - lat) / (b["north"] - b["south"]) * self.rows - 0.5
        fx = min(max(fx, 0.0), self.cols - 1.0)
        fy = min(max(fy, 0.0), self.rows - 1.0)
        x0, y0 = int(math.floor(fx)), int(math.floor(fy))
        x1, y1 = min(x0 + 1, self.cols - 1), min(y0 + 1, self.rows - 1)
        tx, ty = fx - x0, fy - y0
        h = self.heights()
        c = self.cols
        top = h[y0 * c + x0] * (1 - tx) + h[y0 * c + x1] * tx
        bot = h[y1 * c + x0] * (1 - tx) + h[y1 * c + x1] * tx
        return top * (1 - ty) + bot * ty

    def seabed_depth(self, lat, lon):
        return -self.elevation(lat, lon)


def read_config_source(repo=REPO):
    """Text of src/core/Config.ts plus the per-domain src/core/config/*.ts files
    (F0-CORE split Config.ts by domain). Raises OSError when none can be read."""
    paths = [os.path.join(repo, "src", "core", "Config.ts")]
    config_dir = os.path.join(repo, "src", "core", "config")
    if os.path.isdir(config_dir):
        paths += sorted(os.path.join(config_dir, n) for n in os.listdir(config_dir)
                        if n.endswith(".ts"))
    parts = []
    for path in paths:
        try:
            with open(path, "r", encoding="utf-8") as f:
                parts.append(f.read())
        except OSError:
            continue
    if not parts:
        raise OSError("no config source under %s" % os.path.join(repo, "src", "core"))
    return "\n".join(parts)


def load_hull_classes(repo=REPO):
    """{class: crushDepth (negative m)} parsed from the config source, else DEFAULT_HULLS."""
    try:
        text = read_config_source(repo)
    except OSError:
        return dict(DEFAULT_HULLS)
    m = re.search(r"hullClasses:\s*\{(.*?)\n\s*\},", text, re.S)
    found = {}
    if m:
        for key, depth in re.findall(r"\b([A-Z])\s*:\s*\{[^}]*?crushDepth:\s*(-?\d+(?:\.\d+)?)",
                                     m.group(1)):
            found[key] = float(depth)
    return found or dict(DEFAULT_HULLS)


def load_hull_ratings(repo=REPO):
    """{class: ratedDepth (negative m)} when the runtime defines separate ratings."""
    try:
        text = read_config_source(repo)
    except OSError:
        return {}
    m = re.search(r"hullClasses:\s*\{(.*?)\n\s*\},", text, re.S)
    if not m:
        return {}
    return {key: float(depth) for key, depth in re.findall(
        r"\b([A-Z])\s*:\s*\{[^}]*?ratedDepth:\s*(-?\d+(?:\.\d+)?)", m.group(1))}


def load_crush_warn_ratio(repo=REPO):
    """Read the runtime submarine pressure-warning threshold from the config source."""
    try:
        source = read_config_source(repo)
    except OSError:
        return DEFAULT_CRUSH_WARN_RATIO
    match = re.search(r"\bcrushWarnRatio:\s*(\d+(?:\.\d+)?)", source)
    return float(match.group(1)) if match else DEFAULT_CRUSH_WARN_RATIO


# --------------------------------------------------------------------------- report


class Report:
    def __init__(self, landmark):
        self.landmark = landmark
        self.errors = []
        self.warnings = []
        self.notes = []

    def err(self, where, msg):
        self.errors.append("%s: %s" % (where, msg))

    def warn(self, where, msg):
        self.warnings.append("%s: %s" % (where, msg))

    def note(self, where, msg):
        self.notes.append("%s: %s" % (where, msg))


def _load_json(path, report, name):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except ValueError as e:
        report.err(name, "does not parse as JSON (%s)" % e)
    except OSError as e:
        report.err(name, "cannot be read (%s)" % e)
    return None


def _check_header(doc, report, name, landmark):
    if not isinstance(doc, dict):
        report.err(name, "top level must be an object")
        return False
    if doc.get("version") != 1:
        report.err(name, '"version" must be 1 (got %r)' % (doc.get("version"),))
    if doc.get("landmark") != landmark:
        report.err(name, '"landmark" must be "%s" (got %r)' % (landmark, doc.get("landmark")))
    return True


def _check_sources_list(sources, report, where, minimum, as_objects):
    if not isinstance(sources, list) or not sources:
        report.err(where, '"sources" must be a non-empty list')
        return
    for i, s in enumerate(sources):
        url = s.get("url") if as_objects and isinstance(s, dict) else s
        if as_objects and not (isinstance(s, dict) and _nonempty_str(s.get("title"))):
            report.err(where, "sources[%d] needs a title and url" % i)
            continue
        if not (_nonempty_str(url) and re.match(r"^https?://", url)):
            report.err(where, "sources[%d] is not an http(s) URL: %r" % (i, url))
    if len(sources) < minimum:
        report.warn(where, "only %d source(s); aim for >= %d" % (len(sources), minimum))


# --------------------------------------------------------------------------- guide


def check_guide(doc, report, landmark):
    ids = set()
    if not _check_header(doc, report, "guide.json", landmark):
        return ids
    if "memorial_note" in doc and not _nonempty_str(doc["memorial_note"]):
        report.err("guide.json", '"memorial_note" must be a non-empty string when present')
    entries = doc.get("entries")
    if not isinstance(entries, list) or not entries:
        report.err("guide.json", '"entries" must be a non-empty list')
        return ids
    for i, e in enumerate(entries):
        where = "guide.json entries[%d]" % i
        if not isinstance(e, dict):
            report.err(where, "not an object")
            continue
        eid = e.get("id")
        if not _nonempty_str(eid):
            report.err(where, 'missing "id"')
            continue
        where = 'guide.json entry "%s"' % eid
        if eid in ids:
            report.err(where, "duplicate id")
        ids.add(eid)
        if not _nonempty_str(e.get("title")):
            report.err(where, 'missing "title"')
        paras = e.get("paragraphs")
        if not (isinstance(paras, list) and paras and all(_nonempty_str(p) for p in paras)):
            report.err(where, '"paragraphs" must be a non-empty list of strings')
        elif len(paras) < 2:
            report.warn(where, "only %d paragraph(s); aim for 2-4" % len(paras))
        facts = e.get("facts", [])
        if not isinstance(facts, list) or not all(
                isinstance(f, dict) and _nonempty_str(f.get("label")) and _nonempty_str(f.get("value"))
                for f in facts):
            report.err(where, '"facts" must be a list of {label, value} strings')
        if "image" in e:
            img = e["image"]
            if not (isinstance(img, dict) and _nonempty_str(img.get("url"))
                    and _nonempty_str(img.get("credit")) and _nonempty_str(img.get("license"))):
                report.err(where, '"image" needs url, credit and license')
        if "reconstruction" in e and not isinstance(e["reconstruction"], bool):
            report.err(where, '"reconstruction" must be a boolean')
        if e.get("confidence") not in CONFIDENCE:
            report.err(where, '"confidence" must be one of %s' % "|".join(CONFIDENCE))
        _check_sources_list(e.get("sources"), report, where, 2, as_objects=True)
    if "overview" not in ids:
        report.err("guide.json", 'no "overview" entry')
    return ids


# --------------------------------------------------------------------------- pois


def check_pois(doc, report, landmark, guide_ids, tile, tolerance):
    """Returns {poi_id: resolved depth (m) or None}."""
    pois = {}
    if not _check_header(doc, report, "pois.json", landmark):
        return pois
    items = doc.get("pois")
    if not isinstance(items, list) or not items:
        report.err("pois.json", '"pois" must be a non-empty list')
        return pois
    for i, p in enumerate(items):
        where = "pois.json pois[%d]" % i
        if not isinstance(p, dict):
            report.err(where, "not an object")
            continue
        pid = p.get("id")
        if not _nonempty_str(pid):
            report.err(where, 'missing "id"')
            continue
        where = 'poi "%s"' % pid
        if pid in pois:
            report.err(where, "duplicate id")
            continue
        pois[pid] = None
        if not _nonempty_str(p.get("name")):
            report.err(where, 'missing "name"')
        lat, lon = p.get("lat"), p.get("lon")
        coords_ok = _is_num(lat) and _is_num(lon)
        if not coords_ok:
            report.err(where, '"lat"/"lon" must be numbers')
        elif tile is not None and not tile.inside(lat, lon):
            report.err(where, "%.5f, %.5f is outside the tile bbox" % (lat, lon))
            coords_ok = False
        r = p.get("radius_m")
        if not (_is_num(r) and r > 0):
            report.err(where, '"radius_m" must be a positive number')
        if p.get("kind") not in POI_KINDS:
            report.err(where, '"kind" must be one of %s (got %r)' % ("|".join(POI_KINDS), p.get("kind")))
        if "primary" in p and not isinstance(p["primary"], bool):
            report.err(where, '"primary" must be a boolean')
        if "scan_seconds" in p and not (_is_num(p["scan_seconds"]) and p["scan_seconds"] > 0):
            report.err(where, '"scan_seconds" must be a positive number')
        if p.get("confidence") not in CONFIDENCE:
            report.err(where, '"confidence" must be one of %s' % "|".join(CONFIDENCE))
        if not isinstance(p.get("reconstruction"), bool):
            report.err(where, '"reconstruction" must be a boolean')
        ge = p.get("guide_entry")
        if ge is None:
            report.warn(where, 'no "guide_entry"')
        elif ge not in guide_ids:
            report.err(where, 'guide_entry "%s" does not exist in guide.json' % ge)
        _check_sources_list(p.get("sources"), report, where, 1, as_objects=False)

        snap = p.get("snap_to_seabed") is True
        depth = p.get("depth_m")
        if depth is not None and not (_is_num(depth) and depth > 0):
            report.err(where, '"depth_m" must be a positive depth magnitude (got %r)' % (depth,))
            continue
        if depth is None and not snap:
            report.err(where, 'needs "depth_m" or "snap_to_seabed": true')
            continue
        seabed = None
        if tile is not None and coords_ok:
            try:
                seabed = tile.seabed_depth(lat, lon)
            except (OSError, ValueError) as e:
                report.err("tile", "cannot sample heightmap (%s)" % e)
                tile = None
        if snap:
            if depth is not None:
                report.warn(where, 'both "depth_m" and "snap_to_seabed"; snapping wins')
            pois[pid] = seabed
        else:
            pois[pid] = depth
            if seabed is not None:
                if seabed <= 0:
                    report.err(where, "terrain at this point is above sea level (%.0f m)" % -seabed)
                elif abs(depth - seabed) > tolerance:
                    report.err(where, "depth_m %.0f is %.0f m from the terrain (%.0f m); tolerance %.0f m"
                               % (depth, abs(depth - seabed), seabed, tolerance))
    return pois


# --------------------------------------------------------------------------- mission


def check_mission(doc, report, landmark, poi_depths, tile, hulls, folder, tiles_root,
                  crush_warn_ratio=DEFAULT_CRUSH_WARN_RATIO, poi_doc=None, ratings=None):
    if not _check_header(doc, report, "mission.json", landmark):
        return
    tile_id = doc.get("tile", landmark)
    if not _nonempty_str(tile_id):
        report.err("mission.json", '"tile" must be a string')
    elif tile is None and not os.path.isfile(os.path.join(tiles_root, tile_id, "meta.json")):
        report.err("mission.json", 'tile "%s" not found under data/tiles/' % tile_id)
    if not _nonempty_str(doc.get("title")):
        report.err("mission.json", 'missing "title"')

    review = doc.get("pressure_band_review")
    hull = doc.get("hull_class")
    if hull not in hulls:
        report.err("mission.json", '"hull_class" must be one of %s (got %r)'
                   % ("|".join(sorted(hulls)), hull))
    else:
        crush = abs(hulls[hull])
        warning_start = abs(ratings[hull]) if ratings and hull in ratings else crush_warn_ratio * crush
        known = [(d, pid) for pid, d in poi_depths.items() if d is not None]
        if known:
            deepest, pid = max(known)
            if deepest >= crush:
                report.err("mission.json", 'hull_class %s (crush %.0f m) does not clear the deepest POI '
                           '"%s" at %.0f m' % (hull, crush, pid, deepest))
            elif deepest > warning_start:
                band_message = ('deepest POI "%s" (%.0f m) is inside the crush-warning band '
                                'of hull %s (%.0f m)' % (pid, deepest, hull, crush))
                # An explicit review only acknowledges this exact POI/hull/depth.
                # A changed POI or hull rating brings back the strict warning.
                briefing = doc.get("briefing")
                hazards = briefing.get("hazards", []) if isinstance(briefing, dict) else []
                valid_review = (
                    isinstance(review, dict)
                    and review.get("poi") == pid
                    and review.get("hull_class") == hull
                    and _is_num(review.get("poi_depth_m"))
                    and abs(review["poi_depth_m"] - deepest) <= 0.5
                    and review.get("crush_depth_m") == crush
                    and review.get("warning_start_m") == warning_start
                    and _nonempty_str(review.get("reason"))
                    and isinstance(hazards, list)
                    and any(isinstance(h, str) and all(
                            str(round(n)) in h or format(round(n), ',d') in h for n in
                            (deepest, crush, warning_start)) for h in hazards)
                )
                if valid_review:
                    report.note("mission.json", band_message +
                                "; " + review["reason"])
                else:
                    report.warn("mission.json", band_message)
    if review is not None and not (
        hull in hulls and poi_depths
        and any(d is not None and d > (abs(ratings[hull]) if ratings and hull in ratings
                                      else crush_warn_ratio * abs(hulls[hull]))
                and d < abs(hulls[hull])
                for d in poi_depths.values())
    ):
        report.err("mission.json", '"pressure_band_review" requires a POI inside the hull warning band')

    spawn = doc.get("spawn")
    if not isinstance(spawn, dict):
        report.err("mission.json", '"spawn" must be an object')
    else:
        lat, lon, sd = spawn.get("lat"), spawn.get("lon"), spawn.get("depth_m")
        if not (_is_num(lat) and _is_num(lon)):
            report.err("mission.json spawn", '"lat"/"lon" must be numbers')
        elif tile is not None and not tile.inside(lat, lon):
            report.err("mission.json spawn", "%.5f, %.5f is outside the tile bbox" % (lat, lon))
        elif tile is not None and _is_num(sd):
            seabed = tile.seabed_depth(lat, lon)
            if sd >= seabed:
                report.err("mission.json spawn", "depth_m %.0f is at or below the seabed (%.0f m)"
                           % (sd, seabed))
        if not (_is_num(sd) and sd >= 0):
            report.err("mission.json spawn", '"depth_m" must be a non-negative number')
        if "heading_deg" in spawn and not _is_num(spawn["heading_deg"]):
            report.err("mission.json spawn", '"heading_deg" must be a number')

    start = doc.get("start")
    if start is not None:
        near = start.get("near_site") if isinstance(start, dict) else None
        where = "mission.json start.near_site"
        if not isinstance(near, dict) or not all(
                _is_num(near.get(key)) for key in ("lat", "lon", "depth_m", "heading_deg")):
            report.err(where, 'needs numeric lat, lon, depth_m and heading_deg')
        else:
            lat, lon, depth = near["lat"], near["lon"], near["depth_m"]
            if not (-90 <= lat <= 90 and -180 <= lon <= 180 and depth > 0):
                report.err(where, "coordinates or depth_m out of range")
            elif tile is not None and not tile.inside(lat, lon):
                report.err(where, "coordinates are outside the tile bbox")
            elif tile is not None and depth > tile.seabed_depth(lat, lon) - 28:
                report.err(where, "depth_m does not clear the seabed by 28 m")
            if hull in hulls and depth > abs(hulls[hull]) - 8:
                report.err(where, "depth_m exceeds the hull depth rating")
            primary = next((o.get("poi") for o in doc.get("objectives", [])
                            if isinstance(o, dict) and o.get("primary") is True), None)
            entries = poi_doc.get("pois", []) if isinstance(poi_doc, dict) else []
            poi = next((p for p in entries if isinstance(p, dict) and p.get("id") == primary), None)
            if poi and _is_num(poi.get("lat")) and _is_num(poi.get("lon")):
                dx = (lon - poi["lon"]) * 111320 * math.cos(math.radians(lat))
                dz = (lat - poi["lat"]) * 111320
                if math.hypot(dx, dz) > 200:
                    report.err(where, "coordinates are more than 200 m from first primary POI")
                if math.hypot(dx, dz) > 1:
                    toward = math.degrees(math.atan2(-dx, -dz)) % 360
                    turn = (near["heading_deg"] - toward + 180) % 360 - 180
                    if abs(turn) > 30:
                        report.err(where, "heading_deg must face the first primary POI (within 30 degrees)")
                target_depth = poi_depths.get(primary)
                if target_depth is not None and max(math.hypot(dx, dz) / 12,
                                                    abs(depth - target_depth) / 8) > 60:
                    report.err(where, "first primary POI exceeds the 60 s Arcade approach budget")

    b = doc.get("briefing")
    if not isinstance(b, dict):
        report.err("mission.json", '"briefing" must be an object')
    else:
        if not _nonempty_str(b.get("summary")):
            report.err("mission.json briefing", 'missing "summary"')
        for key in ("facts", "hazards"):
            v = b.get(key)
            if not (isinstance(v, list) and v and all(_nonempty_str(x) for x in v)):
                report.err("mission.json briefing", '"%s" must be a non-empty list of strings' % key)
        if "depth_m" in b and not (_is_num(b["depth_m"]) and b["depth_m"] > 0):
            report.err("mission.json briefing", '"depth_m" must be a positive number')

    objs = doc.get("objectives")
    if not isinstance(objs, list) or not objs:
        report.err("mission.json", '"objectives" must be a non-empty list')
    else:
        seen, primary, secondary = set(), 0, 0
        for i, o in enumerate(objs):
            where = "mission.json objectives[%d]" % i
            if not isinstance(o, dict) or not _nonempty_str(o.get("id")):
                report.err(where, 'needs an object with an "id"')
                continue
            if o["id"] in seen:
                report.err(where, 'duplicate id "%s"' % o["id"])
            seen.add(o["id"])
            if o.get("type", "scan") not in OBJECTIVE_TYPES:
                report.err(where, '"type" must be one of %s' % "|".join(OBJECTIVE_TYPES))
            if o.get("poi") not in poi_depths:
                report.err(where, 'poi "%s" does not exist in pois.json' % (o.get("poi"),))
            if not _nonempty_str(o.get("title")):
                report.err(where, 'missing "title"')
            if not _nonempty_str(o.get("hint")):
                report.err(where, '"hint" must be a nonblank string')
            if o.get("primary") is True:
                primary += 1
            else:
                secondary += 1
        if primary < 2:
            report.err("mission.json", "needs >= 2 primary objectives")
    if "completion" in doc and doc["completion"] not in COMPLETIONS:
        report.err("mission.json", '"completion" must be one of %s' % "|".join(COMPLETIONS))

    env = doc.get("environment")
    if env is None:
        report.warn("mission.json", 'no "environment"; the type-based default preset applies')
    elif not isinstance(env, dict):
        report.err("mission.json", '"environment" must be an object')
    else:
        if env.get("preset") not in PRESETS:
            report.err("mission.json environment", '"preset" must be one of %s (got %r)'
                       % ("|".join(PRESETS), env.get("preset")))
        if "overrides" in env and not isinstance(env["overrides"], dict):
            report.err("mission.json environment", '"overrides" must be an object')
    sf = doc.get("species_file")
    if sf is not None:
        if not _nonempty_str(sf) or "/" in sf or ".." in sf:
            report.err("mission.json", '"species_file" must be a file name in the landmark folder')
        elif not os.path.isfile(os.path.join(folder, sf)):
            report.err("mission.json", 'species_file "%s" not found' % sf)


# --------------------------------------------------------------------------- props / species


def check_props(doc, report, landmark, tile):
    if isinstance(doc, dict):
        _check_header(doc, report, "props.json", landmark)
    bbox = tile.bbox if tile is not None else None
    tile_id = tile.meta.get("id") if tile is not None else None
    attribution = None
    attr = os.path.join(REPO, "ATTRIBUTION.md")
    if os.path.isfile(attr):
        with open(attr, "r", encoding="utf-8") as f:
            attribution = f.read()
    errors, warnings, _ = validate_props.validate_doc(
        doc, bbox=bbox, tile_id=tile_id, public_dir=os.path.join(REPO, "public"),
        max_bytes=int(validate_props.DEFAULT_MAX_MODEL_MB * 1048576), attribution_text=attribution)
    for e in errors:
        report.err("props.json", e)
    for w in warnings:
        report.warn("props.json", w)
    entries = doc.get("props") if isinstance(doc, dict) else doc
    if isinstance(entries, list):
        for i, p in enumerate(entries):
            if isinstance(p, dict) and p.get("reconstruction") is not True:
                report.err("props.json", 'props[%d] "%s": placed props must be "reconstruction": true'
                           % (i, p.get("id")))


def check_species(doc, report, landmark):
    if not _check_header(doc, report, "species.json", landmark):
        return
    for key in ("source", "source_url", "fetched_at", "note"):
        if not _nonempty_str(doc.get(key)):
            report.err("species.json", 'missing "%s"' % key)
    bbox = doc.get("bbox")
    if not (isinstance(bbox, dict) and all(_is_num(bbox.get(k)) for k in ("north", "south", "east", "west"))):
        report.err("species.json", '"bbox" must have numeric north/south/east/west')
    if "depth_filter_m" in doc:
        df = doc["depth_filter_m"]
        if not (isinstance(df, list) and len(df) == 2 and all(v is None or _is_num(v) for v in df)):
            report.err("species.json", '"depth_filter_m" must be [min, max]')
    sp = doc.get("species")
    if not isinstance(sp, list):
        report.err("species.json", '"species" must be a list (empty is allowed)')
        return
    if not sp:
        report.warn("species.json", "species list is empty; say why in the note")
    names = set()
    for i, s in enumerate(sp):
        where = "species.json species[%d]" % i
        if not isinstance(s, dict) or not _nonempty_str(s.get("scientificName")):
            report.err(where, 'needs "scientificName"')
            continue
        if s["scientificName"] in names:
            report.err(where, 'duplicate "%s"' % s["scientificName"])
        names.add(s["scientificName"])
        if not (isinstance(s.get("records"), int) and not isinstance(s.get("records"), bool)
                and s["records"] >= 0):
            report.err(where, '"records" must be a non-negative integer')
        if "aphiaID" in s and not (isinstance(s["aphiaID"], int) and not isinstance(s["aphiaID"], bool)):
            report.err(where, '"aphiaID" must be an integer')
        if "depthRange_m" in s:
            d = s["depthRange_m"]
            if not (isinstance(d, list) and len(d) == 2 and all(_is_num(v) and v >= 0 for v in d)
                    and d[0] <= d[1]):
                report.err(where, '"depthRange_m" must be [min, max] positive depths')
        for key in ("commonName", "group"):
            if key in s and not _nonempty_str(s[key]):
                report.err(where, '"%s" must be a non-empty string when present' % key)


# --------------------------------------------------------------------------- driver


def validate_landmark(landmark, repo=REPO, tolerance=DEFAULT_DEPTH_TOLERANCE_M, hulls=None):
    """Validate data/landmarks/<landmark>/ under `repo`. Returns a Report."""
    report = Report(landmark)
    folder = os.path.join(repo, "data", "landmarks", landmark)
    tiles_root = os.path.join(repo, "data", "tiles")
    if not os.path.isdir(folder):
        report.err(folder, "folder not found")
        return report
    hulls = hulls if hulls is not None else load_hull_classes(repo)

    docs = {}
    for name in sorted(os.listdir(folder)):
        if name.endswith(".json"):
            docs[name] = _load_json(os.path.join(folder, name), report, name)
    for name in REQUIRED_FILES:
        if name not in docs:
            report.err(name, "missing")
    if "species.json" not in docs:
        report.warn("species.json", "missing (every Phase C pack should ship one)")
    if not os.path.isfile(os.path.join(folder, "sources.md")):
        report.warn("sources.md", "missing")

    mission = docs.get("mission.json")
    tile_id = mission.get("tile", landmark) if isinstance(mission, dict) else landmark
    tile = None
    if _nonempty_str(tile_id):
        tdir = os.path.join(tiles_root, tile_id)
        try:
            tile = Tile(tdir)
        except (OSError, ValueError, KeyError) as e:
            report.err("tile", 'cannot read data/tiles/%s/meta.json (%s)' % (tile_id, e))

    guide_ids = set()
    if docs.get("guide.json") is not None:
        guide_ids = check_guide(docs["guide.json"], report, landmark)
    poi_depths = {}
    if docs.get("pois.json") is not None:
        poi_depths = check_pois(docs["pois.json"], report, landmark, guide_ids, tile, tolerance)
    if mission is not None:
        check_mission(mission, report, landmark, poi_depths, tile, hulls, folder, tiles_root,
                      load_crush_warn_ratio(repo), docs.get("pois.json"), load_hull_ratings(repo))
        pois_doc, guide_doc = docs.get("pois.json"), docs.get("guide.json")
        if isinstance(mission, dict) and isinstance(pois_doc, dict) and isinstance(guide_doc, dict):
            poi_items = pois_doc.get("pois")
            guide_items = guide_doc.get("entries")
            poi_by_id = {p["id"]: p for p in poi_items if isinstance(p, dict) and
                         isinstance(p.get("id"), str)} if isinstance(poi_items, list) else {}
            guide_by_id = {e["id"]: e for e in guide_items if isinstance(e, dict) and
                           isinstance(e.get("id"), str)} if isinstance(guide_items, list) else {}
            objectives = mission.get("objectives")
            for obj in objectives if isinstance(objectives, list) else []:
                if not isinstance(obj, dict):
                    continue
                poi_id = obj.get("poi")
                poi = poi_by_id.get(poi_id) if isinstance(poi_id, str) else None
                guide_id = poi.get("guide_entry") if poi else None
                entry = guide_by_id.get(guide_id) if isinstance(guide_id, str) else None
                where = 'objective "%s"' % obj.get("id")
                if not entry:
                    report.err(where, "needs a POI with a guide entry")
                    continue
                paragraphs = entry.get("paragraphs")
                length = len(" ".join(paragraphs)) if isinstance(paragraphs, list) and all(
                    isinstance(p, str) for p in paragraphs) else 0
                if length < 250 or not entry.get("facts"):
                    report.err(where, "guide entry needs >= 250 characters of explanation and a specific fact")
    if docs.get("props.json") is not None:
        check_props(docs["props.json"], report, landmark, tile)
    if docs.get("species.json") is not None:
        check_species(docs["species.json"], report, landmark)
    return report


def list_landmarks(repo=REPO):
    root = os.path.join(repo, "data", "landmarks")
    return sorted(d for d in os.listdir(root)
                  if os.path.isdir(os.path.join(root, d)) and not d.startswith("_")
                  and os.path.isfile(os.path.join(root, d, "mission.json")))


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Validate data/landmarks/<id>/ content (pois, guide, mission, props, species) "
                    "against the Phase B/C contracts and the tile's terrain.")
    ap.add_argument("landmarks", nargs="*", metavar="id", help="landmark id(s)")
    ap.add_argument("--all", action="store_true", help="every landmark folder with a mission.json")
    ap.add_argument("--depth-tolerance", type=float, default=DEFAULT_DEPTH_TOLERANCE_M,
                    help="max |depth_m - terrain| for non-snapping POIs (default %.0f m)"
                         % DEFAULT_DEPTH_TOLERANCE_M)
    ap.add_argument("--strict", action="store_true", help="treat warnings as errors")
    ap.add_argument("--quiet", action="store_true", help="only print errors and the summary")
    args = ap.parse_args(argv)
    ids = list(args.landmarks)
    if args.all:
        ids += [i for i in list_landmarks() if i not in ids]
    if not ids:
        ap.print_usage(sys.stderr)
        print("error: give at least one landmark id, or --all", file=sys.stderr)
        return 2
    failed = False
    for lid in ids:
        if not os.path.isdir(os.path.join(REPO, "data", "landmarks", lid)):
            print("error: no folder data/landmarks/%s" % lid, file=sys.stderr)
            return 2
        rep = validate_landmark(lid, tolerance=args.depth_tolerance)
        if not args.quiet:
            for w in rep.warnings:
                print("warning: [%s] %s" % (lid, w))
            for n in rep.notes:
                print("reviewed: [%s] %s" % (lid, n))
        for e in rep.errors:
            print("error: [%s] %s" % (lid, e))
        bad = bool(rep.errors) or (args.strict and bool(rep.warnings))
        failed = failed or bad
        print("%s: %s, %d error(s), %d warning(s)"
              % ("FAILED" if bad else "OK", lid, len(rep.errors), len(rep.warnings)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
