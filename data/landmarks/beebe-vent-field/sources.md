# Beebe Vent Field content: sources and notes (package C4, beebe-vent-field)

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json`, `mission.json`,
`species.json` in this folder. Tile: `data/tiles/beebe-vent-field` (GMRT Synthesis, Ryan et al.
2009, doi:10.1029/2008GC002332; bbox N 18.69618 / S 18.39626 / E -81.55920 / W -81.87726;
~58.0 x 61.1 m cells; `min_m` -6575.34, `max_m` -2087.00).

## Sources consulted (WebSearch/WebFetch this session)

| #   | Source                                                                                                                                                                                                                                                                                            | URL                                                                   | Used for                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Connelly, D.P. et al. 2012, "Hydrothermal vent fields and chemosynthetic biota on the world's deepest seafloor spreading centre", Nature Communications 3:620 (facts taken via WebFetch of Wikipedia's summary and WebSearch results after the Nature.com page itself redirected to a login wall) | https://www.nature.com/articles/ncomms1636                            | Discovery history (2009-2010, RV Cape Hatteras plume detection, RRS James Cook confirmation with Nereus/Autosub6000/HyBIS), depth range 4,957-4,987 m, supercritical venting, ultraslow Mid-Cayman spreading rate, primary citation for the field |
| 2   | Beebe Hydrothermal Vent Field — Wikipedia                                                                                                                                                                                                                                                         | https://en.wikipedia.org/wiki/Beebe_Hydrothermal_Vent_Field           | Coordinates (18 32'48"N 81 43'6"W), depth range, max temperature (403 degC at Beebe 1-5), chimney mineralogy, naming origin (William Beebe), Rimicaris hybisae's iron-brown color and eye loss                                                    |
| 3   | Webber, A.P. et al. 2015, "Geology, sulfide geochemistry and supercritical venting at the Beebe Hydrothermal Vent Field, Cayman Trough", Geochemistry, Geophysics, Geosystems 16 (accessed via WebSearch summary; AGU page not fetched directly)                                                  | https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2015GC005879 | Seven sulfide mounds on the field's western side, temperatures exceeding 407 degC / 298 bar, chimney mineralogy detail (pyrite, pyrrhotite)                                                                                                       |
| 4   | Nye, V. et al. 2012, "A new species of Rimicaris (Crustacea: Decapoda: Caridea: Alvinocarididae) from hydrothermal vent fields on the Mid-Cayman Spreading Centre" (author's own PDF copy)                                                                                                        | http://www.joncopley.com/docs/Rimicaris_hybisae.pdf                   | Species description, naming after HyBIS, eye loss with age, dorsal light-sensing organ, episymbiotic chemosynthetic feeding, relation to Rimicaris exoculata                                                                                      |
| 5   | Diverse styles of submarine venting on the ultraslow spreading Mid-Cayman Rise — PNAS                                                                                                                                                                                                             | https://www.pnas.org/doi/full/10.1073/pnas.1009205107                 | Corroborates the Mid-Cayman Spreading Centre's ultraslow spreading regime and diverse venting styles (Beebe vs. the off-axis Von Damm field)                                                                                                      |
| 6   | Von Damm Vent Field — Wikipedia                                                                                                                                                                                                                                                                   | https://en.wikipedia.org/wiki/Von_Damm_Vent_Field                     | Von Damm's coordinates (18 22'36"N 81 47'52"W = 18.37667, -81.79778) and depth (~2,300 m), used only to confirm it falls outside this tile's bbox (south boundary 18.39626 N) -- excluded from this mission per the task brief                    |
| 7   | InterRidge Vents Database — Beebe vent field (page found via search; direct WebFetch returned a connection error)                                                                                                                                                                                 | https://vents-data.interridge.org/ventfield/beebe                     | Listed as a general vent-field-registry citation; not read directly this session (connection refused), kept as a reference link only, no fact in this pack rests on it alone                                                                      |
| 8   | Global Multi-Resolution Topography (GMRT) Synthesis — Ryan et al. 2009, doi:10.1029/2008GC002332                                                                                                                                                                                                  | https://www.gmrt.org/                                                 | Every terrain-derived POI depth and the axial-valley transect, read directly from this tile's grid via `.probe_terrain.py` (an ad hoc script built this session on `validate_landmark.py`'s `Tile` class; not part of the shipped toolset)        |
| 9   | Ocean Biodiversity Information System (OBIS)                                                                                                                                                                                                                                                      | https://obis.org/                                                     | `species.json` (via `tools/obis_export.py --landmark beebe-vent-field --tile-bbox --max 30`); independently returned _Rimicaris hybisae_ (aphiaID 762988) inside this exact tile bbox, corroborating sources 2/4 from a separate database         |

Two sources (1, 3) could not be fetched directly as full text (Nature.com redirected to an
authentication wall; the AGU Wiley page was not fetched directly either) -- their facts come
from WebFetch's summary of Wikipedia (which itself cites Connelly et al. 2012 throughout) and
from WebSearch's own result summaries, which attribute specific numbers (depth range, max
temperature, mound count) clearly to each paper. This is noted in the guide's own source
citations rather than presented as a direct read of the primary text.

## Von Damm: excluded by design

Von Damm's published coordinates, 18.37667 N / 81.79778 W, sit south of this tile's south
boundary (18.39626 N) -- outside the bbox. Per the task brief, Von Damm is described only in the
`overview` guide entry and `mission.json`'s hazards (as context / "not reachable here") and has
no POI, no prop and no objective in this mission.

## Terrain survey (this session, via `.probe_terrain.py`)

- `bvf-main-vents` (18.5464, -81.718): -4,987.9 m, within a few tens of metres of Wikipedia's
  published field coordinate (18.5467, -81.7183) and at the deep end of Connelly et al.
  (2012)'s published depth range.
- `bvf-shrimp-swarm` (18.5462, -81.7175): -4,979.2 m, ~35 m from the main vent POI, inside the
  same real vent complex.
- `bvf-sulfide-mound-west` (18.5445, -81.7206): -4,957.1 m, ~1.4 km west of the main vent POI,
  found by a local grid search (0.0001-deg step) for points within the field's published
  4,957-4,987 m range; not a citation to one specific named mound among Webber et al.'s seven.
- `bvf-eastern-margin` (18.5514, -81.71): -4,952.6 m, ~1 km ENE of the main vent POI, slightly
  shallower than the published range -- included to show the terrain stays plausible this far
  out, flagged `confidence: "low"` and explicitly not a confirmed vent location.
- `bvf-spreading-axis` (18.57667, -81.80333): -5,395.8 m, the deepest point found along a
  straight NW-SE transect run across the tile's western half, tracing the general direction and
  depth of the Mid-Cayman Spreading Centre's axial valley on this tile's real terrain. About
  13 km from the main vent POI (haversine).
- A fine local grid search around the main vent coordinate (+/-0.006 deg in both axes, ~0.0001
  deg step) found no single sharp, closed mound peak that this tile's ~58x61 m GMRT grid clearly
  resolves as one specific sulfide edifice -- consistent with `docs/props.md`'s guidance that
  individual chimneys (a few to ~15 m across) are far smaller than this survey's grid can
  resolve. All four vent/mound POI depths are real terrain within or very near the field's
  published depth range; the chimney props placed on top of them are reconstructions (see
  `props.json`).

## Pacing

Primary objectives (`bvf-main-vents`, `bvf-shrimp-swarm`) are ~35 m apart and both ~500-700 m
from `mission.json`'s spawn point (18.548, -81.716) -- well inside a 10-minute budget. Three
secondary objectives fan out from ~1 km (`bvf-eastern-margin`) to ~13 km (`bvf-spreading-axis`)
as optional further exploration.

## Descent time

Spawn is at the surface (`depth_m: 5`); the deepest required objective (`bvf-main-vents`,
4,987.9 m) takes roughly 5 minutes of vertical descent at this submarine's ~5.4 m/s x3
sim-speed descent rate (4,987.9 / 16.2 ~= 308 s ~= 5.1 min) -- under the ~12-minute threshold in
the task brief, so no mid-water spawn shortcut (as used at Challenger Deep) is needed here.

## Hull class

`hull_class: "C"` (crush depth -11,000 m) per the task brief -- it is the only class that clears
this tile's terrain at all: hull B's -4,500 m crush depth is shallower than every POI in this
mission (the shallowest, `bvf-eastern-margin`, is already -4,952.6 m) and would fail outright,
not just warn. With hull C, the deepest POI (`bvf-spreading-axis`, -5,395.8 m) leaves roughly
5,600 m of margin to crush depth -- nowhere near the 90%-of-crush-depth warning band, so this
mission produces no crush-warning, unlike Challenger Deep.

## Chimney props

Three `procedural:chimney` props, all `material_hint: "sulfide"` (the near-black, rust-streaked
palette reserved for true black smokers, per `docs/props.md` and
`plan/progress/props-material.md`) -- the opposite chemistry and palette from
Kama'ehuakanaloa's low-sulfide, iron-oxide-mat vents in this same batch of packages. No
photogrammetric model of Beebe's real chimneys was found, so shapes/heights are reconstructions;
the field's chemistry, record temperature and general mound locations are sourced.

## Fabricated vs. sourced

| Item                                      | Sourced                                                                 | Reconstructed / estimated                                              |
| ----------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Seabed terrain (all POIs)                 | GMRT bathymetry, Ryan et al. 2009                                       | Render-time detail noise (engine)                                      |
| Field discovery, depth range, publication | Connelly et al. 2012 (1), Wikipedia (2)                                 | --                                                                     |
| Supercritical venting, max temperature    | Connelly et al. 2012 (1), Webber et al. 2015 (3)                        | --                                                                     |
| Sulfide mound count/mineralogy            | Webber et al. 2015 (3)                                                  | Which real-terrain point corresponds to which of the 7 mounds          |
| Rimicaris hybisae biology                 | Nye et al. 2012 (4)                                                     | Exact swarm/individual placement: reconstruction                       |
| Mid-Cayman ultraslow spreading            | Connelly et al. 2012 (1), PNAS (5)                                      | Axial-valley POI is a terrain trace, not a mapped plate boundary       |
| Von Damm's existence and exclusion        | Wikipedia (6)                                                           | -- (correctly excluded, no fabricated content)                         |
| Chimney prop shapes                       | Vent type and chemistry are real                                        | Individual shapes: reconstruction, no photogrammetry found             |
| Species list                              | OBIS occurrence data (9), independently corroborating Rimicaris hybisae | Placement of the shrimp swarm in the mission is invented               |
| Spawn point                               | --                                                                      | Chosen for gameplay: surface start above the primary-objective cluster |

## Final validator run

```
$ python3 tools/validate_landmark.py beebe-vent-field --strict
0 error(s), 0 warning(s)
```

## Not verified / open

- The Nature Communications and AGU GGG full texts were not fetched directly this session
  (login wall / not attempted); facts from them come via Wikipedia and WebSearch summaries that
  consistently and specifically attribute the same numbers to each paper.
- This tile's ~58x61 m GMRT grid does not resolve individual sulfide chimneys or mounds; all POI
  coordinates are real terrain within or very near the field's published depth range, not traced
  outlines of specific named structures.
- No photogrammetric or published shape data for Beebe's actual chimneys was found; the three
  placed chimney props are generic reconstructions.
