# S-bughunt: battery, oxygen and supply boundaries

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited SHA: `e518b3cfa5aadf58cea5ae2d19dea3f23d7f8250`.

No supported-path production defect reproduced. Twelve missing boundary cases
extend `tests/unit/d2Hazard.test.ts`, the existing depth/hull capability that
already owns descent supply reserves. Only that spec and this note change.
Production remains read-only; no failing-before/passing-after fix is claimed.

## Intake and ownership

Read CONTRIBUTING-AGENTS; DIRECTOR Backlog, simplicity rules and rubric; the
topmost targeted review and newest dated review (2026-10-24 midday);
OVERNIGHT-LOG through run 114; launched 3620, 3690 and 3730–3750 briefs;
3620/3690 result files; and relevant supply, depth, clock and settings progress
notes. Historical wrapper PASS labels disagree with their embedded reports of
failed local gates; they are not validation for this checkout.

Pinned the initially clean checkout and inspected every registered worktree's
HEAD, status, changed paths and diff statistics, including branch-only changes.
Held 2980/3050 collision changes, 3310 journeys, 3320 full-e2e report, 3340 touch
tests/report and 3380 CI report remain untouched. Read the finished 3320, 3340
and 3380 notes; none supplies a missing battery guard. V-lostcity-foot-2 owns
terrain/scatter changes and snapshot edits. Concurrent 3740 and 3750 begin
clean and own Journal/reload and site-selection slices. None overlaps
d2Hazard. Rechecked SHA and local/concurrent status immediately before editing.

The supply integration audit is already collected: commit `1c9dee1` and
OVERNIGHT run 107 establish 3620's powerSystem coverage on this checkout.
3690's depth/HUD boundaries and 3720's clean clock audit are also collected
(runs 112–113). Their existing tests are read-only here. No uncollected patch
is copied, collected or required. The remaining raw-duration and exact supply
threshold cases were absent from the current capability specs.

## Round 1: existing guard map

All citations refer to the audited checkout. Existing assertions, tolerances,
budgets, snapshots and policies are retained.

