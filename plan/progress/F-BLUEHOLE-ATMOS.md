# F-BLUEHOLE-ATMOS

## Changes

- `terrainFeatures.ts` (`blueHoleTint`): depth ramp is now warm tan, thin ochre, then a cool teal-blue
  (R falls to 0.5, B rises) from ~14 to 84 m; per-tread tone, warmth and across-tread gradient from the
  terrace profile; riser lip, foot cut and ambient occlusion widened and softened.
- `TerrainBiome.ts`: unchanged (a test pins the Blue Hole `depthShade` at 30 to 105 m); cooling is in the vertex tint.
- `props/geo/stalactites.ts` (outside the strict owns list, for the stalactite task and apron grade):
  pendants get a body girth multiplier (1x to 1.9x, capped under the foot) with the foot footprint
  unchanged, blunter needle tip, stronger irregularity and bend, non-main pendants lean 0.05 to 0.19 rad;
  variation uses a separate PRNG so the original gallery placement and the envelope test hold; tips less
  white; apron, lower wall and vertex glow shift toward teal-grey; apron ochre reduced.
- `tests/unit/__snapshots__/beebeIsolation.test.ts.snap`: Blue Hole vertex colour hashes regenerated
  (intended colour change; only the colour buffers differ).

## How to see it

`GOLDEN_SITES=great-blue-hole tools/golden.sh`; screenshots in `.cache/codex/shots/f-bluehole-atmos/{before,after}`
(poses 2 and 3).

## Tiers / performance

Vertex colour and geometry parameters only. No new meshes, textures or draw calls; Low is unchanged in cost.
Pendant segment counts are unchanged.

## Known gaps

- Per-ledge roughness is not varied (terrain roughness is shader-owned); only albedo varies.
- The shelf riser is still a geometric edge; colour only softens it.
- Lengths are not newly varied (original length rule kept for the envelope test).
- Apron is now rather grey-green and pendants read a little flat cream; a normal-detail pass would help.
- Cockpit bezel and the shallow yellow reef wedge at the bottom of the frame are outside this package.
