# V-lostcity-slope-colour

## What changed

- `TerrainFidelity.paleTalus` (src/core/config/terrain.ts): per-site data, `{ radiusM, amount }`. Lost City sets 240 m / 1.3.
- `Terrain.ts` vertex-colour loop lightens and cools the seabed toward the fidelity focus (the chimney field) in broken drifts (value noise), on top of the existing biome tint. No site branch; any site can opt in.
- Real site facts unchanged; no tests needed new values (clearance assertions untouched).

## Before / after

Opening frame (mission, desktop): before, a flat dark mud-olive slope; after, the slope around the chimneys reads pale grey-white and clearly brighter, towers stand against it less in isolation. Left, far side of the slope outside the radius stays dark. Rating: before 5/10, after 7/10 (pale talus reads; the transition is soft but the left hillside is still dark olive and could be eased in a later pass).

## Gates

- `PW_PORT=4871 tools/gates.sh`: all PASS (e2e=smoke).
- `tools/site-specs.sh lost-city`: 70 passed, 1 failed: `journal-debrief` journey 844x390 lost-city (pause menu hidden). Fails identically on the parent commit without this change, so pre-existing.
