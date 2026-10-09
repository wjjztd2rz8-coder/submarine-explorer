# f-challenger-seabed

Challenger Deep seabed legibility (DIRECTOR item 5).

## Changes
- `src/world/TerrainBiome.ts` (challenger-deep): lighter olive-grey ooze (0x6a6758/0x58594f/0x4c4a41), warm stain, stronger patch variation, ripple 0.15 -> 0.3 with longer crests, mound density 4 -> 7, dropstone 0.3 -> 0.4.
- `data/landmarks/challenger-deep/props.json`: lander marker dimensions 3x3x1.5 -> 5x5x2.4 m (note text unchanged).
- `src/core/config/deepOpenings.ts`, `src/world/life/DeepOpening.ts`: amphipod bait swarm 30 -> 45 (low tier 18 -> 24), tighter spacing, deterministic jitter so it no longer reads as rows.
- `src/world/life/catalogueInvert.ts`: hadal amphipod size 0.04 -> 0.06.

## See it
`GOLDEN_SITES=challenger-deep node tools/golden-shots.mjs <preview url>`. Swarm is clearly visible left of the lander in capture 2; the far trench rise shows in capture 1.

## Tiers
Terrain/biome and marker changes are tier independent (no new draw calls; mounds use the existing scatter pipeline). Swarm count scales via the existing low/high split.

## Known gaps
Slope toward the trench axis is the real GMRT surface and is unchanged; only its readability improved through brighter colour and relief. Lander is still a debris cluster.
