# F-CHALLENGER-SEABED

## What changed

- `src/world/TerrainBiome.ts`: the `challenger-deep` scatter list now has dropstones (14 per 1000 m2, size x2.4), cobble rubble clumps (24, x2), boulders (1.6, x1.1) and burrow mounds (14), up from 0.4 dropstones and 7 mounds. These use the existing instanced scatter kinds, so there are no new draw calls.
- `src/world/ChallengerRelief.ts`: floor vertex tint adds warm/cool sediment patches and faint current drift lines (under 15% variation), fading out up the wall. The slope shading is unchanged and the multiplier stays above 0.8.

## How to see it

`GOLDEN_SITES=challenger-deep node tools/golden-shots.mjs` (shots 2 and 3 show the lander with the cobble fields). Before and after shots are in `.cache/codex/shots/f-challenger-seabed/`.

## Tier behaviour

`scatterDensity` scales every kind (Low 0.25, Medium 0.6, High 1, Ultra 1.8); Low draws a sparse version with the same draw calls.

## Known gaps

Rocks are small at the 45 m approach. Real hadal floor is very flat, so relief stays subtle. Drift lines are colour only.
