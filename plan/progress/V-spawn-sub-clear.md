# V-spawn-sub-clear

2026-10-22. Low tier, mission openings (`GOLDEN_MODE=mission`), desktop 1600x900 and portrait 390x844.
Shots: `.cache/codex/shots/V-spawn-sub-clear/{before,after}/<site>-1-mission.png` (desktop) and `<site>-portrait-1-mission.png`.

## What changed

Data only, plus one optional manifest field:

| Site            | rangeM    | yawOffset (new) |
| --------------- | --------- | --------------- |
| Titanic         | 220 -> 140 | 35              |
| Endurance       | 180 -> 110 | 25              |
| Bismarck        | 150 -> 110 | 25              |
| Challenger Deep | 200 -> 140 | 25              |

- Root cause: the mission spawn always yaws at the first target, so the wreck is dead ahead of the chase camera. Shortening the range alone drops the hull onto the sub (checked at 140 m). Only a heading offset can put the wreck beside the sub.
- `opening.mission.yawOffset` (degrees, optional, default 0) mirrors the existing `freeDive.yawOffset`. `composedMissionSpawn` adds it to the facing yaw (3 lines) and the manifest validator accepts it. No site branches. The target is still in view and the HUD shows "25 deg PORT".
- First target stays out of scan range: all sites still satisfy `range - scanRadius >= 60` and `range < sonarPoiRange` (missionApproach test).

## Tests changed (new floor, no exceptions)

- Range floor 150 -> 110 in missionApproach, missionComposition (two places) and heroMissionSpawn; per-site table in missionApproach updated.
- deepOpening: the hard-coded 200/180 now reads `MISSION_APPROACH_M[site]`.
- Facing assertions (dot > 0.999) now expect `cos(yawOffset)` from the manifest.
- The existing strict zero-envelope-overlap guard for the Titanic mission still passes (25 degrees overlapped 5430 px^2, so Titanic uses 35).

## Before / after (honest, 1-5)

| Site            | Before | After | Note |
| --------------- | ------ | ----- | ---- |
| Titanic desktop | 2.8    | 3.8   | hull large in the lower-left third, sub clear on its right, bow marker on the hull |
| Titanic portrait| 2.5    | 3.0   | sub clear, but only the bow end fits at the left edge |
| Endurance       | 2.8    | 3.0   | beside the sub now, but the hull is still a small strip (a thin wreck at 110 m); no real gain in size |
| Bismarck        | 3.0    | 3.5   | hull large and beside the sub; dark rock spires in the foreground are busy |
| Challenger Deep | 3.2    | 3.4   | lander beside the sub instead of directly ahead, still small |

Not met: Endurance does not fill the lower third (the model is small); Titanic portrait crops the hull. A lower spawn altitude (22 m above the target is fixed by clearance) would help Endurance but is a separate change.

## Gates

See the final report; `PW_PORT=4391 tools/gates.sh` run in the worktree.
