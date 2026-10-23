# V-eight-sites-lit (b): Blake Plateau and Hunga Tonga

Shots: `.cache/codex/shots/V-eight-sites-lit-b/{base,after3}-{high,low}-*` (mission opening and approach, desktop and portrait).

## What changed (data only, net no new code)

- `src/world/TerrainBiome.ts`: both biomes gain the existing `horizonFadeM` (Hunga [250, 900], Blake [150, 700]), so the far seabed eases to the fog colour instead of ending in a hard line. Blake's bed colours are lighter (about +0x10 per channel).
- `data/landmarks/{blake-plateau-corals,hunga-tonga-caldera}/site.json`: the existing site ambient floor changed from 6 / 0x87a899 to 11 (Blake) and 9 (Hunga) with a cooler blue-grey 0x6f8f9e, on all tiers.
- No spawn, overlap or scatter numerics touched; no new draw calls or code paths, Low unchanged in cost.

## Ratings (my reading of the shots)

| Site            | Before | After |
| --------------- | ------ | ----- |
| Blake, High/Low | 2.6    | 3.3   |
| Hunga, High/Low | 3.0    | 3.5   |

## Known gaps

- Blake's upper half is still open dark water: the horizon is soft but there is no mid-water life or glow there. A true graded sky needs a backdrop dome (today wreck-only, `TitanicHorizon`) generalised for non-wreck sites, or more marine snow near the camera; both go beyond data tables.
- The Blake coral mound is still a dark silhouette at 160 m.
