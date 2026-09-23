# Hunga Tonga caldera site content: sources and notes (package C4)

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json` (empty),
`mission.json`, `species.json` in this folder. Tile: `data/tiles/hunga-tonga-caldera`
(GMRT; bbox N -20.39964/S -20.69956/E -175.23907/W -175.56097; `min_m` -1951.36,
`max_m` 82.09 -- part of the tile is the two islands, above sea level).

**Central honesty constraint, per `plan/PHASE-C-CONTRACTS.md` §5: this tile's
bathymetry predates the 15 January 2022 eruption.** The GMRT Synthesis this tile is
built from aggregates surveys collected over time, and this area's data reflects
pre-eruption multibeam work (2015 WASSP survey, 2017 multibeam survey) rather than
the post-eruption TESMaP survey. That is stated plainly in `mission.json`'s briefing,
every objective title, and `guide.json`'s `overview` entry, which also describes the
real post-eruption caldera from sources rather than fabricating it in the terrain.
No props are placed (per the task brief); `props.json` is an empty array.

## Sources consulted

| # | Source | URL | Used for | Primary? |
| - | ------ | --- | -------- | -------- |
| 1 | Mapping the Tongan eruption — NIWA (Earth Sciences New Zealand) | https://niwa.co.nz/hazards/mapping-tongan-eruption | Pre-eruption caldera depth (~150 m), post-eruption depth (~850 m), TESMaP project phases, RV Tangaroa and USV Maxlimer, islands "smaller and no longer joined together" | **Yes** — NIWA co-led TESMaP |
| 2 | Ongoing Activity at Hunga Submarine Volcano, Tonga — Walker et al. 2024, *Geochemistry, Geophysics, Geosystems* (AGU) | https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2024GC011685 | Pre-eruption caldera diameter (~4.5 km) and max depth (155 m), post-eruption diameter (~4.8 km), 2015 WASSP survey (S. Cronin, RV Pacific Rose), 2017 multibeam survey, edifice height (~2 km) | **Yes** — peer-reviewed |
| 3 | NIWA-Nippon Seabed Mapping Project press materials (search summary; TESMaP project pages, SEA-KIT, Hydro International, Hydrographic Society) | https://www.sea-kit.com/tongaeruptionseabedmappingproject and related | TESMaP Phase 1 (Apr/May 2022, Tangaroa) and Phase 2 (Jul/Aug 2022, USV Maxlimer), area mapped (>800 km²), Nippon Foundation-GEBCO Seabed2030 link | Secondary/primary mix (project's own partner pages) |
| 4 | 2022 Hunga Tonga-Hunga Ha'apai eruption and tsunami — Wikipedia | https://en.wikipedia.org/wiki/2022_Hunga_Tonga%E2%80%93Hunga_Ha%CA%BBapai_eruption_and_tsunami | Eruption date/time (15 Jan 2022), plume height (~58 km), VEI, tsunami heights, casualties | Secondary corroboration |
| 5 | GMRT Synthesis (Ryan et al. 2009), doi:10.1029/2008GC002332 | https://www.gmrt.org/ | This tile's own terrain readings (caldera floor, saddle, rim wall, outer flank) | **Yes** — the dataset itself |

## Terrain check (this tile, bilinear sample of `heightmap.bin`)

| Point | lat, lon | This tile's reading | Published (pre-eruption) |
| ----- | -------- | -------------------- | -------------------------- |
| hunga-tonga-caldera-floor | -20.560, -175.390 | 131.6 m | ~150-155 m (sources 1-2) |
| hunga-tonga-island-saddle | -20.553, -175.4075 | ~0 m (sea level) | shallow saddle, above/near sea level pre-2022 (source 1) |
| hunga-tonga-rim-wall | -20.570, -175.420 | 468.6 m | not separately published; identified from this tile's own terrain |
| hunga-tonga-outer-flank | -20.518, -175.432 | 1,028.9 m | consistent with a ~2 km edifice (source 2) |

The caldera-floor reading (131.6 m) is within about 20 m of the widely cited
pre-eruption figure (~150-155 m), a reasonable match for real pre-eruption survey
data. No attempt was made to locate the post-eruption ~850 m floor in this tile,
because that terrain is not present here (and should not be, per the task brief).

## Fabricated vs. sourced

| Item | Sourced (measured/published) | Reconstructed / estimated |
| ---- | ----------------------------- | -------------------------- |
| Pre-eruption caldera terrain | Real pre-2022 survey data (GMRT/GEBCO) | — |
| Post-eruption caldera (not modelled) | Described in guide.json from TESMaP/NIWA/AGU sources only | Not represented in terrain or props anywhere |
| Caldera-wall POI's exact identity | This tile's own depth reading | "Representative stretch of the caldera wall" is an interpretation, flagged medium confidence |
| Eruption facts (date, plume height, tsunami, deaths) | Wikipedia, cross-checked against the AGU paper's introduction | — |
| Spawn point | — | Chosen for gameplay: over the pre-eruption caldera, heading 250° |

## Not verified / open

- No source consulted gives a named identity for the specific "inner caldera wall"
  point used for `hunga-tonga-rim-wall`; it is picked from the tile's own bathymetry
  and flagged `confidence: "medium"` rather than treated as a named surveyed feature.
- Casualty figures for the 2022 eruption vary slightly across sources (6-9 deaths
  cited depending on whether indirect/missing-person reports are included); `guide.json`
  uses "at least 6" to stay conservative rather than overstate a single figure.
- `species.json`'s OBIS records cannot be reliably dated to before or after the
  eruption; the note says so explicitly rather than assuming either.

## OBIS command

```
python3 tools/obis_export.py --landmark hunga-tonga-caldera --tile-bbox --out data/landmarks/hunga-tonga-caldera/species.json
```

Returned 25 kept taxa (of 134 matching at species rank, 175 in the bbox at any rank),
1,068 records — mostly shallow Tongan reef fish. See `species.json`'s own `note` for
the pre/post-eruption caveat.
