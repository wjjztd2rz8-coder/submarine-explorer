# Blake Plateau coral mounds site content: sources and notes (package C4)

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json`, `mission.json`,
`species.json` in this folder. Tile: `data/tiles/blake-plateau-corals` (GMRT; bbox
N 30.33020/S 29.67047/E -79.16968/W -79.82996, 1202x1201 cells, ~53 x 61 m cells;
`min_m` -960.1, `max_m` -579.93).

## Sources consulted

| # | Source | URL | Used for | Primary? |
| - | ------ | --- | -------- | -------- |
| 1 | Multi-Partner Mapping Effort Reveals Largest Known Deep-sea Coral Reef Habitat — NOAA Ocean Exploration | https://oceanexplorer.noaa.gov/news/million-mounds-news/ | Province extent (500 km x 110 km, core 254 km x 42 km), 83,908 mapped peaks, 6.4 million acres, 31 multibeam surveys + 23 submersible dives, partner institutions, Desmophyllum pertusum as the dominant coral | **Yes** — NOAA's own announcement of its led mapping effort |
| 2 | Blake Plateau — Wikipedia | https://en.wikipedia.org/wiki/Blake_Plateau | Corroborating geography/depth figures, general plateau description | Secondary |
| 3 | World's largest deep-sea coral reef found lurking beneath the Gulf Stream — Live Science | https://www.livescience.com/planet-earth/rivers-oceans/worlds-largest-deep-sea-coral-reef-found-lurking-beneath-the-gulf-stream-right-on-the-doorstep-of-us-coast | Mound heights (up to ~300 ft/90 m), depth range (500-1,000 m/1,640-3,280 ft), Gulf Stream's role delivering warm water and food particles | Secondary (science journalism, cites the same Sowers et al. 2024 paper) |
| 4 | GMRT Synthesis (Ryan et al. 2009), doi:10.1029/2008GC002332 | https://www.gmrt.org/ | This tile's own terrain readings (mound relief, depths at each POI) | **Yes** — the dataset itself |
| 5 | Sowers, D.C. et al. (2024), "Mapping and Geomorphic Characterization of the Vast Cold-Water Coral Mounds of the Blake Plateau," *Geomatics* (identified via search, not directly fetched this session — its findings are quoted secondhand through sources 1 and 3, both of which name and describe the paper) | (DOI not confirmed this session; see NOAA/Live Science summaries) | The 83,908-mound figure and the paper's own province dimensions, both already corroborated by source 1 | Primary paper, cited but not directly fetched |

Note: the peer-reviewed paper itself (source 5) was not directly fetched this
session — all its key figures (83,908 mounds, province dimensions, mound-height
range) are corroborated by at least two secondary sources (NOAA's own
announcement, source 1, and independent science journalism, source 3) that both
name and describe the paper directly, so we treat those figures as reliable
without a direct read of the paper's full text. This is noted as a limitation.

## Terrain check (this tile, bilinear sample of `heightmap.bin`)

| Point | lat, lon | This tile's reading | Local relief nearby |
| ----- | -------- | -------------------- | --------------------- |
| blake-mound-field-core | 30.16033, -79.78982 | 744.2 m | ~72 m (3x3 sample window) |
| blake-coral-thicket | 30.1613, -79.7893 | 768.1 m | — |
| blake-second-mound | 30.15833, -79.79182 | 775.5 m | ~63 m |
| blake-gulf-stream | 30.162, -79.787 | 704.0 m | — |
| blake-inter-mound-channel | 30.1615, -79.7905 | 779.7 m | — |

All five POIs sit within about 1 km of each other, inside the tile's ~63.7 x 73.4 km
extent, chosen from a coarse relief scan across the tile that looked for the
highest local terrain variance (a proxy for mound-like texture at this cell size).
This tile's own depth range (579.9-960.1 m) matches the province's published
500-1,000 m depth band well.

## What this tile can and cannot show

At roughly 53 x 61 m per cell, this tile's terrain resolves broad relief (tens of
metres of local elevation change, consistent with real mound clusters) but not
individual coral colonies, nor the smallest mapped mounds. Per the task brief,
optional `rock_09.glb` stand-ins mark the coral-thicket POI, flagged
`reconstruction: true` throughout — they represent "a coral-colonised outcrop is
roughly here," not an attempt to model actual coral structure.

## Fabricated vs. sourced

| Item | Sourced (measured/published) | Reconstructed / estimated |
| ---- | ----------------------------- | -------------------------- |
| Mound-field terrain | GMRT Synthesis (real) | Render-time detail noise (engine) |
| Province facts (extent, mound count, depth range) | Sowers et al. 2024, via NOAA/Live Science | — |
| Coral species presence at this exact point | Province-wide finding (Sowers et al. 2024) | Site-specific presence inferred, not directly surveyed here (medium confidence) |
| Coral colony appearance | — | `rock_09.glb` stand-ins, explicitly flagged as not a coral model |
| Gulf Stream POI | Real current, well documented | Marker position is illustrative; current not modelled as a physical force |
| Spawn point | — | Chosen for gameplay: directly above the mound cluster, heading 140° |

## Not verified / open

- The peer-reviewed Sowers et al. 2024 paper itself was not directly fetched this
  session (see note above); its key figures are corroborated by two independent
  secondary sources instead.
- No source names this tile's specific bump-and-hollow terrain as individually
  cataloged mounds from the 83,908-feature dataset; POI placement is our own
  reading of the tile's relief, consistent with but not directly matched to that
  catalogue.
- Coral presence at the exact `blake-coral-thicket` coordinate is inferred from the
  province-wide finding, not a site-specific record; flagged `confidence: "medium"`.

## OBIS command

```
python3 tools/obis_export.py --landmark blake-plateau-corals --tile-bbox --depth-min 500 --depth-max 1000 --out data/landmarks/blake-plateau-corals/species.json
```

Returned 25 kept taxa (of 32 matching at species rank, 95 in the bbox at any rank),
843 records. Desmophyllum pertusum itself is directly present in the results,
alongside other deep-sea corals (Madrepora oculata, Enallopsammia profunda, several
octocorals) and associated fauna. See `species.json`'s own `note`.