| Contract                                                                                | Production evidence                                                                                                                                                                                           | Existing capability evidence                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arcade freezes supplies; enabling/disabling preserves them                              | [Power.ts:58](../../src/game/Power.ts#L58), [step:70](../../src/game/Power.ts#L70); [power documentation](../../docs/power.md)                                                                                | [power.test.ts:8](../../tests/unit/power.test.ts#L8); [powerSystem.test.ts:369](../../tests/unit/powerSystem.test.ts#L369) retains disabled empty-battery/oxygen regression guards                                                                                                            |
| Nonfinite/nonpositive simulated duration cannot drain or replenish reserves             | [Power.ts:70](../../src/game/Power.ts#L70) rejects before calculating loads                                                                                                                                   | Existing power.test zero-time case; negative/nonfinite duration and subsequent recovery lacked explicit coverage                                                                                                                                                                              |
| Supported loads and finite duration keep fractions bounded                              | [Power.ts:72](../../src/game/Power.ts#L72) clamps thrust/ballast magnitude; [:78](../../src/game/Power.ts#L78) clamps both remaining fractions using [math.ts:2](../../src/util/math.ts#L2)                   | [power.test.ts:26](../../tests/unit/power.test.ts#L26) load separation; [:36](../../tests/unit/power.test.ts#L36) split-duration conservation; no extreme finite-duration case                                                                                                                |
| Drain uses admitted fixed simulated time, not frozen or accumulated wall time           | [Time.ts:46](../../src/core/Time.ts#L46) bounds gaps/steps; [power system:71](../../src/app/systems/power.ts#L71) uses steps × fixedDt × simSpeed                                                             | [powerSystem.test.ts:243](../../tests/unit/powerSystem.test.ts#L243) ordinary/batched delivery at 1×/2×/3×; [:283](../../tests/unit/powerSystem.test.ts#L283) frozen/zero-step/resume; [3620 audit](3620-S-bughunt-supply-sim-time.md) and [3720 audit](3720-S-bughunt-pause-resume-clock.md) |
| Descent reserves respect active depth/profile; test-injected levels are bounded         | [Power.ts:29](../../src/game/Power.ts#L29) rejects invalid depth; [:36](../../src/game/Power.ts#L36) clamps reserves; [:84](../../src/game/Power.ts#L84) ignores nonfinite test levels and clamps finite ones | Existing [d2Hazard.test.ts:68](../../tests/unit/d2Hazard.test.ts#L68) surface, research/fast descent, trench reserve and depletion at 100 km; powerSystem guards deferred start/disposal and effective equipment                                                                              |
| Warning bands are inclusive at 25% low and 10% critical                                 | [gameplay.ts:120](../../src/core/config/gameplay.ts#L120), [Power.ts:89](../../src/game/Power.ts#L89) recomputes current warning membership                                                                   | [power.test.ts:50](../../tests/unit/power.test.ts#L50) mixed battery-low/oxygen-critical; lacked just-above and exact boundaries for both supplies                                                                                                                                            |
| Depletion starts one ascent and one free-dive debrief; mission router retains ownership | [power system:81](../../src/app/systems/power.ts#L81) and [:88](../../src/app/systems/power.ts#L88) latch dispatch                                                                                            | [powerSystem.test.ts:318](../../tests/unit/powerSystem.test.ts#L318) battery/oxygen/both, free/mission context and subsequent active frames; [Submarine.test.ts:74](../../tests/unit/Submarine.test.ts#L74) control lock and surface completion                                               |
| One-shot battery hints do not repeat                                                    | [Hints.ts:104](../../src/game/Hints.ts#L104) skips seen IDs; [onboard.ts:225](../../src/app/systems/onboard.ts#L225) persists hints and flashes only on a returned ID                                         | [f3Onboard.test.ts:99](../../tests/unit/f3Onboard.test.ts#L99) fires battery once then stays quiet at lower reserve; [:117](../../tests/unit/f3Onboard.test.ts#L117) disabled/seen control; [:260](../../tests/unit/f3Onboard.test.ts#L260) saved seen-hint persistence                       |
| Current low/critical condition occupies one guidance source                             | [HUD.ts:250](../../src/ui/HUD.ts#L250) chooses one warning; [hud system:56](../../src/app/systems/hud.ts#L56) offers source `warning` to the existing slot                                                    | [guidance.test.ts:252](../../tests/unit/guidance.test.ts#L252) warning replaces objective and withdrawal restores it; source inspection establishes supply-specific text selection, not a newly executed visual check                                                                         |

The 30% contextual battery hint ([Hints.ts:50](../../src/game/Hints.ts#L50)) is
separate from the documented 25%/10% supply bands. Oxygen has the ongoing HUD
warning, not a separate one-shot hint. A low/critical HUD condition intentionally
remains present while unsafe. Likewise Power.step returns the current depletion
reason on subsequent positive steps; it is not an event. Neither is a repeated
notification defect: the system latches ascent/debrief dispatch and HintEngine
tracks seen hints. [GuidanceSlot.ts:176](../../src/ui/GuidanceSlot.ts#L176)
retains the source entry for unchanged messages instead of rendering it again.
No warning-policy change or duplicate integration test.

## Round 2: missing supported boundary coverage

Added only [d2Hazard.test.ts:95](../../tests/unit/d2Hazard.test.ts#L95):

- Six cases reject 0, -1, -Number.MAX_VALUE, NaN and both infinities while already
  low/critical. Full supply state remains exactly unchanged; a subsequent real
  1/60 s step drains both supplies and remains nondepleted.
- Two cases consume 1e12 and Number.MAX_VALUE simulated seconds with idle/dark
  and full supported reverse-thrust/ballast/light/sensor loads. Both fractions
  saturate at exactly zero (therefore neither NaN nor negative), with existing
  battery-first depletion policy. Another active tick keeps both at zero.
- Four cases classify both resources at 0.250001, 0.25, 0.100001 and 0.1.
  Warning membership is stable and reserves remain unchanged across repeated
  state reads. Existing one-shot hint and ascent/debrief tests supply the
  notification non-repetition evidence; these state reads do not claim to test
  UI notification dispatch.

These check observable public outcomes with shipped config and supported loads,
without reproducing the drain formula or adding an abstraction/fixture.
Extreme durations probe the guarded Power API; normal frame delivery is bounded
upstream and is already covered by 3620. No arbitrary malformed config or NaN
control injection is declared supported. No production correction is justified.

## Validation

Focused command before and after additions:

```bash
npm test -- --configLoader runner --cache=false tests/unit/d2Hazard.test.ts tests/unit/power.test.ts tests/unit/powerSystem.test.ts tests/unit/f3Onboard.test.ts tests/unit/uiHud.test.ts tests/unit/Submarine.test.ts tests/unit/guidance.test.ts
```

- Before: exit 0, **7 files / 231 tests passed**, 944 ms;
  `/tmp/3730-focused-before.log`.
- After: exit 0, **7 files / 243 tests passed**, 1.04 s;
  `/tmp/3730-focused-after.log`. All twelve added cases pass unchanged source;
  no failing-before/passing-after production evidence.
- `npx prettier --write tests/unit/d2Hazard.test.ts`: exit 0.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **completed, exit 1, `FAIL gates (e2e=none)`**.
- Config preparation, strict content validation (13 sites, zero errors or
  warnings), TypeScript/production build, full units, attribution (14 asset
  files) and repository-wide Prettier **PASS**. The existing Vite chunk-size
  warning is non-failing. Python **FAIL**, detailed below.
- Full units: **192 files passed; 4,160 passed / 4 existing expected failures
  (4,164 total)**, 844.75 s. No stage was interrupted or retried, and the four
  expected collision failures remain untouched.
- Final `npx prettier --check tests/unit/d2Hazard.test.ts plan/progress/3730-S-bughunt-fuel-battery.md`
  and `git diff --check`: exit 0.

Gate logs: `/tmp/3730-gates.log` and
`.cache/runs/20261024-093313-31-cdKVVj/`. Python completed **167 tests in
10.530 s: 162 passed / 5 failed**. Four `test_ci_build_manifest` cases fail with
`spawnSync git EPERM`:

- `test_both_bases_survive_copy_and_verify_all_provenance_fields`
- `test_every_manifest_mismatch_is_rejected`
- `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`
- `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`

The fifth, `test_golden_tooling`, fails its Node subtest “golden comparison
refuses partial sets, missing files and incompatible poses”: JSON.parse at
`tools/tests/golden-manifest.test.mjs:151` receives empty child stdout and
reports `Unexpected end of JSON input` (24/25 internal Node tests passed).
These signatures match the earlier 3620/3690 reports. The first four show a
subprocess permission block; this run does not establish the fifth's cause.
Smallest next step is to run the unchanged checks where child processes are
permitted and retain the golden child's exit status/stderr/stdout before
proposing a tooling correction. No tools edit, retry, skip, timeout increase or
assertion change is made.

## Simplicity, rubric and limits

Runtime complexity and player behavior are unchanged. The spec already covers
depth/hull hazards and supply reserves; no new package-named capability, fixture,
abstraction, setting, UI, guidance surface, dependency, save schema or site branch.
All historical assertions and policies remain. Bounded resources and predictable
warnings protect understandable, rewarding exploration and honest telemetry.
Terrain, all 13 site identities, five hero set pieces, scanning, Journal, marine
life, input and accessibility are unchanged; Arcade stays default.

Actual local e2e mode: **none**. No rendering, browser, WebGL/GPU, screenshots,
hosted CI, unaided journeys, visual readability/beauty/touch layout or real-phone
performance validation. Production, tools, DIRECTOR, authored data, shared
fixtures, snapshots, held packages and other worktrees remain read-only. No
merge, push, tag or hosted workflow dispatch.

Final review rechecked the unchanged audited SHA and exactly the two owned
changed paths. Neighboring 3740/3750 worktrees now hold only their respective
untracked progress notes, with no overlapping test edits. No new supported
production defect or smallest-fix proposal is outstanding for this slice.
