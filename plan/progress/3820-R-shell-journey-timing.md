# 3820 — R-ci-green: cheaper shell journey

DIRECTOR **R-ci-green [Codex]** (Backlog 10 at task start), 2026-10-24. Starting HEAD:
`38afe4991d121c6b6c295b6a47d27fd6c45eeffb`; checkout initially clean.
The journey changes only `tests/e2e/d-shell.spec.ts`; this note records the
work. The orchestrator follow-up additionally authorizes a formatting-only
repair to `plan/DIRECTOR.md`. No production, helper, Playwright configuration
or timeout changes.

## Timing audit

Read the shell spec, `helpers/frames.ts`, DIRECTOR simplicity rules,
CONTRIBUTING-AGENTS and the [hosted CI audit](3780-R-ci-green-post-f64.md).
That audit records three 240 s journey failures at different late operations
and a green journey taking about 3.3 minutes. This work does not establish a
new hosted duration or claim that the timeout is fixed.

The old journey combined:

- Three `waitForFrames(page, 8, 400)` calls: initial Home input, paused input,
  and post-Quit Home input. These require **both** eight animation callbacks
  and at least 400 ms measured from the first callback. The 1.2 s combined
  minimum is not a bound on wall time: software GL can make eight frames take
  seconds, and a stalled callback never resolves until the test deadline.
- Five screenshots and a resize from 1280×720 to 1920×1080 immediately after
  the first Home capture. The globe, selected Titanic dive and remaining
  interactions then ran with **2.25 times as many viewport pixels**. Captures
  require renderer work but have no image assertions in this test.
- Twenty individual Tab key round trips and a Settings open/close detour.
  Pointer actions also wait for browser actionability/frame opportunities;
  the existing Quit dispatch already documents software-GL scroll stalls.
- One initial Home load and one selected Titanic mission navigation, not a
  repeated site-load loop. The separate URL-probe test loads five dive URLs
  followed by Home; the control-tree test loads Blue Hole then Blake. Those
  independent capability checks are unchanged.

These are source-level cost candidates, not measured per-step timings. Local
browser execution was blocked before any test body ran.

## Changes and retained coverage

- Keep 1280×720 for the whole journey; remove five diagnostic captures,
  their directory setup, and the 1920×1080 resize. Home and site-grid layout
  captures remain in `f-title-layout.spec.ts`; title rendering has separate
  coverage in `f-title-scene.spec.ts`. This maintenance task does not change
  UI or assert visual acceptance. Pause/Objectives captures from this journey
  are no longer produced; their functional assertions remain.
- Keep the initial Home held-input/no-dive-resources regression check with
  two frame callbacks and no elapsed-time minimum. Keep the paused pose
  equality guard with **two required callbacks and the original 400 ms
  observation window**, so input has real loop opportunities to expose motion.
  A remaining frame wait still depends on frame delivery; neither is a claim
  to survive a completely stalled renderer.
- Remove the post-Quit held-input/pose check: `f-title-scene.spec.ts`,
  “quit after a mission lazily presents home, keeps Dive on the last mission
  and freezes the sub”, already holds input across eight frames/500 ms and
  checks exact pose equality, then re-enters the last mission.
- Remove the Settings round trip, covered by `settings.spec.ts`,
  “briefing returns home on Escape; Settings opens from pause after the dive
  begins”, and its keyboard-only overlay ownership test.
- Replace twenty Tabs and a generic containment check with explicit forward
  and backward wrapping between Quit and Resume. Retain the pause freeze,
  Objectives count and hint, Escape back to pause, resume, re-pause, Quit,
  empty query string and enabled Dive assertions. Add explicit `pause`, `dive`
  and `home` app-state assertions and wait for re-pause visibility before Quit.
- Retain all menu order/mode/action assertions, initial resource checks,
  globe texture/pin readiness, aspect/alpha checks, site card assertions,
  hover linkage, selected mission URL and briefing dismissal. No new loads.

There are now two explicit frame waits with four required callbacks instead
of three waits with 24 required callbacks, and a combined elapsed-time floor
of 400 ms instead of 1200 ms. These are minimums: at high frame rates the
400 ms freeze window naturally needs more than two callbacks. DOM/readiness
conditions still synchronize navigation and shell transitions; no fixed
sleep or new timeout is added. Net simpler, in the existing capability spec,
with no package-number comments. Independent Sol review found no material
assertion regression after retaining the 400 ms pause guard.

## Validation

Commands run locally on the changed spec:

