# F-TITANIC-HORIZON-670

## Plan

1. Trace the per-site water/fog overrides and backdrop rendering; retain a
   baseline build and capture Titanic golden poses 1–3 plus the other four sites.
2. Add a Titanic-only dim blue-grey upper-water gradient and a small far-field
   fog lift. Preserve hull/foreground exposure, ambient fill, lamps and grade.
3. Run two verification rounds: focused environment/readability regressions,
   then full gates including E2E. Review before/after goldens and compare the
   other four sites' pixels when browser access permits.

## Implementation

- Titanic inherits `waterColor 0x040f16`, `fogColor 0x050c10`, and effective
  abyss fog density `0.001` from `src/core/config/atmosphere.ts`. The scene
  background normally copies that fog colour each frame. Its site overrides
  previously only added ambient fill and sediment/rust particle tuning.
- Other presets adjust the atmosphere sample before `PresetSystem` syncs it
  back to the scene (e.g. vent haze). The title uses an unlit vertex-colour
  sphere for its water backdrop; the new `TitanicHorizon` follows that approach.
- Only `data/landmarks/titanic/mission.json` enables `titanicHorizon`. The wreck
  environment default is false, so other wrecks and the four other golden sites
  allocate no new backdrop and take no new atmosphere path. No shared shader,
  HUD, hull, spawn, other site content, or global water palette changed.
- The camera-centred, world-up dome blends the fog colour at/below the horizon
  toward `0x182630` above it (smooth transition over up-direction 0–0.65).
  It renders first, unlit and without fog or depth writes; terrain and hulls
  cover it normally. One draw and no particles or lights, including Low.
- Far-field fog gets a 40% **linear RGB** lift, keeping its normalized hue.
  That preserves the shared post pass's foreground shadow-floor hue. Scene
  fog applies the tiny colour difference by distance; density/transmission,
  water colour, ambient fill 30, sunlight, lamp exposure, grade and vignette
  remain unchanged. The effect eases in from 700–1,200 m, preserving surface
  starts and hiding the dome on ascent.

## Golden capture progress

The required `GOLDEN_SITES=titanic tools/golden.sh` baseline attempt failed
before capture: Vite cannot write to the read-only `node_modules/.vite-temp`.
A writable temporary native config successfully built the baseline into
`dist-horizon670-before`. Preview then failed with `listen EPERM` on
`127.0.0.1:4298`, and Chromium failed at `sandbox_host_linux.cc:41` with
`shutdown: Operation not permitted`. The Browser skill found no connected
browsers. No permission request can resolve these managed sandbox restrictions.

No PNGs have been produced; visual QA and the four-site pixel-similarity check
are **pending**, not passed. Failed capture manifests/contact sheets:

- Titanic before: `.cache/golden/2026-10-05-052013/poses.json`,
  `.cache/golden/2026-10-05-052013/index.html` (`captures: []`).
- Other four sites before: `.cache/golden/2026-10-05-052338/poses.json`,
  `.cache/golden/2026-10-05-052338/index.html` (`captures: []`).
- Titanic after: `.cache/golden/2026-10-05-052631/poses.json`,
  `.cache/golden/2026-10-05-052631/index.html` (`captures: []`).
- Other four sites after: `.cache/golden/2026-10-05-052641/poses.json`,
  `.cache/golden/2026-10-05-052641/index.html` (`captures: []`).
- Before logs: `.cache/horizon670/golden-before.log`,
  `.cache/horizon670/golden-before-native.log`,
  `.cache/horizon670/golden-others-before.log`,
  `.cache/horizon670/preview-before.log`, `.cache/horizon670/build-before.log`.

- The required `GOLDEN_SITES=titanic tools/golden.sh` after attempt also fails
  at the read-only config cache. Native-config preview and direct capture fail
  at the same localhost/browser restrictions as before. After logs:
  `.cache/horizon670/golden-after.log`,
  `.cache/horizon670/golden-after-native.log`,
  `.cache/horizon670/golden-others-after.log`,
  `.cache/horizon670/preview-after.log`.

