# V-lostcity-foot: Lost City hill hue and tower foot

Shots: `.cache/codex/shots/V-lostcity-foot/{base,after1,after2,after3}-{high-desktop,low-portrait}-*` (mission opening `1` and +10 s `2`), plus `{base,after1,after2}-free-lost-city-N.png` (free-dive 40 m and 15 m views). Final is `after3`.

## What changed (colour and geometry inside the existing tower mesh; no new instances, settings or site branches)

- `src/world/LostCityBands.ts`: `lostCitySlopeTint` now carries a cool cast (red x0.84, green x0.97, blue x1.04), so the massif reads olive-grey instead of tan under the lamps and fog.
- `src/world/props/geo/towers.ts`: palette for the Poseidon apron and troughs cooled (`SEABED`, `TROUGH`, `OCHRE`, `OLD`), so the apron fades into the same olive-grey as the hill; the near-foot rubble ring is 70 to 130 blocks (size 0.09 to 0.1 of the column radius), all merged into the tower mesh, so the draw and instance counts are unchanged.
- Snapshots updated: `props-geo`, `beebeIsolation`, `terrainMerge1140` (Low triangle budget still passes). `lostCityBiome` keeps its bounds (blue gain was lowered rather than loosening the 1.3 ceiling).

## Ratings (my reading of the shots)

| View                     | Before | After |
| ------------------------ | ------ | ----- |
| Desktop High opening/+10 | 3.2    | 3.5   |
| Portrait Low opening     | 3.1    | 3.4   |
| Free-dive 40 m           | 3.5    | 3.7   |

## Known gaps

- At the 220 m opening the tower is a small silhouette; the foot rubble ring is invisible there and only reads from the free-dive range, where the frame mostly crops the foot.
- The orange-brown clumps on the hill are generic scatter rubble/dropstone colour (shared scatter config, not per-site), still warm against the cooler slope. A per-biome scatter tint is the next lever.
- Chimney stumps were not added: that would be new prop geometry or instances.
