# Challenger Deep content: sources and notes (package C4)

Researched 2026-09-23, revised 2026-09-23 after coordinator review. Files: `pois.json`, `guide.json`,
`props.json`, `mission.json`, `species.json` in this folder. Tile: `data/tiles/challenger-deep` (GMRT, bbox
N 11.6233 / S 11.1229 / E 142.8420 / W 142.3416, cellsize ~59.9 x 61.1 m, min/max -10,930.89 / -5,936.3 m).
Picked up from `plan/progress/C4a.md`'s Challenger Deep notes (deepest cell, second basin, north wall
coordinates and the descent-pacing/hull-margin plan) and `plan/progress/C4-monterey.md`'s lessons
(terrain-tracing method, pacing rule: required objectives close together).

## Revision note (coordinator review)

The first pass of this pack leaned on Wikipedia for nearly every guide fact, and cited the GMRT and OBIS
_homepages_ rather than the specific dataset citation. This revision replaces every guide-entry source with a
primary or authoritative source that was actually fetched and read (WebFetch, with two PDFs fetched and run
through `pdftotext -layout` when WebFetch returned raw PDF bytes: Stewart & Jamieson 2019 and the Five Deeps
Expedition press release). Wikipedia has been removed from every guide entry and every POI's `sources` list;
none of the fact citations below rely on it. In the process, a real error was caught and fixed: the "Leggo"
lander deployment was originally dated 19 December **2018** (misread from an under-specified Wikipedia
sentence); Schmidt Ocean Institute's own cruise page confirms it was 19 December **2014**, cruise FK141215.
That date is now corrected everywhere (`pois.json`, `props.json`, `mission.json`, `guide.json`).

## Sources actually fetched and read this session

