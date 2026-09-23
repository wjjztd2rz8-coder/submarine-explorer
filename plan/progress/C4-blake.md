# C4 Blake Plateau coral mounds finish (this session)

Followed `plan/PHASE-C-CONTRACTS.md` §1-3 (`ridge` type, `reef` preset, hull class B,
1202x1201 tile). Only edited `data/landmarks/blake-plateau-corals/` (all 6 files,
new) plus this note; did not touch `src/`, `tests/` or any other landmark folder.

## What was done

1. Read `data/landmarks.json`'s entry and `data/tiles/blake-plateau-corals/meta.json`,
   sampled `heightmap.bin` (bilinear, same convention as `validate_landmark.py`) to
   find real terrain. Tile depth range 579.9-960.1 m matches the province's
   published 500-1,000 m depth band. Scanned a coarse grid across the tile for the
   highest local relief (a proxy for mound-like texture at this ~53 x 61 m cell
   size) and found a dense cluster around 30.16N, -79.79W with ~72 m of local
   relief, used as the mission's core area — all 5 POIs sit within ~1 km of each
   other there.
2. Sourcing: NOAA Ocean Exploration's own January 2024 announcement (primary — NOAA
   led the mapping), Wikipedia and Live Science as secondary corroboration, and the
   GMRT Synthesis for terrain readings. The underlying peer-reviewed paper (Sowers
   et al. 2024, *Geomatics*) was **not directly fetched** this session; its key
   figures (83,908 mounds, province dimensions, mound-height range) are corroborated
   by two independent secondary sources that both name and describe it directly, and
   this limitation is stated explicitly in `sources.md`.
3. `pois.json` (5 POIs): a dense mound cluster (primary, geology, real terrain), a
   Desmophyllum pertusum thicket (secondary, biology, `reconstruction: true` — the
   terrain is real but the coral colonies are placed, confidence medium since
   species presence at this exact point is inferred from the province-wide finding
   rather than a site-specific record), a neighbouring mound (secondary, geology,
   real terrain), a Gulf Stream marker (secondary, kind `other`, real terrain
   anchoring a description of the current), and an inter-mound channel (secondary,
   geology, real terrain).
4. `props.json` (2 props): two `rock_09.glb` stand-ins at the coral-thicket POI, per
   the task brief's suggestion, flagged `reconstruction: true` and explicitly noted
   as not depicting actual coral structure (the engine has no coral-colony model).
   `python3 tools/validate_props.py ... --tile blake-plateau-corals`: 0 errors.
5. `guide.json` (6 entries): overview (province facts, Gulf Stream role, honesty
   about what this tile's resolution can/cannot show), the mound-field cluster, the
   coral thicket (explains the rock stand-ins), a second mound (illustrating the
   near-continuous field), the Gulf Stream, and the inter-mound channel. No
   memorial content needed (not a grave/historic site).
6. `mission.json`: `hull_class: "B"` per the task brief, `environment.preset:
   "reef"`, spawn directly above the mound cluster at the surface, heading 140°,
   checked to be in well over 60 m of water. Descent to ~780 m at 3x sim speed
   (16.2 m/s) is under a minute, so no mid-water-spawn warning needed.
7. `species.json`: `tools/obis_export.py --landmark blake-plateau-corals --tile-bbox
   --depth-min 500 --depth-max 1000` returned 25 taxa / 843 records. Desmophyllum
   pertusum itself is directly present in the OBIS export, alongside other deep-sea
   corals (Madrepora oculata, Enallopsammia profunda, several octocorals) and
   associated invertebrates — a strong match to the described habitat. Noted in the
   file's own `note`.

## Validator

```
$ python3 tools/validate_landmark.py blake-plateau-corals --strict
OK: blake-plateau-corals, 0 error(s), 0 warning(s)

$ python3 tools/validate_props.py data/landmarks/blake-plateau-corals/props.json --tile blake-plateau-corals
OK: data/landmarks/blake-plateau-corals/props.json, 2 valid prop(s), 0 error(s), 0 warning(s)
```

## Not verified / open

- The peer-reviewed Sowers et al. 2024 paper was not directly fetched this session;
  its figures are corroborated by two independent secondary sources instead (see
  `sources.md`).
- No source names this tile's specific relief features as individually catalogued
  mounds from the 83,908-feature dataset; POI placement is our own reading of the
  tile's terrain, consistent with but not directly matched to that catalogue.
- Coral presence at the exact `blake-coral-thicket` coordinate is inferred from the
  province-wide finding rather than a site-specific survey record, hence
  `confidence: "medium"` there.
