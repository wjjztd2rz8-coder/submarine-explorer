# F-VISUAL-FIXES

Implemented 2026-10-01; gate follow-up fixes below. **The orchestrator captured
the browser screenshots and identified two regressions. Both root causes have
been addressed; browser confirmation of the follow-up remains pending because
this managed session cannot start Vite or Chromium.** No commit was made.

## Changes and player effect

- `src/core/config/gameplay.ts`: enhanced lamps 750 / 36° / 0.012 haze,
  fill 50 over 220 m; realistic 500 / 32° / 0.008 haze, fill 12 over 80 m.
- `src/render/Headlights.ts`: spots use distance exponent 1.35 and fill 2;
  finite cone eye-ray integration replaces normal-based polygon shading.
  Soft radial edges, distance attenuation, smooth drifting haze and single-sided
  integration use 6/8/12 samples on low/medium/high. Still two beam draw calls.
- `src/core/config/atmosphere.ts`: standalone lamp defaults match realistic;
  snow size 0.32 → 0.14 m. Depth-band fog, ambient and grading remain unchanged.
- `src/app/boot.ts`, `src/app/systems/render.ts`: exposure 1.25 → 1.0,
  bloom 0.22 → 0.12.
- `src/game/Spawn.ts`: explicit hero, local bearing and approach range for all
  thirteen sites, fitted to loaded prop bounds. Tests straight approach terrain,
  hull rating, submarine prop collisions and the actual chase arm. Chooses a
  safer adjacent bearing on steep terrain. Ignores chimney effect/plume height
  when framing its solid body. Challenger faces the sampling marker, not the
  separate northern wall.
- `src/core/config/camera.ts`, `src/sub/CameraRig.ts`: 2 m underwater ceiling,
  depth-aware chase retraction; reef conflicts retract horizontally to a refined
  safe boundary before applying terrain clearance. Free look, cockpit and photo
  orbit also respect the ceiling. Chase-to-photo entry uses actual camera-to-sub position
  to preserve the retracted arm instead of deriving position from view direction.
- `tests/e2e/f-visual-fixes.spec.ts`: normal-suite 1280×720 opening captures for
  all sites. Blue Hole, Hunga Tonga, Titanic, Lost City, Endurance, Beebe and Blake
  also capture 40 m and 15 m cockpit views, asserting chase surface/terrain
  clearance before each; Titanic adds a Realistic close view. Checks opening yaw,
  hull collision and browser/shader errors. Writes `.cache/codex/shots/f-visual-fixes/`.
- `tests/unit/cameraCeiling.test.ts`: continuous ascent, shallow reef turns,
  deep full-arm restoration, free look, photo entry/return and mode switches.
- `tests/unit/freeDiveComposition.test.ts`: real survey heightmaps and medium
  procedural props for all thirteen sites; hull collision, camera clearance and
  hero projection inside the view. External GLBs remain covered by e2e.
- `tests/e2e/d-modes.spec.ts`: exact light/fill expectations updated to the new
  defaults; existing assertions retained. `CHANGELOG.md`: player-visible tuning
  and opening changes, with no feature cuts.

## Checks

`PW_PORT=4293 bash tools/gates.sh`: build, unit (65 files / 676 tests), Python,
content, attribution and Prettier pass. E2e and e2e-base fail before any test can
run because preview cannot start. Project-base build itself passes.

Direct preview probe reports `listen EPERM: operation not permitted
127.0.0.1:4293`. Direct Chromium launch also fails at
`sandbox_host_linux.cc:41` with `shutdown: Operation not permitted`.
The dedicated screenshot spec was attempted and meets the same preview blocker.
No assertions were weakened or suppressed; no screenshots were substituted.

The initial shared `node_modules` symlink was read-only and prevented Vite from
writing its temporary config. Replaced it with an ignored local dependency copy;
no dependency/lockfile changes.

## Deviations

- `src/app/systems/props.ts`: minimal spawn callback after prop loading. The
  current architecture places spawning in submarine/props systems rather than
  `boot.ts`; the loaded bounds and colliders are needed for safe composition.
  Mission starts and explicit `?at=`, `?poi=`, `?depth=` probes keep their poses.
  A pilot who already moved more than 2 m during loading is not teleported.
