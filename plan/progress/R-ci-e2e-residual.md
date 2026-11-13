# R-ci-e2e-residual

2026-11-12 — DIRECTOR item 16o. Investigating the seven recurrent hosted shards,
starting with same-frame scan completion and touch help/photo controls.

## Hosted evidence

Read `gh run view 43013719108 --json jobs` and downloaded all seven failed-job
logs through `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<id>/logs`.
Also inspected jobs for run 42995015126 (six failures, same capability groups).

- Scan: paused clock; hidden `.tc-btn-scan` after the teleport. Content readiness
  does not guarantee an unfrozen HUD frame has run.
- Touch help: `.tc-btn-pause` is explicitly hidden at the first tap, rather than
  a slow tap dispatch. The clock remains paused during locator waiting.
- Journal desktop: actual cue is `Hold G`; assertion requires `HOLD ... SCAN`.
- Desktop HUD: manually revealed checklist becomes hidden again at mission start.
- Portrait opening: failures at `expect.soft(errors).toEqual([])`, containing only
  Chromium `GL Driver Message ... GPU stall due to ReadPixels` warnings. No
  reported hull/HUD geometry assertion failure in these logs.

Fixes and verification are recorded below. No timeout or retry limits were increased.

## Root causes and changes

All five groups are test synchronization/expectation defects; no game behavior
change was needed.

1. **Same-frame scan completion:** `Discovery.loaded` and `Props.loaded` can become
   true after the last rendered frame, while that frame's touch controls still
   reflect the frozen mission startup. `MissionRouter.begin()` waits for discovery
   readiness before starting the mission. Waiting for a locator with the clock
   paused never executes `late.input` again. The scan spec now pumps until the
   mission is unfrozen and touch controls are visible **before** teleporting.
   This ordering also preserves the original geometry-only scan test: a physics
   frame at a gallery's close POI pose can move the sub out of aim. The scan still
   uses real held input; completion/navigation/marker/reward assertions are read
   synchronously with the clock paused.
2. **Touch help/photo:** the same stale frozen controls frame leaves Pause
   explicitly `hidden`. Pump frames to visible flight controls before Pause and
   again after Resume, retaining actual taps and all gesture/key-name assertions.
3. **Desktop Journal journey:** the keyboard cue is deliberately `Hold G`
   (`ScanOverlay`); `HOLD ... SCAN` describes touch. Assert the exact device-specific
   guidance detail, retaining candidate identity, objective priority, both scans,
   both Journal entries, reward directions and debrief checks.
4. **HUD regions:** `revealChecklist()` raced `begin()`'s `showPanel()`, which hides
   a checklist with no completed objectives. Wait for `mission.diving` before the
   existing measurement-only reveal. No HUD layout or visibility rules changed.
5. **Portrait openings:** hosted failures are console assertions, not hull/HUD
   bounds failures. Retain only the exact Chromium performance warning
   `GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due
to ReadPixels` (including its suppression suffix) in diagnostic `driverWarnings`.
   All application warnings, errors, rejected loads and geometry assertions still
   fail. Driver warnings remain in each attached bounds JSON.

No retry/deadline increases, site branches, production tuning or new helper modules.
Existing capability specs own all fixes. The small test-only additions replace
racy waits and an incorrect cross-device assertion; they add no runtime machinery.

## Reproduction and validation

- Run 42995015126 is the CI run for commit `1ad40be3` (resolved through the
  commits/actions API), not a third independent run ID. Its downloaded shards
  2, 8 and 24 confirm the same checklist/copy/readback and paused-clock failures.
- Built with `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-residual tools/gates.sh
--phase build`; writable mode is required because this checkout's shared
  `node_modules` is read-only.
- A local ignored config `.cache/residual/playwright.config.ts` inherits the root
  config, overrides Chromium args to `--use-gl=angle --use-angle=swiftshader`,
  sets retries to zero, and retains failure traces. No CPU throttle was needed.
- **Failing first:** the unchanged scan/help specs, `CI=1`, SwiftShader, zero
  retries, and a shortened diagnostic 30 s test budget reproduced the hidden
  landscape Blue Hole scan and hidden landscape Pause failures (6 pass, 2 fail).
  Evidence: `.cache/residual/before/`, including both failure traces.
- The shots symlink originally pointed outside the writable checkout. Replaced
  that local ignored symlink with a local shots directory for browser diagnostics;
  the shared target was not modified. Journey shots use `FLOW_AUDIT_SHOTS`.

Final three-round capability runs and repository gate results follow below.

