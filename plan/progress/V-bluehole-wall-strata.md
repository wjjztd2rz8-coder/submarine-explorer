# V-bluehole-wall-strata

## Changes

- Root cause of the fine scanlines was not the baked beds: it was the terrain fragment shader's rock lamination (`bedPhase`, ~1.5 m period), plus the fragment `strata` entry and the baked 3.4 m beds.
- `src/world/terrainFeatures.ts`: Rewrote the baked beds in `blueHoleTint`: ~17 m broad bands, tilted/wavy boundaries (bearing and position wobble), soft blend between neighbouring bed tones, no dark joint, vertical staining streaks deepening below ~30 m, gentle lighter-above/deeper-below value gradient.
- `src/world/TerrainBiome.ts`: dropped the blue-hole fragment `strata` entry; new optional biome flag `smoothRock` (set for the blue hole) that skips the shader's fine lamination and grain. Applied in `Terrain.ts` where rock detail strength is chosen.
- Roof geometry, shaft, colliders, spawn and Low draw pin untouched. Heights are unchanged (removing the carve strata term was tried and reverted: it moved the shelf and broke the shaft pixel budget).

## Screenshots

`.cache/codex/shots/V-bluehole-wall-strata/`: before.png, after1.png (colour only: scanlines unchanged, proving the source), after2.png (carve strata removed, faint lines left), after3.png (final, scanlines gone).

## Tests

Snapshots re-baselined for the intended change only: tint hashes in terrainFeatures (heights hash unchanged) and beebeIsolation (blue-hole biome and shader define/uniforms). Unit suite otherwise green; first full gates run failed only on those snapshots plus the reverted carve change.

## Simplicity

Net: one fragment strata entry and the joint/fine-bed code deleted; one optional biome flag added (data, no site branch). No new draws.

## Remaining issues

- The wall now reads as a broad brown mass with soft dark staining; band contrast is modest, so bands are subtle.
- Floor under the sub shows lumpy shading (lost fine grain); not tuned.
- Other biomes keep the shader lamination.

Honest rating: 6.5/10; scanline prototype look is gone, but not yet rich limestone.
