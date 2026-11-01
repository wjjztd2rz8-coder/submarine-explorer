# V-hunga-wall-rise

## What changed (data only, no code)
- `data/landmarks/hunga-tonga-caldera/props.json`: wall `heading_deg` 270 to 195 (the opening spawns the sub in front of the wall's face; at 270 it saw the back of the arc, which read as a wedge), `dimensions_m` [90,30,45] to [150,24,80]; note updated, game-addition tag kept.
- `pois.json`: POI name "Volcanic rim slope (pre-2022 survey)" to "Volcanic rim slope" (objective card now one line).
- CHANGELOG entry added.

## Result vs target
Screenshots: before `.cache/golden/2026-11-01-081522/hunga-tonga-caldera-1-mission.png`; after `.cache/golden/2026-11-01-132032/hunga-tonga-caldera-1-mission.png` (desktop).
Now a wide, lit, bedded wall band with a rubble apron, centred rather than upper-left, filling roughly the middle third of the frame and ~40% of its height. Reads as a wall: about 3.6 on the rubric (was ~3.0). Not met: it sits centre, not upper-left; top is a bit dark; the opening camera is high so the face is foreshortened.
Label: one line, unclipped.

## Verification
`PW_PORT=5871 tools/gates.sh` (smoke + project-base, static) passed.
