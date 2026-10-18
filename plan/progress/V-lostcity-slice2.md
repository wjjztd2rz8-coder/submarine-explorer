# V-lostcity-slice2

## What changed

- Tower paint (`buildCarbonateTower`, `towers.ts`): one broad mottle term (grey-brown patches, ochre patches, dirtier foot) applied after the staining passes so it is not washed back to white; the white vent-lip band is narrower (it had been painting most of the torn rim pale).
- Foot rubble: a second `scatterRubble` call with larger blocks, kept only within about two column radii of each column foot (`nearFoot`). Same helper, same blocks; no new geometry kinds.
- Test: `lostCitySurface` slope-rubble test now expects two scatters and checks the first (apron-wide) one as before.

## Simplicity

No settings, UI, materials, site branches or new data. About 25 lines in one file. Re-baselined, intended: `props-geo`, `terrainMerge1140` (buffer hashes; triangle and draw counts of the Low terrain test unchanged).

## Screenshots

`.cache/golden/2026-10-18-060527/lost-city-{1,2,3}.png` (High desktop); before: `.cache/golden/2026-10-17-231115/lost-city-3.png`.

## Rating

Before about 3.9; after about 4.1. Tower is now mottled white, grey and ochre with flow streaks, and frame 2 reads as chimneys. Not 4.5.

## Residuals

- Foot rubble is out of frame in lost-city-3 (camera aims at the mouth); visible only in frame 2/wider views and modestly.
- The torn rim still shows large flat facets; needs geometry (rimDrop) work.
- Background terrain banding at left is texture-driven and unchanged.
- Low tier not re-captured; Low has no foot-rubble change (rubble is gated by existing detail).
