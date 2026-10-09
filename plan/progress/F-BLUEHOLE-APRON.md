# F-BLUEHOLE-APRON

## Changes

- `src/world/terrainFeatures.ts` (`blueHoleTint`): replaced the single warm/cool
  tone on level ground with three low-frequency sediment fields (olive algae
  film, grey-brown silt, tan sand), dark rubble beds, scour streaks and fine
  ripple brightness. Patches also reach the bowl treads (0.55 weight on rock).
  Flat ground keeps less chroma (0.3) so the shallow reef is not lemon yellow.
  A pale lip at r=179 and a dark foot cut at r=172 sharpen the first riser.
- Vertex colour only: no new meshes, textures or draw calls; Low unchanged in cost.

## Screenshots

`.cache/codex/shots/f-bluehole-apron/{before,after}` (poses 2/3 plus the full set).

## Known gaps

- Atmosphere haze and the shared rock texture's contour pattern still wash much
  of the patch contrast at pose-2/3 distance; the gain is visible but moderate.
- The pale sand wedge at the bottom of poses 2/3 is the shallow reef/gallery
  floor; the gallery talus apron (`stalactites.ts`) was not touched this pass.
- Patch hue range is bounded by the shared albedo texture; stronger variance
  would need the atmosphere config (owned elsewhere) or a dedicated texture.
