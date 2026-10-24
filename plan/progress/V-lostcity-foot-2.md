# V-lostcity-foot-2: Lost City scatter tint

Shots: `.cache/codex/shots/V-lostcity-foot-2/{base,a1}-lost-city-{1,2,3}.png` (desktop High, mission opening/+10 s/approach). Final is `a1`.

## What changed
- `src/world/TerrainBiome.ts`: new optional `Biome.scatterTint` (linear rgb multiplier); `lost-city` sets `[0.62, 0.9, 0.9]`.
- `src/world/scatter/ScatterPlacement.ts`: `makeInstance` applies the biome tint to rock-material kinds only (soft life such as sponges keeps its palette). No site branch; no new props or instances (instance counts unchanged, 933).
- Snapshots rebaselined for Lost City only: `beebeScatter` (meshes hash), `beebeIsolation` (biome hash). Existing specs cover the capability; no new test file.

## Result
The orange-brown rubble clumps on the hill and around the tower foot now read olive-grey like the slope, with the original per-instance value variation. Tower remains the brightest mass. Not darker overall at the tower; rubble is a little dimmer than before, which is what lets the ground cohere.

## Remaining issues
- At the 220 m opening the rubble is tiny regardless of colour.
- Red multiplier is a hand-tuned guess from one site's shots; no Low-tier or portrait shots taken.

Rating (my reading): approach view 3.4 -> 3.7.
