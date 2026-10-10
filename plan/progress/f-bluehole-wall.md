# f-bluehole-wall

Shots: `.cache/codex/shots/f-bluehole-wall/{before,after}` (golden Blue Hole poses 1-3, east 2-3).

## Changes

- `stalactites.ts` wall `disp`: per-bed ledges (lip out, recess back, bed thickness varies with x and bed index) plus four partial notch bands (0.8-1.2 m deep), both off across the shelf window. Shared `ledgeBed` helper drives geometry and paint.
- Wall paint: depth grade BLUE_GREY toward the foot, CREAM_OCHRE near the top, bed tone variation, lit lips, shadowed recesses; gentler floors keep it readable.
- `terrainFeatures.ts` `blueHoleTint`: stronger bed and joint contrast (0.72-1.28 bed tone, 0.62 joint floor).
- Snapshots rebaselined: beebeIsolation (Blue Hole terrain buffers), terrainMerge1140.
- Shared rock detail map untouched; no new textures; HUD untouched.

## Verdict

Poses 2/3: the cream backdrop now shows stacked ledges, darker recess bands and a cooler lower face. Honest gain about +0.3 to +0.5 (score ~3.3-3.5).

## Remaining

- Bowl terraces beyond the grotto remain subtle at range (fog).
- Overhangs are shallow (heightfield and extruded prop); no true undercut caves in the wall.
