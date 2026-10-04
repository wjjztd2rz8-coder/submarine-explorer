# Underwater atmosphere (package A2)

Source of truth: `src/render/Atmosphere.ts` (fog, ambient, filtered sun, caustics, depth-band events), `Headlights.ts`, `MarineSnow.ts`, `caustics.ts`, `src/world/Water.ts` (surface lid), `src/shaders/underwater.ts` (post pass). Tunables: `water` section of `src/core/Config.ts`. Wiring: `src/main.ts`. Test: `tests/e2e/atmosphere.spec.ts`.

## Depth bands

Palettes and fog coefficients are the art-direction values (`docs/art-direction.md` §0). Stops are interpolated smoothly by **camera** depth, never hard-cut.

| band     | reached at | character                                                  |
| -------- | ---------- | ---------------------------------------------------------- |
| surface  | 0 m        | bright blue-green water, filtered sun, caustics on the bed |
| twilight | −20 m      | dimming teal, caustics fading out by −60 m                 |
| midnight | −200 m     | near-black blue, no sun, headlights carry the scene        |
| abyss    | −1000 m    | black, cold headlight pool only                            |

`Atmosphere.update()` emits `env:depthBand {band, previous, depth}` on the EventBus whenever the band changes.

- Nothing subscribes to it yet, and nothing needs to. The audio beds already crossfade continuously from `frame.depth` in `AudioSystem.update()` (`src/audio/DepthBands.ts`).
- The HUD does not show the band.

Reference frames: `docs/img/atmosphere-10.png`, `-300.png` and `-3800.png`.

- A normal e2e run writes them to `tests/e2e/screenshots/atmosphere-*.png` (gitignored), so it no longer dirties the tracked copies.
- To refresh the docs copies, run the spec with `UPDATE_DOCS_IMG=1`.

Spawn at a depth with `?depth=<metres>`; it is clamped 40 m above the seabed.

## Fog

`FogExp2`, density = band density × `fogDensityScale` (default 0.02). The published coefficients describe a 20–200 m sight line; the chase camera sits ~120 m behind the boat and navigation needs kilometre sight lines, so the shipped scale is small while the 5:1 surface-to-abyss ratio is preserved. Set `fogDensityScale` to 1 for the literal art-direction look (first-person only).

## Lights

- **Ambient + directional "sun"**, intensities per band; sun is zero below the photic zone. The directional light's target tracks the boat.
- **Headlights**: two spotlights `headlightSeparationM` apart, colour `headlightColor`, plus a soft additive cone mesh on medium/high tiers. Toggle with **L** (`toggleLights` action, gamepad X).
- **Caustics**: a downward spotlight projecting animated procedural frames (`makeCausticFrames`) at `causticsFps`; full strength above `causticsStartM`, gone below `causticsEndM`. Disabled on low tier.

## Marine snow

GPU point field of `snowCount` particles in a `snowBoxM` cube that wraps around
the camera; density and drift per band. Permanent flakes use `snowSizeM` (0.08 m),
`snowOpacity` (0.24), and `snowLampGain` (0.8 extra linear brightness in the lamp
cone). The budgets are 300/1,200/3,000/3,000 for Low/Medium/High/Ultra; one draw
with GPU drift and no per-frame particle uploads on every tier.

Readability guard: within `snowForegroundM` (6 m radial distance from the camera),
sprites are at most 2 drawing-buffer pixels across, with centre alpha at most
0.12 and a linear colour multiplier at most 0.65, including lamp flare. These
bounds ease back to the configured lighting/alpha by 12 m; the diameter never
exceeds `snowMaxSizePx` (3 buffer pixels). Permanent snow also fades in from zero
at the lens to full strength at 12 m and fades out radially between
`snowFadeStartM` (40 m) and `snowFadeEndM` (80 m), keeping the middle-distance
particles as depth cues. The Gaussian edge, band density, drift and wrapping
are unchanged. At higher DPR the cap occupies fewer CSS pixels. Fog and scene
ambient floors are independent of these particle controls. Wreck sediment haze
and rust motes share the 6 m guard, easing back to their original broad sprites,
alpha and lighting by 12 m. Other preset plumes/mist retain their own appearance.
Titanic also overrides its wreck haze to 1,800 particles, 0.25 m sprites and
0.05 opacity, and rust motes to 180 per hull, 0.15 m sprites and 0.16 opacity.
These settings reduce large seabed flecks outside the foreground guard while
preserving the 30-intensity ambient fill that lights the hull. Low skips both
wreck particle layers.
Regression coverage:
`tests/unit/marineSnowReadability.test.ts` (13 sites, four tiers, free/mission openings).