- Priority groups: **24/24 pass**, all six scan cases and both help/photo cases
  repeated three times under `CI=1` + forced SwiftShader + zero retries.
  Log: `/tmp/residual-scan-touch-after.log`; output:
  `.cache/residual/scan-touch-after/`. Inspected the landscape touch/photo
  screenshot: it renders the scene, touch-only gesture hint and Capture controls.
- Checked the warning classifier against the actual hosted log: all 20 recorded
  ReadPixels diagnostic occurrences match. Application warnings, an OpenGL error,
  unprefixed warning text and extra failure text all remain rejected.

The three-round commands use `CI=1 GATES_CONFIG_MODE=writable`, the local config,
`PW_OUTDIR=dist-residual`, separate `PW_PORT`s and separate `--output` directories:

```sh
npx playwright test tests/e2e/d-scan.spec.ts tests/e2e/phone-accept.spec.ts \
  -g 'completion advances navigation and direction in the same frame|touch help and photo gestures' \
  --config=.cache/residual/playwright.config.ts --repeat-each=3 --retries=0
npx playwright test tests/e2e/journal-debrief.spec.ts tests/e2e/hud-touch.spec.ts \
  -g 'two-objective scan journey|regions .*top info, guidance and controls stay clear|card, objectives and readouts do not overlap' \
  --config=.cache/residual/playwright.config.ts --repeat-each=3 --retries=0
npx playwright test tests/e2e/opening-framing.spec.ts \
  -g 'live portrait opening matrix.*(kamaehuakanaloa|endurance|axial-seamount-ashes) (low|high).*sub and HUD remain fully visible after 3 s' \
  --config=.cache/residual/playwright.config.ts --repeat-each=3 --retries=0
```

### Completed capability results

All **93/93** selected checks pass with forced SwiftShader, `CI=1`, **zero retries**
and three independent repetitions per case:

| Capability                                                     | Cases per round | Total passing | Log                                   |
| -------------------------------------------------------------- | --------------: | ------------: | ------------------------------------- |
| Same-frame scan + touch help/photo                             |               8 |            24 | `/tmp/residual-scan-touch-after.log`  |
| Journal journeys + HUD regions/checklist layout                |              11 |            33 | `/tmp/residual-journey-hud-after.log` |
| Portrait openings: three affected sites, low/high, both routes |              12 |            36 | `/tmp/residual-opening-after.log`     |

Journal runs cover both sites in all three layouts, including two real held scans,
both Journal visits and debrief. Opening runs retain the live three-second settle
and every terrain/prop/hull/HUD assertion. No application warning was observed.

### Repository gates

`GATES_CONFIG_MODE=writable PW_PORT=4193 tools/gates.sh` runs the normal root smoke
and project-base checks. The first process ended with SIGTERM during its silent
unit phase, after Python (169 tests), content and build passed. It produced no
unit verdict. Restarted the identical gate command with a shell heartbeat around
it; no test settings or gate behavior were changed. Final results are recorded below.

The restarted gate initially ran alongside the final SwiftShader repetitions and
reported one failure in untouched `tests/unit/props-geo.test.ts` (high smoker
material profile; 38.9 s against the existing 30 s unit budget). After browser
runs ended, the exact case passed unchanged in 22.86 s, and the **entire 92-test
file passed unchanged** in 123.90 s. Commands:

```sh
npx vitest run tests/unit/props-geo.test.ts \
  -t 'high: isolates finite material tuning and preserves profiled and unprofiled defaults' \
  --configLoader runner --cache=false
npx vitest run tests/unit/props-geo.test.ts --configLoader runner --cache=false
```

Logs: `/tmp/residual-props-isolated.log`, `/tmp/residual-props-file.log`. No prop,
material, unit-test or deadline changes were made for this unrelated gate failure.

### Final gate result

The required gate completed with **exit 1**, solely for the unrelated unit
**30,000 ms timeout** described above. It is not a green full-gate claim.

- **PASS:** Python (169 tests), strict content validation, TypeScript/build,
  root browser smoke (3 tests), project-base browser checks (8 tests), attribution
  and repository-wide Prettier.
- **Unit:** 4,866 pass, one timeout, across 196 files (1,049.60 s). The unchanged
  timed-out case and its entire 92-test file both pass in separate follow-up runs.
- **Targeted e2e:** all 93 checks pass across three rounds with forced SwiftShader
  and zero retries, independently of the normal smoke gate.
- **Final source:** `git diff --check` and formatting of every edited file pass.

Gate logs: `.cache/runs/20261112-164340-7-Tu0gQ7/`, also copied with the capability
logs under `.cache/residual/`. The retained root build used for diagnostics was
removed after validation; reproduce it with the build command above.

Implementation is complete in the working tree. Hosted main acceptance still
requires a run containing these changes; no hosted green result is claimed.