| #   | Source                                                                                                                                                                                                                                                                                                                                            | URL                                                                                                                        | Type                                                | Used for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Stewart, H.A. & Jamieson, A.J. (2019). "The five deeps: the location and depth of the deepest place in each of the world's oceans." _Earth-Science Reviews_ 197:102896. doi:10.1016/j.earscirev.2019.102896. Open access (CC BY); fetched as PDF via NERC Open Research Archive, read with `pdftotext -layout`.                                   | http://nora.nerc.ac.uk/id/eprint/524544/1/Stewart_and_Jamieson_2019_The%20five%20deeps.pdf                                 | Peer-reviewed, primary                              | Trench length/width, Pacific Plate subduction under the Mariana Arc/Philippine Plate, Table 1's list of >18 independently published Challenger Deep depth/coordinate estimates (Nakanishi & Hashimoto 2011, GEBCO Gazetteer, van Haren et al. 2017, Gardner et al. 2014, Gardner & Armstrong 2011), the paper's own thesis about propagated coordinate/depth errors, the "3 basins" / westernmost-basin note in the Fig. 6 caption, the Sirena/Nero deeps being distinct from Challenger Deep |
| 2   | Greenaway, S.F., Sullivan, K.D., Umfress, S.J., Beittel, A., Wagner, J.K.S. (2021). "Revised depth of the Challenger Deep from submersible transects; including a general method for precise, pressure-derived depths in the ocean." _Deep-Sea Research Part I_ 178:103644. Fetched via the NOAA Central Library institutional repository record. | https://repository.library.noaa.gov/view/noaa/33477                                                                        | Peer-reviewed, primary, NOAA-hosted                 | The currently accepted deepest measured depth, 10,935 +/- 6 m (95% CI), from June 2020 submersible pressure-transect dives                                                                                                                                                                                                                                                                                                                                                                    |
| 3   | "Planet Postcard: The Mariana Trench." NOAA National Centers for Environmental Information (NCEI) News.                                                                                                                                                                                                                                           | https://www.ncei.noaa.gov/news/planet-postcard-mariana-trench                                                              | Authoritative, government                           | 1875 HMS Challenger sounding (4,475 fathoms / 8,184 m), 2010 multibeam measurement (10,994 +/- 40 m), trench length/width (2,550 km / 69 km), general subduction description, Cameron 2012 dive mention                                                                                                                                                                                                                                                                                       |
| 4   | "Marianas Trench Marine National Monument Managers Support National Geographic and Director James Cameron on Historic Dives." U.S. Fish & Wildlife Service.                                                                                                                                                                                       | https://www.fws.gov/story/2012-03/marianas-trench-marine-national-monument-managers-support-national-geographic-and        | Authoritative, government                           | Direct quote: "The Challenger Deep area is not within the monument" -- source for the protected-area/jurisdiction fact in the overview entry                                                                                                                                                                                                                                                                                                                                                  |
| 5   | "Deepest Submarine Dive in History, Five Deeps Expedition Conquers Challenger Deep." Five Deeps Expedition / Caladan Oceanic press release, 13 May 2019. Fetched as PDF, read with `pdftotext -layout`.                                                                                                                                           | https://fivedeeps.com/wp-content/uploads/2019/05/FDE-Challenger-Release-FINAL-5132019.pdf                                  | Primary, official expedition document               | Full dive-by-dive log (28 Apr-7 May 2019): depths, pilots, bottom times, the official "Eastern Pool" / "Central Pool" naming, DNV GL commercial certification, lander salvage, Cameron's 10,908 m figure (attributed to direct communication from Cameron), Trieste comparison figures, "new amphipod species" discovery claim                                                                                                                                                                |
| 6   | "1960 Dive." DEEPSEA CHALLENGE (official expedition site, James Cameron/National Geographic/Rolex).                                                                                                                                                                                                                                               | https://deepseachallenge.com/the-team/1960-dive/                                                                           | Primary, official expedition site                   | 1960 Trieste dive narrative: descent time, 20 minutes on bottom, the fish/shrimp sighting quote, cracked window pane, surface time                                                                                                                                                                                                                                                                                                                                                            |
| 7   | "James Cameron on Earth's Deepest Spot: Desolate, Lunar-Like." National Geographic.                                                                                                                                                                                                                                                               | https://www.nationalgeographic.com/travel/article/120326-james-cameron-mariana-trench-challenger-deepest-lunar-sub-science | Primary journalism, co-sponsor of the expedition    | Cameron's 2012 dive: ~2.5h descent, amphipod sighting quote, hydraulic leak cutting the dive short, "featureless" bottom description, sediment sample                                                                                                                                                                                                                                                                                                                                         |
| 8   | Kobayashi, H., Hatada, Y., Tsubouchi, T., Nagahama, T., Takami, H. (2012). "The Hadal Amphipod _Hirondellea gigas_ Possessing a Unique Cellulase for Digesting Wooden Debris Buried in the Deepest Seafloor." _PLoS ONE_ 7(8):e42727. doi:10.1371/journal.pone.0042727.                                                                           | https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0042727                                                | Peer-reviewed, primary                              | ASHURA lander deployment (11 22.11'N, 142 25.86'E, 10,897 m, 10 Sep 2009, 185 individuals in 2.5 h), the amphipod's cellulase enzyme and wood/detritus diet, pressure/temperature of the enzyme assay (100 MPa, 2 degC)                                                                                                                                                                                                                                                                       |
| 9   | "Expanding Mariana Trench Perspectives" (cruise FK141215). Schmidt Ocean Institute.                                                                                                                                                                                                                                                               | https://schmidtocean.org/cruise/expanding-mariana-trench-perspectives/                                                     | Primary, research-institute expedition page         | The "Leggo" lander's December 2014 deployment: exact coordinate (11.368536 N, 142.5875166 E), depth (10,929 m), date (19 Dec 2014), species (Hirondellea gigas), pressure figure (~16,000 psi)                                                                                                                                                                                                                                                                                                |
| 10  | "The Deepest Living Animals." Schmidt Ocean Institute cruise log.                                                                                                                                                                                                                                                                                 | https://schmidtocean.org/cruise-log-post/the-deepest-living-animals/                                                       | Authoritative, research institute                   | Mariana snailfish depth limits (filmed to ~8,075 m, rare, none found deeper), general hadal-amphipod biology                                                                                                                                                                                                                                                                                                                                                                                  |
| 11  | "Research Highlight: Scientists ID Giant Amoebas in the Extreme Deep." Scripps Institution of Oceanography.                                                                                                                                                                                                                                       | https://scripps.ucsd.edu/news/research-highlight-scientists-id-giant-amoebas-extreme-deep                                  | Authoritative, research institute                   | Xenophyophore depth record (10,641 m, Sirena Deep, July 2011 Scripps/National-Geographic "Dropcam" expedition), previous record (~7,500 m, New Hebrides Trench), confirms Sirena Deep (not Challenger Deep) as the find location                                                                                                                                                                                                                                                              |
| 12  | GMRT Synthesis. Ryan, W.B.F. et al. (2009). "Global Multi-Resolution Topography synthesis." _Geochem. Geophys. Geosyst._ 10, Q03014. doi:10.1029/2008GC002332.                                                                                                                                                                                    | https://www.gmrt.org/                                                                                                      | Dataset citation, this project's own terrain source | Every terrain-derived POI depth and the north-wall slope calculation -- always read directly from `data/tiles/challenger-deep`'s grid, never looked up on the GMRT website itself                                                                                                                                                                                                                                                                                                             |
| 13  | Ocean Biodiversity Information System (OBIS)                                                                                                                                                                                                                                                                                                      | https://obis.org/                                                                                                          | Dataset citation                                    | `species.json` occurrence/checklist data (via `tools/obis_export.py`)                                                                                                                                                                                                                                                                                                                                                                                                                         |

