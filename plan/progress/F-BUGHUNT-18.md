# F-BUGHUNT-18 — Lost City camera audit

## Plan

1. Audit 400's 38 m Arcade opening / 50 m chase arm against reset (X, HUD,
   double-click and view toggle), wheel limits, photo entry/return, mission
   briefing/skip and free dive.
2. Exercise Realistic/Custom, surface starts, explicit probes and other sites;
   check the camera against actual slope heights and tower/hull geometry.
3. Fix reproduced bugs and add unit/browser regressions. Capture and inspect
   1600×900 and 844×390 openings, reset and photo views where browser access permits.
4. Run build, units, Python, content, attribution, formatting and full e2e;
   log findings and limitations here and in CHANGELOG.md.

## Findings and fixes

1. **Reset loses the short opening.** `resetView()` previously restored the
   global ~97.7 m arm; the mission-start workaround kept arbitrary current
   zoom and did not cover X/HUD/double-click/Q. `CameraRig` now stores a reset
   distance independently of wheel zoom. Only a composed Lost City opening
   installs the 50 m default. Mission-start events use the same reset as X.
2. **Briefing mode changes use stale settings.** `applyMissionStart()` read
   the boot snapshot, retaining Arcade's opening after selecting Realistic.
   Starts now read the saved mode; changing mode refreshes the preview even
   when Near site remains selected. Realistic/Custom, surface, Daily and
   missing-prop mission starts clear a previously installed short default.
3. **Hull occludes the tower.** Before tuning, raycasts through Poseidon's
   centreline hit the actual Class A hull before the tower at heights 0, 5
   and 10 m. The initial 20° yaw fix failed the existing facing acceptance
   (`0.93969`, required `>0.98`) in the orchestrator's browser run. The final
   fix preserves the original 10° heading and adds −20 m to the local chase
   vector's X component before normalizing it to the 50 m arm (about 10 m
   lateral camera displacement). Actual Class A/B/C geometry now clears the
   sampled tower axis, with facing `cos(10°) ≈ 0.98481`. The range stays 38 m.
   Realistic/Custom retain 44 m, 10° and the global arm with no lateral override.
   Arcade composition tuning now lives in `Config.camera.lostCityArcadeOpening`.
4. **Photo double-click desynchronizes the camera and overlay.** The actual
   canvas handler changed orbit to chase while the photo UI remained active.
   A regression failed with `expected 'orbit', received 'chase'`; HUD and
   double-click chase resets now ignore active photo mode.

No camera terrain-clipping bug was reproduced in the deterministic sweep;
the existing collision resolver was retained. Chase wheel limits remain
35–180 m, photo limits 6–220 m. Photo exit restores the previous camera mode,
distance, eye and aim; photo zoom does not alter the chase reset default.

## Regression coverage

| Area                              | Evidence                                                                                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X, HUD, double-click, Q and Begin | Real rig plus actual camera-control handlers; wheel zoom cannot become the reset default.                                                                                                                                              |
| Mission versus free dive          | Actual terrain/props, free-dive load callback, mission router with both briefing and skip paths; camera override installation and restoration.                                                                                         |
| Realistic/Custom                  | Retain 44 m free-dive opening; mode changes in both directions use the current saved mode; surface/Daily/missing props restore the global arm.                                                                                         |
| Other sites                       | Existing full-suite openings and camera tests pass, including Titanic's mission reset; other sites do not install the new reset default. Browser spec also navigates Lost City → Titanic/Beebe/Monterey and checks explicit probes.    |
| Terrain slope                     | Actual heightmap, full 360° chase turns at 35/50/180 m, free look and photo azimuth/elevation sweeps at 6/50/220 m. Eye stays at least 6 m above terrain; all four near-plane corners stay above it.                                   |
| Tower visibility                  | Actual Class A/B/C hulls and Poseidon triangle raycasts at 5 m height intervals; solid axis stays inside the frustum at 1600×900, 844×390 and an extra 390×844 portrait aspect. Facing stays >0.98 and actual arm length stays 50 m.   |
| Browser and screenshots           | `tests/e2e/f-bughunt-18.spec.ts`: 10 tests. Orchestrator captured all 12 opening/reset/photo images at the requested sizes. Six mode/site checks passed; four photo-return comparisons need the corrected frame synchronization rerun. |