- Three new unit files, the existing exact-value mode expectations, and the
  requested shared `CHANGELOG.md` entry are outside the explicit OWNS list.

## Orchestrator review required

Run `PW_PORT=4293 npx playwright test tests/e2e/f-visual-fixes.spec.ts` after build
in a session that permits the preview server and Chromium, then inspect every
PNG. L1/L2 are calibrated starting settings, not visually accepted results:
check rusty steel vs brown timber vs basalt vs ivory, joints/branches and seabed
contrast at both distances, shallow/deep and Realistic hull readability, and
beam softness in cockpit/chase on low/medium/high. Lost City still uses the
existing tower geometry; Hunga/Blue Hole use their existing survey/hero placement.
Recheck touch drag/zoom near the surface and terrain while moving, plus photo
entry and return. No UI or control targets were added.

## Orchestrator gate follow-up — 2026-10-01

The orchestrator ran the browser gates outside this sandbox: 161 e2e passed,
14 skipped, two failed; e2e-base passed. Its provided PNGs now establish
actual beam and opening evidence, superseding the initial absence of captures.
The subsequent changes below still require an outside-sandbox browser rerun.

- **ROV exposure root cause:** the shared headlight rig follows the deployed ROV,
  so lowering submarine lamp intensity/fill and increasing their decay also
  reduced the working pool. The failed deployed-frame centre mean was 24.94
  against the unchanged minimum 35. `LightPreset.workLight` now supplies explicit
  work-light multipliers, angle and fill range. The shared rig selects them on
  the existing smaller ROV lamp bar: enhanced 2250, inverse-linear decay, 52°,
  fill 200 / 350 m. This preserves the previous 1800 / 160 at exposure 1.25
  when the new exposure is 1.0. It also restores the old 0.6 work penumbra.
  Realistic work lights similarly retain the previous spot illumination with
  only the faint 12 fill. Gains follow research upgrades. Retrieval and live
  mode changes restore the correct submarine rig, including when lamps are off.
  No changes to ROV models, camera or gameplay tuning were needed.
- **Flight failure root cause:** the old scripted flight assumed yaw zero;
  the authored Titanic opening has yaw 225°. Forward motion therefore increases
  Z. `tests/e2e/sub-playtest.spec.ts` now uses the existing explicit `?depth=3700`
  open-water probe for its two north-heading scripts. All movement, acceleration,
  coast, ballast, bank, heading and camera assertions remain unchanged. Normal
  free dives retain the authored opening; the normal visual spec covers those.
  **Additional deviation:** these two fixture URL changes are outside OWNS.
- **Opening review:** the supplied Bismarck, Hudson and Monterey frames show
  weak hero detail at navigation distance. Changed submarine decay 1.5 → 1.35
  (roughly twice the spot illumination at 130 m, only 1.5× at 15 m). Intensities,
  narrow angles, low haze, inverse-square close fill, ambient, fog, exposure and
  bloom are unchanged. Challenger's quiet floor remains deliberate.
- `tests/unit/headlightWork.test.ts`: four new regression checks for established
  work irradiance at 15/40/52 m, retrieval with lamps off, live mode changes and
  research gains, plus the ROV model lamp intensities. `src/rov/RovVisual.ts`
  applies the same work multipliers to its existing lamps (six-line lighting
  consumer change; **additional deviation** outside OWNS). The deployed-frame centre-mean >35 and clipping <0.05 e2e
  assertions in `d-rov.spec.ts` are untouched.

Local follow-up `tools/gates.sh --no-e2e`: build, **680 unit tests in 66 files**,
Python, content, attribution and Prettier all pass. Added an explicit north-heading
assertion to the scripted flight setup. The orchestrator
should rebuild and rerun `tests/e2e/d-rov.spec.ts`,
`tests/e2e/sub-playtest.spec.ts` and `tests/e2e/f-visual-fixes.spec.ts`, then inspect
refreshed opening, close-material and ROV captures before the full gate rerun.
