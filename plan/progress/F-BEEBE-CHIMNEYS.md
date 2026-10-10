# F-BEEBE-CHIMNEYS

Branch claude/f-beebe-chimneys. Files: src/world/props/geo/{crust,crustChimney,spire,smokers,beebe}.ts, src/world/props/builders/vents.ts, src/world/scatter/ScatterGeometry.ts, src/core/config/beebeChimney.ts, tools/beebe-chimney-shots.mjs, CHANGELOG.

## Built

- Chimneys 2-3 (plain `procedural:chimney`): `buildCrustedChimney` uses `tieredSpire` with `crust`, the hero's irregular profile, partial sulfide flanges seated on the leaned trunk axis, and 1-2 side spires. Colours come from the shared `paintCrust()` (extracted from smokers.ts), painted per column in its own frame so bands follow the lean. Variation per id in `BEEBE_SIDE_CHIMNEYS`: chimney 2 is 1.18x tall, leans 0.06 rad, 4 flanges, 4 flutes; chimney 3 is 0.9x tall, wider, leans 0.09 rad, 2 flanges, 6 flutes. Same finish as the hero (albedo x1.25, vertex glow). One mesh, one draw.
- Hero flange softening: `crustBand` crest is broad and rounded (slow rise, gentler fall), nodule amplitude lower; `flange()` has a thicker bullnose lip and gentler scallops.
- Rocks: habitat rubble columns are jittered (knobbly) and darker basalt colours; scatter rubble vertex colour divided by 1.3 so it is no longer the brightest scatter kind.

## Tiers

High/Medium: 28-segment, ~0.32 m ring trunks. Low: 10 segments, ~1.4 m rings, one coarse flange, no side-spire crust (1140 Low ceiling holds). Spawn view Low 115,112 to ~116,000 triangles, 68 draws unchanged.

## Shots

.cache/codex/shots/f-beebe-chimneys/: base-{high,low}-_, after-{high,low}-_ (spawn, c1..c3 far 42 m and near 26 m) from `tools/beebe-chimney-shots.mjs`.

## Known gaps

- Smooth tan blobs near the sub at spawn are not scatter or habitat meshes (probably the terrain shader's cobble/stain layer); not changed.
- Chimneys 2-3 read slightly paler/pinker than the hero under the headlights.
- Flange rims still catch bright headlight highlights.

Snapshots re-baselined (intended): beebeIsolation, beebeScatter (rubble colour), terrainMerge1140 beebe Low buffer hash.
