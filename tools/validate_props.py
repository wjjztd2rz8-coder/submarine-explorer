#!/usr/bin/env python3
"""Validate a landmark props.json against the Phase B contract (§2.3).

Mirrors the rules in src/world/PropLoader.ts, so a file that passes here loads
in the game with no skipped entries. Keep the two in step.

    python3 tools/validate_props.py data/landmarks/titanic/props.json --tile titanic
    python3 tools/validate_props.py path/to/props.json --tile data/tiles/titanic/meta.json

With --tile, every prop must also lie inside that tile's bbox. GLB models must
exist under public/, be at most --max-model-mb, and be listed in ATTRIBUTION.md
(a missing attribution is a warning).

Exit status: 0 = valid (warnings allowed, unless --strict), 1 = errors,
2 = the file could not be read or parsed.

Python 3.9, standard library only.
"""

import argparse
import json
import math
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PROCEDURAL_PREFIX = "procedural:"
PROCEDURAL_KINDS = ("hull-block", "debris", "chimney", "geo")
MODEL_URL_PREFIX = "/assets/models/"
COLLISIONS = ("none", "sphere", "box")
HULL_ENDS = ("prow", "cut", "rounded")  # hull-block "ends": [forward, aft]
CHIMNEY_MATERIALS = ("basalt", "carbonate", "sulfide")  # chimney "material_hint"
# "wreck": hand-built wreck ids (src/world/props/wrecks/variants.ts); keep in step.
WRECK_HULLS = ("titanic-bow", "titanic-stern", "bismarck", "endurance")
WRECK_SCATTERS = ("titanic-boilers", "titanic-field", "titanic-stern-field", "bismarck-turrets",
                  "bismarck-field", "bismarck-landslide", "endurance-rigging", "endurance-stern")
# "feature": procedural:geo set pieces (src/world/props/geo/features.ts); keep in step.
GEO_FEATURES = ("smoker-cluster", "carbonate-tower", "coral-mound", "stalactite-cluster",
                "pillow-field", "tuff-cliff", "canyon-ledge", "hadal-scarp")
DEFAULT_MAX_PROPS = 400  # Config.props.maxProps
DEFAULT_MAX_MODEL_MB = 2.0


def _is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def _is_triple(v, allow_zero):
    return (
        isinstance(v, list)
        and len(v) == 3
        and all(_is_num(n) and (n >= 0 if allow_zero else n > 0) for n in v)
    )


def parse_model(model):
    """'procedural:<kind>' -> kind; a model URL -> '' ; invalid -> None."""
    if model.startswith(PROCEDURAL_PREFIX):
        kind = model[len(PROCEDURAL_PREFIX):]
        return kind if kind in PROCEDURAL_KINDS else None
    lower = model.lower()
    if (
        model.startswith(MODEL_URL_PREFIX)
        and ".." not in model
        and (lower.endswith(".glb") or lower.endswith(".gltf"))
    ):
        return ""
    return None


