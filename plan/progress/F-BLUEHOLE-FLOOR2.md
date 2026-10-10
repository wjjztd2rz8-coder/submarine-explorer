# F-BLUEHOLE-FLOOR2

Shots: `.cache/codex/shots/f-bluehole-floor2/{before,after}` (golden Blue Hole poses 1-3, east 2-3).

## Findings

- The grey squiggle contours were not terrain albedo. The visible shelf in poses 2/3 is the gallery apron prop and the wall prop (`stalactites.ts`), which use the shared `rock` detail map. Earlier attempts changed terrain texture only.
- The terraces skip both gallery bearings, so the apron the sub sits on was a smooth ramp.

## Changes

- `stalactites.ts`: apron and wall drop their detail map and bump map (vertex colour only, albedo scale kept at 0.58 / 0.8). Apron gets height-keyed sediment bands (pale lip, dark joint, per-bed tone), hollows and pale sand pools.
- `terrainFeatures.ts`: `blueHoleApron` (four ragged 1.7 m steps on the gallery-mouth shelf), three extra ~2.6 m steps in the bowl shelf profile, `blueHoleTalus` (rounded 1-2 m mounds at riser feet, bearings hashed), stronger riser shadow, pale tread lips, hollows and sand patches in `blueHoleTint`, and `blueHoleSonarShade` for the minimap.
- `TerrainBiome.ts`: Blue Hole `contrast 0`, `detail 0`, stain and patch 0, burrow 0.15.
- `terrain.frag.glsl` (deviation, 1 line): the breakup texture term is skipped when slot-A contrast is 0 (only Blue Hole uses 0).
- `Sonar.ts` (Blue Hole path only): multiplies the relief colour by `blueHoleSonarShade` when the hole lies on the tile. The shared-ramp test uses a synthetic tile away from the hole and stays green.
- Snapshots updated: beebeIsolation (Blue Hole biome hash, shader text), terrainMerge1140 (Blue Hole terrain buffers).

## Tier / cost

No new meshes or draw calls. Terrain triangle budgets unchanged; steps and talus are heightfield only. Low-tier mesh-vs-sampler and terrace bound tests pass unchanged, so drift/talus amplitudes were kept small.

## Verdict

Squiggle gone; apron now shows soft banded steps and hollows; minimap reads as reef patches and sand around the hole instead of a flat square. Terrace relief at gallery distance is still subtle (fog), and the upper wall prop now reads smooth cream. Modest gain, about +0.25 to +0.5.

## Known gaps

- Far-wall terraces are lost to horizon fade; they read in the chase pose (1) only.
- Minimap blotches are somewhat regular; could vary scale with zoom.
