# Hudson Canyon content: sources and notes (package C4, hudson-canyon)

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `mission.json`, `props.json` (empty),
`species.json` in this folder. Tile: `data/tiles/hudson-canyon` (GMRT Synthesis, Ryan et al.
2009, doi:10.1029/2008GC002332; bbox N 39.65009 / S 39.15021 / E -72.09998 / W -72.70038;
~47.3 x 61.1 m cells; `min_m` -1683.08, `max_m` -67.86).

## Sources consulted (WebSearch/WebFetch this session)

| #   | Source                                                                                                       | URL                                                                                                      | Used for                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Proposed Designation of Hudson Canyon National Marine Sanctuary — NOAA Office of National Marine Sanctuaries | https://sanctuaries.noaa.gov/hudson-canyon/                                                              | Sanctuary designation status (proposed, not designated; process opened June 2022; 17,000+ scoping comments; no target date published), canyon location/size, depth range                                                                                                                                         |
| 2   | Proposed Designation of Hudson Canyon National Marine Sanctuary — Mid-Atlantic Fishery Management Council    | https://www.mafmc.org/actions/hudson-canyon                                                              | Canyon size (350 mi seaward, up to 7.5 mi wide, 2-2.5 mi deep), habitat description (steep slopes, rock outcrops, nutrient flux), Frank R. Lautenberg Deep Sea Coral Protection Area (~100,000 km^2 / ~38,000 sq mi, bans bottom-tending gear), fishing-grounds importance, MAFMC's designation-process concerns |
| 3   | Frank R. Lautenberg Deep-Sea Coral Protection Area — Wikipedia                                               | https://en.wikipedia.org/wiki/Frank_R._Lautenberg_Deep-Sea_Coral_Protection_Area                         | Cross-check on the coral protection area's existence and scope (kept as a secondary corroboration alongside source 2, which independently states the same area/rule)                                                                                                                                             |
| 4   | Explore the Depths: Hudson Canyon Live! — NOAA Office of National Marine Sanctuaries                         | https://sanctuaries.noaa.gov/news/2025/explore-the-depths-hudson-canyon-live.html                        | Sept 2025 ROV Global Explorer expedition: two-week live-streamed survey of coral/sponge/fish communities and eDNA collection, explicitly to support the sanctuary review                                                                                                                                         |
| 5   | Hudson Canyon — Britannica                                                                                   | https://www.britannica.com/place/Hudson-Canyon                                                           | Canyon location (~100 mi SE of New York City), general description, corroborates depth figures                                                                                                                                                                                                                   |
| 6   | A catastrophic meltwater flood event and the formation of the Hudson Shelf Valley — USGS                     | https://pubs.usgs.gov/publication/70030018                                                               | Hudson Shelf Valley formation: catastrophic glacial meltwater flood, 15 m banks, 120 sq km bedform field, outer-shelf delta deposit                                                                                                                                                                              |
| 7   | A catastrophic meltwater flood event and formation Hudson Shelf Valley — USGS (mirror/search summary)        | https://www.usgs.gov/publications/a-catastrophic-meltwater-flood-event-and-formation-hudson-shelf-valley | Valley length (~150 km), head/tail depths (~30 m near the harbor mouth, ~85 m near the canyon head), "largest physiographic feature on the mid-Atlantic shelf," not infilled with Holocene sediment                                                                                                              |
| 8   | Global Multi-Resolution Topography (GMRT) Synthesis — Ryan et al. 2009, doi:10.1029/2008GC002332             | https://www.gmrt.org/                                                                                    | Every terrain-derived POI depth and the wall-slope calculation -- read directly from this tile's grid via `.probe_terrain.py` (an ad hoc script built this session on `validate_landmark.py`'s `Tile` class; not part of the shipped toolset)                                                                    |
| 9   | Ocean Biodiversity Information System (OBIS)                                                                 | https://obis.org/                                                                                        | `species.json` (via `tools/obis_export.py --landmark hudson-canyon --tile-bbox --max 30`)                                                                                                                                                                                                                        |