def validate_entry(entry, warnings):
    """Return an error string, or None if the entry is valid. Appends notes to `warnings`."""
    if not isinstance(entry, dict):
        return "entry is not an object"
    pid = entry.get("id")
    if not isinstance(pid, str) or not pid.strip():
        return 'missing or empty "id"'
    where = 'prop "%s"' % pid

    model = entry.get("model")
    if not isinstance(model, str):
        return '%s: missing "model"' % where
    kind = parse_model(model)
    if kind is None:
        return '%s: bad "model" %s (expected procedural:%s or %s<file>.glb)' % (
            where, json.dumps(model), "|".join(PROCEDURAL_KINDS), MODEL_URL_PREFIX)

    lat, lon = entry.get("lat"), entry.get("lon")
    if not _is_num(lat) or not -90 <= lat <= 90:
        return '%s: "lat" must be a number in [-90, 90]' % where
    if not _is_num(lon) or not -180 <= lon <= 180:
        return '%s: "lon" must be a number in [-180, 180]' % where

    snap = entry.get("snap_to_seabed") is True
    depth = entry.get("depth_m")
    if depth is not None:
        if not _is_num(depth):
            return '%s: "depth_m" must be a number' % where
        if depth < 0:
            return ('%s: "depth_m" must be a positive depth magnitude (got %s); world Y is -depth_m'
                    % (where, depth))
    if not snap and depth is None:
        return '%s: needs "depth_m" or "snap_to_seabed": true' % where
    if snap and depth is not None:
        warnings.append('%s: both "depth_m" and "snap_to_seabed"; snapping wins' % where)

    if "y_offset_m" in entry and not _is_num(entry["y_offset_m"]):
        return '%s: "y_offset_m" must be a number' % where
    if "heading_deg" in entry and not _is_num(entry["heading_deg"]):
        return '%s: "heading_deg" must be a number' % where

    if "scale" in entry:
        s = entry["scale"]
        if not ((_is_num(s) and s > 0) or _is_triple(s, False)):
            return '%s: "scale" must be a positive number or [x, y, z]' % where

    dims = entry.get("dimensions_m")
    if dims is not None and not _is_triple(dims, True):
        return '%s: "dimensions_m" must be [length, width, height] of non-negative numbers' % where
    if kind:
        if dims is None:
            warnings.append('%s: no "dimensions_m"; the engine uses its default' % where)
        else:
            needed = 2 if kind == "chimney" else 0
            if not dims[needed] > 0:
                return "%s: dimensions_m[%d] must be > 0 for procedural:%s" % (where, needed, kind)
            if kind == "hull-block" and not (dims[1] > 0 and dims[2] > 0):
                return "%s: hull-block needs all three dimensions_m > 0" % where

    if "ends" in entry:
        ends = entry["ends"]
        if not (isinstance(ends, list) and len(ends) == 2
                and all(isinstance(e, str) and e in HULL_ENDS for e in ends)):
            return '%s: "ends" must be [forward, aft], each one of %s' % (where, " | ".join(HULL_ENDS))
        if kind != "hull-block":
            warnings.append('%s: "ends" only applies to procedural:hull-block; ignored' % where)

    if "wreck" in entry:
        w = entry["wreck"]
        ok = (kind == "hull-block" and w in WRECK_HULLS) or (kind == "debris" and w in WRECK_SCATTERS)
        if not ok:
            warnings.append('%s: "wreck" %r does not match procedural:%s; generic builder used'
                            % (where, w, kind))

    if "feature" in entry:
        if not (kind == "geo" and entry["feature"] in GEO_FEATURES):
            warnings.append('%s: "feature" %r does not match procedural:%s; ignored'
                            % (where, entry["feature"], kind))

    if "material_hint" in entry:
        m = entry["material_hint"]
        if not (isinstance(m, str) and m in CHIMNEY_MATERIALS):
            return '%s: "material_hint" must be one of %s' % (where, " | ".join(CHIMNEY_MATERIALS))
        if kind != "chimney":
            warnings.append('%s: "material_hint" only applies to procedural:chimney; ignored' % where)

    if "lod_distance_m" in entry:
        v = entry["lod_distance_m"]
        if not _is_num(v) or v <= 0:
            return '%s: "lod_distance_m" must be a positive number' % where

    if "collision" in entry and entry["collision"] not in COLLISIONS:
        return '%s: "collision" must be one of %s' % (where, " | ".join(COLLISIONS))

    if entry.get("align_to_slope") is True and not snap:
        warnings.append('%s: "align_to_slope" only applies when snapping' % where)
    return None


