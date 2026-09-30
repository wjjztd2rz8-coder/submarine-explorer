# F1-TERRAIN progress

## Built
- PBR triplanar seabed (`src/world/TerrainMaterial.ts`, `src/shaders/terrain.{vert,frag}.glsl`) from five CC0 sets (silt, sand, basalt, rubble, carbonate; `public/assets/terrain/`, built by `tools/make_terrain_textures.py`, recorded in ATTRIBUTION.md).
- Per-site biomes (`src/world/TerrainBiome.ts`): three texture slots, palette, stain, patchiness, ripple direction/length, bioturbation, scatter table.
- Near-field detail normals, current ripples, bioturbation, vertex cavity (`aCavity`, from `TerrainChunk.ts`) darkening hollows.
- Instanced scatter (`src/world/scatter/`): boulder, dropstone, pillow, rubble, sponge, sea pen, whip, mound; placed by slope/depth/biome, streamed by cell around the camera, density/range per tier (`scatterDensity`, `scatterRangeM` in `src/core/config/terrain.ts`).

## How to see it
`?tile=<id>&tier=low|high`; `tests/e2e/f1-terrain.spec.ts` (SHOT_SITE, SHOT_TIERS, SHOT_TAG) writes shots to `.cache/codex/shots/f1-terrain/`.

## Draw calls / triangles (3rd-person, 8 m altitude; low / high)
titanic 47/72k, 64/768k; lost-city 25/50k, 42/495k; blake 125/101k, 140/157k; great-blue-hole 40/54k, 56/538k; axial 76/75k, 93/396k; challenger 82/91k, 93/357k. (Totals include the whole scene; scatter adds a handful of instanced calls.)

## Known gaps
- The sub lamp hotspot over pale ground (Lost City, Blake) still runs hot up close; that is the lamp, not the material.
- Scatter is sparse on very flat soft bottoms by design; hard-substrate sites show more.
- Procedural forms are simple (no hero-quality sponges).
