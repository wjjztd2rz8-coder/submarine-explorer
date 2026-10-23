# S-verify: late-placement first move across modes

Brief **3490**, **S-verify / S-bughunt**, DIRECTOR Backlog **9**.
Baseline: `1ce4f46e4be2238c6f42ba93e9f32981f52df6c7` (clean checkout).

## Plan

1. Review the authored-opening callback, frame gates, all shipped site data,
   and the real debrief/restart and hull-loss paths.
2. Extend the existing `tests/unit/firstMove.test.ts` capability fixture only
   where coverage is missing. Exercise Arcade and Realism at every shipped
   site, including mission/free-dive loading orders and lifecycle resets.
3. Review twice, run the focused headless checks and `tools/gates.sh`, and
   record results and limits. Keep any fix minimal under DIRECTOR simplicity
   rules; add no production machinery for verification.

## Progress

- The permanent real-physics caller fixture previously covered Beebe in Arcade
  only. All-site/mode coverage and lifecycle caller integration are gaps.
- Round 1 traced the production handoff: mission and free-dive placement notify
  camera controls immediately after `sub.reset`; only unlearned movement is
  reanchored, on the next unfrozen controls frame. No production defect found.
- Extended the existing spec: all 13 sites from the shipped index, Arcade and
  Realism, each with briefing/skip/free late-props orderings (78 cases). Beebe
  additionally covers mission/free props first, the explicit depth probe,
  delayed mission readiness, already learned mission/free movement, and both
  lifecycle paths, in each mode (16 more cases). The existing 11 low-level and
  camera/objective cases remain intact: **105 total**.
- Both `settings.gameplayMode` and resolved effective settings use the selected
  mode, including Realism's slower physics and the authored mode-specific free
  opening. All shipped prop counts are checked, with zero failed/skipped props.
  Blake's two GLB rocks are decoded from disk using GLTFLoader, following the
  existing missionComposition fixture; only image/texture decoding is stubbed.
- Lifecycle review confirmed no in-place respawn exists: normal and aborted
  debriefs offer Dive again, which emits `mission:restart` then reloads the page.
  Tests call the real debrief action, verify reload, dispose all systems and
  repeat the placement witness on a fresh context. Learned state must not leak.
  The hull fault uses one physics frame with a deep seabed and a below-crush position;
  real submarine physics, event emission, blow completion and router abort run.
  The shipped seabed is restored immediately after the failure event.
- A read-only Sol lifecycle/diff review was delegated per CONTRIBUTING-AGENTS.md.
  It confirmed the reload model and identified the GLB fixture boundary and
  excessive cross-product repetition. Kept all-site late-order coverage, with
  detailed controls/lifecycle cases at Beebe (98 fixture initializations rather
  than 312). This task remains headless/unit-level as requested.

## Validation and final report

- Baseline firstMove spec: **19/19 passed**, exit 0, 4.57 s;
  `.cache/3490-baseline.log`.
- Expanded matrix's first completed run: **101 passed / 4 failed**, 81.52 s.
  All site/mode/placement assertions passed; the four lifecycle cases exposed a
  missing `formatDuration` export in the new Debrief mock. Switched it to a
  partial mock so formatting remains real. Focused lifecycle rerun:

  ```bash
  npm test -- --configLoader runner --cache=false tests/unit/firstMove.test.ts -t 'restart-after-debrief|respawn-after-hull-loss'
  ```

  **4/4 selected cases passed**, exit 0, 7.84 s;
  `.cache/3490-lifecycle.log` (101 other cases filtered by test-name selection).

- Round 2 read-only review found no blocking correctness issue or weakened
  assertion. Standalone TypeScript checking, owned-file Prettier and
  `git diff --check` pass.
- Required gate command:

  ```bash
  GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
  ```

  Aggregate log `.cache/3490-gates.log`; per-gate logs under
  `.cache/runs/20261023-135154-7-BDuJ72/`. Config, content and build pass;
  unit/remaining gates pending. Python fails **5/167**: four unchanged
  `test_ci_build_manifest.py` cases fail with `spawnSync git EPERM` in this
  sandbox, and `test_golden.py` fails parsing empty subprocess stdout at
  `golden-manifest.test.mjs:151` (`Unexpected end of JSON input`). Both reproduce
  independently without loading the changed TypeScript spec:

  ```bash
  python3 -m unittest discover -s tools/tests -p test_ci_build_manifest.py
  python3 -m unittest discover -s tools/tests -p test_golden.py
  ```

  Retained logs: `.cache/3490-python-manifest-repro.log` (4/4 failures) and
  `.cache/3490-python-golden-repro.log` (1/1 failure). No tooling or unrelated
  assertions were changed to work around these failures. The same five failures
  are recorded in `3390-S-verify-monterey-apron.md` and
  `3400-S-bughunt-mission-catalog-failures.md`; those runs' complete unit suites
  took about ten minutes.

## Scope and simplicity

Only the existing capability spec and this note change. No production fix,
new module, setting, dependency, site branch in shared code, visual asset or
UI element is needed. Existing bug assertions stay intact. Runtime IO timing,
DOM controls and image decoding are controlled; the fixture runs real shipped
terrain/prop geometry, placement, router, fixed-step submarine physics, contact,
shell/input gates and camera controls. Environmental current/power systems and
browser rendering are outside this unit test; injected idle displacement tests
the first-move drift invariant directly. No visual, phone, load-frequency or
performance acceptance is claimed. Gates will use `--no-e2e` for the requested
headless unit scope.
