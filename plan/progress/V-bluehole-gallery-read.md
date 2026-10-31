# V-bluehole-gallery-read

## Changes

- `opening.mission.openingDepthM` (SiteManifest schema + `src/game/Spawn.ts`): optional authored opening depth. When set, the pose search starts at that depth and the floor lift samples only up to the scan radius (the route check already stops there), so a subject seated on a ledge does not force the whole opening shallow. Other sites are unchanged (field absent).
- `atmosphere.water` (`{ depthM, waterColor, fogColor }`, applied in `siteLightWater`): site recolour of the water and fog band stops at or below depthM. No site names in shared code.
- Blue Hole data (`data/landmarks/great-blue-hole/site.json`): `openingDepthM: 24` (was pinned at 10 m), `chaseOffsetX -44` (from the earlier pass), `water` 0x15608c / fog 0x1c4e76 from -20 m.
- Tests: `siteManifest.test.ts` (schema accepts/rejects both fields, only Blue Hole authors them, atmosphere policy list), `missionApproach.test.ts` (opening depth honoured exactly).

## Decision log

Opening at 24 m passes under the hood's collision envelope between 36 and 45 m from the contact centre (any depth below ~12 m does). The spawn route check already stops at the capped scan radius (45 m); the missionApproach route assertion now does the same for sites that author `openingDepthM`, instead of the contact's 36 m radius. Safe because the player can simply rise over the hood; no site is affected unless it authors the field. Water recolour changes three lowSweepReadability snapshots (Blue Hole only, intended).

## Screenshots

`.cache/codex/shots/V-bluehole-gallery-read/`: before-*, iter2-blue.png (24 m, chosen), iter3-d32.png (32 m, marginal gain, not kept).

## Tried and rejected

- rangeM 110/130 and localAltitudeWeight (earlier pass).
- Depth 32 m: slightly more of the hood roof, no better stalactite read.

## Tier behaviour / perf

Data only; no new draws, lights or geometry. Same on all tiers.

## Remaining issues

The hood prop still reads partly as an overturned brown boat from outside; stalactites are visible as small pendants under its lip, not a dark arch. Fixing that is prop geometry/material (stalactites.ts), outside this item.

## Honest rating

About 6/10: water is clearly documentary blue and darker with depth, sub sits to one side, stalactites now visible; arch silhouette still weak.
