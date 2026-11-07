# V-bluehole-apron-silt

## Finding

The terraced slope in `great-blue-hole-3.png` is not the terrain carve. It is the gallery apron prop (`buildTalusMesh` with `terraces`), whose bed tops sat at near-constant heights along the wall. Disabling `blueHoleTerraces` entirely left the image unchanged, so the first attempt (terrain-side slump and ring changes in `terrainFeatures.ts`) was reverted and nothing there changed.

## Changes

- `talus.ts`: bed tops sway along the wall at two wavelengths (still under half a bed per term, so beds never cross), and a slump field keyed to height and wall position (not bed index, so the surface stays continuous across a riser) flattens the beds into smooth ramp in patches. Only apron meshes with `terraces` are affected (Blue Hole galleries); Monterey scarps are untouched.
- `stalactites.ts`: fallen blocks get a hashed stretch and size (cobbles to boulders) and a wider tone range. Hashed from the spot, not `rnd()`, so the pendants and the rest of the gallery stream are unchanged (the first try shifted the pendants).
- `data/landmarks/great-blue-hole/site.json`: `riserShade` 0.2 to 0.12 and `lipLight` 0.12 to 0.06, so the remaining risers stop reading as pale stripes. This is per-site data; no site branch.

## Simplified

No new settings, no new draw calls, no new files. One shared field replaces nothing but adds about ten lines; the tint and terrain carve are untouched. `geo-talus` assertions (level treads and risers) are unchanged and pass.

## Screenshots

`plan/progress/shots/V-bluehole-apron-silt-before.png` and `-after.png` (west gallery detail frame). Opening: mission-opening frame is outside the grotto apron; compared with a fresh golden capture (see Gates).

## Self-rating

Detail frame about 3.5 of 5 (was about 2.5). The slope is now one irregular body with scarps that fade in and out and rocks of different size and outline. Not done: fine grain and ripple texture on the silt (the surface is still a smooth blend in colour), and the lower scarps still run roughly parallel for part of their length.
