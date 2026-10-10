# 1190 — Titanic and Endurance horizon haze

Implement a gradual upper-water haze and faint suspended-sediment glow using the
existing backdrop, preserve the Titanic hull, and validate in two rounds with
Low and fresh 390×844 portrait starts. Run `tools/gates.sh --full-e2e` and retain
before/after golden evidence.

## Result

`ABYSS_HORIZON` in `src/core/config/atmosphere.ts` now owns the backdrop palette,
fog lift, activation depths, gradient elevations and suspended-glow variation.
The existing `TitanicHorizon` dome (also used by Endurance) reaches its faint
blue-grey haze peak at unit-sphere elevation 0.5 instead of extending its old
upward ramp to 0.85. It fades gently toward a slightly dimmer crown, with broad
8% azimuth variation in the glow. This gives the upper water depth without
adding relief meshes, particles, lights, textures, post passes or dependencies.

The lower hemisphere and first ring above world level retain the exact fog
colour, avoiding an outline around far seabed in pitched/portrait views. The
existing terrain distance fade remains unchanged. Fog lift remains 0.4, and
fog density, fog hue, ambient exposure, lamps and post grade remain unchanged.
The hue matters because the post pass derives its foreground readability
floor from it. The new backdrop never darkens a vertex relative to the previous
backdrop at full abyssal depth; peak linear luminance remains below the existing
0.025 ceiling. Nearby hull visibility therefore retains its previous lighting.
No Titanic hull or other prop geometry files changed.

Budget remains one backdrop draw, 561 vertices and 960 triangles on every tier.
Low still skips wreck particle layers and the post stack. Both wrecks share the
same tuning; other sites do not instantiate this backdrop. Surface starts retain
the original palette, with activation smoothly limited to 700–1,200 m depth.

## Before / after goldens

**Fresh paired capture is blocked, so visual acceptance remains pending.**
The pre-edit High capture attempt and post-edit High/Low capture attempts all
built successfully but preview startup failed with
`listen EPERM: operation not permitted 127.0.0.1:4298`. The browser skill's
runtime also reports `No browser is available`, with an empty browser list.
No after image is fabricated or represented by an archival reference.

| View                             | Before reference                                                                                    | After                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------- |
| Titanic desktop 1600×900, High   | [Archival opening](1190-f-titanic-haze-horizon/before-reference-titanic-desktop-high.png)           | Pending fresh capture |
| Endurance desktop 1600×900, High | [Archival opening](1190-f-titanic-haze-horizon/before-reference-endurance-desktop-high.png)         | Pending fresh capture |
| Titanic portrait 390×844, Low    | [Earlier archival opening](1190-f-titanic-haze-horizon/before-reference-titanic-portrait-low.png)   | Pending fresh capture |
| Endurance portrait 390×844, Low  | [Earlier archival opening](1190-f-titanic-haze-horizon/before-reference-endurance-portrait-low.png) | Pending fresh capture |

References are copied byte-for-byte from
`/home/vijay/submarine-explorer/.cache/golden/2026-10-09-221156/` (High desktop)
and `2026-10-09-034952/` (Low portrait). They show the large dark upper band;
archival references predate intervening changes (including Endurance's 1180
particle tuning) and are context rather than a paired baseline. Original pose
manifests and SHA-256 copy verification
are retained beside the images. All four references were opened for inspection.
Capture logs: `.cache/1190/golden-before.log`, `golden-after-high.log`, and
`golden-after-low.log`.

## Two validation rounds

Round 1 reused the existing backdrop and tested fog matching, exposure and
Endurance behaviour. Fourteen focused cases passed; the initial haze peak
failed the existing 0.025 luminance limit. The peak was lowered from `#20333e`
to `#1d2e38`, preserving that assertion rather than relaxing it. Log:
`.cache/1190/focused-round1.log`.

Round 2 passes all 17 focused tests. New assertions check unchanged geometry
budget, no vertex darkening relative to the previous backdrop, bounded peak
brightness, a dim azimuth-varying glow below the crown and partial-depth fog
activation. Existing checks retain fog matching along actual pitched/rolled
landscape and portrait camera rays, unchanged fog density/exposure, near-hull
fog contribution, surface deactivation and disposal. Endurance remains covered
at all four tiers. Log: `.cache/1190/focused-round2.log`.

`tests/e2e/f-horizon-1190.spec.ts` adds eight independent browser cases: both
wrecks, Low/High, desktop/390×844. Viewport is set before navigation so portrait
uses its authored opening rather than a resized desktop pose. Each case saves
a screenshot, verifies the active tier, canvas size, loaded props, unchanged
dome budget, absence of Low wreck haze, non-black screenshot scene-region mean
(excluding the bright HUD/controls) and no
browser errors. All eight load via Playwright `--list`; execution still requires
a working preview server. Typechecking including the new spec passes.
Logs: `.cache/1190/e2e-list.log`, `.cache/1190/typecheck.log`.

Required gate command:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4190 PW_OUTDIR=dist-1190 \
  tools/gates.sh --full-e2e
```

Gate run in progress; results will be recorded below. Log:
`.cache/1190/gates-round2.log` and `.cache/gates/*.log`.

## Complete visual acceptance outside this sandbox

```bash
GATES_CONFIG_MODE=writable PW_PORT=4190 PW_OUTDIR=dist-1190 \
  tools/gates.sh --full-e2e
GATES_CONFIG_MODE=writable GOLDEN_SITES=titanic,endurance \
  GOLDEN_LAYOUTS=desktop,portrait tools/golden.sh
GATES_CONFIG_MODE=writable GOLDEN_SITES=titanic,endurance \
  GOLDEN_LAYOUTS=desktop,portrait GOLDEN_TIER=low tools/golden.sh
```

Capture the pre-change revision with the same commands to obtain true paired
baselines; retain the pose manifests. Check hull readability and the seabed
transition in opening, approach and detail views. Copy fresh after images into
this evidence directory and replace the pending entries only after inspection.
