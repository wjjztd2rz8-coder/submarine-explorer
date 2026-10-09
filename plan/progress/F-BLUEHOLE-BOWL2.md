# F-BLUEHOLE-BOWL2

## Changes

- `terrainFeatures.ts`: `blueHoleTint` (vertex colour, wired via the biome's
  `vertexTint`): depth ramp tan, ochre, grey-brown; per-bed tone and dark joints;
  riser-foot and riser-face ambient occlusion from `TERRACE_PROFILE`; chroma
  reduced and mottled on level treads. The carve records its centre for the tint.
- `TerrainBiome.ts`: `vertexTint: blueHoleTint`, softer depth tint colour.
- `stalactites.ts`: new `pendant()` (concave needle taper, drip rings, uneven
  flutes, slight bend; foot keeps the original footprint so the envelope test
  passes); wall repainted (ochre high, grey-brown low, dark joints, shadowed
  foot/underside); apron mottled with debris streaks and wall-contact shadow;
  limestone lift 3.5 to 2.7, vertex glow 0.18 to 0.1.
- Low: no new draw calls; one extra colour attribute on terrain (Lost City
  already does this); pendants use 8 + 6 x meshDensity rings.

## Findings

- The "hard grey ring around the frame" and "dark strip at the bottom" in poses
  2/3 are the cockpit viewport bezel and console (`src/vehicles/cockpit.ts`,
  F1-VEHICLES), not terrain haze. Not changed (outside ownership).
- The large beige surface in poses 2/3 is the gallery talus apron, not the bowl.

## Screenshots

`.cache/codex/shots/f-bluehole-bowl2/{before,after,low}`.

## Known gaps

- Pose 2/3 apron still leans beige; its texture is the shared rock texture.
- Bowl banding is vertex resolution limited at distance; no overhang possible.
