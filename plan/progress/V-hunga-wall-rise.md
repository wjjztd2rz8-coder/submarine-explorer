# V-hunga-wall-rise

## What changed

- New `caldera-rim` value for the existing site `terrain.carve` mechanism (`src/world/terrainFeatures.ts`, `src/core/SiteManifest.ts`), selected from `data/landmarks/hunga-tonga-caldera/site.json`. It adds a smooth rim bank (up to ~60 m, wobbled) rising from the wall's foot eastward (behind the face, heading 270) and fading over ~260 m, ±70-180 m laterally. Same pattern as `canyon-bend` and `sinkhole`; no siteId branch.
- Wall dims, position and the 120 m scan-distance pins are unchanged. The rim-foot vent still snaps to the seabed beside the sub.

## Before / after (Hunga mission opening, desktop)

- Before: /home/vijay/submarine-explorer/.cache/golden/2026-10-31-161522/hunga-tonga-caldera-1-mission.png
- Tried 38 m rise (too subtle): .cache/golden/2026-10-31-191010/
- After (60 m): /home/vijay/subexp-wt/V-hunga-wall-rise/.cache/golden/2026-10-31-191146/hunga-tonga-caldera-1-mission.png

## Honest rating

About 4.2 of 5 (was ~3.9). The wall now sits inside a rising dome of ground, so it reads as a rim spur rather than a free-standing wedge, and the vent sits warm beside the sub. Weaknesses: the bank is a smooth, dark, blobby dome with little surface texture, and the wall's cut face is still sharply faceted against it. Not too dark by golden readability, but the bank is dimmer than the foreground.

## Simplicity check

One data line in site.json, one carve branch (~15 lines) beside the existing two, one union member. No new specs, props or layout patches. Nothing cut.
