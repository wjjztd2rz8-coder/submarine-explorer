# F-BLUEHOLE-ATMOS

## Changes

- `terrainFeatures.ts` (`blueHoleTint`): depth ramp is now warm tan, thin ochre, then a cool teal-blue
  (R falls to 0.5, B rises) from ~14 to 84 m; per-tread tone, warmth and across-tread gradient from the
  terrace profile; riser lip, foot cut and ambient occlusion widened and softened.
- `TerrainBiome.ts`: Blue Hole `depthShade` 10 to 90 m with a lighter teal tint (0x5f8f9c), so the shader's
  depth multiplier starts earlier and stays readable.
- `props/geo/stalactites.ts` (touched outside the strict owns list, for the stalactite task and apron
  grade): pendants thicker (radius scale 0.75 to 1.85 of the old rule), blunter needle tip, stronger
  irregularity and bend, lean up to about 0.15 rad, length power-law variation; tips less white;
  apron, lower wall and vertex glow shifted toward teal-grey; ochre on the apron reduced.

## How to see it

`GOLDEN_SITES=great-blue-hole tools/golden.sh`; screenshots in `.cache/codex/shots/f-bluehole-atmos/{before,after}`
(poses 2 and 3).

## Tiers / performance

Vertex colour and geometry parameters only. No new meshes, textures or draw calls; Low is unchanged in cost.
Pendant segment counts are unchanged.

## Known gaps

- Per-ledge roughness is not varied (terrain roughness is shader-owned); only albedo varies.
- The shelf riser is still a geometric edge; colour only softens it.
- Apron is now rather grey-green and pendants read a little flat cream; a normal-detail pass would help.
- Cockpit bezel and the shallow yellow reef wedge at the bottom of the frame are outside this package.
