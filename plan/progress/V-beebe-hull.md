# V-beebe-hull

## Changed

- New per-site channel `hullLight` (default 1): Vent preset param (`src/core/config/presets.ts`) -> `AtmosphereSample.hullLight` (reset to 1 each frame in `Atmosphere.update`, set by VentPreset) -> `env.lighting` writes the shared `uHullLight` uniform of the player vehicle materials -> scales `outgoingLight` before the highlight shoulder in `src/vehicles/materials.ts`. Documented in docs/presets.md.
- Beebe mission override `hullLight: 0.2` (data/landmarks/beebe-vent-field/mission.json). The response is strongly non-linear after tonemap/grade: 0.6 and 0.45 were nearly invisible, 0.1 too dark (livery lost), 0.2 is a clear dim with decal, stripe and outline still readable.
- Other sites run the same code with scale 1, so they are unchanged. No new settings, elements or tests; gates cover the shader compile.

## Screenshots

- Beebe at 0.6 / 0.45 / 0.1 / 0.28 (tuning): .cache/golden/2026-10-16-025407/, 025606/, 025711/, 025813/
- Beebe final (0.2): .cache/golden/2026-10-16-025918/beebe-vent-field-{1,2,3}.png
- Titanic unchanged check: .cache/golden/2026-10-16-025407/titanic-1.png

## Remains

- The hull is still among the brighter objects in the opening shot (white livery plus the headlight pool); the vent steam puff next to it is also bright. Going below ~0.2 loses the livery. A further step would be a darker site-specific hull tint, not more dimming.
- Wreck and canyon presets do not read `hullLight`; add only if a site needs it.
