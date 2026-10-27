# V-bluehole-wall-strata

## Changes

- Root cause of the fine scanlines was not the baked beds: the terrain fragment shader's rock lamination (`bedPhase`, ~1.5 m period) and the geometry carve's two concentric sine "strata" terms. Removed/disabled all three sources.
- `src/world/terrainFeatures.ts`: deleted the carve `strata` sine term (net simpler). Rewrote the baked beds in `blueHoleTint`: ~17 m broad bands, tilted/wavy boundaries (bearing and position wobble), soft blend between neighbouring bed tones, no dark joint, vertical staining streaks deepening below ~30 m, gentle lighter-above/deeper-below value gradient.
- `src/world/TerrainBiome.ts`: dropped the blue-hole fragment `strata` entry; new optional biome flag `smoothRock` (set for the blue hole) that skips the shader's fine lamination and grain. Applied in `Terrain.ts` where rock detail strength is chosen.
- Roof geometry, shaft, colliders, spawn and Low draw pin untouched. The carve change shifts wall/floor heights by up to ~2 m (the removed strata term), so the pose moved ~1 m deeper.

## Screenshots

`.cache/codex/shots/V-bluehole-wall-strata/`: before.png, after1.png (colour only: scanlines unchanged, proving the source), after2.png (carve strata removed, faint lines left), after3.png (final, scanlines gone).

## Tests

Gates: see final report (`PW_PORT=5341 tools/gates.sh`).

## Simplicity

Net: one carve term and one fragment strata entry deleted; one optional biome flag added (data, no site branch). No new draws.

## Remaining issues

- The wall now reads as a broad brown mass with soft dark staining; band contrast is modest, so bands are subtle.
- Floor under the sub shows lumpy shading (lost fine grain); not tuned.
- Other biomes keep the shader lamination.

Honest rating: 6.5/10; scanline prototype look is gone, but not yet rich limestone.
