# f-titanic-monterey

Before: .cache/golden/2026-10-09-074237/{titanic,monterey-canyon}-1-mission.png
After: .cache/golden/2026-10-09-080748/ (titanic, monterey-canyon desktop), .cache/golden/2026-10-09-081113/ (Monterey, Low tier), .cache/golden/2026-10-09-075323/ (Monterey desktop + portrait, intermediate chase 64)

Changes

- Titanic: abyssFadeM [180,780] -> [110,650] (src/world/TerrainBiome.ts). Band edge now a gradient over ~100 px instead of ~60 px; nearby seabed and hull unchanged.
- Monterey: range 16->34, chaseRadius 64, chaseOffset (14,-2) in src/game/Spawn.ts; sablefish/sea-pen offsets in src/core/config/monterey.ts. First target now 60 m away, still IN RANGE.
- Tests: titanicHorizon uniform expectation, beebeIsolation snapshot (spawn + titanic biome/uniform hashes only).

Remaining weaknesses

- Titanic: a faint lighter strip remains at the seabed horizon; mid-distance seabed is slightly darker than before (inherent to fading earlier).
- Monterey: target label sits over the sub's upper hull; portrait HUD panels overlap in the golden capture (pre-existing); portrait sub is small.
