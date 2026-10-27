# V-beebe-flow

Beebe plumes read as flowing hot water instead of identical tall columns.

## What changed (all through existing systems)
- `VentPreset.ventVariety`: wider height/width/lean scatter plus a per-vent `pace`. A new per-vertex `aPace` attribute scales each vent's rise rate, so drift speed differs per vent.
- White-smoker wisp: width now follows the vent's width scale, height follows pace, and it is a darker tone. The old fixed narrow bright wisp was the "uniform white column".
- Hot-water haze (`ventHaze`, the existing additive draw): per-sprite `aScale` (wide vents glow wider, sprites swell with height) via a small `HAZE_VERT`. Still one draw, same sprite count.
- `plume.ts` `smokePlume` (mound smokers): per-vent height (0.6-1.0), width, lean, pace, smoke tone, and a warm additive `plume-hot-haze` child at the mouth (`additive` option on `makePlume`). `smokePlumeReach/Top` replace the duplicated bounds arithmetic in `smokers.ts`; the maxima equal the old ones, so culling bounds, framing and snapshots are unchanged.
- Tests: extended `ventHazeBudget.test.ts` (pace/scale) and `props-geo.test.ts` (variety, hot haze). No snapshots re-baselined; perf-budget passes unchanged.

## Cost
Preset: +1 float attribute per smoke particle, +1 per haze sprite, no new draws. Mound smokers: +1 small Points child per plume (about 18% of the smoke count), on the 2 mound plumes only. Low tier scales by the same tier factor.

## Rating and weaknesses
Beebe golden ~3.5 to ~3.7: plumes now differ in height, thickness and lean, and warm glow sits at the mouths. Remaining: the trunk's own plume is still a dense column near the top of frame; smoke is a billboard-sprite cloud, so no true flow shear; the wisp stays brighter than the black smoke around it; the haze is only 3 sprites per orifice so it is subtle from far.

## Screenshots
Before: `.cache/golden/2026-10-27-022132/`. After: `.cache/golden/2026-10-27-022746/` (and the newest set). Files `beebe-vent-field-1..3.png`.