Wikipedia was used once, for source 3, only as a secondary corroboration of a fact (the coral
protection area's existence and scope) that is independently and more specifically stated by
source 2 (MAFMC, the body that actually adopted the rule); no guide fact rests on Wikipedia
alone.

## Sanctuary status -- the one fact this pack corrects against `data/landmarks.json`

This game's own `data/landmarks.json` entry for `hudson-canyon` says the area was "Designated
Hudson Canyon National Marine Sanctuary in 2025." That is not accurate as of this research
session (2026-09-23): NOAA's own sanctuary page (source 1) describes the effort as still in its
early stages, reviewing 2022 scoping comments and preparing draft documents, with no
designation finalized and no target date published. `guide.json`'s `sanctuary` entry and
`mission.json`'s briefing both state the sanctuary is **proposed, not yet designated**, per the
task's explicit instruction to get this right. `data/landmarks.json` itself was not edited (out
of scope for this package; C1/globe content owns it).

## Terrain survey (this session, via `.probe_terrain.py`, a small script built on

`tools/validate_landmark.py`'s `Tile` class -- bilinear elevation sampling, grid extrema and
straight-line transects)

- Grid extrema: shallowest cell -67.86 m at 39.58994, -72.69791 (tile's NW corner); deepest
  cell -1683.08 m at 39.36856, -72.10025 (tile's SE corner). Both match
  `data/tiles/hudson-canyon/meta.json`'s `min_m`/`max_m`.
- A straight-line transect from the shallow corner to the deep corner (used to orient the
  general canyon-axis direction) crosses the shelf (67-300 m) for about three-quarters of its
  length, then drops sharply past ~72.22 W into canyon-proper depths -- consistent with a canyon
  whose head/shelf-break nick sits close to that transect's 0.75-0.80 fraction.
- `hc-canyon-wall` (39.42, -72.21): 541.92 m deep. Local slope from central-difference sampling
  at a one-grid-cell baseline (~50-60 m): ~18.5 deg (compare to a few nearby cells tested,
  10.6-18.5 deg depending on exact point and baseline -- reported in the guide as "~18-19 deg").
- `hc-coral-ledge` (39.41, -72.18): 941.90 m deep, ~2.8 km from the wall POI (haversine). Chosen
  as a steep mid-canyon flank inside the Frank R. Lautenberg Deep Sea Coral Protection Area's
  footprint (source 2/3), not from any specific coral-colony dataset (none found; see below).
- `hc-upper-floor` (39.40, -72.16): 1,220.12 m deep, ~4.9 km from the wall POI.
- `hc-deepest-sounding` (39.369, -72.100): -1,682.59 m, the tile's single deepest cell,
  ~9.4 km from the wall POI.
- `hc-shelf-valley` (39.478, -72.399): 126.5 m deep, on the same NW-SE transect described
  above, ~26 km from the wall POI. This is a coarse-grid approximation of the shelf valley's
  general path, not a point taken from USGS's own valley centerline shapefiles (not fetched this
  session -- they are GIS data releases, not text sources practical to read via WebFetch).
- `hc-shelf-edge-head` (39.589, -72.698): -67.86 m, the tile's shallowest cell, at its NW
  corner, ~34 km from the wall POI. Published sources (5, and Wikipedia's Hudson Canyon
  coordinate, cross-checked but not cited as a guide fact) place the literal canyon head a little
  further north/east, around 39.66-39.67 N / 72.47-72.48 W, just outside this tile -- documented
  explicitly in the POI's own `note` rather than silently treated as the same point.

## Pacing

Both primary objectives (`hc-canyon-wall`, `hc-coral-ledge`) are ~2.8 km apart and both are
~6-9 km from `mission.json`'s spawn point (39.45, -72.27), well inside a 10-minute budget at this
submarine's ~6.0 m/s terminal horizontal speed x3 sim speed (~18 m/s): roughly 5-9 minutes of
transit for both required objectives combined. The four secondary objectives fan out from
~4.9 km (`hc-upper-floor`) to ~34 km (`hc-shelf-edge-head`) as optional further exploration, the
same pattern used by the Challenger Deep and Monterey Canyon packs for distant lore/geology
points.

## Descent time

Spawn is at the surface (`depth_m: 5`) directly above the primary-objective cluster; the deepest
required objective (`hc-canyon-wall`, 541.9 m) is reached in well under a minute of vertical
descent at this submarine's ~5.4 m/s x 3 sim-speed descent rate, so no mid-water spawn shortcut
is needed (unlike Challenger Deep).

## Hull class

`hull_class: "B"` (crush depth -4,500 m) per the task brief -- ample margin below this tile's
deepest terrain (1,682.6 m); no crush-warning band is approached anywhere in this mission.

## Not found / not used

- No public dataset from the 2023-2025 NOAA Deep-Sea Coral Research and Technology Program
  cruises or the September 2025 ROV Global Explorer expedition gives an exact, citable coral- or
  sponge-colony coordinate usable for a scan point; `hc-coral-ledge`'s position is therefore an
  invented stand-in on a real steep wall inside the protected area's footprint, flagged
  `reconstruction: true` and documented as such in both the POI note and the guide entry. No
  coral prop is rendered (`props.json` is empty) because `docs/props.md`'s procedural kinds
  (`hull-block`, `debris`, `chimney`) have no coral builder.
- The USGS Hudson Shelf Valley bathymetry/trackline GIS layers (shapefiles/GeoTIFFs) were found
  via search but not fetched as text sources; the valley's general path/depths used here come
  from the USGS publication abstracts (sources 6-7) plus this tile's own terrain, not from
  reproducing that GIS centerline exactly -- documented as "medium" confidence on the
  `hc-shelf-valley` POI.
- `notable_species` in `mission.json` was checked against this landmark's actual OBIS export
  (`species.json`) rather than invented: blue shark (_Prionace glauca_) and piked/spiny dogfish
  (_Squalus acanthias_) both appear in the bbox's OBIS records.

## Fabricated vs. sourced

| Item                                               | Sourced                           | Reconstructed / estimated                                                                                    |
| -------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Seabed terrain (all POIs)                          | GMRT bathymetry, Ryan et al. 2009 | Render-time detail noise (engine)                                                                            |
| Canyon size, sanctuary proposal status             | NOAA (1), MAFMC (2)               | --                                                                                                           |
| Frank R. Lautenberg Deep Sea Coral Protection Area | MAFMC (2), Wikipedia (3)          | --                                                                                                           |
| Sept 2025 ROV survey expedition                    | NOAA (4)                          | --                                                                                                           |
| Hudson Shelf Valley formation/geometry             | USGS (6, 7)                       | Exact valley centerline vs. this tile's coarse grid; `hc-shelf-valley`'s point is an approximation           |
| Canyon head position                               | Britannica (5)                    | This tile's shallowest cell stands in for the (slightly out-of-tile) literal head                            |
| Coral-ledge habitat type and protection status     | MAFMC (2), NOAA (4)               | Exact colony position: invented, flagged `reconstruction: true`                                              |
| Species list                                       | OBIS occurrence data (9)          | Placement in the mission is invented (field guide only; no species POIs beyond the habitat-type biology POI) |
| Spawn point                                        | --                                | Chosen for gameplay: surface start above the primary-objective cluster                                       |

## Final validator run

```
$ python3 tools/validate_landmark.py hudson-canyon --strict
0 error(s), 0 warning(s)
```

## Not verified / open

- Exact coral-colony coordinates from recent Hudson Canyon survey cruises: not found in a
  publicly citable form during this session.
- The USGS Hudson Shelf Valley GIS centerline was not cross-checked point-by-point against this
  tile's grid; `hc-shelf-valley` is a coarse approximation, confidence "medium."
