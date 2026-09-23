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

GPU point field of `snowCount` particles in a `snowBoxM` cube that wraps around the camera; density and drift per band; brightness follows ambient with a floor so particles still catch the headlights in the abyss.

## Surface lid

`Water.ts` draws a camera-following plane at y = 0 with a two-sine vertex wobble and a facing-angle brightness term, only while the camera is shallower than `surfaceVisibleAboveM` (−100 m). **Not done:** a true Fresnel/reflective lid (A2 item 6); the current one is a tinted translucent plane.

## Post pass

`UnderwaterPass` is a single full-screen shader: slow UV wobble (fades with depth), per-band colour grade tint (`gradeTint`) and vignette (`vignette`), driven from the current `AtmosphereSample`.

**Colour pipeline.** The scene renders into a linear **half-float** target, and Three skips tone mapping and output encoding for render targets. The pass therefore ends with `#include <tonemapping_fragment>` and `<colorspace_fragment>`: ACES with `toneMappingExposure`, then sRGB, applied once on the way to the screen.

- Before QA-B #4 it did neither, so medium/high showed raw linear values: crushed darks, over-saturated mid-tones.
- `toneMappingExposure` had no effect, and the displayed fog was not the art-direction hex.
- The band light intensities were about 3× hotter to compensate. They are now surface ambient 0.9 / sun 1.0, twilight 0.55 / 0.35, and caustics 1.1.
- The low tier (no post) always rendered correctly and now matches medium/high.

**Draw calls.** The pass's own `renderer.render` auto-resets `renderer.info`. It therefore snapshots the scene's `info.render.calls` / `triangles` first (`sceneDrawCalls`, `sceneTriangles`), and the `?debugTerrain=1` line adds them (QA-B #8). Chromatic aberration and god rays are configured per tier (`aberrationStrength`, `godRayStrength`, `tiers.*.godRays`) but **not yet implemented in the shader**; the uniforms are read by nothing. On the low tier the scene renders straight to the screen with no post pass.

## Tiers

| tier   | post | god rays   | snow | caustics px | headlight cones |
| ------ | ---- | ---------- | ---- | ----------- | --------------- |
| low    | no   | no         | 0    | 0           | no              |
| medium | yes  | no         | 3000 | 128         | yes             |
| high   | yes  | yes (stub) | 9000 | 256         | yes             |

## Follow-ups

- Implement aberration and god rays in the post shader (high tier) and measure the pass cost (brief target ≤ 3 ms on this Mac).
- Fresnel surface lid.
- LUT-based grade instead of a single tint multiply.
