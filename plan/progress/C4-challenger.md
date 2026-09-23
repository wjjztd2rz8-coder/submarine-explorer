# C4 Challenger Deep finish (this session)

Picked up from `plan/progress/C4a.md`'s Challenger Deep notes and
`plan/progress/C4-monterey.md`'s pacing lesson. Only edited
`data/landmarks/challenger-deep/` (plus this note); did not touch `src/` or
`tests/`.

## What was done

1. `species.json`: `tools/obis_export.py --landmark challenger-deep --tile-bbox
   --depth-min 6000 --depth-max 11000` (species, then genus, then any rank)
   returned 0 taxa at every rank -- OBIS has essentially no hadal-depth
   occurrence records in this tile's ~50x50 km bbox. Fell back to `--rank
   genus` with no depth filter: 180 taxa in the bbox, 69 at species/genus
   rank, top 30 by record count kept. Nearly all are bacteria/archaea genera
   whose occurrence records report 0-1.6 m depth (near-surface water samples,
   not hadal fauna) -- documented explicitly in `species.json.note` so it
   isn't mistaken for trench-floor life. The one metazoan present is
   *Hirondellea gigas* (the hadal amphipod), independently corroborating the
   Wikipedia-sourced amphipod facts used in the guide.
2. `pois.json` (6 POIs): the deepest surveyed cell in the tile
   (`cd-eastern-pool-deepest`, 10,930.9 m, matches `meta.json`'s `min_m`); the
   real position of the benthic lander "Leggo" (`cd-leggo-amphipod-site`,
   Wikipedia-sourced, ~1.2 km from the deepest cell, reads 10,925.1 m on this
   tile vs. Leggo's own corrected 10,929 m reading); the long-published
   rounded catalog coordinate (`cd-published-coordinate`, close enough here
   that it isn't a Lost-City-style miss); the steep north inner wall
   (`cd-north-wall`, slope measured this session at ~25-29 deg depending on
   sampling baseline); the second (Central) sub-basin carried over from C4a's
   notes (`cd-central-basin`, ~18.6 km west); and a sill between the Central
   and Eastern Pools located by tracing the deepest continuous path along the
   trench axis, same method as Monterey's canyon-axis trace
   (`cd-axis-sill`, ~10,704 m).
3. `guide.json` (7 entries, >= 2 sources each): overview, the Eastern Pool and
   its multi-survey depth spread, the three crewed/notable descents (Trieste
   1960, Deepsea Challenger 2012, Five Deeps 2019), hadal life (Hirondellea
   gigas, xenophyophores, no confirmed fish this deep), the published-vs-
   surveyed coordinate story, trench-wall/subduction geology, and the
   three-pools/en-echelon structure.
4. `props.json`: one `procedural:debris` marker standing in for the real
   Leggo lander at its sourced position, flagged `reconstruction: true` and
   noted as a historic-event marker (the lander was recovered after the 2018
   cruise; nothing physical remains on the seabed there).
5. `mission.json`: `hull_class: "C"` (the only class that clears this tile's
   terrain), `environment.preset: "trench"`, `spawn.depth_m: 6000` per the
   task brief (surface-to-floor descent at ~5.37 m/s vertical terminal would
   be ~34 min sim time; from 6,000 m it's ~15.3/7.6/5.1 min real time at
   1x/2x/3x), and the briefing explicitly says the descent start is
   shortened and explains the tight hull margin. Two required objectives
   (`cd-eastern-pool-deepest`, `cd-leggo-amphipod-site`) are ~1.2 km apart,
   well inside Monterey's ~3 km pacing guideline; four secondary objectives
   fan out from ~0.6 km to ~18.6 km as optional further exploration.
6. `sources.md`: full source table (6 sources, all Wikipedia + GMRT + OBIS),
   terrain-survey notes per POI, pacing rationale, spawn-depth/descent-time
   math, hull-class rationale, a fabricated-vs-sourced table, and a section
   specifically explaining the one unavoidable validator warning (below).

## Validator

```
$ python3 tools/validate_landmark.py challenger-deep --strict
warning: [challenger-deep] mission.json: deepest POI "cd-eastern-pool-deepest" (10931 m) is inside the crush-warning band of hull C (11000 m)
FAILED: challenger-deep, 0 error(s), 1 warning(s)
```

0 errors, 1 warning -- **not** the requested 0 errors / 0 warnings. The
warning is `validate_landmark.py`'s crush-warning-band check
(`deepest POI depth > 0.9 * crush depth`). Class C's crush depth is a fixed
-11,000 m in `src/core/Config.ts` (not editable by this pack), and this
tile's real deepest terrain is 10,900-10,931 m -- only ~70-100 m of margin,
which is inherently inside the 90% warning band. `plan/progress/C4a.md`
already flagged this as intentional design ("Hull C crush 11,000 m, warn
band from 9,900 m"), and this mission's own `briefing.hazards` calls it out
as the point of a full-ocean-depth dive. Avoiding the warning would require
either fabricating shallower terrain (forbidden by the honesty rules in
`plan/PHASE-C-CONTRACTS.md` §5) or omitting the deepest point of the ocean
from its own mission, so it is reported here rather than worked around.
`npm run test:py` (Python only): 104 tests, all pass.

## Not verified / open

- No source gives an exact coordinate for the sill between the Central and
  Eastern Pools (`cd-axis-sill`); it's a terrain trace, not a citation
  (matches C4a's noted approximate location, ~142.518 E, within the traced
  profile's resolution).
- Leggo's physical dimensions are not published anywhere found; the debris
  marker's size (`props.json`) is an arbitrary small estimate.
- The crush-warning-band validator warning above could not be eliminated;
  see `sources.md` for the full explanation.

## Revision (coordinator review: sourcing)

The coordinator flagged that every guide entry leaned on Wikipedia, and that
GMRT/OBIS were cited by homepage rather than their specific dataset
citations. Fixed, touching only `data/landmarks/challenger-deep/` and this
note:

- Used WebFetch/WebSearch to locate and actually read primary/authoritative
  sources for every fact (two as PDFs, run through `pdftotext -layout` after
  WebFetch returned raw bytes): Stewart & Jamieson (2019, *Earth-Science
  Reviews*, open access), Greenaway et al. (2021, *Deep-Sea Research I*, via
  the NOAA repository record), NOAA NCEI, U.S. Fish & Wildlife Service, the
  Five Deeps Expedition's own 13 May 2019 press release, the official
  DEEPSEA CHALLENGE site, National Geographic, Kobayashi et al. (2012, PLoS
  ONE, peer-reviewed), and two Schmidt Ocean Institute cruise pages.
- Rewrote every `guide.json` entry (7 entries) to cite >= 2 of these, all
  non-Wikipedia, with at least one peer-reviewed or official-primary source
  each. Wikipedia is no longer cited anywhere in `guide.json`, `pois.json`,
  `props.json` or `mission.json`.
- GMRT-derived depths/slopes now cite "Ryan et al. 2009, GMRT Synthesis,
  doi:10.1029/2008GC002332" by name in both `guide.json` source titles and
  `pois.json` POI notes, with an explicit "value read directly from this
  tile's grid" note, rather than linking the gmrt.org homepage as if it were
  the source of the number.
- **Caught and fixed a real error**: the "Leggo" lander deployment was dated
  19 December 2018 in the first draft (misread from an under-specified
  Wikipedia sentence). Schmidt Ocean Institute's own cruise page
  (`schmidtocean.org/cruise/expanding-mariana-trench-perspectives/`, cruise
  FK141215) confirms it was 19 December **2014**. Corrected in `pois.json`,
  `props.json`, `mission.json` and `guide.json`.
- Dropped three facts that only Wikipedia supported and that no source
  fetched this session confirmed: the "~170 million year old" Pacific Plate
  crust-age figure, the specific "Challenger Deep is in the FSM's EEZ"
  jurisdiction claim (kept the weaker, FWS-confirmed "not within the
  monument" fact instead), and "JAMSTEC's 1980s-1990s surveys first mapped
  the three pools separately." See `sources.md`'s "Facts dropped for lack of
  a confirmed source" section.
- Final source list per guide entry (all URLs fetched and read this
  session): **overview** -- Greenaway et al. 2021, Stewart & Jamieson 2019,
  NOAA NCEI, FWS, Five Deeps press release. **eastern-pool** -- Stewart &
  Jamieson 2019, Five Deeps press release, GMRT (Ryan et al. 2009).
  **descents** -- DEEPSEA CHALLENGE (1960 dive), Five Deeps press release,
  National Geographic. **hadal-life** -- Schmidt Ocean Institute (x2),
  Kobayashi et al. 2012 (PLoS ONE), Scripps, Five Deeps press release.
  **published-coordinate** -- Stewart & Jamieson 2019, GMRT. **trench-walls**
  -- Stewart & Jamieson 2019, NOAA NCEI, GMRT. **three-pools** -- Five Deeps
  press release, Stewart & Jamieson 2019, GMRT.
- Re-ran the gates: `python3 tools/validate_landmark.py challenger-deep
  --strict` -> 0 errors, 1 warning (only the accepted crush-band warning).
  `npm run test:py` -> 104 tests, all pass.
