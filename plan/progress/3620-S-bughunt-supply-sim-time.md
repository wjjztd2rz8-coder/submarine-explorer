# S-bughunt: fixed-step supply time and depletion dispatch

Serves Director Backlog 9, S-verify / S-bughunt [Codex, standing], specifically
S-bughunt. Audited checkout SHA: `04cf357798c30dd34b782d0154ca1751bf8f1d36`.
Both rounds found no production defect. Only `tests/unit/powerSystem.test.ts`
and this note change; `src/app/systems/power.ts` remains unchanged.

## Ownership and prior evidence

Read Director's Backlog, simplicity rules and review rubric, the newest dated
review (2026-10-24 early, plus the targeted entry above it), Overnight runs
103–105, CONTRIBUTING-AGENTS, relevant launched briefs and registered worktree
status/diff evidence before editing. Rechecked ownership immediately before
editing: no other worktree claims the power files. The checkout began clean.

- `F-BUGHUNT-16.md` / launched 410 and its result: the historical Arcade defect
  was depleted supplies initiating ascent while disabled. The two original
  empty-battery/empty-oxygen mode guards remain, with every assertion retained.
  The old wrapper's PASS labels do not supersede its reported browser block.
- 2850 and 2930 progress: deferred descent reserves, disposal, successor runtime
  isolation and Home cancellation already have regression coverage. Their
  deep-start tests are unchanged; the new matrix emits no `mission:started`
  event and performs no deferred reserve initialization.
- Launched 3100, merge `3556bcd`, and current `missionRouter.test.ts`: pending/open
  completion behavior and power/crush abort dispatch are already guarded. The
  router's current power cases establish one `mission:aborted`, one
  `mission:ended`, aborted objectives and a retained mission debrief. No banner
  timing or mission-policy matrix is added here.
- Finished 3590's note and diffs: blur/focus resets, repeated freezes, mission/
  dive totals, quality recovery, Scanner and touch release are covered in its
  uncollected worktree. Its three specs and all other 3590 files stayed read-only;
  this audit does not depend on those patches. `appSystems.test.ts` is read-only.
- Registered 3580/3600 diffs cover biome tests and settings/device behavior;
  3610 and 3630 launched briefs reserve life and sonar tests. None overlap this
  slice. Finished 3310/3320/3340/3380 and owner-dependent 2980/3050 are untouched;
  no collection, rebrief, merge, push or tag.

## Round 1: time contract and missing integration guards

`Time.fixedDelta` and `FrameState.fixedDt` are seconds per physics step; shipped
`physicsHz` is 60. `Time.tick` takes RAF milliseconds, returns fixed-step count,
clamps real gaps to 0.25 s and limits delivery to eight steps per frame.
`inputGateSystem` admits `realSteps` only outside freezes/resume intervals.
`startLoop` handles resets and discards frozen fractional backlog; existing
app-system/3590 coverage owns that lifecycle. Mission/dive `clockDt` is a
separate real-time clock and is not the supply duration.

`docs/power.md` and `Power.ts` specify simulated seconds at 1×. `Submarine.step`
runs whole fixed ticks for its selected multiplier. The shipped and runtime-
supported values are `[1, 2, 3]` (`config/submarine.ts`, `setSimSpeed` and
`cycleSimSpeed`); no fractional or invented speeds are tested. The actual
`sim.power` caller supplies `steps * fixedDt * sub.simSpeed`, before the frame's
vehicle-control speed change. `FRAME_STAGES` runs vehicles, power, submarine
events and power events in that order. `events.power` waits until the updated
submarine snapshot ends the ascent and excludes a mission-router context.

Existing `power.test.ts` covers split-duration math, load drain, disabled/zero
duration behavior and thresholds. `d2Hazard.test.ts` covers depth/descent reserves;
`Submarine.test.ts` covers power ascent control lock and surface completion.
`appSystems.test.ts` covers input/clock gating and system ordering. Those guards
did not exercise fixed-step delivery into the real power hooks or free-dive
depletion dispatch. Nine tests are added to the existing power-system capability.

The existing mode fixture is reused and expanded locally with a real CPU-only
Submarine, EventBus, SystemRunner, shell/input gates, submarine simulation/events
hooks and the complete power system. No submarine init/pose hook, hull mesh,
renderer, WebGL or browser is constructed. Discovery's debrief is a call sink;
its separate gate double allows testing further active frames after dispatch.

Supply cases resolve Realistic settings through Save and `resolveEffective`,
including the shipped equipment multipliers (battery 1.36, oxygen 1.24), without
mutating config. Each result is compared to `new Power(effective.power, true)`
advanced by six simulated seconds, at 12-decimal precision. No drain formula is
copied into tests. The three supported constant loads are idle/dark; forward
0.6 with lights and Scan; reverse -0.2 with ballast -0.8, map sensors and no
lights. These distinguish Scan and sonar sensor admission and ballast demand.

| Speed | Ordinary frames/steps | Six-step batches | Wall duration | Simulated duration |
| ----- | --------------------- | ---------------- | ------------- | ------------------ |
| 1×    | 360                   | 60               | 6 s           | 6 s                |
| 2×    | 180                   | 30               | 3 s           | 6 s                |
| 3×    | 120                   | 20               | 2 s           | 6 s                |

