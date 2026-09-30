# F1-OCEAN: the water column

Status: done. Screenshots: `.cache/codex/shots/f1-ocean/` (`tests/e2e/f1-ocean.spec.ts`:
shallow, reef, mid, deep on high/medium/low, plus look-up, under-surface reef and
side-on beam views; `base/` holds the frames from before this package).

## Done

- Post stack (`src/shaders/underwater.ts`): depth texture, optional 4x MSAA, bloom
  (1 or 2 levels), view-direction scattering, god rays, chromatic fringing, depth-band
  grade with warm shallows, highlight shoulder, readability floor, dither.
  `app/systems/render.ts` feeds it from the atmosphere sample; low tier applies the
  band gain through tone-mapping exposure.
- Sea surface (`Water.ts`): Snell's window with rim and sun glint, total internal
  reflection, Fresnel from above. Flat quad, fragment-shaded swell.
- Headlight beams rebuilt (the old cone drew nothing); dust streaks, murk scaling.
- Marine snow: size spread, soft sprites, lamp flare, fog fade. Low keeps 600 points.
- Caustics: replaced the formula that rendered flat, finer footprint, stronger.
- Tier knobs added to `core/config/atmosphere.ts`; unit test `tests/unit/f1Ocean.test.ts`.

## Deferred

- The F0-CORE audit P2s (dynamic-resolution oscillation in `core/Quality.ts`, the
  `?tier=auto` Settings hint in `app/systems/settings.ts` and `ui/Settings.ts`) are
  outside this package's files and were left.
- Real-GPU timing of the post stack; headless runs use SwiftShader.
- God rays are analytic (not occluded by terrain); beam cones are not soft against
  geometry; no bloom on the low tier.
- Terrain-side caustics (in `TerrainMaterial`) would sharpen the web on slopes; the
  projector is a top-down spotlight only.

## Known issues

- With the chase camera above the waterline (sub within ~20 m of the surface) the
  boat is seen through the sea surface at reduced contrast.
