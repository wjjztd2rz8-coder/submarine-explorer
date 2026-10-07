# F-TITANIC-780

## Plan

1. Trace 670's backdrop and the seabed fog path; reproduce the horizon mismatch
   in unit tests before changing the rendering.
2. Soften the distant Titanic seabed/backdrop transition and check foreground
   readability, Low, portrait and unaffected sites.
3. Run `tools/gates.sh --full-e2e` and attempt golden capture. Record sandbox
   limitations and leave rendered screenshot review to Claude.

## Implementation

- Inspected the reported baseline at
  `/home/vijay/submarine-explorer/.cache/golden/2026-10-06-121603/titanic-1.png`.
  The lit seabed retains visible contrast against the open-water backdrop as
  the shared exponential fog approaches its asymptote.
- `src/world/TerrainBiome.ts` enables an extra fade only on Titanic's seabed:
  smoothstep from **300 to 1,100 m of camera view depth**. The terrain material
  blends to Three's existing `fogColor` after the normal fog/output conversion;
  at 1,100 m it matches fully fogged water exactly. Depth activation uses the
  same smoothstep from 700 to 1,200 m as 670's backdrop, preserving surface
  starts and ascent. Other biomes retain their previous shader and cache key.
- `src/world/presets/TitanicHorizon.ts` holds the fog colour through the first
  sphere ring above level, then eases toward the existing dim upper-water
  colour over world-up 0.2–0.85. This removes the immediate brightening above
  the seam without using screen coordinates, so pitch/portrait keep world up.
- Set the unlit backdrop's `toneMapped` to false. Three applies terrain fog
  **after** tone mapping in the direct/Low path; tone mapping the backdrop
  alone was another source of a fog/backdrop colour mismatch. With the post
  pass both enter the same linear target and receive the shared final grade.
- Wreck/sub materials, snow/particles, lights, scene fog colour/density,
  670's 40% fog lift, grade and exposure are unchanged. Seabed within 300 m is
  unchanged. No new draw calls, geometry, textures or lights; the dim backdrop
  brightness bound remains below 0.025 linear luminance. Pixel-level hull
  brightness/readability still requires the rendered review below.

## Verification round 1

- New horizon/terrain regressions failed against the old implementation:
  **5 failures**, establishing the missing Low colour-path match and seabed
  fade. Log: `.cache/titanic780/round1-red.log`.
- After the changes, **10 horizon tests passed**. Log:
  `.cache/titanic780/round1-green.log`.
- Tests pin fog/backdrop RGB through the horizon ring, the unlit output path,
  and interpolated ray-hit colours in pitched/rolled landscape and portrait
  projections, on Low and particle/post tiers. Shader integration tests pin
  Titanic-only fade limits, fog-colour reuse and abyss activation on Low/High.

## Verification round 2

- **6 files / 112 tests passed**: horizon, hero readability, marine snow
  readability, terrain material readiness, terrain detail and presets.
  Log: `.cache/titanic780/round2-unit.log`.
- Type checking passed: `.cache/titanic780/round2-typecheck.log`.
- Strengthened the horizon regression to sample interpolated sphere triangles
  through each actual camera projection; all **10 horizon tests passed** again.

## Verification round 3

- Ran `GATES_CONFIG_MODE=writable PW_PORT=4780 PW_OUTDIR=dist-titanic780
tools/gates.sh --full-e2e`.
- Build/typecheck, **136 unit files / 1,427 tests**, **144 Python tests**, strict
  content, attribution and repository formatting passed. `git diff --check`
  also passed.
- Full E2E and project-base E2E were both attempted but failed before tests
  could execute: `Process from config.webServer was not able to start`.
  The project-base build passed. The explicit preview attempt below confirms
  the sandbox's `listen EPERM` restriction. Gates exit status: **1**; browser
  gates are blocked, not passed.
- Logs: `.cache/titanic780/round3-gates.log` and retained individual logs
  `.cache/titanic780/round3-{build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`.

## Screenshot review

- Browser capture is unavailable in this sandbox: Chromium aborts before page
  creation at `sandbox_host_linux.cc:41` with `shutdown: Operation not
permitted`. Preview independently fails with `listen EPERM` on
  `127.0.0.1:4781`. Logs: `.cache/titanic780/golden-after.log` and
  `.cache/titanic780/preview-after.log`.
- Failed capture manifest:
  `.cache/golden/2026-10-06-125637/poses.json` (`complete: false`, `captures: []`).
  No after PNGs were produced; visual QA is **pending**, not passed.
- Retained final build: `dist-titanic780`. On a browser-capable host, rebuild
  and run `GOLDEN_SITES=titanic tools/golden.sh`, compare all three poses to
  `2026-10-06-121603`, and repeat the default spawn on `?tier=low` and a portrait
  viewport. Claude should check the absence of a stripe, gradual seabed
  falloff, comfortable darkness and unchanged hull/sub/snow readability.