All six golden compositions (five sites, including both Blue Hole alcoves)
still require rendered review. Do not interpret the empty contact sheets or
source/data checks below as passing screenshot comparisons.

## Verification round 1

- Targeted environment/hero/snow regressions: **4 files / 86 tests passed**.
  Log: `.cache/horizon670/unit-round1.log`.
- Final adjustment preserves normalized fog RGB, so the foreground floor hue
  stays fixed. New regressions cover Titanic-only activation, Low and higher
  tiers, unchanged exposure/density, bounded 40 m fog-colour contribution,
  a dim world-up gradient, camera translation/pitch, surface starts/ascent,
  draw count and disposal. Final focused test/typecheck logs:
  `.cache/horizon670/unit-horizon-round1-final.log`,
  `.cache/horizon670/typecheck-round1.log`.

## Verification round 2

- Command: `GATES_CONFIG_MODE=writable PW_PORT=4670
PW_OUTDIR=dist-horizon670-after tools/gates.sh --full-e2e`.
- Build/typecheck, **125 unit files / 1,331 tests**, **144 Python tests**, strict
  content, attribution and repository formatting passed.
- Full E2E and project-base E2E were both attempted and blocked before test
  execution by `config.webServer ... unable to start`; the project-base build
  passed. The explicit native preview log confirms the `listen EPERM` cause.
- Updated the environment E2E's exact Titanic wreck draw expectation from two
  to three (backdrop + haze + rust motes), retaining its shader-error and
  selection assertions. Playwright successfully discovers the preset cases.
- Tests quantify the maximum 40 m fog-colour contribution below `0.00001`
  linear RGB; measured value is recorded in
  `.cache/horizon670/fog-measurements.json`. Normalized fog RGB, ambient,
  sunlight, water colour, fog density, grade and vignette are preserved against
  the same Titanic preset without the horizon. This establishes parameter
  preservation, not pixel-exact foreground exposure.
- Other four golden sites' built landmark/tile/current/secret content: **10
  files per site, 40 total, byte-identical** between retained baseline and final
  builds. Record: `.cache/horizon670/site-content-comparison.json`. Their
  presets/content remain unchanged, and the Titanic feature defaults off;
  pixel-similarity remains pending browser access.
- Logs: `.cache/horizon670/gates-round2.log`,
  `.cache/horizon670/unit-round2.log`, `.cache/horizon670/e2e-round2.log`,
  `.cache/horizon670/e2e-base-round2.log`,
  `.cache/horizon670/e2e-presets-list.log`, plus `.cache/gates/*.log`.

## Reproduce the pending golden review

Retained builds are `dist-horizon670-before` and `dist-horizon670-after`.
In an environment with localhost/Chromium access, serve each build in turn
using the same preview URL, then run the unchanged golden capture tool:

```bash
# Terminal 1: repeat with dist-horizon670-after for the final version.
npx vite preview --port 4670 --strictPort --host 127.0.0.1 \
  --outDir dist-horizon670-before \
  --config .cache/horizon670/vite.config.mjs --configLoader native
# Terminal 2: captures 1–3 at Titanic; then all four comparison sites.
GOLDEN_SITES=titanic node tools/golden-shots.mjs --base-url http://127.0.0.1:4670/
GOLDEN_SITES=lost-city,great-blue-hole,beebe-vent-field,monterey-canyon \
  node tools/golden-shots.mjs --base-url http://127.0.0.1:4670/
```

The tool writes each run to `.cache/golden/<timestamp>/`: Titanic shots are
`titanic-{1,2,3}.png`, with `poses.json` recording the reproducible cameras.
Compare upper water, hull/foreground, and all comparison-site compositions;
goldens can contain time-dependent particles/HUD readings, so retain the
manifests and distinguish such variation from site-rendering changes.
