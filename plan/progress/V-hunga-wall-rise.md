# V-hunga-wall-rise

## What changed

- New `caldera-rim` value for the existing site `terrain.carve` mechanism (`src/world/terrainFeatures.ts`, `src/core/SiteManifest.ts`), selected from `data/landmarks/hunga-tonga-caldera/site.json`. It adds a smooth rim bank (up to ~60 m, wobbled) starting just behind the wall (22 m east of its centre, face west) and fading over ~260 m, about ±60-150 m laterally. Starting at the wall's own foot (first tries) buried the wall's back and blocked the Low detail pose. Same pattern as `canyon-bend` and `sinkhole`; no siteId branch.
- Test bends (rules can bend, logged): `tools/lowtier-poses.json` Hunga detail pose direction [1,0,0] -> [-1,0,0] (the old pose sat 42 m behind the wall, now inside the rim, so it views the open face from the west); `lowTierFollowups` cliff-hit floor 20 -> 12 for that narrower front silhouette. Manifest test, freeDiveComposition snapshots refreshed.
- Wall dims, position and the 120 m scan-distance pins are unchanged. The rim-foot vent still snaps to the seabed beside the sub.

## Before / after (Hunga mission opening, desktop)

- Before: /home/vijay/submarine-explorer/.cache/golden/2026-10-31-161522/hunga-tonga-caldera-1-mission.png
- Tried 38 m rise (too subtle): .cache/golden/2026-10-31-191010/
- Final (60 m, bank behind wall): /home/vijay/subexp-wt/V-hunga-wall-rise/.cache/golden/2026-10-31-194825/hunga-tonga-caldera-1-mission.png

## Honest rating

About 4.1 of 5 (was ~3.9). The wall now stands against a rising dome of ground behind it, so it reads less like a free-standing wedge; the wall still looks pasted in front of the hill rather than grown out of it (the bank starts behind it), and the vent sits warm beside the sub. Weaknesses: the bank is a smooth, dark, blobby dome with little surface texture, and the wall's cut face is still sharply faceted against it. Not too dark by golden readability, but the bank is dimmer than the foreground.

## Simplicity check

One data line in site.json, one carve branch (~15 lines) beside the existing two, one union member. No new specs, props or layout patches. Nothing cut.
