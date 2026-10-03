# F-BLUEHOLE-WALL

Branch `claude/f-bluehole-wall`. Great Blue Hole wall, apron and floor.

## Changes

- `src/world/terrainFeatures.ts`: concentric strata shelves on the wall, four scooped alcoves (NOTCHES), eight fixed floor blocks (BLOCKS).
- `src/world/TerrainBiome.ts`, `TerrainMaterial.ts`, `src/shaders/terrain.frag.glsl`: new optional biome `strata {periodM, amount}` drives warm/cool bed tints with dark joints on slopes (one uniform, no extra texture fetches, all tiers). Blue Hole colours less bright, patch 0.45 -> 0.3, boulder scatter on any ground.
- `src/world/props/geo/stalactites.ts`: banded wall paint, apron and shelf-top sediment mottling (no flat cream), lower limestone lift.
- `data/landmarks/great-blue-hole/props.json`: `karst-grotto-east` (56x20x16 m) at ~154 m from the centre, bearing ~57 deg (south-east), facing the hole.
- Tests: `tests/unit/f-bughunt-4.test.ts` characterization retargeted (finer sample grid, sub placed above the collision surface beneath the drawn mesh); `blueHoleProps` covers the new prop automatically.

## See it

`GOLDEN_SITES=great-blue-hole tools/golden.sh`; before `.cache/golden/2026-10-03-190819`, after in `.cache/codex/shots/f-bluehole-wall/`.

## Tier behaviour / perf

Terrain: one extra analytic block in the fragment shader, no new draw calls. Props: same meshes, one extra prop (instanced rocks and merged stalactites; low tier unchanged in kind). Boulder scatter is an existing instanced kind.

## Known gaps

A height field cannot overhang; alcoves are steep re-entrants. The east alcove is not in the three golden poses.
