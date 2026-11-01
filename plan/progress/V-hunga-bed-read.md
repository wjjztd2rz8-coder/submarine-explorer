# V-hunga-bed-read

## What changed (data and preset values only, no new code)

- `src/world/props/geo/scarp.ts` tuff preset: `bands` 15 to 8, `tile` [11, 6] to [14, 14] (coarser, fewer bedding bands).
- `data/landmarks/hunga-tonga-caldera/site.json`: added `atmosphere.water` (depth -200 m and below: waterColor 0x12465e, fogColor 0x1a4a60) so the water above the crest is faintly lit rather than near black. Existing manifest mechanism; no site branch.
- CHANGELOG entry.

## Result vs target

Before: `.cache/golden/2026-11-01-211523/hunga-tonga-caldera-1-mission.png` (main checkout). After: `.cache/golden/2026-11-01-224913/hunga-tonga-caldera-1-mission.png` and `hunga-tonga-caldera-portrait-1-mission.png`.
Beds are now fewer and broader and read as a bedded wall rather than straw; the crest line is visible against a lit blue-teal water column; the frame is brighter overall; objective label is one line, unclipped.
Not fully met: the wall is still a wedge/haystack silhouette (shape unchanged, data-only route), and the lit-wall brightness is similar. Self-rating about 4.0 (was about 3.4).

## Verification

`PW_PORT=5881 tools/gates.sh`: see final report.
