#!/usr/bin/env python3
"""Export an OBIS species list for a landmark to species.json (Phase C §3).

    python3 tools/obis_export.py --landmark lost-city --depth-min 600 --depth-max 1000 \\
        --out data/landmarks/lost-city/species.json
    python3 tools/obis_export.py --landmark monterey-canyon --bbox 36.95 36.6 -121.75 -122.2 --max 25
    python3 tools/obis_export.py --landmark challenger-deep --tile-bbox --rank any

How it works (OBIS v3 API, https://api.obis.org/v3/):

1. The bbox (default: the landmark's `bbox` in data/landmarks.json; `--tile-bbox`
   uses data/tiles/<id>/meta.json; `--bbox N S E W` overrides both) becomes a
   WKT POLYGON.
2. `GET /v3/checklist?geometry=...&startdepth=&enddepth=` is paged in full. It
   returns one row per taxon with its record count and taxonomy
   (kingdom/phylum/class/order/family), i.e. occurrences already aggregated by
   scientificName. Rows are filtered by `--rank`, sorted by record count and the
   top `--max` kept.
3. For each kept taxon, one `GET /v3/occurrence?taxonid=...&fields=...` page
   (up to `--depth-sample` records) gives the depth range and, if any record
   carries one, the most common `vernacularName` -> `commonName`.
   `group` is a coarse class derived from phylum/class (fish, mollusc, ...).
   Nothing is invented: a key is omitted when the records do not support it.

Raw responses are cached in .cache/obis/ (keyed by URL; `--refresh` ignores the
cache). The tool sleeps >= 1 s before every network request. If OBIS returns
nothing, the file is still written with an empty `species` array and a note.

Python 3.9, standard library only.
"""

import argparse
import datetime
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://api.obis.org/v3"
CACHE_DIR = os.path.join(REPO, ".cache", "obis")
USER_AGENT = "submarine-explorer-obis-export/1 (+https://github.com/; research game content)"
MIN_SLEEP_S = 1.0
CHECKLIST_PAGE = 1000
MAX_CHECKLIST_PAGES = 50
DEFAULT_MAX = 25
DEFAULT_DEPTH_SAMPLE = 2000
NOTE = ("Occurrence records within the tile bbox from OBIS; record counts reflect sampling "
        "effort, not abundance. Placement of animals in the game is invented.")

SPECIES_RANKS = ("species", "subspecies", "variety", "forma", "form")
GENUS_RANKS = SPECIES_RANKS + ("genus", "subgenus")

FISH_CLASSES = {
    "actinopteri", "actinopterygii", "teleostei", "elasmobranchii", "holocephali",
    "chondrichthyes", "myxini", "petromyzonti", "sarcopterygii", "cephalaspidomorphi",
}
TUNICATE_CLASSES = {"ascidiacea", "thaliacea", "appendicularia"}
CRUSTACEAN_CLASSES = {
    "malacostraca", "maxillopoda", "hexanauplia", "copepoda", "ostracoda", "thecostraca",
    "branchiopoda", "cephalocarida", "remipedia", "tantulocarida", "mystacocarida",
    "ichthyostraca",
}
CRUSTACEAN_SUBPHYLA = {"crustacea"}
WORM_PHYLA = {
    "annelida", "nemertea", "sipuncula", "nematoda", "platyhelminthes", "chaetognatha",
    "priapulida", "hemichordata", "echiura", "kinorhyncha", "gastrotricha", "phoronida",
}
PROTIST_PHYLA = {
    "foraminifera", "radiozoa", "ciliophora", "myzozoa", "cercozoa", "amoebozoa",
    "haptophyta", "choanozoa", "euglenozoa", "retaria", "sagenista", "bigyra",
    "dinoflagellata", "apicomplexa",
}
ALGA_PHYLA = {"rhodophyta", "chlorophyta", "charophyta", "cryptophyta", "glaucophyta"}


