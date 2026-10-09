# F-MONTEREY-STRATA

## What changed

- `src/core/config/monterey.ts`: bed thickness range 0.3-3.4 with skew 2.2, new `bedPalette`, wider `ledgeStrength` (0.12-1.55), deeper slumps (`slumpDepthH` 0.06).
- `src/world/props/geo/scarp.ts` (canyon only): per-bed hardness (thick, resistant beds protrude and overhang; strength also varies along x) and per-bed albedo from the palette, scaled by hardness. Other scarps unchanged.
- Spawn clearance, wall-life placement, geometry budgets and tier scaling untouched (colour and displacement only).

## Shots

`.cache/codex/shots/f-monterey-strata/{before,after}-{1,2,3}.png` (before-1 is spawn; after-2/3 approach and detail).

## Known gaps

- Fine laminae (bedContrast) are still regular at close range; the wall remains dark under teal haze.
