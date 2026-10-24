# 3660 — S-bughunt: mission objective ordering

DIRECTOR Backlog 9, **S-verify / S-bughunt [Codex, standing]**, specifically
S-bughunt. Audited checkout: `7351399422cdf6d8911459e2eeb0aac82722958e`.
No production defect reproduced. Two missing sequence guards extend the existing
`tests/unit/missionRouter.test.ts`; production remains read-only.

## Intake and ownership

Read DIRECTOR Backlog, all seven simplicity rules and rubric; the newest dated
REVIEWS entry (2026-10-24 early, below the older targeted entry at the file top);
OVERNIGHT-LOG through run 109; CONTRIBUTING-AGENTS; launched briefs 3430 and
3640–3660; results 3600–3630; and progress notes 3290, 3400 and 3430. Historical
result wrappers claim browser/gate PASS while their embedded final reports say
headless gates failed: those wrapper summaries are not validation for this audit.

Pinned HEAD and initially clean status, then rechecked before editing. Read-only
worktree registry, status, committed-work listings and path/diff inspection found
no competing missionRouter/Mission ownership. Active 3640 owns Journal and 3650
owns save migration. Held 2980/3050 collision diffs, 3310 journey commit, 3320 full
e2e note, 3340 touch diff and 3380 CI note were left intact and unused. 3510's
collected journey report was not reopened. The launch brief still calls 3580–3600
uncollected, but current registry and OVERNIGHT runs 106–107 show those worktrees
removed and their changes already on this checkout. No collection was performed.
Only the named capability spec and this progress note are edited.

## Production contracts and existing guards

- `src/game/Mission.ts:313` selects the first resolved, unfinished primary in
  authored order, then an optional objective. Both `src/app/systems/discovery.ts:57`
  and `src/app/systems/waypoints.ts:47` use this selector for beam/waypoint
  priority. `Mission.ts:516` accepts any matching unfinished resolved objective
  while diving; no predecessor or `firstTime` requirement. Duplicate events are
  silent. The final primary emits `mission:primaryComplete` once.
- `src/game/Mission.ts:440`, `:455` and `:490`: abort prevents further progress
  and voluntary completion; end emits completion once for a successful run;
  restart clears objective completion, clock, end reason and completion latch.
  Journal history is separate from per-dive objectives.
- `src/game/MissionRouter.ts:259` chooses the nearest unfinished primary for the
  panel nav readout, then the nearest optional. This differs from the authored
  order used for beam/in-world waypoint priority; the existing nearest-nav policy
  is explicitly documented in `docs/missions.md` and is preserved, not treated as
  a reproduced ordering defect. At `:510`/`:520`, all-objective completion
  schedules/promotes the appropriate banner; ascent suppresses banners. At `:650`,
  Dive again calls restart and navigates to reload; it does not reuse the router
  in place. Tests model that boundary by disposing and reconstructing it.
- `tests/unit/missionCore.test.ts:430`–`:582` already guards pre-start scans,
  duplicate objective events, optional-first partial surfacing, primary/all
  completion, voluntary end/resume, unresolved objectives, fresh restart and
  dispose. `tests/unit/missionAbort.test.ts:20` guards power/crush abort, frozen
  clocks, ignored late scans, nonresumability and no abort completion.
- Existing `tests/unit/missionRouter.test.ts:280` guards nearest nav and missing
  POIs. Its completion-timing cases (now `:619` onward) cover pending/open/dismissed
  banner promotion, pause/resume timing, late actions/scans, repeat end/resume and
  power/crush ascent across pending/open primary/all boundaries, including an
  abort after an earlier voluntary completion. These assertions are unchanged.
- `tests/unit/missionApproachWaypoint.test.ts:31` and `:106` exercise actual
  discovery/waypoint hooks and Scanner with Mission: first-frame primary
  priority, optional guidance, debrief resume and leftover nonobjective contacts.
- `tests/unit/guidance.test.ts:587` already covers all 13 missions' first two
  runtime scans, both modes, keyboard/touch and new/logged discoveries (104
  cases). `src/ui/ScanOverlay.ts:187` rejects a cue to `lastCompleteId`;
  guidance tests check completion-frame suppression, next waypoint, updated
  direction, movement and expiry. Its `:855` case clears rewards through the real
  restart handler. `tests/unit/discoveryReward1240.test.ts:85` guards POI reward
  identity and linked authored Journal entry. Prior 3430/3290 evidence covers
  this reward/Journal handoff, so no duplicate matrix was added.
