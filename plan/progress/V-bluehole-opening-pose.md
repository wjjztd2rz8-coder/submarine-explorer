# V-bluehole-opening-pose

## Changes

Data only, `data/landmarks/great-blue-hole/site.json` opening.mission: rangeM 150 -> 125, openingDepthM 24 -> 44, chaseOffsetY -30 -> -50. `tests/unit/missionApproach.test.ts` range table updated (150 -> 125). No code, no site branches.

## Shots

`.cache/bh/` (worktree): before-desktop.png, before-portrait.png, after-desktop.png, after-portrait.png.

## Probe results (hull-safe pose exists, high arcade)

Passes: 150/24, 130/34, 130/42, 120/38, 125/44. Fails: 130/24, 110/any of 24-40, 100/40, 120/44, 125/46.

## Honest rating vs target

About 5/10, target NOT met. The hood is now at eye level with ragged lip and stalactites clearly visible and the water is deeper blue, but it still occupies roughly 10% of the frame, not the top 30%, and it is not an overhang above the sub: it still sits below the horizon line. The route/collision check (hood envelope) rejects every pose at 110 m or less, and the scan radius floor ties to rangeM, so data alone cannot get close enough.

## Remaining

Needs either a hood prop scale-up or a repositioned pose target (hood further above the ledge / a larger hood for the east gallery), or relaxing the opening route check under the hood (code). Portrait frame reads similarly, hood small left of centre.
