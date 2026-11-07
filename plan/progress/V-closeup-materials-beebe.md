# V-closeup-materials-beebe

## Changes
- `sulfideCrust()` in `src/world/props/geo/materials.ts`: world-position value-noise shader layer (no UVs, no textures, no extra draw calls) giving chimney bodies mineral grain (normal perturbation at two scales, detail tiers only), dark sulfide stain pooling in hollows and streaking down steep faces, and a pale microbial film on shelves.
- Applied to the shared smoker body (`smokers.ts`) and crusted chimney (`crustChimney.ts`) materials, so any vent site using those builders gets it. Low tier keeps albedo only (`grain: 0`, no normal work).

## Simplicity rules
Net: one function, two call lines; no site branch (rule 4), no new settings, no new tests needed (visual shader only), no package numbers in code.

## Evidence
Before/after golden detail frames in `.cache/codex/shots/V-closeup-materials-beebe/` (`before-` / `after-beebe-vent-field-3.png`).

## Remaining issues
The main spire geometry still reads as smooth sheet-like terraces and slab flanges; the shader adds grain and stain but not silhouette. No true anemone/microbial relief at the vent mouths; sediment at the base is unchanged. Rating of the detail frame: about 3.3 -> 3.6 of 5.
