# S-bughunt — deferred power start lifecycle

Backlog item **9, S-verify / S-bughunt [Codex, standing]**; brief 2850.
Audited SHA: `f827eba0da2b6623a5a199b40922507579ccd641` (all evidence and
changes are relative to that HEAD). Non-visual, Realistic supplies enabled.

## Ownership and prior evidence

Read Director rules/rubric, the newest review (2026-10-21), overnight-log tail
through run 74, queued/launched briefs 2800–2880, available results/progress,
and the power source/spec/history. Read 410's brief/result and
`F-BUGHUNT-16.md`: disabled Arcade depletion/ascent was already fixed and its
two existing assertions remain unchanged. Read 1580's brief/result and
`S-modal.md`: overlay ownership/Escape work does not establish deferred reserve
cancellation. Historical wrapper PASS labels overstate some browser results;
the detailed progress notes describe those limits.

2810 has now merged; its discovery/mission/props and scene teardown changes
are excluded here. 2800 numerics, 2820 scan/fidelity CI watch, 2830 steel shader
verification, 2840 Settings shortcut work and Monterey art are excluded.
2850 had its launched brief but no completed result/progress or prior power
lifetime guard. This exact slice was neither finished nor claimed by another
package. Before editing, this worktree and the 2860/2870/Monterey-cliff
worktrees had no diffs; main had only another owner's Director status edit
marking Monterey-cliff in flight. None of those files were taken.

## Supported ordering and reproduced defects

- Power subscribes before the mission router is constructed. With skipBriefing,
  `MissionRouter` calls `Mission.start()` before discovery resolves, then
  registers `applyStart` on the same readiness promise. The power promise
  handler queues one additional microtask, so the pose handler runs before
  reserves read the actual start depth. The fixture uses the real EventBus,
  parsed Titanic mission and `Mission`, a manually resolved native promise,
  and a disposal-guarded pose handler matching the router contract.
- A normal briefing's `begin()` waits for readiness and applies the pose before
  emitting `mission:started`. `Mission.start()` only emits in briefing state;
  repeated starts in one mission do not create another dive. Keep exploring
  resumes without a new start; Dive again navigates to a fresh runtime. Thus
  repeated artificial bus starts before readiness are not a supported reset
  policy and were not used to justify a generation counter.
- A supported `?depth=` probe can place the sub deep before discovery is ready.
  Startup failure/page teardown disposes systems while readiness remains
  pending. Even when the router correctly cancels its pose handler, old power
  work still ran. Both disposal before resolution and disposal after the
  promise handler queued the reserve work reproduced a write to disposed
  supplies. Levels **0.4 / 0.6** became
  **0.7718803640985014 / 0.8246415770609319** at 3,800 m.
- Successive starts are exercised across disposed/replacement runtime
  instances, each with its own readiness promise, resolved newest first.
  Repeating the old instance's teardown after replacement subscription also
  removed the replacement's listeners: module-global cleanup crossed instance
  ownership. Its reserves stayed **1 / 1** instead of initializing at 1,800 m.
  This violates the existing idempotent teardown contract. No simultaneous
  playable dives or same-mission restart was invented.

Before the production change, the six-case powerSystem spec had **3 failures /
3 passes**, exit 1 (`/tmp/2850-power-before.log`). The normal start and both old
Arcade-depletion cases passed. The cancellation cases failed at the observed
level write; the replacement case failed at missing live initialization.

## Minimal fix and preserved behavior

`power.ts` now owns its Disposables inside the factory, like other system
factories, and registers an init-lifetime disposal flag with existing cleanup.
The queued callback checks that flag immediately before reading depth,
initializing reserves or publishing the existing descent notice. Both async
boundaries are covered; removed bus subscriptions and repeated old teardown
cannot cancel the replacement's current start.

Four new cases extend `powerSystem.test.ts`. They verify no stale reserve write
or notice at either cancellation boundary, isolated replacement initialization,
and exactly one normal reserve write/notice after the actual pose is applied.
The normal case starts shallow, resolves at 3,800 m and uses resolved Realistic
speed and equipped supply settings, demonstrably different from raw config.
It reuses `startingReserves` as the integration oracle; existing power/hazard
specs independently cover the drain/descent math. No formulas were copied.