def classify_group(taxon):
    """Coarse group from a record's taxonomy, or None when the taxonomy is missing."""
    kingdom = (taxon.get("kingdom") or "").lower()
    phylum = (taxon.get("phylum") or "").lower()
    klass = (taxon.get("class") or "").lower()
    subphylum = (taxon.get("subphylum") or "").lower()
    if not (kingdom or phylum or klass):
        return None
    if kingdom in ("bacteria", "archaea"):
        return "microbe"
    if kingdom == "fungi":
        return "fungus"
    if phylum == "chordata":
        if klass in FISH_CLASSES:
            return "fish"
        if klass == "mammalia":
            return "mammal"
        if klass == "aves":
            return "bird"
        if klass == "reptilia":
            return "reptile"
        if klass in TUNICATE_CLASSES:
            return "tunicate"
        return "other"
    if phylum == "mollusca":
        return "mollusc"
    if phylum == "arthropoda":
        if klass in CRUSTACEAN_CLASSES or subphylum in CRUSTACEAN_SUBPHYLA:
            return "crustacean"
        return "other"
    if phylum == "cnidaria":
        return "cnidarian"
    if phylum == "echinodermata":
        return "echinoderm"
    if phylum == "porifera":
        return "sponge"
    if phylum == "ctenophora":
        return "ctenophore"
    if phylum in WORM_PHYLA:
        return "worm"
    if phylum in PROTIST_PHYLA or kingdom == "protozoa":
        return "protist"
    if phylum in ALGA_PHYLA:
        return "alga"
    if phylum == "ochrophyta":
        return "alga"  # diatoms, brown algae
    if phylum == "tracheophyta":
        return "plant"
    if kingdom == "chromista":
        return "protist"
    if kingdom == "plantae":
        return "alga"
    return "other"


def bbox_to_wkt(bbox):
    """WKT POLYGON (lon lat, counter-clockwise, closed) for a {north,south,east,west} bbox."""
    n, s, e, w = bbox["north"], bbox["south"], bbox["east"], bbox["west"]
    if not (-90 <= s < n <= 90):
        raise ValueError("bbox needs south < north within [-90, 90]: %r" % (bbox,))
    if not (-180 <= w < e <= 180):
        raise ValueError("bbox needs west < east within [-180, 180] (no antimeridian): %r" % (bbox,))

    def f(v):
        return ("%.6f" % v).rstrip("0").rstrip(".")

    pts = [(w, s), (e, s), (e, n), (w, n), (w, s)]
    return "POLYGON((%s))" % ",".join("%s %s" % (f(x), f(y)) for x, y in pts)


def build_url(endpoint, params):
    clean = [(k, v) for k, v in params if v is not None]
    return "%s/%s?%s" % (API, endpoint, urllib.parse.urlencode(clean, safe="(),"))


class Fetcher:
    """GET JSON with an on-disk cache and >= MIN_SLEEP_S between network requests."""

    def __init__(self, cache_dir=CACHE_DIR, refresh=False, sleep_s=MIN_SLEEP_S,
                 sleeper=None, retries=3, log=None):
        self.cache_dir = cache_dir
        self.refresh = refresh
        self.sleep_s = max(MIN_SLEEP_S, sleep_s)
        self.sleeper = sleeper or (lambda secs: time.sleep(secs))
        self.retries = retries
        self.log = log or (lambda msg: print(msg, file=sys.stderr))
        self.network_requests = 0

    def _cache_path(self, url):
        return os.path.join(self.cache_dir, hashlib.sha1(url.encode("utf-8")).hexdigest() + ".json")

    def get(self, url):
        path = self._cache_path(url)
        if not self.refresh and os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        last = None
        for attempt in range(self.retries):
            self.sleeper(self.sleep_s * (attempt + 1))
            self.network_requests += 1
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT,
                                                           "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=120) as resp:
                    body = resp.read()
                data = json.loads(body.decode("utf-8"))
                break
            except (urllib.error.URLError, OSError, ValueError) as e:
                last = e
                self.log("  request failed (%s), attempt %d/%d" % (e, attempt + 1, self.retries))
        else:
            raise RuntimeError("OBIS request failed after %d attempts: %s (%s)"
                               % (self.retries, url, last))
        os.makedirs(self.cache_dir, exist_ok=True)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f)
        os.replace(tmp, path)
        return data


def rank_ok(taxon, rank_filter):
    if rank_filter == "any":
        return True
    rank = (taxon.get("taxonRank") or "").lower()
    allowed = SPECIES_RANKS if rank_filter == "species" else GENUS_RANKS
    return rank in allowed


def fetch_checklist(fetcher, wkt, depth_min, depth_max):
    """All checklist rows for the polygon. Returns (rows, first_page_url)."""
    rows, first_url, total = [], None, None
    for page in range(MAX_CHECKLIST_PAGES):
        url = build_url("checklist", [("geometry", wkt), ("startdepth", depth_min),
                                      ("enddepth", depth_max), ("size", CHECKLIST_PAGE),
                                      ("skip", page * CHECKLIST_PAGE)])
        if first_url is None:
            first_url = url
        data = fetcher.get(url)
        results = data.get("results") or []
        total = data.get("total", total)
        rows.extend(results)
        if not results or len(results) < CHECKLIST_PAGE or (total is not None and len(rows) >= total):
            break
    return rows, first_url


