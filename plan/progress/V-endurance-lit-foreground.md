# V-endurance-lit-foreground

## What changed

- New geo feature `dropstones` (`src/world/props/geo/dropstones.ts`, registered in `features.ts`, `index.ts`, `tools/validate_props.py`, DIMS table in `tests/unit/props-geo.test.ts`): a cluster of pale grey rounded boulders using the existing geo detail tier, `geoMaterial('rock')` and `vertexGlow`. It adds a builder to the existing geo kit, no new system.
- `data/landmarks/endurance/props.json`: `dropstones-a` and `dropstones-b`, placed from the golden opening pose (a forward-left and a forward-right cluster, in the lower foreground). The camera is ~65 m above the seabed, so props near the sub project into the bottom of the frame; ones 25 m behind it fall off-screen.
- No site branches; no geometry hash or snapshot changes (only the DIMS entry for the new feature in the unit test).

## Image

`.cache/golden/2026-11-03-200122/endurance-1-mission.png` (before: `2026-11-03-195220`).

## Rating (honest)

Endurance opening about 3.6 to about 3.8. Two pale grey boulder clusters now sit in the lower foreground with the spars as thin debris behind them; no longer an empty dark foreground. They read grey, not bright, and a little uniform (same lump template). Portrait/landscape not reviewed.

## Gates

`tools/gates.sh` (smoke + project-base) green: python, content, build, e2e-base, attribution, unit; prettier fixed.