The production Time helper generates every delivered step; its count is asserted
per frame and in total. A 0.001 ms timestamp offset only avoids floating-point
round-down at exact tick boundaries. All 18 load/speed/delivery combinations
match the capability reference, stay nondepleted and dispatch no ascent/debrief.

## Round 2: gates and depletion ownership

At each speed, zero delivered steps despite a positive real delta, shell Pause,
free-dive debrief and the resume flag produce no `Power.step` calls and exactly
unchanged supply state. Subsequent one-step and eight-step active frames call
Power exactly twice overall and match the capability reference after each
delivery, even with `dt = 0.25` differing from admitted fixed time. This checks
the supply boundary without repeating blur/focus reset tests.

Battery-only, oxygen-only and simultaneous depletion start from supported
`setLevels` probes (1e-9 for the supply to exhaust, 0.5 for the other). A real
active fixed step exhausts the small reserve and starts the real submarine
ascent. Subsequent eight-step frames complete it at the existing surface clamp
without changing emergency acceleration, lock policy or supply policy.

| Depletion | Context | Ascent starts | `sub:emergencyBlow` | Free-dive debrief calls |
| --------- | ------- | ------------- | ------------------- | ----------------------- |
| Battery   | Free    | 1             | 1, cause power      | 1, after ascent         |
| Oxygen    | Free    | 1             | 1, cause power      | 1, after ascent         |
| Both      | Free    | 1             | 1, cause power      | 1, after ascent         |
| Battery   | Mission | 1             | 1, cause power      | 0                       |
| Oxygen    | Mission | 1             | 1, cause power      | 0                       |
| Both      | Mission | 1             | 1, cause power      | 0                       |

No free-dive dispatch occurs while ascending. Both empty levels are asserted
for simultaneous depletion; existing battery precedence is preserved. Three
additional active frames after surface completion repeat neither ascent nor
dispatch. The mission context uses a router presence/freeze-state double solely
to check the power system's ownership guard; the focused real-router suite
establishes actual mission abort/debrief behavior. No same-instance restart is
invented: supported Dive again navigates/reloads. The original Arcade tests
still prove disabled exhausted supplies remain frozen and cannot start an
ascent, with exactly one start after returning to Realistic.

## Validation

- Baseline focused command: `npm test -- --configLoader runner --cache=false tests/unit/powerSystem.test.ts tests/unit/power.test.ts tests/unit/d2Hazard.test.ts tests/unit/Submarine.test.ts tests/unit/appSystems.test.ts tests/unit/missionRouter.test.ts`:
  **PASS, 6 files / 89 tests**, exit 0 (`/tmp/3620-focused-before.log`).
- Same focused command after the added guards: **PASS, 6 files / 98 tests**,
  exit 0 (`/tmp/3620-focused-final.log`). There is no production failing-before/
  passing-after claim; all new behavior checks pass against unchanged source.
- `npm run typecheck`: final **PASS**, exit 0
  (`/tmp/3620-typecheck-final.log`). The initial test-fixture draft failed with
  three TS2540 errors from assigning readonly public getter types; holding
  mutable test-double references fixed those errors within the owned spec.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **completed, FAIL, exit 1**. Log `/tmp/3620-gates.log`; detailed logs
  `.cache/runs/20261023-235406-31-3r5Zxi/`.
- Aggregate **PASS**: config preparation, strict content validation, production
  build (TypeScript plus Vite), full unit suite, attribution and repository-wide
  Prettier. Full units: **192 specs, 4,094 passed tests and four existing expected
  failures (4,098 total)**, 770.48 seconds. The collision expected failures remain
  untouched. The existing Vite chunk-size warning remains non-failing. No gate
  stage was interrupted or retried; the long full unit run completed normally.
- Aggregate **FAIL**: Python, **5 failures / 167 tests**. Four unchanged
  build-manifest tests report `spawnSync git EPERM`; `test_golden_tooling` reports
  `Unexpected end of JSON input`. These match the previous 2930/3590 evidence;
  no tooling or assertions are changed to bypass them. Wrapper labels do not
  override these command failures, and the aggregate is not green.
- Owned-file `npx prettier --check tests/unit/powerSystem.test.ts plan/progress/3620-S-bughunt-supply-sim-time.md`
  and `git diff --check`: **PASS**, exit 0; checked again after recording the
  final outcomes. The final SHA is unchanged and the working diff is confined
  to the owned capability spec and this note.
- Actual local e2e mode: **none**. Hosted CI, GPU, screenshots, unaided journeys,
  visual readability/beauty/touch layout and real-phone performance are not
  validated or claimed.

## Simplicity and rubric

Clean audit with test-only additions to one existing capability spec and reuse
of its fixture. No production fix is justified; no new abstraction outside the
local fixture, setting, guidance surface, UI, dependency, save schema, site branch
or runtime config mutation. Historical assertions and tolerances are retained.
No retries, skips, timeout changes, snapshots or budget adjustments. Correct
supply timing and one abort dispatch protect understandable, rewarding and
honest exploration. Terrain, all site identities, scanning, Journal, life and
input/accessibility behavior remain unchanged; Arcade remains default.