def occurrence_sample(fetcher, wkt, taxon_id, depth_min, depth_max, size):
    url = build_url("occurrence", [
        ("geometry", wkt), ("taxonid", taxon_id), ("startdepth", depth_min),
        ("enddepth", depth_max), ("size", size),
        ("fields", "depth,minimumDepthInMeters,maximumDepthInMeters,vernacularName"),
    ])
    data = fetcher.get(url)
    return data.get("results") or [], data.get("total")


def summarise_records(records):
    """(depthRange_m or None, commonName or None) from occurrence records."""
    depths = []
    names = Counter()
    for r in records:
        for key in ("minimumDepthInMeters", "maximumDepthInMeters", "depth"):
            v = r.get(key)
            if isinstance(v, (int, float)) and not isinstance(v, bool) and v >= 0:
                depths.append(float(v))
        vn = r.get("vernacularName")
        if isinstance(vn, str) and vn.strip():
            names[vn.strip()] += 1
    rng = None
    if depths:
        rng = [_tidy(min(depths)), _tidy(max(depths))]
    common = names.most_common(1)[0][0] if names else None
    return rng, common


def _tidy(v):
    return int(v) if float(v).is_integer() else round(v, 1)


def build_species(rows, fetcher, wkt, depth_min, depth_max, top_n, rank_filter, depth_sample,
                  log=None):
    log = log or (lambda msg: None)
    agg = {}
    for r in rows:
        name = r.get("scientificName")
        if not isinstance(name, str) or not name.strip():
            continue
        if not rank_ok(r, rank_filter):
            continue
        rec = r.get("records") or 0
        prev = agg.get(name)
        if prev is None or rec > (prev.get("records") or 0):
            agg[name] = r
    ranked = sorted(agg.values(), key=lambda r: (-(r.get("records") or 0), r["scientificName"]))
    out = []
    for r in ranked[:top_n]:
        entry = {"scientificName": r["scientificName"]}
        taxon_id = r.get("taxonID") or r.get("acceptedNameUsageID")
        sample = []
        if isinstance(taxon_id, int):
            entry["aphiaID"] = taxon_id
            log("  %s (%s)" % (r["scientificName"], taxon_id))
            sample, _ = occurrence_sample(fetcher, wkt, taxon_id, depth_min, depth_max, depth_sample)
        entry["records"] = int(r.get("records") or 0)
        rng, common = summarise_records(sample)
        if common:
            entry["commonName"] = common
        if rng:
            entry["depthRange_m"] = rng
        group = classify_group(r)
        if group:
            entry["group"] = group
        if r.get("taxonRank"):
            entry["taxonRank"] = r["taxonRank"]
        # stable key order: contract keys first
        ordered = {}
        for k in ("scientificName", "commonName", "aphiaID", "records", "depthRange_m", "group",
                  "taxonRank"):
            if k in entry:
                ordered[k] = entry[k]
        out.append(ordered)
    return out, len(agg)


def load_landmark_bbox(landmark_id, repo=REPO):
    with open(os.path.join(repo, "data", "landmarks.json"), "r", encoding="utf-8") as f:
        doc = json.load(f)
    items = doc if isinstance(doc, list) else doc.get("landmarks", [])
    for item in items:
        if item.get("id") == landmark_id:
            return item["bbox"]
    raise KeyError("landmark %r not found in data/landmarks.json" % landmark_id)


def load_tile_bbox(tile_id, repo=REPO):
    with open(os.path.join(repo, "data", "tiles", tile_id, "meta.json"), "r", encoding="utf-8") as f:
        return json.load(f)["bbox"]