Two sources were attempted but could not be used as intended: the ScienceDirect page for Greenaway et al. (2021)
returned HTTP 403 (paywalled), so source #2 above cites the NOAA Central Library repository record instead,
which was fetched successfully and gives the same abstract-level facts. A NOAA PMEL PDF
(`pmel.noaa.gov/pubs/PDF/dzia4367/dzia4367.pdf`), found while searching for a bottom-pressure/temperature source,
could not be parsed as text by either WebFetch or a local `pdftotext` pass and was dropped rather than cited
unread.

## Facts dropped for lack of a confirmed source

- The oceanic crust age figure ("up to 170 million years old") that appeared in the first draft's trench-walls
  entry came only from Wikipedia's Mariana Trench article. No fetched primary/authoritative source stated it
  during this session's research, so it has been removed rather than re-sourced to Wikipedia alone.
- The specific claim that Challenger Deep sits in the Federated States of Micronesia's EEZ (as opposed to simply
  "outside the monument") likewise came only from Wikipedia. The FWS source (#4 above) confirms "not within the
  monument"; the more specific FSM-EEZ claim has been dropped from the guide text rather than kept on a
  single-source basis.
- A precise bottom pressure figure in bar (the first draft used "1,086 bar" from Wikipedia) has been replaced
  with Schmidt Ocean Institute's own figure of ~16,000 psi (~1,100 bar, converted), which is the same order of
  magnitude but is now sourced to a fetched, authoritative page rather than Wikipedia.
- "JAMSTEC's 1980s-1990s surveys were the first to map the three pools separately," a specific historical claim
  in the first draft's `cd-central-basin` POI note, has been removed; no fetched source in this session
  confirmed that specific historical attribution, though Stewart & Jamieson (2019) and the Five Deeps press
  release both confirm the three-pool structure exists and is real.

## Terrain survey (unchanged from the first pass, via a standalone script using the same bilinear sampler as

`tools/validate_landmark.py`'s `Tile` class)

- `cd-eastern-pool-deepest` (11.3737, 142.5973): the single deepest cell in the tile, -10,930.89 m, matching
  `data/tiles/challenger-deep/meta.json`'s `min_m`.
- `cd-leggo-amphipod-site` (11.36854, 142.587517): Schmidt Ocean Institute's published position for the Leggo
  lander's 19 Dec 2014 deployment (11.368536 N, 142.5875166 E). This tile reads 10,925.1 m there, 4 m from
  Schmidt Ocean's own reported 10,929 m -- close agreement between an independent bathymetry survey and an
  in-situ pressure/altimeter reading. About 1.2 km from `cd-eastern-pool-deepest` (haversine).
- `cd-published-coordinate` (11.3733, 142.5917): the long-published IHO-IOC GEBCO Gazetteer coordinate
  (11 22.4'N 142 35.5'E) used by this game's `data/landmarks.json` pin. Reads 10,917.9 m here, about 0.6 km from
  the deepest cell.
- `cd-north-wall` (11.4055, 142.5830): 9,977.7 m depth. Slope measured by central-difference sampling of the
  heightmap at two baselines (one grid cell, ~60 m, and five cells, ~300 m): 28.8 deg and 25.0 deg respectively,
  reported in the guide as "~25-29 deg depending on sampling baseline."
- `cd-central-basin` (11.3676, 142.4270): 10,926.5 m, ~18.6 km west of the Eastern Pool (haversine). Matches the
  Five Deeps Expedition's explicitly-named "Central Pool" dive site.
- `cd-axis-sill` (11.362, 142.515): traced this session as the shallowest point along the deepest continuous
  path between the Central and Eastern Pool minima (same method as the Monterey Canyon pack's canyon-axis
  trace). 10,704.4 m at 142.515 E, lat 11.362. No source gives an exact sill coordinate; this POI's position is
  a terrain trace, not a citation (documented in its `note` field).

## Pacing

Both required (`primary: true`) objectives, `cd-eastern-pool-deepest` and `cd-leggo-amphipod-site`, are about
1.2 km apart (haversine) -- comfortably inside the ~3 km guideline from the Monterey Canyon pack's pacing
lesson. The four secondary/optional objectives fan out from there: `cd-published-coordinate` (~0.6 km),
`cd-north-wall` (~3.8 km), `cd-axis-sill` (~9 km) and `cd-central-basin` (~18.6 km).

## Spawn depth and descent time (task-specified)

At this submarine's ~5.37 m/s vertical terminal speed (full flood, `docs/missions.md`), a surface-to-floor
descent to ~10,931 m would take about 2,035 s (~33.9 min) of sim time even before any horizontal transit -- too
long for a mission. Per the task brief, `mission.json` sets `spawn.depth_m` to 6,000 m instead of the surface,
and the briefing says so explicitly. The remaining descent to the Eastern Pool floor (~4,931 m) takes about
918 s sim time: ~15.3 min real time at 1x, ~7.6 min at 2x, ~5.1 min at 3x sim speed.

## Hull class and the crush-warning band (reviewed condition)

`mission.json` uses `hull_class: "C"` (crush depth -11,000 m per `src/core/Config.ts`), the only class that
clears any Challenger Deep terrain at all. The deepest POI, `cd-eastern-pool-deepest` at 10,930.9 m, is real
terrain and sits well inside `validate_landmark.py`'s crush-warning band (>90% of crush depth, i.e. deeper than
9,900 m). `mission.json.pressure_band_review` records the measured POI, hull class, the 9,900 m warning threshold,
the 11,000 m crush depth, and the review reason. The validator checks each against the live content and hull config;
when all match, this condition prints a **reviewed note** and strict validation succeeds:

```
reviewed: [challenger-deep] mission.json: deepest POI "cd-eastern-pool-deepest" (10931 m) is inside the crush-warning
band of hull C (11000 m)
```

This is called out in this mission's own `briefing.hazards`. The recorded review is specific to these depths; a
changed POI or hull config restores the strict warning. It does not suppress any other validator warning.

## OBIS species data

Unchanged from the first pass. A `--depth-min 6000 --depth-max 11000` query (species rank, then genus, then
any) returned 0 taxa at every rank: OBIS has essentially no hadal-depth occurrence records inside this specific
~50x50 km tile bounding box. `species.json` instead uses `--rank genus` with no depth filter: 180 taxa in the
bbox, 69 at species/genus rank, kept the top 30 by record count (482 total occurrence records). Nearly all are
bacteria/archaea genera whose OBIS records carry `minimumDepthInMeters`/`maximumDepthInMeters` of 0-1.6 m --
near-surface water samples, unrelated to the ~10,900 m trench floor -- a detail spelled out in
`species.json.note`. The one metazoan present, _Hirondellea gigas_ (6 occurrence records, no reported depth), is
the same species documented by name in sources #8 and #9 above; its inclusion in `species.json` is independent
corroboration from a different database, not the source of the amphipod facts in the guide. Species placement in
the mission is invented; there are no species POIs or props at all.