- `tests/unit/gameScanner.test.ts:648` guards same-dive scan suppression and
  logged scans in a fresh dive. `src/game/Discovery.ts:175` clears transient
  overlay/scanner/stats on restart, retaining Journal unlocks. Persistent reward
  deduplication is already guarded by `tests/unit/progress.test.ts:130`, `:243`
  and `:251`: independent reward kinds, zero abort stars and only improved best
  ratings paying again. `src/app/systems/progress.ts:42` connects mission events
  to idempotent awards; `src/app/systems/mission.ts:125` passes abort status to
  `Progress.finish`. Restart does not undo discoveries or previously earned
  objective/primary tokens; an abort suppresses the end-of-dive star rating.

## Added sequence evidence

The existing pieces lacked two router-level sequences:

1. `missionRouter.test.ts:516`: scan optional, later primary, then first primary.
   Logged (`firstTime: false`) scans count; primary waypoint/nav stays on the
   remaining first primary. No premature primary banner appears. Finishing the
   last primary leaves no objective/target and opens **All objectives complete**
   with **3 of 3**, never an intermediate primary-only claim. Repeating all three
   scans just before the deadline emits nothing and does not postpone the banner.
   Voluntary end, resume and another end emit one mission completion.
2. `missionRouter.test.ts:579`: finish objectives, start power ascent and abort
   before the pending banner. Activate the actual **Dive again** action and
   assert one reload request plus cleared mission state. Dispose the old router
   and construct a fresh one on the same bus. No old banner/progress leaks; logged
   scans must complete the primaries and optional again. The first successful
   end gets a partial tally, the second gets all objectives, and only one mission
   completion fires. The disposed mission receives none of those later scans.

Both pass against the pinned implementation. No failing-before/passing-after
product fix, retained runtime reproduction or proposed product correction.
These tests inject scan-completion events and use the existing EventTarget DOM
double: they verify controller/state/timing, not beam geometry, storage reload,
browser navigation or rendered waypoint/reward appearance. The existing focused
Scanner/guidance/progress capabilities cover their respective boundaries.

## Simplicity and rubric

Two capability guards, no runtime complexity or new abstraction. No settings,
UI/guidance surface, config mutation, site branch, schema, dependency or authored
data change. Historical assertions, budgets, snapshots, tolerances and the four
expected-failure collision cases remain untouched. Behavior stays simple,
rewarding and honest: only outstanding objectives guide progression, repeated
events do not inflate completion, and an abort does not claim a successful dive.
GMRT terrain, all 13 sites/five heroes, scan/Journal/life/input/accessibility and
Arcade default retain their implementations. Visual rubric and phone acceptance
remain with Claude/owner.

## Validation

- Initial focused command:
  `./node_modules/.bin/vitest run tests/unit/missionRouter.test.ts tests/unit/missionCore.test.ts tests/unit/missionAbort.test.ts tests/unit/missionApproachWaypoint.test.ts tests/unit/guidance.test.ts tests/unit/progress.test.ts tests/unit/gameScanner.test.ts --configLoader runner --cache=false`
  — **PASS, exit 0, 7 files / 300 tests**, 837 ms; `/tmp/3660-focused.log`.
- Final focused command adds `tests/unit/discoveryReward1240.test.ts` to the
  command above, after retaining the complete POI list in the out-of-order
  fixture — **PASS, exit 0, 8 files / 313 tests**, 1.12 s;
  `/tmp/3660-focused-final.log`.
- Owned-file Prettier and `git diff --check` — **PASS**.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` — **FAIL, exit 1**,
  `FAIL gates (e2e=none)`, solely the five Python tooling failures below.
  Config preparation, strict content validation, TypeScript/production build,
  full units, attribution and repository-wide Prettier all **PASS**. Full units:
  **192 files passed; 4,134 passed / 4 existing expected failures (4,138 total)**,
  615.31 s. Logs: `/tmp/3660-gates.log`,
  `.cache/runs/20261024-041947-4-52672w/`.

The Python gate ran **167 tests in 10.597 s, five failures**. Four
`test_ci_build_manifest` cases fail with `spawnSync git EPERM` at
`tools/ci-build-manifest.mjs:11`: `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden_tooling` fails with `Unexpected end of JSON input` parsing child
stdout at `tools/tests/golden-manifest.test.mjs:151`. These match previously
recorded tooling failures in 3400 and the 3600–3630 final reports; they are
outside ownership. The smallest next step for the permission failures is the
unchanged command on a runner that permits the child process. For golden tooling,
first capture the failing child's status/stderr/stdout there; the log does not
establish its underlying failure, so no code correction is justified. No tools
edit, retry, skip, timeout increase or weakened assertion was attempted.

Second review checked the two new sequences against the reload contract and
the existing reward/waypoint guards: no further gap or supported defect found.
Final ownership/status recheck retains the pinned SHA and exactly the two owned
changed paths. Sibling work remains separate; no merge, push, tag, workflow
dispatch or collection performed.

Actual local e2e mode is **none**. No browser, game rendering, WebGL context,
screenshots, GPU, hosted CI, unaided journey or real-phone validation is claimed.
