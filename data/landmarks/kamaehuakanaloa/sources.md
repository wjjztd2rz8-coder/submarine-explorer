# Kama'ehuakanaloa content: sources and notes (package C4, kamaehuakanaloa)

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json`, `mission.json`,
`species.json` in this folder. Tile: `data/tiles/kamaehuakanaloa` (GMRT Synthesis, Ryan et al.
2009, doi:10.1029/2008GC002332; bbox N 19.06694 / S 18.76646 / E -155.10718 / W -155.42578;
~57.8 x 61.1 m cells; `min_m` -5027.22, `max_m` -975.17).

## Naming

The official current name is **Kama'ehuakanaloa**, adopted by the Hawai'i Board on Geographic
Names in July 2021 (unanimous vote), replacing the descriptive name Lo'ihi ("long") given in 1955. This pack uses the current name throughout `mission.json`, `pois.json` and `guide.json`,
and dedicates a full guide entry (`renaming`) to the change and its cultural context, per the
task brief. `data/landmarks.json`'s own entry for this landmark already uses "Kama'ehuakanaloa
(Lo'ihi)" and states the renaming happened in 2021 -- consistent with this pack's research, no
correction needed there.

## Sources consulted (WebSearch/WebFetch this session)

| #   | Source                                                                                                                                                                                                                                                                                                                                                                   | URL                                                                                                             | Used for                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Volcano Watch: Kama'ehuakanaloa — the volcano formerly known as Lo'ihi Seamount — USGS Hawaiian Volcano Observatory                                                                                                                                                                                                                                                      | https://www.usgs.gov/observatories/hvo/news/volcano-watch-kamaehuakanaloa-volcano-formerly-known-loihi-seamount | Renaming date/authority (Hawai'i BGN, July 2021, unanimous), 1955 naming history (Kenneth Emery, Mary Kawena Pukui, Martha Hohu, Gordon Macdonald), meaning of "Lo'ihi", Ku'ulei Kanahele quote on the new name's meaning                                                                                                                                                                    |
| 2   | United States Board on Geographic Names — Undersea Feature Name Proposal, Kama'ehuakanaloa — Hawai'i Board on Geographic Names (official PDF)                                                                                                                                                                                                                            | https://files.hawaii.gov/dbedt/op/gis/bgn/HBGN_Meeting_20210803-06-ACUF_Kama%CA%BBehuakanaloa.pdf               | Primary-source corroboration of the 2021 renaming proposal (found via search; used as a citation for the official process, full text not parsed this session)                                                                                                                                                                                                                                |
| 3   | Volcano Watch: Treasures of the Deep Sea: Lo'ihi Hosts Hydrothermal Vents — USGS Hawaiian Volcano Observatory                                                                                                                                                                                                                                                            | https://www.usgs.gov/news/volcano-watch-treasures-deep-sea-loihi-hosts-hydrothermal-vents                       | Summit depth (~1,000 m / 3,200 ft), location (~30 km/20 mi SE of the Big Island), 1996 collapse event (largest Hawaiian earthquake swarm on record, Pele's Vents destroyed, Pele's Pit formed roughly Halema'uma'u-sized), post-collapse fluid temperatures (~80 degC rising to >200 degC by late 1997)                                                                                      |
| 4   | Kama'ehuakanaloa Seamount — Wikipedia                                                                                                                                                                                                                                                                                                                                    | https://en.wikipedia.org/wiki/Kama%CA%BBehuakanaloa_Seamount                                                    | Height above seafloor (>3,000 m/10,000 ft), north/south rift lengths (~7 mi/~12 mi), Pele's Pit dimensions (diameter ~600 ft... corrected to ~600 m per source 3's crater-diameter figure, wall height ~700 ft/~210 m, wall thickness ~70 ft/~21 m), iron-oxidizing bacterial mat chemistry (low sulfide, high CO2/Fe), island-formation timeline (10,000-100,000 years), renaming rationale |
| 5   | Quantitative PCR Analysis of Functional Genes in Iron-Rich Microbial Mats at an Active Hydrothermal Vent System (Lo'ihi Seamount, Hawai'i) — Applied and Environmental Microbiology (Amend lab; direct WebFetch returned HTTP 403, facts taken from WebSearch's summary of the article, which explicitly attributes the Hiolo North/South depths and temperatures to it) | https://journals.asm.org/doi/10.1128/aem.03608-14                                                               | Hiolo North depth (~1,300 m) and Hiolo South depth (~1,274 m) within Pele's Pit, diffuse warm venting (~20-50 degC), Hiolo South's ~47 degC mean fluid temperature (~7 degC hotter than Hiolo North), iron mat morphology ("chimneys" at Hiolo North, "cauliflower" texture at Hiolo South, mats up to ~0.5 m thick), Zetaproteobacteria as the iron-oxidizing mat-former                    |
| 6   | Global Multi-Resolution Topography (GMRT) Synthesis — Ryan et al. 2009, doi:10.1029/2008GC002332                                                                                                                                                                                                                                                                         | https://www.gmrt.org/                                                                                           | Every terrain-derived POI depth and the south-rift transect, read directly from this tile's grid via `.probe_terrain.py` (an ad hoc script built this session on `validate_landmark.py`'s `Tile` class; not part of the shipped toolset)                                                                                                                                                     |
| 7   | Ocean Biodiversity Information System (OBIS)                                                                                                                                                                                                                                                                                                                             | https://obis.org/                                                                                               | `species.json` (via `tools/obis_export.py --landmark kamaehuakanaloa --tile-bbox --max 30`)                                                                                                                                                                                                                                                                                                  |

Source 5 could not be fetched directly (ASM's site returned HTTP 403 to WebFetch); its facts
come from WebSearch's own summary of the article, which quotes specific numbers (depths,
temperatures) clearly attributed to that paper. This is noted explicitly in the guide entry's
own source citation rather than presented as a direct read.

## Terrain survey (this session, via `.probe_terrain.py`)

- Grid extrema: shallowest cell -975.17 m at 18.91725, -155.26401 (matches published summit
  depth closely); deepest cell -5027.22 m at 18.76784, -155.10745, well south of the summit and
  outside this mission's scope (still within hull B's -6,500 m rating).
- `kh-summit` (18.91725, -155.26401): -975.2 m, the tile's shallowest cell.
- A fine local grid search around the summit found the seabed deepening to the southwest/south,
  not a clean closed depression -- Pele's Pit's ~600 m-diameter crater rim is finer than this
  ~58x61 m grid resolves. Two points within that search bracket the published Hiolo North/South
  depths closely: `kh-hiolo-north` (18.91245, -155.26781) reads -1,300.3 m (published ~1,300 m)
  and `kh-hiolo-south` (18.91125, -155.26601) reads -1,274.3 m (published ~1,274 m), about 330 m
  apart, both about 0.6-0.7 km from the summit.
- `kh-south-rift` (18.9053, -155.2646) and `kh-flank-relief` (18.8878, -155.2655) both lie on a
  straight transect run due south from the summit at a fixed longitude step, reading -1,281.3 m
  (~1.4 km out) and -1,896.6 m (~3.4 km out) -- a terrain trace of the general south-rift
  direction, not a citation to a mapped rift-zone polygon.

## Pacing

Primary objectives (`kh-summit`, `kh-hiolo-north`) are ~0.66 km apart, both close to
`mission.json`'s spawn point (18.9205, -155.263, ~0.7-1 km away) -- comfortably inside a 10-minute
budget at this submarine's ~6.0 m/s terminal horizontal speed x3 sim speed. Three secondary
objectives (Hiolo South ~0.33 km from Hiolo North, south rift ~1.4 km from the summit, lower
flank ~3.4 km from the summit) are optional further exploration.

## Descent time

Spawn is at the surface (`depth_m: 5`); the deepest required objective (`kh-hiolo-north`,
1,300.3 m) takes well under two minutes of vertical descent at this submarine's ~5.4 m/s x3
sim-speed descent rate, so no mid-water spawn shortcut is needed.

## Hull class and rating margin

`hull_class: "B"` (rated depth -6,500 m). This tile's deepest cell (-5,027.22 m)
and every mission POI stay within the rating. The deepest POI is at -1,896.6 m.

## Chimney props

Three `procedural:chimney` props (two at Hiolo North, one at Hiolo South), all `dimensions_m[2]`
(height) at or under 5 m per the task brief, `material_hint: "basalt"` (the default grey-rock
palette with pale orange mineral staining, chosen over `sulfide` because Kama'ehuakanaloa's
vents are documented as low-sulfide and iron-rich -- the opposite chemistry from a black smoker
-- and over `carbonate` because these are not the alkaline, calcite-brucite towers of a
Lost-City-type field). No published photogrammetry of the Hiolo sites' actual chimney/mound
shapes was found, so all three props are flagged `reconstruction: true` and documented as
generic stand-ins in both `props.json` and the `vents` guide entry.

## Fabricated vs. sourced

| Item                                          | Sourced                                               | Reconstructed / estimated                                              |
| --------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Seabed terrain (all POIs)                     | GMRT bathymetry, Ryan et al. 2009                     | Render-time detail noise (engine)                                      |
| Renaming (date, authority, meaning, history)  | USGS HVO (1), Hawai'i BGN (2)                         | --                                                                     |
| Summit depth, seamount height, rift lengths   | Wikipedia (4), USGS HVO (3)                           | --                                                                     |
| 1996 collapse event and Pele's Pit dimensions | USGS HVO (3), Wikipedia (4)                           | Exact crater rim not traced on this tile's coarse grid                 |
| Hiolo North/South depths and temperatures     | Journal article via search summary (5)                | --                                                                     |
| Iron mat chemistry and Zetaproteobacteria     | Journal article via search summary (5), Wikipedia (4) | --                                                                     |
| Chimney/mound shapes at Hiolo sites           | Vent type and chemistry are real                      | Individual prop shapes: reconstruction, no photogrammetry found        |
| South rift zone direction and extent          | Wikipedia (4)                                         | Exact terrain trace on this tile's grid, not a mapped boundary         |
| Species list                                  | OBIS occurrence data (7)                              | Placement in the mission is invented (field guide + species.json only) |
| Spawn point                                   | --                                                    | Chosen for gameplay: surface start above the summit/Hiolo cluster      |

## Final validator run

```
$ python3 tools/validate_landmark.py kamaehuakanaloa --strict
0 error(s), 0 warning(s)
```

## Not verified / open

- Pele's Pit's ~600 m crater rim is not traced on this tile's ~58x61 m grid; the summit and
  Hiolo POIs sit on real terrain inside the collapsed summit area without claiming to outline
  the pit itself.
- Source 5's facts (Hiolo depths/temperatures) come from a WebSearch summary rather than a
  directly fetched full text (ASM's site returned HTTP 403); the specific numbers are
  consistently and clearly attributed to that paper across the search results, but a direct
  read was not possible this session.
- No photogrammetric or published shape data for the Hiolo vent chimneys/mounds was found; the
  three placed chimney props are generic reconstructions.
