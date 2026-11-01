# V-hunga-wall-rise

## What changed (data only, no code)

- `props.json`: wall `dimensions_m` [90,30,45] to [150,24,80]; note updated, game-addition tag kept.
- `site.json`: opening `freeDive.bearing` 0 to 75 (the mission opening now comes in on the wall's lit face, not at an angle to its side), `range` 75 to 65 (keeps the first scan within 120 m).
- `pois.json`: name "Volcanic rim slope (pre-2022 survey)" to "Volcanic rim slope" (objective card is one line).
- `tools/lowtier-poses.json`: Hunga detail pose rescaled to the taller wall; free-dive snapshot regenerated (genuine pose change).
- CHANGELOG entry added.

## Result vs target

Before: `.cache/golden/2026-11-01-081522/hunga-tonga-caldera-1-mission.png`. After: `.cache/golden/2026-11-01-134814/hunga-tonga-caldera-1-mission.png` (desktop).
A wide, lit, steep bedded wall with a rubble apron fills the middle of the frame and about 55% of its height; joints and beds read, and it stands in front of the dark dome as a wall rather than a wedge. Self-rating about 3.7 (was about 3.0). Not met exactly: it is centred rather than upper-left, the top is a little dark, and the bearing was tuned on desktop only (portrait/landscape not re-captured).
Label is one line, unclipped.

## Verification

`PW_PORT=5871 tools/gates.sh` passed (smoke + project-base e2e, unit, static). Not run: full e2e.