## Orchestrator full-e2e follow-up

The supplied run at port 4372 passed all static gates and project-base e2e;
root e2e reported **314 passed, 8 failed, 22 skipped**. All failures are addressed
without relaxing assertions:

| Failures                           | Root cause and correction                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four Lost City photo-return tests  | The double-click / Done handlers change mode synchronously, but the rig updates its eye on the next game frame. Expected offsets sometimes still belonged to free look; returned offsets sometimes still belonged to the 220 m photo orbit (exactly 4.4× the 50 m chase offset). Await two animation frames before both snapshots. Keep `toBeCloseTo(..., 2)`, wheel bounds, freeze and return checks unchanged. |
| Lost City opening facing           | Replace the initial 20° yaw change with lateral camera framing. Keep the existing `f-visual-fixes` >0.98 facing assertion untouched and add it to actual-geometry unit checks for A/B/C.                                                                                                                                                                                                                         |
| Two portrait home hit-target tests | Home is ready before the asynchronous mission catalogue/Daily refresh inserts the card. The opening screenshots lack it; failure snapshots include it. Await visible Daily content before indexing/scanning buttons. Keep every size, viewport, overlap and `elementFromPoint` hit assertion.                                                                                                                    |
| Generic vent draw count            | New haze used an unconditional 0.5 fallback, allocating a third draw even on the forced generic fixture. Register `hazeGlow`/`hazeGlowSizeM` defaults (0/7) and opt Beebe into 0.5 through its validated mission environment. Keep the existing exact two-draw browser assertion; a new unit test checks generic=2, Beebe=3, carbonate=2, low=0 and disposal.                                                    |

Inspected the supplied Lost City screenshots at both requested sizes, plus
portrait home captures. The tower and slope render; photo controls are visible.
The 844×390 desktop-input HUD is crowded and its scan contact overlaps telemetry
in these initial captures. Images predate the final lateral camera correction;
they are evidence from the first run, not final visual acceptance.

## Validation and remaining visual work

- Follow-up focused units: **88 passed** across camera geometry, readability,
  actual-site free-dive composition and loadout; **19 passed** across preset
  draw-budget/lifecycle and camera regressions. Typecheck passes.
- Follow-up `GATES_CONFIG_MODE=writable PW_PORT=4390 tools/gates.sh --no-e2e`:
  production build/typecheck, **116 unit files / 1,234 tests**, **144 Python
  tests**, strict content, attribution and whole-repository Prettier **passed**.
- Initial `GATES_CONFIG_MODE=writable PW_PORT=4390 tools/gates.sh --full-e2e`:
  production build/typecheck, **116 unit files / 1,231 tests**, **144 Python
  tests**, strict content, attribution and whole-repository Prettier **passed**.
- In the initial sandbox run, root full e2e and project-base e2e both **failed before tests ran** because
  the preview server could not start. The project-base build passed too.
- Browser runtime connects but reports no available browsers (empty discovery).
  Direct Vite preview fails with `listen EPERM 127.0.0.1:4390`; standalone
  Chromium fails with `sandbox_host_linux.cc:41` /
  `shutdown: Operation not permitted`. These restrictions also prevent fresh
  screenshots locally. The orchestrator subsequently captured the 12 images;
  they are now available and inspected as described above.
- Browser collection passes: **43 tests** across the four affected e2e files,
  including all **10** new Lost City regressions. `git diff --check` passes.
- Architecture documents the camera-reset/offset API and photo behavior;
  preset docs record the generic budget and opt-in Beebe haze. CHANGELOG records
  the fixes. Terrain and carbonate materials/lighting are unchanged.

The follow-up full browser run and refreshed screenshots must be run by the
orchestrator outside this sandbox. No passing browser result is claimed for
the new corrections.

To finish visual acceptance in an environment that permits browsers:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4390 PW_OUTDIR=dist-bughunt18 tools/gates.sh --full-e2e
```

Inspect `.cache/bughunt18/screenshots/{tile,mission}-{1600x900,844x390}-{opening,reset,photo}.png`
(12 images). Check the tower, lower slope, hull overlap, HUD and photo controls;
numeric projection/collision assertions do not certify those visuals.
