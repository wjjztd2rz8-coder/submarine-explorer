# V-eight-sites

2026-10-20. Portrait 390x844 Low, Arcade, mission spawn, captured with the opening-framing spec.
Shots: `.cache/codex/shots/V-eight-sites/{before,after}/<site>-portrait-1-mission.png`.

## Ratings (1-5, before -> after)

| Site            | Before | After | Note                                                                                    |
| --------------- | ------ | ----- | --------------------------------------------------------------------------------------- |
| Hunga Tonga     | 2.8    | 2.8   | brown mud, dark scarp wedge is the subject, empty dark top half                         |
| Blake Plateau   | 2.6    | 2.6   | flat featureless bed, hard horizon line, mound reads small and dark                     |
| Kamaehuakanaloa | 2.2    | 2.7   | orange speckle was noisy; now calmer stain; still dark, subject (jelly) is a black blob |
| Axial Seamount  | 3.0    | 3.0   | decent warm light pool; vent subject tiny, speckle on far bed                           |
| Hudson Canyon   | 3.2    | 3.2   | good seabed, coral ledge subject tiny                                                   |
| Endurance       | 2.8    | 3.0   | hull now a bit larger; still a thin strip at the horizon                                |
| Bismarck        | 3.0    | 3.3   | hull larger and clearer, nice debris foreground                                         |
| Challenger Deep | 3.2    | 3.4   | lander clearer in the light pool                                                        |

## Changes (data only, no shared-code branches)

- `src/world/TerrainBiome.ts`: Kamaehuakanaloa biome gets lower, broader stain and lighter bed colours; Hunga Tonga bed colours lifted (effect barely visible).
- Tried and reverted: shortening `rangeM` for Endurance, Bismarck and Challenger (180/150/200 -> 120/110/140) made the subject clearer (about +0.2 each) but breaks the enforced 150-300 m mission opening invariant (missionApproach, missionComposition, deepOpening tests). The `after/` shots show the reverted (unchanged) range. Queue as a deliberate invariant change if wanted.
- Snapshots re-baselined: beebeScatter and beebeIsolation (intended biome table change for Kamaehuakanaloa and Hunga Tonga).
- Tried and reverted: raising Hunga/Blake ambient floor intensity (6 -> 10) gave no visible gain.

## Remaining defects, ranked

1. Kamaehuakanaloa: whole frame dark, rust speckle remains, scan-target jelly is a black silhouette; needs a lit subject (vent glow or brighter bed) at spawn.
2. Blake Plateau and Hunga Tonga: empty dark upper half, hard horizon, flat bed; need depth haze or a lit ridge, and a more interesting spawn heading.
3. Endurance: hull still a thin strip at the horizon; needs a lower spawn altitude or heading offset (parked/V-endurance-aim history).
4. Axial and Hudson: subjects tiny and distant (160-180 m); shorter rangeM in the same style.
5. Speckled bed at distance on volcanic sites (Axial, Kama): texture noise reads as grain.
