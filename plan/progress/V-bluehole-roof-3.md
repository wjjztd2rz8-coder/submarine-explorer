# V-bluehole-roof-3

## What changed (`src/world/props/geo/stalactites.ts`, hood branch only)

- **Roof top and lip** lerp to a warm cliff-strata brown (`STRATA`), so they stop reading as a paler separate slab.
- **Underside and cavity** lerp toward a cool dark tone (`CAVE_DARK`), darkest deep in the bay; the apron under the roof is darkened and loses its teal pane.
- **Pendants** take the rock's warm grey and lose the bright white tips.
- **Opening light**: emissive scale 0.16 -> 0.1 and a stronger fall-off with depth (0.2 + 0.8 * openingLight) so the interior is dark. This is the existing shader hook; no light-shaft effect was added.
- No geometry change: lip silhouette, spawn, colliders and Low budget are untouched.

## Shots

`.cache/codex/shots/V-bluehole-roof-3/{before,after}/` : east-2, east-3, great-blue-hole-2, plus `low-great-blue-hole-east-2.png`.

## Tests

Colour-only change: `props-geo` and `terrainMerge1140` snapshots re-baselined (buffer hashes only). Full vitest passes; `tools/gates.sh` run at the end.

## Simplicity rules

1 net: three constants and a few lines in the existing hood branches. 4: extends the `hood` flag, no site branches. 6: capability tests unchanged, snapshots moved for intended colour only. 7: no package numbers in code.

## Remaining issues

- The lip outline is still the rolled slab with chunky blocks (task 2 not attempted); fused curtains absent.
- No soft light shaft; the interior is dark but the far pool still reads as a flat grey pane.
- Pendants are still uniformly spiky teeth in profile.
- Honest rating about 3.3 (value and colour clearly improved, shape unchanged).
