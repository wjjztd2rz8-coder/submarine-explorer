# F-VERIFY-F29 — 750 merge-batch verification

## Scope and two-round plan

Baseline: `6b373f4e2f44584eafaa3af7d5bf040451416e9f` (2026-10-05).
Read `git log --stat -20`, the six package diffs and their merged runtime/test
results, including the subsequent F29 fixes.

1. Review 670 Titanic horizon, 680 Beebe framing, 690 Blue Hole grotto,
   700 Monterey canyon, 720 debrief/Journal and 730 CI timing as one batch.
   Run full gates and inspect the existing regression coverage.
2. Recheck the merge-sensitive spawn, terrain/prop and portrait CSS paths;
   audit Monterey's channel with the merged content at every graphics tier;
   run full gates again. Fix only reproduced defects, with a unit regression
   per fix; preserve the authored visual design.

## Findings

- **No new runtime defect reproduced; no production fixes or restyling.**
  Existing fixes below belong to main before this verification, not to 750.
- **Beebe:** `Spawn.ts` has one opening definition and no duplicate pose code.
  Merge `877bcc7` selected 680's pose; `c47a4c7` already reconciled the lost
  650/660 camera clearance. The current values are range 76, altitude 8,
  yaw offset 11, radius 54, lateral offset -24 and vertical offset -38.
  The shared composition path and prop-loading path apply those offsets once.
  Existing `beebeFraming`, `beebeOpeningReadability` and `beebeSeabed` unit
  suites pass, covering actual hull/target projection, portrait/landscape,
  camera reset, terrain seating and unchanged solid colliders.
- **Blue Hole/Monterey:** the carve dispatch is exclusive by tile ID.
  690 changes only the east grotto profile, pendants and opening glow; its
  foot, overhang, pendant clearance and close-camera collision regressions
  pass. 700 changes Monterey's banks and adds a scoped carve; neither
  overwrites the Blue Hole terrain branch or grotto geometry. All four
  Monterey walls pass existing rubble and colony attachment regressions at
  Low/Medium/High/Ultra. `freeDiveComposition` also passes with the merged
  props. Monterey retains the global chase radius for reset, with offsets
  X=20 and Y=-14; the earlier 700 radius regression is already fixed.
- **Debrief/Journal portrait CSS:** read the complete stylesheet import order,
  base overlay rules, 720 changes, touch rules and later accessibility rules.
  The six-column debrief grid and cell spans remain consistent in the
  <=480 px override; there is no later conflicting column definition.
  Journal's <=760 px single-pane layout hides contents until requested and
  hides the article while contents are open. The later coarse-pointer
  `flex-wrap` declaration on its grid header is inert, not a second layout.
  Its spoiler wrapping and touch target sizes remain applicable. No source
  cascade clash was found. Actual portrait overflow, hit testing and visual
  appearance still require browser execution; static review is not a rendered
  pass. Existing `debriefReopen`, `journalData` and `copyJournal` suites pass.
- **Titanic:** the horizon is opt-in through Titanic mission content only;
  shared defaults remain off. Horizon disposal and Low-tier fog/background
  synchronization are present. Existing `titanicHorizon` regressions pass,
  including shallow starts, ascent, gradient orientation and retained
  atmosphere/exposure properties.
- **CI timing:** review includes the paused-clock helpers and affected specs.
  Main's follow-up commits `535bcd1`, `84c813c` and `c8cbab2` already reconcile
  720's Journal copy and the missing post-Begin/resume/pause frame advances
  in 510. No additional timing defect was established by source review.
  These browser scenarios have not executed in this sandbox.

## Validation

- Round 1: `GATES_CONFIG_MODE=writable PW_PORT=4750 tools/gates.sh --full-e2e`.
  Build/typecheck, **133 unit files / 1,380 tests**, **144 Python tests**,
  strict content, attribution and whole-repository formatting pass.
  Both full E2E and project-base E2E stop at preview-server startup, before
  tests execute. The project-base build passes. Retained logs:
  `.cache/verify-f29/gates-round1.log`, `unit-round1.log`, `e2e-round1.log`
  and `e2e-base-round1.log`.
- Direct preview probe reproduces **`listen EPERM 127.0.0.1:4750`**;
  `.cache/verify-f29/preview-probe.log`. The sandbox cannot bind localhost.
  Browser failures are environmental, not passing browser checks.
- Supplemental merged Monterey audit: **4 tests pass**, one per graphics tier.
  Using actual merged props and surveyed terrain sampling, test the channel
  at 10 m intervals along its first 400 m, 10 m above the floor: every hull
  position clears the prop colliders and the floor descends more than 60 m.
  All four science contact positions remain outside the carve. Apply both
  authored chase offsets to the real CameraRig at 390x844 and check the eye
  against prop collision and terrain clearance. This is headless geometry
  evidence, not rendered portrait QA. Audit and config are retained locally
  at `.cache/verify-f29/integration.test.ts` and `vitest.config.mjs`; results
  are in `integration.log`. Re-run with:
  `npx vitest run --config .cache/verify-f29/vitest.config.mjs --configLoader runner --cache=false`.
- Round 2: the same full-gate command passes build/typecheck, **133 unit
  files / 1,380 tests**, **144 Python tests**, strict content, attribution and
  whole-repository formatting again. Both browser gates again stop before
  tests at preview-server startup; the project-base build passes. Retained
  logs: `.cache/verify-f29/gates-round2.log`, `unit-round2.log`,
  `e2e-round2.log` and `e2e-base-round2.log`.
- Focused Playwright discovery succeeds: **63 cases in 6 files** for the
  browser follow-up below; `.cache/verify-f29/e2e-discovery.log`. Discovery
  does not execute browser assertions. Final `git diff --check` and
  changed-file Prettier checks pass.

## Browser follow-up

Run in an environment permitting localhost and Chromium:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4750 tools/gates.sh --full-e2e
```

Review `f-debrief-720`, `f-flow-audit-510`, `f-beebe-framing-680`,
`f-verify-650`, `f-bughunt-18`, and Blue Hole visual QA results/screenshots.
No runtime fix or new regression test is warranted without a reproduced
new defect. This verification changes only this findings log.
