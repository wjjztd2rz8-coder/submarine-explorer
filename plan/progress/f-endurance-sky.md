# f-endurance-sky: Endurance sky and sonar (DIRECTOR backlog 5)

## What changed

- `src/world/presets/WreckPreset.ts`, `TitanicHorizon.ts`: Endurance horizon look is paler (upper 0x2c5266, haze 0x4a7a8c, peak 0.32). `HorizonLook` gains optional `fogLift` and `fogHaze` (defaults leave Titanic as before). Endurance mixes 45% haze colour into the fog, so the fog-matched ring (elevation <= 0.2, asserted in `enduranceAtmosphere.test.ts`) is lit too; no silhouette outlines.
- `src/world/presets/EnduranceRelief.ts`: ridge layout extracted to `enduranceRidges`, plus `enduranceScourHeight` (analytic ridge height); the 3D mesh output is unchanged.
- `src/ui/Sonar.ts`: on Endurance (flat view with the hull poi) no tilt contours; ridge hillshade from the shared layout; hull footprint glyph at the hull poi; dark disc under the sub on flat sites; `setPois` marks the relief dirty.
- Tests: `tests/unit/enduranceScour.test.ts`; full vitest run 1728 passed. CHANGELOG entry added.

## Screenshots

`plan/progress/f-endurance-sky-shots/before-{1,2,3}.png`, `after-{1,2,3}.png` (golden endurance, desktop).

## Gaps

- Sonar swells are an interpretive layer over the real 6 m tilt: the survey has no ridges, the 3D scene's ridges are the same layout. Phone and expanded sonar views not captured.
- Near the horizon the water is still darker at far distance (fog), but it is a blue-teal gradient, not black. Pitch-up views not separately captured.