def load_tile_bbox(tile):
    """`tile` is a tile id (data/tiles/<id>/meta.json) or a path to a meta.json."""
    path = tile if tile.endswith(".json") else os.path.join(REPO, "data", "tiles", tile, "meta.json")
    with open(path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    return meta["id"], meta["bbox"]


def check_model_file(model, public_dir, max_bytes, attribution_text, errors, warnings, where):
    path = os.path.join(public_dir, model.lstrip("/"))
    if not os.path.isfile(path):
        errors.append("%s: model file %s not found" % (where, path))
        return
    size = os.path.getsize(path)
    if size > max_bytes:
        errors.append("%s: %s is %.2f MB, over the %.2f MB limit"
                      % (where, model, size / 1048576.0, max_bytes / 1048576.0))
    if attribution_text is not None and os.path.basename(model) not in attribution_text:
        warnings.append("%s: %s has no row in ATTRIBUTION.md" % (where, os.path.basename(model)))


def validate_doc(doc, bbox=None, tile_id=None, public_dir=None, max_bytes=None,
                 attribution_text=None, max_props=DEFAULT_MAX_PROPS):
    """Validate a parsed props.json. Returns (errors, warnings, valid_count)."""
    errors, warnings = [], []
    if isinstance(doc, list):
        entries = doc
    elif isinstance(doc, dict):
        if "version" in doc and doc["version"] != 1:
            warnings.append("version %r is not 1" % (doc["version"],))
        if "landmark" in doc and not isinstance(doc["landmark"], str):
            errors.append('"landmark" must be a string')
        entries = doc.get("props")
    else:
        entries = None
    if not isinstance(entries, list):
        return ['props.json has no "props" array'], warnings, 0

    seen = set()
    valid = 0
    for i, entry in enumerate(entries):
        err = validate_entry(entry, warnings)
        if err:
            errors.append("props[%d]: %s" % (i, err))
            continue
        pid = entry["id"]
        where = 'props[%d] "%s"' % (i, pid)
        if pid in seen:
            errors.append('props[%d]: duplicate id "%s"' % (i, pid))
            continue
        seen.add(pid)
        if bbox is not None:
            lat, lon = entry["lat"], entry["lon"]
            if not (bbox["south"] <= lat <= bbox["north"] and bbox["west"] <= lon <= bbox["east"]):
                errors.append("%s: %.6f, %.6f is outside tile %s bbox" % (where, lat, lon, tile_id))
                continue
        if public_dir is not None and parse_model(entry["model"]) == "":
            before = len(errors)
            check_model_file(entry["model"], public_dir, max_bytes, attribution_text,
                             errors, warnings, where)
            if len(errors) > before:
                continue
        valid += 1
    if valid > max_props:
        errors.append("%d props exceeds the %d-prop cap (Config.props.maxProps)" % (valid, max_props))
    return errors, warnings, valid


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("props_json", help="path to a props.json")
    ap.add_argument("--tile", help="tile id (data/tiles/<id>/meta.json) or path to a meta.json; "
                                   "checks every prop is inside its bbox")
    ap.add_argument("--public", default=os.path.join(REPO, "public"),
                    help="static root that /assets/models/... URLs resolve against (default: public/)")
    ap.add_argument("--no-model-check", action="store_true", help="skip GLB existence/size checks")
    ap.add_argument("--max-model-mb", type=float, default=DEFAULT_MAX_MODEL_MB,
                    help="largest GLB allowed, MB (default 2)")
    ap.add_argument("--strict", action="store_true", help="treat warnings as errors")
    args = ap.parse_args(argv)

    try:
        with open(args.props_json, "r", encoding="utf-8") as f:
            doc = json.load(f)
    except (OSError, ValueError) as e:
        print("error: cannot read %s: %s" % (args.props_json, e), file=sys.stderr)
        return 2

    bbox = tile_id = None
    if args.tile:
        try:
            tile_id, bbox = load_tile_bbox(args.tile)
        except (OSError, ValueError, KeyError) as e:
            print("error: cannot read tile %s: %s" % (args.tile, e), file=sys.stderr)
            return 2

    attribution = None
    attr_path = os.path.join(REPO, "ATTRIBUTION.md")
    if os.path.isfile(attr_path):
        with open(attr_path, "r", encoding="utf-8") as f:
            attribution = f.read()

    errors, warnings, valid = validate_doc(
        doc, bbox=bbox, tile_id=tile_id,
        public_dir=None if args.no_model_check else args.public,
        max_bytes=int(args.max_model_mb * 1048576), attribution_text=attribution)

    for w in warnings:
        print("warning: %s" % w)
    for e in errors:
        print("error: %s" % e)
    status = "OK" if not errors else "FAILED"
    print("%s: %s, %d valid prop(s), %d error(s), %d warning(s)"
          % (status, args.props_json, valid, len(errors), len(warnings)))
    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
