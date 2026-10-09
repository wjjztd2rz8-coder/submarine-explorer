# f-hud-overlap

Fixes findings 2 and 3 of f-firstminute.

- Phone portrait: `.onboard-card` bottom offset 230px -> 176px (`src/styles/hud-layout.css`, tall-phone block), so the one-line card sits in the gap above the touch controls, clear of the sub and scan target. Landscape 844x390 already placed it under the scan target, clear of the sub; unchanged.
- Desktop: `.is-onscreen` target chip now offset below the target (`src/styles/waypoints.css`) so the centre scan bracket never crosses the label.
- `tools/firstminute-shots.mjs`: added `phoneland` layout.

Shots: `.cache/codex/shots/hud-overlap-before/` and `.cache/codex/shots/hud-overlap-after/` (05-t10.png per layout).

Gate result: `PW_PORT=4391 tools/gates.sh` green (build, unit, python, content, attribution, prettier, e2e smoke + base).