def export(landmark, bbox, depth_min=None, depth_max=None, top_n=DEFAULT_MAX, rank="species",
           depth_sample=DEFAULT_DEPTH_SAMPLE, fetcher=None, now=None, log=None):
    """Build the species.json document (dict)."""
    fetcher = fetcher or Fetcher()
    log = log or (lambda msg: None)
    wkt = bbox_to_wkt(bbox)
    log("checklist for %s ..." % wkt)
    rows, url = fetch_checklist(fetcher, wkt, depth_min, depth_max)
    total_records = sum(int(r.get("records") or 0) for r in rows)
    species, n_taxa = build_species(rows, fetcher, wkt, depth_min, depth_max, top_n, rank,
                                    depth_sample, log=log)
    now = now or datetime.datetime.now(datetime.timezone.utc)
    note = NOTE
    if not species:
        note = ("OBIS returned no %s-rank records for this bbox%s. " % (
            "matching" if rank == "any" else rank,
            " and depth filter" if depth_min is not None or depth_max is not None else "")) + NOTE
    doc = {
        "version": 1,
        "landmark": landmark,
        "source": "OBIS",
        "source_url": url,
        "fetched_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "bbox": {k: bbox[k] for k in ("north", "south", "east", "west")},
    }
    if depth_min is not None or depth_max is not None:
        doc["depth_filter_m"] = [depth_min, depth_max]
    doc["rank_filter"] = rank
    doc["taxa_in_bbox"] = len(rows)
    doc["taxa_matching_rank"] = n_taxa
    doc["records_in_bbox"] = total_records
    doc["note"] = note
    doc["species"] = species
    return doc


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Export the top OBIS taxa for a landmark bbox to species.json (Phase C §3).",
        epilog="Example: python3 tools/obis_export.py --landmark lost-city --depth-min 600 "
               "--depth-max 1000 --out data/landmarks/lost-city/species.json")
    ap.add_argument("--landmark", required=True, help="landmark id in data/landmarks.json")
    ap.add_argument("--bbox", nargs=4, type=float, metavar=("N", "S", "E", "W"),
                    help="override the bbox (degrees; west/east negative for W)")
    ap.add_argument("--tile-bbox", action="store_true",
                    help="use data/tiles/<landmark>/meta.json bbox instead of data/landmarks.json")
    ap.add_argument("--depth-min", type=float, help="OBIS startdepth (m, positive)")
    ap.add_argument("--depth-max", type=float, help="OBIS enddepth (m, positive)")
    ap.add_argument("--max", type=int, default=DEFAULT_MAX, help="keep the top N taxa (default %d)"
                    % DEFAULT_MAX)
    ap.add_argument("--rank", choices=("species", "genus", "any"), default="species",
                    help="lowest rank kept: species (default; species/subspecies), genus "
                         "(adds genus-level records) or any (includes family, phylum, ...)")
    ap.add_argument("--depth-sample", type=int, default=DEFAULT_DEPTH_SAMPLE,
                    help="occurrence records sampled per taxon for depthRange_m/commonName "
                         "(default %d; OBIS max 10000)" % DEFAULT_DEPTH_SAMPLE)
    ap.add_argument("--out", help="output path (default: stdout)")
    ap.add_argument("--cache-dir", default=CACHE_DIR, help="raw response cache (default .cache/obis)")
    ap.add_argument("--refresh", action="store_true", help="ignore cached responses")
    ap.add_argument("--sleep", type=float, default=MIN_SLEEP_S,
                    help="seconds between requests (minimum %.0f)" % MIN_SLEEP_S)
    args = ap.parse_args(argv)

    def log(msg):
        print(msg, file=sys.stderr)

    try:
        if args.bbox:
            n, s, e, w = args.bbox
            bbox = {"north": n, "south": s, "east": e, "west": w}
        elif args.tile_bbox:
            bbox = load_tile_bbox(args.landmark)
        else:
            bbox = load_landmark_bbox(args.landmark)
        bbox_to_wkt(bbox)
    except (OSError, ValueError, KeyError) as e:
        print("error: %s" % e, file=sys.stderr)
        return 2
    if args.depth_min is not None and args.depth_max is not None and args.depth_min > args.depth_max:
        print("error: --depth-min is greater than --depth-max", file=sys.stderr)
        return 2
    if args.max < 1 or not 1 <= args.depth_sample <= 10000:
        print("error: --max must be >= 1 and --depth-sample in 1..10000", file=sys.stderr)
        return 2

    fetcher = Fetcher(cache_dir=args.cache_dir, refresh=args.refresh, sleep_s=args.sleep, log=log)
    try:
        doc = export(args.landmark, bbox, args.depth_min, args.depth_max, args.max, args.rank,
                     args.depth_sample, fetcher=fetcher, log=log)
    except RuntimeError as e:
        print("error: %s" % e, file=sys.stderr)
        return 1
    text = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text)
        log("wrote %s: %d taxa (of %d matching, %d in bbox), %d records in bbox, %d network requests"
            % (args.out, len(doc["species"]), doc["taxa_matching_rank"], doc["taxa_in_bbox"],
               doc["records_in_bbox"], fetcher.network_requests))
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
