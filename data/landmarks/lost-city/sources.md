# Lost City content: sources and notes (package C4a)

## Phase F factual corrections — 2026-10-01

- Discharge is clear, warm alkaline fluid, not an opaque white smoker. The [NOAA fluid comparison, page 2](https://oceanexplorer.noaa.gov/okeanos/explorations/ex1104/background/edu/media/ex1104_tracking.pdf) supports clear flow. Mission overrides disable smoke and warm glow and retain shimmer strength 0.03; existing generic carbonate builders do not emit a second plume.
- Replace the earlier 500 m² field claim: [NOAA’s 2005 field log](https://oceanexplorer.noaa.gov/explorations/05lostcity/logs/july29/july29.html) gives about 60,000 m². This corrects the earlier source-table and terrain-survey notes below. Individual chimneys still need finer mapping than this grid.
- [Denny et al. 2016](https://repository.library.noaa.gov/view/noaa/59651) gives Poseidon’s composite edifice as about 60 m tall and 100 m across. The hero envelope becomes [100,100,60] m; its depth/shape are build choices and its base remains snapped to the same terrace.
- [Ludwig et al. 2011](https://www.sciencedirect.com/science/article/abs/pii/S0016703711000135) dates sampled field carbonate up to about 120,000 years. Do not assign that oldest sample age to the whole active Poseidon tower. The historical Beehive and separate IMAX scan markers remain documented game placements.

## Source review, 2026-09-23

The initial research pass relied heavily on Wikipedia. A later check against the original field accounts and research corrected the named-structure entries:

- [Denny et al. (2016), _Geologic evolution of the Lost City Hydrothermal Field_](https://agupubs.onlinelibrary.wiley.com/doi/10.1002/2015GC005869) describes Poseidon as a 60 m composite edifice, Beehive as a roughly 1 m vent on its flank, and IMAX as a roughly 30 m multipronged chimney on its north face. The paper also supplies a geologic survey basis for the field's long history.
- [Aquino et al. (2024), _Fluid Mixing and Spatial Geochemical Variability in the Lost City Hydrothermal Field Chimneys_](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2023GC011011) reports that the Beehive chimney was absent during the 2018 sampling visit, though fluid still emerged at its former opening. The in-game marker therefore depicts the historical vent, with a deliberately offset position for scanning.
- [Kelley et al. (2005), _The Lost City Hydrothermal Field_](https://tos.org/oceanography/assets/docs/18-3_kelley.pdf) describes the IMAX chimney as about 8 m tall. Denny et al. (2016) later describe a roughly 30 m structure; the sources may measure different parts or stages of this growing complex. The prop retains an 8 m illustrative marker, and the guide states both measurements.
- [Ludwig et al. (2011), _U-Th systematics and 230Th ages of carbonate chimneys_](https://www.sciencedirect.com/science/article/abs/pii/S0016703711000135) supports the old carbonate age. Individual prop coordinates remain illustrative because this terrain grid does not resolve chimney footprints.

The original source table below records the first pass; use the corrections above for Beehive and IMAX dimensions and placement.

Researched 2026-09-22/23. Files: `pois.json`, `guide.json`, `props.json`, `mission.json`, `species.json` in this
folder. Tile: `data/tiles/lost-city` (GMRT, bbox N 30.2005 / S 30.0302 / E -42.0194 / W -42.2210, cellsize
52.9 x 61.1 m, summit 724.1 m, min/max -5002.2 / -724.1 m).

## Sources consulted

| #   | Source                                                                                           | URL                                                        | Used for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Lost City Hydrothermal Field — Wikipedia                                                         | https://en.wikipedia.org/wiki/Lost_City_Hydrothermal_Field | Discovery (4 Dec 2000, Alvin + ArgoII, RV Atlantis); depth range 750-900 m; nominal coordinate 30°07'0"N 42°07'0"W; field-extent claim superseded by the NOAA correction above; serpentinization power source; fluid 40-90 degC, pH >9, rich in H2/CH4, low in CO2/H2S/metals; Poseidon ~60 m tall / ~100 m wide (edifice); Beehive and IMAX Tower named structures, IMAX Tower ~8 m; Methanosarcinales-like archaea biofilms; fauna present (small corals, snails, bivalves, polychaetes, amphipods, ostracods) and absent (tubeworms, giant clams); comparison to black smokers; carbonate-age claims superseded by the primary age correction above; astrobiology relevance (Europa, Enceladus); UNESCO protection-wishlist status |
| 2   | Atlantis Massif — Wikipedia                                                                      | https://en.wikipedia.org/wiki/Atlantis_Massif              | Oceanic core complex, detachment-fault uplift of mantle/lower-crust rock, ~15 km off-axis from the Mid-Atlantic Ridge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3   | Global Multi-Resolution Topography (GMRT) Synthesis — Ryan et al. 2009, doi:10.1029/2008GC002332 | https://www.gmrt.org/                                      | Seabed depths (this tile), grid resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 4   | Ocean Biodiversity Information System (OBIS)                                                     | https://obis.org/                                          | `species.json` occurrence data (via `tools/obis_export.py`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 5   | data/landmarks.json (this repo)                                                                  | —                                                          | Catalog entry: nominal position 30.1167, -42.1167; depth_range_m [750, 900]; facts/hooks used as a starting checklist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

The InterRidge vents-data site (`https://vents-data.interridge.org/`) was attempted but its TLS certificate is
currently expired (fetch failed with "certificate has expired" on 2026-09-23); it was not used. Everything above
is corroborated by the landmarks.json catalog entry, which independently cites the same Wikipedia article plus
InterRidge.

## Terrain survey (this session, via `tools/inspect_tile.py` and a bilinear sampler built on

`validate_landmark.Tile`)

- Tile summit (shallowest cell): 724.4 m at 30.1255 N, -42.1181 W (grid search over the tile).
- The data/landmarks.json pin (30.1167, -42.1167, = the rounded 30°07'N 42°07'W published coordinate) reads
  **1,332.3 m** here — on the massif's south wall, not the 750-900 m field. A profile straight south from the
  summit (30.1255, -42.1181) shows a steady, monotonic drop from 725 m to over 2,500 m across roughly 4 km; there
  is no local flattening or bench near 1,332 m that would suggest a second, deeper vent terrace — it is simply a
  point partway down a slope.
- A grid search for the nearest terrain to that pin actually inside the field's published 750-900 m range found
  it about 665 m north (bearing ~340°) of the pin, centred near 30.1223-30.1250 N, -42.118 to -42.121 W, on the
  summit's southern flank. All vent POIs and props in this pack are placed inside that patch (see coordinates in
  `pois.json`/`props.json`), each individually re-checked against the terrain.
- NOAA's 2005 field account gives about 60,000 m², spanning multiple cells of this tile's ~53 × 61 m grid.
  Individual chimneys and their exact outlines remain smaller than the terrain resolution. Internal prop
  placement within the corrected terrace is authored at terrain-matched depths.

## Discrepancy: catalog position vs. real terrain (task-flagged)

**Confirmed.** The `data/landmarks.json` entry's coordinate (30.1167, -42.1167) is the same rounded, arc-minute
coordinate Wikipedia's infobox gives (30°07'0"N 42°07'0"W), which is precise only to about 1.8 km. On this tile's
real bathymetry it lands on the massif's south wall at 1,332 m, roughly 550-600 m deeper than the published
750-900 m field depth. This is documented in-game: `lost-city-south-wall` is a POI at the literal catalog
coordinate (kind `geology`, `reconstruction: false`, since the terrain there is real), and its guide entry and the
mission briefing both explain the gap. All vent-related POIs/props use the corrected, terrain-matched location
instead, about 665 m away.

## Chimney colour

Lost City's chimneys are pale carbonate (calcite/aragonite and brucite), not basalt: closer to white/light grey,
because they form by mineral precipitation from alkaline fluid rather than the dark metal-sulfide deposits of a
black smoker. Every chimney in `props.json` sets `"material_hint": "carbonate"` (see `docs/props.md`), which
renders a cream-grey body with whiter tips instead of the default basalt grey. The exact shade is an art choice,
not a measured colour.

## OBIS species data

`python3 tools/obis_export.py --landmark lost-city --tile-bbox --rank any --max 20 --out
data/landmarks/lost-city/species.json` (checklist endpoint, 200 taxa matched in the bbox, 1,192 records). Run with
`--rank any` per the prior session's notes: essentially every OBIS record in this bbox is archaea/bacteria from a
2003 International Census of Marine Microbes (ICoMM) survey, with no reported collection depth, so filtering to
species/genus rank or a depth window would return almost nothing. `species.json.note` says placement of any
visible mat is invented. The `lost-city-microbial-mat` POI sits near the OBIS sample cluster at ~30.124,
-42.1193 (real coordinate; the visible biofilm itself is a reconstruction).

## Hull class

D3 removed the unmarked south-wall POI. The vent POIs are at about 758-801 m seabed depth.
`mission.json` retains the Class B hull (rated depth 6,500 m) so players can explore the massif's
deeper slopes beyond the required tower scans.

## Fabricated vs. sourced

| Item                                             | Sourced                                                        | Reconstructed / estimated                                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Seabed terrain                                   | GMRT bathymetry (real survey)                                  | Render-time detail noise (engine)                                                                                          |
| Field depth range, power source, fluid chemistry | Wikipedia (source 1)                                           | —                                                                                                                          |
| Poseidon height (~60 m)                          | Wikipedia                                                      | Exact shape, footprint, base diameter (edifice "100 m wide" reinterpreted as a single tower's base, ~70 m, is an estimate) |
| Beehive                                          | Name only (Wikipedia)                                          | Height, exact position                                                                                                     |
| IMAX Tower height (~8 m)                         | Wikipedia                                                      | Exact position                                                                                                             |
| 2 unnamed small chimneys                         | Real fields have many more chimneys than are named (source 1)  | Existence at these positions, heights (6-9 m)                                                                              |
| Microbial mat POI                                | OBIS occurrence cluster location (real)                        | Visible mat rendering, exact taxa shown                                                                                    |
| Atlantis Massif summit POI                       | Real GMRT terrain, oceanic-core-complex description (source 2) | —                                                                                                                          |
| South-wall (discrepancy) POI                     | Real GMRT terrain; catalog coordinate is real                  | Framing as a "teaching" POI                                                                                                |
| Spawn point                                      | —                                                              | Chosen for gameplay: ~750 m north-east of Poseidon, heading 207°                                                           |

## Not verified / open

- No individually published coordinates were found for any chimney other than the field's single rounded
  30°07'N/42°07'W reference point — not even for Poseidon specifically. All relative placements within the
  corrected patch are this session's estimates.
- InterRidge's vents-data site (an independent source used for other vent fields in `data/landmarks.json`) could
  not be reached (expired TLS certificate); a retry later might add a second citation for the coordinate.
- Chimney colour is now handled by `material_hint: "carbonate"` (see above). No GLB work was needed: no CC0
  pale-mineral-tower model was sought, and the schema already supports procedural chimneys.