## Fabricated vs. sourced

| Item                                                           | Sourced                                                | Reconstructed / estimated                                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seabed terrain (all POIs)                                      | GMRT bathymetry, Ryan et al. 2009 (source 12)          | Render-time detail noise (engine)                                                                                                                                                                                                                         |
| Trench length/width, subduction mechanism, plate names         | Stewart & Jamieson 2019 (1), NOAA NCEI (3)             | —                                                                                                                                                                                                                                                         |
| Deepest-point depth figures and coordinate history             | Stewart & Jamieson 2019 (1), Greenaway et al. 2021 (2) | —                                                                                                                                                                                                                                                         |
| Protected-area / jurisdiction status                           | U.S. Fish & Wildlife Service (4)                       | Specific FSM-EEZ attribution dropped (single-source only)                                                                                                                                                                                                 |
| Trieste 1960 dive details                                      | DEEPSEA CHALLENGE official site (6)                    | —                                                                                                                                                                                                                                                         |
| Cameron 2012 dive details                                      | National Geographic (7), Five Deeps press release (5)  | —                                                                                                                                                                                                                                                         |
| Five Deeps / Limiting Factor 2019, Eastern/Central Pool naming | Five Deeps Expedition press release (5)                | —                                                                                                                                                                                                                                                         |
| Leggo lander position, date and event                          | Schmidt Ocean Institute (9)                            | Physical lander prop: Leggo was recovered after the cruise; the `procedural:debris` marker stands in for a historic event, not a surviving structure -- no published dimensions for Leggo were found, so the marker's size is a small, arbitrary estimate |
| Hirondellea gigas biology (ASHURA lander, cellulase, diet)     | Kobayashi et al. 2012, PLoS ONE (8)                    | —                                                                                                                                                                                                                                                         |
| Deepest-fish and xenophyophore facts                           | Schmidt Ocean Institute (10), Scripps (11)             | Species are not rendered as models or placed at any POI; only described in text and listed in `species.json`                                                                                                                                              |
| North-wall slope figure                                        | —                                                      | Terrain trace / central-difference slope calc this session (GMRT, source 12)                                                                                                                                                                              |
| Sill between Central and Eastern Pools (`cd-axis-sill`)        | Three-basin structure documented (1, 5)                | Exact point is a terrain trace, not a citation                                                                                                                                                                                                            |
| Species list                                                   | OBIS occurrence/checklist data (13)                    | Placement in the mission (no species POIs/props)                                                                                                                                                                                                          |
| Spawn point                                                    | —                                                      | Chosen for gameplay: 6,000 m depth per the task brief, near the Eastern Pool, heading 140 deg                                                                                                                                                             |

## Final validator run

```
$ python3 tools/validate_landmark.py challenger-deep --strict
reviewed: [challenger-deep] mission.json: deepest POI "cd-eastern-pool-deepest" (10931 m) is inside the crush-warning
band of hull C (11000 m)
OK: challenger-deep, 0 error(s), 0 warning(s)
```

0 errors and 0 unreviewed warnings. The visible reviewed note preserves the intentional tight hull margin.

## Not verified / open

- No source gives an exact coordinate for the sill between the Central and Eastern Pools (`cd-axis-sill`); it is
  located by tracing this tile's real GMRT terrain, not by citation.
- Leggo's physical dimensions are not published anywhere found during this research pass; the debris marker's
  size (`props.json`) is an arbitrary small estimate.
- The reviewed crush-warning-band condition remains visible in validation output (see above).
- Three facts present in the first draft (170-Myr crust age, FSM-EEZ-specific jurisdiction, and the
  "JAMSTEC first mapped the three pools" historical claim) were removed in this revision because no source
  fetched this session confirmed them outside Wikipedia; see "Facts dropped for lack of a confirmed source"
  above.
