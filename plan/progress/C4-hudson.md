# C4 Hudson Canyon content (this session)

Only edited `data/landmarks/hudson-canyon/` (plus this note); did not touch `src/`, `tests/`,
or `data/landmarks.json`.

## What was done

1. `species.json`: `tools/obis_export.py --landmark hudson-canyon --tile-bbox --max 30` — 30
   taxa kept (of 786 matching species rank, 1524 in bbox, 45,826 records): mostly pelagic
   fish, seabirds and marine mammals typical of the mid-Atlantic shelf/canyon (blue shark,
   piked dogfish, swordfish, bigeye/albacore/yellowfin tuna, bottlenose/Risso's dolphins,
   American lobster, longfin squid).
2. `pois.json` (6 POIs, 2 primary): a steep north-wall point (`hc-canyon-wall`, 541.9 m,
   slope ~18-19 deg) and a nearby coral-habitat ledge (`hc-coral-ledge`, 941.9 m,
   `reconstruction: true` — no exact coral-colony coordinate is publicly citable, so this
   stands in for that habitat type inside the real Frank R. Lautenberg Deep Sea Coral
   Protection Area) as the two required objectives, ~2.8 km apart and ~6-9 km from spawn. Four
   optional/secondary POIs fan out from there: the upper canyon floor, this tile's single
   deepest sounding (-1,682.6 m, matches meta.json's `min_m`), a point on the Hudson Shelf
   Valley's drowned-river path, and the tile's shallowest cell standing in for (but not
   identical to) the canyon's literal head, which published sources place just outside this
   tile's north edge.
3. `guide.json` (5 entries): overview; a `sanctuary` entry that states plainly the Hudson
   Canyon National Marine Sanctuary is **proposed, not yet designated** (NOAA's own site, 2026
   research pass) — this corrects `data/landmarks.json`'s own catalog entry, which says
   "Designated ... in 2025," an inaccuracy this pack does not repeat and does not edit at the
   source (out of scope); the Hudson Shelf Valley's catastrophic-meltwater-flood origin (USGS);
   the canyon wall / coral-habitat entry; and the axis-to-floor entry noting this tile only
   covers the canyon's upper/middle reaches (published full depth 2-2.5 mi, well past this
   tile's 1,682.6 m floor).
4. `props.json`: intentionally empty — no procedural prop kind in `docs/props.md` models coral,
   and no citable exact coral position was found; documented in a `note` field.
5. `mission.json`: `hull_class: "B"`, `environment.preset: "canyon"`, surface spawn
   (`depth_m: 5`) directly above the primary-objective cluster (well under a minute of vertical
   descent to the deepest required POI, so no mid-water-spawn shortcut is needed).
   `notable_species` cross-checked against the actual OBIS export rather than invented (blue
   shark, piked dogfish).
6. `sources.md`: 9-source table (NOAA sanctuary page, MAFMC, Frank R. Lautenberg coral
   protection area, the Sept 2025 ROV Global Explorer expedition, Britannica, two USGS Hudson
   Shelf Valley publications, GMRT, OBIS), a terrain-survey section (via a small ad hoc
   `.probe_terrain.py` script built on `validate_landmark.py`'s `Tile` class — bilinear
   sampling, grid extrema, straight-line transects and central-difference slope), pacing and
   descent-time math, and a fabricated-vs-sourced table.

## Validator

```
$ python3 tools/validate_landmark.py hudson-canyon --strict
OK: hudson-canyon, 0 error(s), 0 warning(s)
```

## Not verified / open

- No public dataset from recent Hudson Canyon coral survey cruises (2023-2025 NOAA Deep-Sea
  Coral Research and Technology Program, Sept 2025 ROV Global Explorer expedition) gives an
  exact, citable coral-colony coordinate; `hc-coral-ledge`'s position is an invented stand-in,
  flagged `reconstruction: true`.
- The USGS Hudson Shelf Valley GIS centerline (shapefiles/GeoTIFFs) was not fetched as a text
  source; `hc-shelf-valley`'s point is a coarse approximation from this tile's own grid plus the
  publications' text description, confidence "medium."
- `data/landmarks.json`'s `hudson-canyon` entry still says the sanctuary was "Designated ... in
  2025," which this session's NOAA research found to be inaccurate (still proposed as of
  2026-09-23). That file is out of scope for this package (owned by C1/globe content) and was
  not edited; flagging it here for whoever does own it.
