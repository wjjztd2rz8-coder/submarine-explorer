# f-bluehole-bowl

Shots: `.cache/codex/shots/f-bluehole-bowl/{before,after}-great-blue-hole-*.png` (golden poses 1-3, east 2-3, High tier).

## Changes

- `blueHoleTint` (terrainFeatures.ts): per-bed tone range 0.74-1.32 (was 0.84-1.2), lit tread lip crisper and stronger with depth (0.42 to 0.82), riser shade floor 0.46, stronger foot occlusion, sediment mottling reduced on wall (`pf`), weaker cool feather.
- `blueHoleTerraces`: the two gallery-mouth angular windows now terrace below r ~126-136 m (below the seat), so the sector the sub looks down is stepped. Test updated (seat radii 139/150 still untouched).
- Biome scatter: sponge rock 1.2 to 2.6 (sizeMul 2.2), sponge flat 0.9 to 1.6 (1.8), new whip coral on rock 1.8 (1.8), tube 3.2 to 5.5 (1.6). Same instanced kinds, no new draw calls, tier density scaling unchanged.
- `horizonFadeM` [55,210] to [80,260].

## Verdict

Pose 1 (approach over the rim): terraces now read clearly as stacked beds with lit lips and dark foots, with visible purple/orange/ochre clumps on the ledges; gain about +0.3. Pose 2/3 (inside the gallery looking across the bowl): barely changed; the large smooth grey-green ramp in front is still the dominant read, because it is fogged lower wall/floor and the new relief and banding sit mostly beyond it. East pose shows a few more tube clumps on the shelf. Not dark.

## Remaining

- Pose 2/3 ramp still needs its own pass (likely the mouth-sector apron/talus and depth fog, not the tint).
