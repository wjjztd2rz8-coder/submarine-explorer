# V-monterey-flatten

## Changes

Data only, in the `monterey-canyon` entry of `BIOMES` (`src/world/TerrainBiome.ts`): sand colours darkened about 20 percent (colorA 0x5d564a to 0x4a443a, colorB 0x6d6454 to 0x554d3e), `contrast` 0.55 to 0.8, `detail` 0.5 to 0.85, `stainAmount` 0.08 to 0.18. No shader or site branch; the existing detail fade distances give the falloff. Earlier attempts (V-monterey-floor ripples and pebbles, apron, foot) did not darken the sand, so this tint route was not repeated.

Tests: `beebeIsolation` and `beebeScatter` snapshots rebaselined (Monterey biome hash and uniforms only; no capability assertion changed). CHANGELOG entry added.

## Screenshots (`plan/progress/V-monterey-flatten/`)

`before-1.png` / `after-1.png` (hero), `before-mission.png` / `after-mission.png` (opening).

## Verification

`PW_PORT=4411 tools/gates.sh` passes (smoke and project-base), full unit suite passes after the two snapshot updates, `golden-readable` flags 0/1 openings (scene mean Y 4.6 percent, same as before in practice).

## Self-rating

About 3.9 to 4.0 (from 3.9). The seabed is darker and mottled and sits closer to the wall tone, and the opening slope reads as textured silt. Honest: the lamp pool under the sub still lights a pale patch in the hero shot, so the slab is softened, not gone; the improvement is moderate.

## What remains

The remaining pale patch is the sub lamp falloff on near ground, not albedo. A lamp-falloff change is shared lighting code and out of scope for a small data pass. One attempt only, as time-boxed.
