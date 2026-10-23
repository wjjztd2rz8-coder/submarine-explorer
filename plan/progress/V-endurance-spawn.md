# V-endurance-spawn

2026-10-23. Low tier, mission opening (`GOLDEN_MODE=mission`), desktop 1600x900.
Shots: `.cache/codex/shots/V-endurance-spawn/{before,after}/endurance-{,portrait-}1-mission.png`.

## What changed

- "Get closer to scan · 110 m" no longer strands "m": `.guidance-hint` gets `text-wrap: balance` (CSS only, strings unchanged, so no test edits).
- Spawn altitude: tried a per-site `opening.mission.spawnClearanceM` (4 instead of 16, so 16 m above the hull POI instead of 22). Rejected and reverted (not committed). Result: the wreck rose toward the horizon band and looked worse, not better. The chase camera sits above the sub, so a lower sub lifts the wreck in frame; it does not put it in the lower third.
- Titanic portrait crop: not attempted; no cheap data lever found (see below).

## Why Endurance stays ~3.0

The hull is only 44 x 8 m and the range floor is 110 m (owner-approved 110-140 m, and range - scan radius >= 60 in missionApproach), so it subtends about 23 degrees. Altitude and yaw cannot enlarge it. Real options: a longer or more detailed hull model, a lit wreck/light pool, or the owner approving a closer opening (about 85 m) with the scan-range floor relaxed. Self-rating unchanged: Endurance ~3.0.

## Gates

PW_PORT=4871 tools/gates.sh: all PASS (python, content, build, unit, e2e smoke, e2e-base, attribution, prettier).
