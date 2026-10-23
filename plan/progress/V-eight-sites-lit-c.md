# V-eight-sites-lit (c): Axial Seamount and Hudson Canyon

Shots: `.cache/codex/shots/V-eight-sites-lit-c/{base,after1,after2,after3}-{high,low}-{desktop,portrait}-<site>-*` (mission opening and +10 s, Arcade). Final is `after3`.

## What changed (data only, no new code)

- `data/landmarks/{axial-seamount-ashes,hudson-canyon}/site.json`: `opening.mission.rangeM` 180 / 160 to 110 (same fix as the wreck/lander openings in V-eight-sites), so the vent field and ledge are about a third closer at spawn. Site ambient now on low, medium and high: Axial 14 (was Low only, 6), Hudson 15 (was 6), colour 0x6f8f9e.
- `src/world/TerrainBiome.ts`: `horizonFadeM` for Axial [200, 700] and Hudson [200, 800], so the far wall/shelf eases into the water.

## Findings

- Range 100 was tried: Axial's first target is then "IN RANGE" at spawn, breaking the rule that the first target starts outside scan range. 110 keeps it outside (nearest scan target 93 m).
- The HUD "scan target" at spawn (white sea anemone 46 m, octopus 47 m) is a creature nobody can see; the mission destination is the visible subject.

## Ratings (my reading of the shots)

| Site | Before | After |
| ---- | ------ | ----- |
| Axial desktop High | 2.0 | 3.3 |
| Axial portrait Low | 2.4 | 3.0 |
| Hudson desktop High | 2.6 | 3.2 |
| Hudson portrait Low | 2.6 | 3.0 |

## Known gaps

- Hudson's coral ledge is still a dark disc, tucked right behind the sub in the frame; its quarter-of-frame-height target is met only by overlap with the sub. A lit mound texture is a prop change.
- Axial's chimneys are small black cones at 110 m; the smoke plume is only sometimes visible at the +0 s frame, so the vent reads mostly through the glow and the bed.
- Upper third of both frames is still dark open water.