## Surface lid

`Water.ts` draws a camera-following flat quad at y = 0, only while the camera is shallower than `surfaceVisibleAboveM` (−160 m). F1-OCEAN shades it per fragment from the optics. The swell is an analytic slope (two crossed sine trains plus four fine ripples on medium and up) that flattens with distance.

- **From below:** inside Snell's window (angle from vertical under 48.6°) you see sky-blue light with a bright rippled rim and a warm sun glint; outside it the surface is a total-internal-reflection mirror, drawn as the fog colour so the horizon stays continuous. Window brightness fades with depth (`uLight`, gone by 160 m).
- **From above:** a Fresnel mix of water colour and sky, with a sun glint.

## Post pass

`UnderwaterPass` (`src/shaders/underwater.ts`) renders the scene into a half-float target with a depth texture (4x MSAA on high and ultra), then:

1. **Bloom**: soft-knee bright pass into a quarter-resolution target, two separable blurs, and on high/ultra an eighth-resolution second level. Added in linear light before tone mapping.
2. **Composite** in one full-screen shader: slow UV wobble (fades with depth); chromatic fringing toward the frame edge; **view-direction scattering** (the water is brighter looking up, darker looking down, weighted by the fog fraction rebuilt from the depth texture so the far terrain still melts into the open-water colour); **god rays** (noise around the sun axis, 1 or 2 octaves by tier, strongest in the top tens of metres, `godRayStrength()` in `app/systems/render.ts`); bloom; the per-band grade (gain, tint, saturation), warm highlights over blue-green shadows while sunlit; a highlight shoulder so lamp pools keep detail; the **readability floor** (a faint lift in the fog hue on the darkest pixels); vignette; ACES and sRGB; a hair of dither.

**Colour pipeline.** The scene renders into a linear **half-float** target, and Three skips tone mapping and output encoding for render targets. The pass therefore ends with `#include <tonemapping_fragment>` and `<colorspace_fragment>`: ACES with `toneMappingExposure`, then sRGB, applied once on the way to the screen.

- Before QA-B #4 it did neither, so medium/high showed raw linear values: crushed darks, over-saturated mid-tones.
- The band light intensities assume this pipeline: surface ambient 0.9 / sun 1.0, twilight 0.55 / 0.35.
- The low tier renders straight to the screen, with the band `gradeGain` applied through `toneMappingExposure`.

**Draw calls.** The pass's own `renderer.render` auto-resets `renderer.info`. It therefore snapshots the scene's `info.render.calls` / `triangles` first (`sceneDrawCalls`, `sceneTriangles`), and the `?debugTerrain=1` line adds them (QA-B #8).

**Headlight beams.** The cone is shaded by `|N·V|` (how squarely the eye looks through the shell), fades at the apex and near the camera, thickens with the particulate load (`snowDensity` scaled down in daylight) and carries drifting dust streaks when `beamDetail` is 1 or more. Marine snow inside the lamp cone is brighter and slightly larger.

**Caustics.** `makeCausticFrames` bakes a two-layer animated Voronoi web (cell borders are the filaments), 10 or 16 frames per loop, projected over `causticsFootprintM` (320 m).

## Tiers

| tier   | post | bloom levels | god-ray octaves | MSAA | snow | caustics px | beam detail |
| ------ | ---- | ------------ | --------------- | ---- | ---- | ----------- | ----------- |
| low    | no   | 0            | 0               | 0    | 300  | 0           | 0 (plain)   |
| medium | yes  | 1            | 1               | 0    | 1200 | 128         | 1           |
| high   | yes  | 2            | 2               | 4    | 3000 | 256         | 2           |
| ultra  | yes  | 2            | 2               | 4    | 3000 | 256         | 2           |

## Follow-ups

- Measure the pass cost on a real GPU (brief target ≤ 3 ms on this Mac); the headless runs use SwiftShader.
- LUT-based grade instead of a single tint multiply.
- Occlude god rays with terrain silhouettes; depth-aware soft particles for the beam cones.
