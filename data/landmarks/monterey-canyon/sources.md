# Monterey Canyon content: sources and notes (package C4a)

## F-FACTCHECK-630 correction (2026-10-04)

The authoritative claim-by-claim review is [F-FACTCHECK-630](../../../plan/progress/F-FACTCHECK-630.md). The earlier research notes below are historical; their Wikipedia-based claims and terrain interpretations are superseded wherever the review identifies a discrepancy or an unresolved claim.

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json`, `mission.json`, `species.json` in this
folder. Tile: `data/tiles/monterey-canyon` (GMRT, bbox N 36.9502 / S 36.5998 / E -121.7499 / W -122.2004, cellsize
48.98 x 61.15 m, min/max -2,332.81 / 265.41 m). Note the tile's deepest cell is 2,332.8 m; MBARI's main-channel continuation
ends below 4,000 m on the abyssal plain, beyond the tile's western edge. The catalogue's 3,600 m is an offshore reference depth, not the canyon maximum.

## Sources consulted

| #   | Source                                                                                                                                     | URL                                                                                                                    | Used for                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Monterey Canyon — Wikipedia                                                                                                                | https://en.wikipedia.org/wiki/Monterey_Canyon                                                                          | Length (~153 km), wall height (1.6-1.7 km), maximum depth (~3,600 m), origin (drowned river outlet / ancient lake drainage), turbidity-current maintenance, comparison to Grand Canyon                                                                         |
| 2   | Monterey Canyon — MBARI, Know Your Ocean                                                                                                   | https://www.mbari.org/know-your-ocean/monterey-canyon/                                                                 | Canyon head close to shore at Moss Landing ("backyard"), turbidity current speeds (~7 m/s) and travel distance (50+ km), frequency (several times/year in upper canyon), carbon-transport role                                                                 |
| 3   | Global Multi-Resolution Topography (GMRT) Synthesis — Ryan et al. 2009, doi:10.1029/2008GC002332                                           | https://www.gmrt.org/                                                                                                  | Seabed depths (this tile), grid resolution, deepest tile cell (2,332.8 m)                                                                                                                                                                                      |
| 4   | Powerful turbidity currents driven by dense basal layers — Paull et al. 2018, Nature Communications 9:4114, doi:10.1038/s41467-018-06254-6 | https://www.nature.com/articles/s41467-018-06254-6                                                                     | Peer-reviewed measurement of turbidity-current frontal speeds up to ~7.2 m/s in Monterey Canyon, 18-month multi-institutional monitoring of a 50 km stretch (second source for the canyon-axis guide entry)                                                    |
| 5   | Large underwater experiment in Monterey Canyon shows turbidity currents involve movement of the seafloor — USGS                            | https://www.usgs.gov/center-news/large-underwater-experiment-monterey-canyon-shows-turbidity-currents-involve-seafloor | Corroborates the 50-km-stretch, multi-year turbidity-current monitoring effort (second, independent source for the canyon-axis guide entry)                                                                                                                    |
| 6   | Monterey Accelerated Research System (MARS) — MBARI                                                                                        | https://www.mbari.org/technology/monterey-accelerated-research-system-mars/                                            | MARS depth (891 m), 52 km shore cable, power step-down (10,000 V to 375/48 V DC), 100 Mbps per instrument across 8 ports, frame dimensions (~3.7 x 4.6 m base, 1.2 m tall), NSF development support since 2002; live from 10 November 2008, published position |
| 7   | Monterey Accelerated Research System — Wikipedia                                                                                           | https://en.wikipedia.org/wiki/Monterey_Accelerated_Research_System                                                     | Corroborates cable length (52 km) and operational date (10 Nov 2008); second source for the mars-node guide entry                                                                                                                                              |
| 8   | Ocean Biodiversity Information System (OBIS)                                                                                               | https://obis.org/                                                                                                      | `species.json` occurrence data (via `tools/obis_export.py`)                                                                                                                                                                                                    |

## Terrain survey (this session, via `validate_landmark.Tile`'s bilinear sampler)

- Canyon head POI (`monterey-canyon-head`): real GMRT terrain, ~2.5 km offshore of Moss Landing on a bearing of
  ~260 deg, seabed 44 m. No source publishes an exact head coordinate; located by inspecting the terrain trace
  where the steep-walled incision into the shelf begins, close to shore as the sources describe.
- Upper-canyon / shelf-break POI (`monterey-canyon-upper-channel`, added this session for the pacing fix below):
  sampled along a straight line from the head toward the traced axis at 250 m steps. Depth rises from 44 m at the
  head to 265 m at 2.8 km down-canyon, where the shelf break steepens sharply; this is the point used.
- Canyon axis: traced as the deepest-path route through the heightmap from the head outward. The 1,000 m and
  2,000 m axis POIs are at 1,016.5 m (about 20 km from Moss Landing) and 2,033.5 m (about 32 km from Moss Landing)
  respectively — no published coordinates exist for specific axis points at these depths, so both are located by
  terrain tracing.
- Canyon wall POI: sampled perpendicular to the traced axis at the 1,000 m axis point; 748 m deep, ~700 m north of
  the axis at the same longitude (~270 m of relief).
- MARS node: MBARI's published position (36 deg 42.7481' N, 122 deg 11.2139' W = 36.712468, -122.186898) reads
  888 m on this tile's GMRT terrain, within 3 m of the published 891 m depth — used as-is. The node's real
  trawl-resistant frame is not modelled; the placed marker is flagged `reconstruction: true` and the prop note
  explains why.

## Pacing fix (task-flagged)

The original two required (`primary: true`) objectives were `monterey-canyon-head` and
`monterey-canyon-axis-1000m`, about 17.5 km apart in a straight line — well over 16 minutes of transit at the
submarine's ~6.03 m/s forward terminal speed even at 3x sim speed (`docs/missions.md`). That is far too long for a
mandatory pair of objectives.

Fix: added a new primary POI, `monterey-canyon-upper-channel`, about 2.8 km down-canyon from the head (real
terrain, guide entry `upper-canyon`), and made it the second required objective alongside the head. The former
axis-1000m objective was first made optional, then removed in D3 along with the axis-2000m point because both
were unmarked depth crossings. The canyon wall and MARS node remain optional. `mission.json.completion` is
still `all_primary`, so the mission completes on the two nearby scans. Straight-line distances (haversine):
head-to-upper-channel ~2.8 km; head-to-the former axis-1000m target ~17.5 km.

## OBIS species data

`python3 tools/obis_export.py --landmark monterey-canyon --tile-bbox --depth-min 200 --depth-max 3600 --max 40
--out data/landmarks/monterey-canyon/species.json` (checklist endpoint, ranked by record count within the tile
bbox and the 200-3,600 m depth filter). Ran live against `api.obis.org` this session (41 network requests, ~1 s
apart, cached under `.cache/obis/`): 885 taxa matched the bbox, 449 at species rank within the depth filter,
129,124 occurrence records total; the top 40 by record count were kept, topped by _Heteropolypus ritteri_ (7,012
records, 196-1,879 m) and _Umbellula lindahli_ (5,460 records, 375-1,192 m). See `species.json` for the full list,
record counts and depth ranges. Species placement in the mission is invented; `species.json.note` and the guide
say so. No species POIs or props are placed in this pack — the field guide's species tab is the only place
species appear.

## Hull class

D3 removed the 2,033.5 m axis point. `mission.json` retains the Class B hull (rated depth
6,500 m) so players can explore the canyon below the optional MARS node at 891 m. The tile
reaches 2,332.8 m, within this hull's rating.

## Fabricated vs. sourced

| Item                                       | Sourced                                                              | Reconstructed / estimated                                                              |
| ------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Seabed terrain                             | GMRT bathymetry (real survey)                                        | Render-time detail noise (engine)                                                      |
| Canyon length, wall height, mouth depth    | Wikipedia (source 1)                                                 | —                                                                                      |
| Canyon head closeness to shore             | MBARI Know Your Ocean (source 2)                                     | Exact head coordinate (no source publishes one; located by terrain trace)              |
| Turbidity current speed/distance/frequency | MBARI (source 2), Paull et al. 2018 (source 4), USGS (source 5)      | —                                                                                      |
| Shelf-break steepening near the head       | Terrain trace (this session), general canyon description (source 1)  | Exact point (no source names this specific transition; located by sampling depth)      |
| MARS depth, cable, power, data specs       | MBARI (source 6), corroborated by Wikipedia (source 7)               | Real frame shape/dimensions not modelled; placed marker is a simplified debris cluster |
| Canyon axis path and depths                | Terrain trace (deepest-path search over the heightmap, this session) | No published coordinates for specific axis points                                      |
| Species list                               | OBIS occurrence/checklist data (source 8)                            | Placement in the mission (species do not appear as POIs/props at all)                  |
| Spawn point                                | —                                                                    | Chosen for gameplay: ~0.5 km from the canyon head, heading 258 deg                     |

## Not verified / open

- No source gives an exact coordinate for the canyon head, a specific canyon-wall point, or specific canyon-axis
  points at 1,000/2,000 m; all four are located by tracing this tile's real GMRT terrain rather than by citation,
  and each POI's `note` field says so.
- The upper-channel POI added for the pacing fix is likewise a terrain-traced point, not a cited coordinate.
