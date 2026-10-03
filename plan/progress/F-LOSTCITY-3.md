# F-LOSTCITY-3: Lost City talus apron and slope blend (progress)

Branch `claude/f-lostcity-3`. Shots: `.cache/codex/shots/f-lostcity-3/` (`base-*` before, `b1-high.png` / `b1-low.png` after).

## What changed

- `src/world/props/geo/towers.ts` (the apron is the carbonate tower's skirt, built here, not in talus.ts): the outline is the ellipse radius warped by two noise scales (lobed, ragged), the apron is flush with the seabed at the outline (feathered wedge, then sunk) on a build plane 25% wider so the outline never meets the plane edge, and the vertex colour fades patchily into a seabed-matching colour toward the rim. Applies to every carbonate chimney, scaled by size.
- `src/world/props/geo/talus.ts`: new `scatterRubble` (lumpy flattened blocks seated on any surface function, tilted to the slope, thinned by a `keep` mask). Towers merge ~150 blocks (Poseidon, high/medium; ~14 for lone chimneys) into the existing skirt mesh: no extra draw call. `rubble` is off on the low tier, so low gets the outline and fade only.
- `VentPreset` / `presets.ts`: opt-in `hazeScale` and `hazeLift` (defaults 1 / 0, no effect elsewhere).
- `data/landmarks/lost-city/mission.json`: `ambientFill` 12 to 16, `hazeScale` 1.5, `hazeLift` 0.4 (fog denser and lifted toward a pale blue-green, so the far ridge fades into the water; fog colour is also the background). All three only add light or lighten fog.
- Tower, sub, spawn and HUD framing unchanged.

## Tiers

High/medium: rubble blocks, 48x48 skirt grid (x meshDensity). Low: no rubble, coarser grid, same fade. Draw calls unchanged (rubble is merged).

## Known gaps

- The far ridge still has a visible edge on the low tier.
- The apron fade colour is matched by eye to the lit terrain, not sampled from it.
- The terrain texture's checker repeat is untouched.