Simplicity/rubric: one lifetime flag and instance-owned existing cleanup;
no counter, reset policy, helper subsystem, setting, UI or guidance surface.
The existing notice text/priority and normal-start behavior are preserved.
This protects correctness, clear information and simple operation after
teardown; keyboard/accessibility behavior is unchanged. No config mutation,
site branch, art, scene-disposal change, layout patch, snapshot/budget change,
new spec, retry, skip or timeout increase. Beauty, composition, phone appearance
and screenshot acceptance remain with Claude/owner.

## Validation

- Focused power capabilities: **3 files / 14 tests PASS**, exit 0:
  `npm test -- --configLoader runner --pool=threads --cache=false tests/unit/powerSystem.test.ts tests/unit/power.test.ts tests/unit/d2Hazard.test.ts`.
  Log: `/tmp/2850-power-after.log`.
- Required invocation: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Log: `/tmp/2850-gates.log`; detailed logs:
  `.cache/runs/20261020-220253-3-22CjoG/`. Config preparation, strict content
  validation and production build (`tsc --noEmit` + Vite) **PASS**. Aggregate
  invocation **INCOMPLETE, exit 130**: its default fork-pool full unit stage
  emitted only the RUN header for over ten minutes and was interrupted.
  No unit assertion result or full-suite pass was obtained. Attribution and
  Prettier were not reached by that invocation; separate outcomes follow.
- Full-suite fallback:
  `npm test -- --configLoader runner --pool=threads --cache=false`,
  `/tmp/2850-unit-threads.log`: **INCOMPLETE, exit 130**. It likewise emitted
  only the RUN header for over ten minutes and was interrupted. These two
  execution stalls have no established cause here; neither demonstrates a
  unit assertion failure or a full-suite pass. No runner configuration,
  tooling or test timeout was changed.
- Python gate: **FAIL, 5 failures / 167 tests**, exit 1. Four unchanged
  build-manifest cases report `spawnSync git EPERM`; the golden-tooling wrapper
  reports `Unexpected end of JSON input`. These match the earlier 2810/2830/2840
  reports. No tooling/assertion changes were made to bypass them.
- Separate attribution: **PASS**, 14 assets, exit 0
  (`/tmp/2850-attribution.log`). Repository-wide Prettier: **FAIL**, exit 1,
  solely the pre-existing `plan/progress/V-monterey-cliff.md` formatting issue
  (`/tmp/2850-prettier.log`); that other owner's file is untouched. Formatting
  of all three owned files and `git diff --check`: **PASS**.
- Actual e2e mode: **none**. No browser, game rendering, screenshots, real-time
  delay or phone acceptance was used for the lifecycle evidence.
- Original implementation scope: `src/app/systems/power.ts`,
  `tests/unit/powerSystem.test.ts` and this progress note.
  No tooling/Director edits, merge, push or tag.

## External gate follow-up

The user supplied an orchestrator run outside the sandbox:
`.cache/runs/20261020-221546-3205014-XtaA4l/`. Its reported Python, content,
build, full unit, smoke e2e, project-base e2e and attribution gates all **PASS**.
Its aggregate result was **FAIL** solely because Prettier rejected the existing
`plan/progress/V-monterey-cliff.md` formatting. External e2e mode was **smoke +
project-base**; this is distinct from the local **none** run above. The external
results establish that the earlier local Python failures/unit stalls did not
reproduce outside the sandbox.

The follow-up instruction explicitly authorizes fixing that remaining gate
failure. Applied Prettier only to the Monterey progress note: missing blank
lines after headings were the root cause. Its prose, art, source, tests and
assertions are unchanged. Repository-wide `npx prettier --check .` now **PASS**,
exit 0 (`/tmp/2850-followup-prettier.log`), and `git diff --check` **PASS**.
The full gate was not rerun locally for this documentation-only correction;
all other gates passed in the supplied external run. No browser was run locally.