```sh
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-shell-journey PW_PORT=4238 bash tools/gates.sh --phase build
GATES_CONFIG_MODE=writable PW_PORT=4238 PW_OUTDIR=dist-shell-journey npx playwright test tests/e2e/d-shell.spec.ts --output=.cache/shell-journey-test-results
npm run preview -- --port 4238 --strictPort --outDir dist-shell-journey --configLoader runner
npx playwright test tests/e2e/d-shell.spec.ts --list
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

- Isolated build phase: **exit 1**. Config bundling and Vite production
  bundling succeeded (447 ms), then `ci-build-manifest.mjs` failed with
  `spawnSync git EPERM`. The bundle existed for the direct spec attempt;
  this was not a successful build-provenance check.
- Full shell spec attempt: **exit 1**, “Process from config.webServer was
  not able to start.” Direct preview diagnostic: **exit 1**,
  `listen EPERM: operation not permitted 127.0.0.1:4238`.
  **Zero browser tests executed**; no local journey duration or screenshots.
- Playwright discovery: **exit 0**, five tests registered, including the
  changed journey. Discovery is not execution.
- Required `--no-e2e` command: **interrupted, exit 130**, after the unit
  stage remained at its startup banner without reporting any test results.
  It did not reach an aggregate PASS/FAIL summary. Per-stage outcomes in
  `.cache/runs/20261024-143217-7-fqbHc1/`:
  - config **PASS**;
  - Python **FAIL**, 167 tests, five failures: four build-manifest tests
    raise `spawnSync git EPERM`; `test_golden_tooling` reports its nested
    comparison CLI test failing with `Unexpected end of JSON input`;
  - content **PASS**, all 13 sites;
  - build **PASS**, including `tsc --noEmit` and Vite production bundling;
  - unit **incomplete**, no reported results before interruption;
  - attribution and Prettier **not reached** in that invocation;
  - e2e **none**, as requested.

Supplemental checks after the gate stalled:

- A thread-pool probe of `tests/unit/playwrightConfig.test.ts`: **exit 0**,
  one file / seven tests passed. A full thread-pool attempt also reported
  only its startup banner and was interrupted (**exit 130**).
- `timeout 120s npm test -- --configLoader runner --cache=false --pool=threads --maxWorkers=1`:
  **exit 124**, the external command limit expired with only the startup
  banner and no reported test results. No complete full-unit result is
  established by either worker-pool attempt.
- `python3 tools/check_attribution.py`: **exit 0**, 14 assets attributed.
- `npx prettier --check .`: **exit 1**, flags only the untouched
  `plan/DIRECTOR.md`. At this initial stage it was outside the edit scope;
  the follow-up repair below resolves it.
- Prettier on the two owned files and `git diff --check`: **exit 0**.

Retained ignored logs: `.cache/shell-journey-e2e.log`,
`.cache/shell-journey-gates.log`, `.cache/shell-journey-unit-probe.log`,
`.cache/shell-journey-unit-threads.log`,
`.cache/shell-journey-unit-single-thread.log`,
`.cache/shell-journey-prettier.log`; isolated build log:
`.cache/runs/20261024-143208-2-JXk6vX/build.log`.
Removed the owned `dist-shell-journey` build after the spec attempt.

No hosted CI rerun, browser/WebGL acceptance, visual review or physical-phone
validation. The retained rAF waits can still stall; a later normal hosted run
must establish the runtime improvement and whether the 240 s flake is gone.

## Orchestrator follow-up: repository formatting

The orchestrator subsequently ran `tools/gates.sh` outside this sandbox.
Its supplied output reports Python, content, build, unit, smoke e2e,
project-base e2e and attribution **PASS**. Only Prettier failed, flagging
`plan/DIRECTOR.md`; aggregate result: `FAIL gates (e2e=smoke)`.
The failure log is
`.cache/runs/20261024-143845-1178076-CQgwfJ/prettier.log`.
These results establish success for the configured smoke/project-base checks,
not a dedicated shell-journey execution or a hosted timing measurement.

The root cause was a gap in DIRECTOR's ordered Backlog source numbering:
`1, 2, 3, 6, ... 13`. Prettier expects contiguous numbering and rewrites it
as `1, 2, ... 11`. Applied `npx prettier --write plan/DIRECTOR.md` under the
follow-up authorization. Backlog text, priority order and stable item IDs
are unchanged; R-ci-green now appears at ordinal 8. No test assertion changes.

Follow-up validation:

- Compared DIRECTOR with HEAD after normalizing ordered-list numeric
  prefixes: **PASS**, no other content changes.
- `npx prettier --check .`: **exit 0**, all matched files pass. Log:
  `.cache/shell-journey-prettier-followup.log`.
- `git diff --check`: **exit 0**.

The sole failure from the supplied orchestrator gate run is resolved.
No complete gate rerun or browser execution was attempted inside this
sandbox during the formatting-only follow-up; the orchestrator's earlier
passing stages remain the execution evidence.
