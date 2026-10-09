# Great Blue Hole site content: sources and notes (package C4)

## F-1110 audit (2026-10-09)

[The five-site primary-source audit](../../../plan/progress/F-1110.md) records
the current copy, corrections, cuts and source-access limits. Earlier notes below
are historical and are superseded where that audit corrects or removes a claim.

## Phase F scope decision — 2026-10-01

Retain the existing Lighthouse Reef atoll route and surveyed outer slopes. The mission and catalog now lead with that experience. The western-slope grotto remains a game addition and is not the actual hole interior. An enclosed sinkhole terrain overlay, lower-shaft chemistry and interior route require a separate geometry/bathymetry package; those promises are cut from the current research brief.

[Gischler et al. 2013, setting and stratification](https://limnogeology.ethz.ch/GischlerMarine.pdf) documents about 320 m width, 125 m depth, a roughly 5 m lagoon and anoxic water below 90 m. Use those rounded primary-study dimensions consistently in the new text. Oxygen depletion excludes reef fish; “lifeless” was too broad because microbial processes persist. Existing catalog depth 124 m remains the earlier survey convention, within the documented 124–125 m range.

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json` (empty),
`mission.json`, `species.json` in this folder. Tile: `data/tiles/great-blue-hole`
(GMRT; bbox N 17.46544/S 17.16496/E -87.37646/W -87.69177, ~58 x 61 m cells;
`min_m` -3642.6, `max_m` +97.5 m -- part of the tile is Lighthouse Reef's cays).

**The GMRT tile does not resolve the ~300 m sinkhole.** At the hole's published
coordinates it reads only ~4.2 m deep, nowhere near the real ~124 m. No terrain
or physical marker was invented. The D3 scan objectives now use the mapped east
and west atoll drop-offs, while the Journal describes the hole itself.

## Sources consulted

| #   | Source                                                                                           | URL                                                                             | Used for                                                                                                                                                                                            | Primary?                                                                             |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Great Blue Hole — Wikipedia                                                                      | https://en.wikipedia.org/wiki/Great_Blue_Hole                                   | Diameter/depth (318 m/124 m), UNESCO status, ice-age formation dates, Cousteau's 1971 ledges (21/49/91 m), stalactites, species (sharks, groupers, squirrelfish, angelfish)                         | Secondary, but the most complete single account found                                |
| 2   | Jacques Cousteau's Grandson to Map Depths of Massive Blue Hole Off Belize's Coast — Live Science | https://www.livescience.com/63950-belize-blue-hole-expedition.html              | 2018 Blue Hole Belize Expedition background, Fabien Cousteau's involvement                                                                                                                          | Secondary                                                                            |
| 3   | Belize's Great Blue Hole revealed in expedition survey — GPS World                               | https://www.gpsworld.com/belizes-great-blue-hole-revealed-in-expedition-survey/ | 2018 expedition dates (27 Nov - 13 Dec), Aquatica Submarines, Kongsberg sonar, RV Brooks McCall, first complete 3D sonar map, conch graveyard, new stalactite fields, hydrogen-sulfide anoxic layer | Secondary (industry trade press, detailed and specific)                              |
| 4   | Lighthouse Reef — Wikipedia                                                                      | https://en.wikipedia.org/wiki/Lighthouse_Reef                                   | Atoll context for the reef-rim/reef-biology entries                                                                                                                                                 | Secondary                                                                            |
| 5   | GMRT Synthesis (Ryan et al. 2009), doi:10.1029/2008GC002332                                      | https://www.gmrt.org/                                                           | This tile's own terrain readings (hole coordinates, reef flat, outer drop-off)                                                                                                                      | **Yes** — the dataset itself, and the direct evidence for the resolution-limit claim |

## Terrain check (this tile, bilinear sample of `heightmap.bin`) -- the key verification

| Point                                | lat, lon          | This tile's reading                                                        | Real feature                              |
| ------------------------------------ | ----------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| Hole's published centre              | 17.3153, -87.5346 | **-4.2 m**                                                                 | Real: 124 m deep, 318 m across            |
| Reef flat, 1.3 km NW of centre       | 17.3273, -87.5466 | -2.5 m                                                                     | Consistent with a shallow atoll reef flat |
| Radial scan east of centre (0-15 km) | 17.3153, various  | -4 to -6 m (0-3 km) -> -92 m (4 km) -> -873 m (5 km) -> -3,600+ m (12+ km) | Real, steep atoll-margin drop-off         |
| Radial scan west of centre (0-15 km) | 17.3153, various  | -2 to -4 m (0-5 km) -> -42 m (6 km) -> -942 m (9 km) -> -1,300+ m (12 km)  | Real, gentler drop-off on this side       |

The tile is flat, shallow reef terrain at and immediately around the hole's real
coordinates, with no trace of a depression. The radial scans located the real
reef-flat and drop-off terrain used by the scan targets.

For D3, a westward profile along 17.3153° N gives 2.1 m depth at 87.58° W,
29.1 m at 87.59° W and 303.5 m at 87.60° W (GMRT source 5, sampled using
`tools/validate_landmark.Tile`). The western drop-off target at 87.596° W lies
on that visible slope. The eastern target is on the opposite atoll margin.

## Fabricated vs. sourced

| Item                                         | Sourced (measured/published)                                        | Reconstructed / estimated                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Reef flat and outer drop-off terrain         | GMRT Synthesis (real)                                               | Render-time detail noise (engine)                                                          |
| Hole's real diameter/depth/formation/history | Wikipedia, Live Science, GPS World                                  | —                                                                                          |
| Hole's terrain in-game                       | This tile's real (shallow) reading                                  | Nothing invented; no depression prop added                                                 |
| Reef-biology species                         | Documented for Lighthouse Reef/the hole's rim generally (Wikipedia) | Placement at this specific POI is illustrative (`reconstruction: true`), not a site record |
| Spawn point                                  | —                                                                   | Chosen for gameplay: over the outer slope (67.4 m water), heading 270° toward the reef     |

## Not verified / open

- No shark species were returned by the OBIS export (see `species.json`'s note);
  the Caribbean reef shark and nurse shark named in `guide.json`'s `reef-biology`
  entry come from Wikipedia rather than this session's OBIS data, and are flagged
  `confidence: "medium"` on the matching POI as a result.
- The 2018 expedition's discovery of human remains (missing divers, reported by some
  press) is not used in `guide.json` — it did not seem appropriate for the game's
  tone, and was not central to the task brief's requested content (stalactites,
  Cousteau, the 2018 sonar survey).
- Exact ice-age dates for stalactite formation (153,000/66,000/60,000/15,000 years
  ago, per Wikipedia) are quoted as a range rather than individually verified
  against a primary geological paper this session.

## OBIS command

```
python3 tools/obis_export.py --landmark great-blue-hole --tile-bbox --depth-max 200 --out data/landmarks/great-blue-hole/species.json
```

Returned 25 kept taxa (of 71 matching at species rank, 82 in the bbox at any rank),
1,674 records — reef-building corals, parrotfish, surgeonfish, grunts, snapper and
groupers, a strong match to Caribbean reef habitat. See `species.json`'s own `note`.

## Opening gallery scan (F-BUGHUNT-17)

`great-blue-hole-stalactites` is an optional contact at the existing authored
`karst-grotto` prop, linked to the existing `the-hole` Journal entry. Its position
is a game placement on the locally carved ledge, not a surveyed gallery coordinate;
confidence is low and the Recreation tag is retained. It gives the scenic free-dive
opening a nearby scan while the mission primaries remain the mapped atoll drop-offs.
The gallery history and source links already present in `the-hole` are unchanged.
