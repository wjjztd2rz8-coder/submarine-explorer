# S-bughunt: debrief, Journal and save interplay

Serves DIRECTOR Backlog **7, S-verify / S-bughunt**.
Audited checkout: `164da7fe6e82e4abfcee270c123106f36bda2707`.

## Plan

1. Trace discovery writes, mission end/resume, rating writes, settings edits and
   boot migration before testing. Distinguish persistent Journal/rewards from
   deliberately fresh mission/session state.
2. Recheck the four requested boundaries with existing capability guards and
   focused headless probes. Report confirmed defects first; fix only a small
   defect with one regression in an existing capability spec.
3. Run focused capabilities and the no-browser gates; record actual results
   and any remaining limits here and in the final report.

## Round 1: code trace

Read DIRECTOR's simplicity rules, CONTRIBUTING-AGENTS and the previous
debrief/Journal and migration audit evidence, particularly 3290, 3790 and 3870. Initial status was clean. Traced production code before adding a test.

The trace covers `boot`, `loadSavedProgress`, `creditPreviousDives`, `Save`,
`ProgressSave`, `DiscoveryStore`, `Scanner`, `Discovery`, `Mission`,
`MissionRouter`, `Debrief`, `Journal`, `JournalData`, and the progress, mission,
settings, modes, discovery and shell systems.

Confirmed ordering: Scanner records a discovery before emitting its
completion event; progress listeners persist objective and primary tokens
synchronously; MissionRouter calls its rating callback before showing the
debrief. Boot finishes legacy credit before constructing a dive. Journal
unlocks read persistent discoveries; mission objectives and session statistics
start afresh on reload.

## Round 2: boundary probes

All four requested boundaries pass the focused headless probe:

| Boundary                          | Trace and observed result                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quit mid-debrief                  | `MissionRouter.showDebrief` calls the rating callback before `Debrief.show`; leaving only hides/disposes the UI. After a primary scan and surface, opening Journal and leaving via Home do not change saved bytes. Recreated discovery/progress stores retain the scan and one-star best. Closing the page itself was code-traced, not browser-tested.                                                                                           |
| Reload after completed primary    | The progress system immediately persists primary/objective tokens. Stars wait for surfacing by design. Production `loadSavedProgress` retains those tokens and Journal discovery without inventing a finished rating; a fresh router has zero completed objectives and empty session stats. A repeat scan reports `firstTime: false`, completes the fresh run and never duplicates primary credit.                                               |
| Settings during debrief           | `Save` uses a separate settings key. Gameplay/display edits survive a new Save instance without changing discovery/progress bytes or the frozen mission. Resume retains its completed objective; finishing the optional scan upgrades the saved rating. The modes system recomputes effective settings through its existing listener; the shell keeps the debrief frozen. Those live consumers were code-traced, not instantiated by this probe. |
| Migrated old save entering a dive | Boot awaits `loadSavedProgress`; legacy credit reads discoveries and resets dive bonus before returning. An unversioned discovery array with both objectives and an animal backfills three stars, leaves discovery bytes intact and enters a fresh mission with no carried bonus. Repeating a primary scan increments its count without reducing the historical best or repeating migration on the next boot.                                    |

Temporary probe: `.cache/4040-debrief-save-audit.test.ts`, using real
`loadSavedProgress`, the progress-system event listeners, Scanner,
DiscoveryStore, MissionRouter, SessionStats, Save and ProgressSave with shared
in-memory storage and a synthetic two-objective mission. DOM behavior uses the
existing router spec's minimal EventTarget double; the Journal-open action is
a spy. This exercises persistence and router handoff, not native Journal
rendering, the full shell, settings controls or physical transit. Existing
`journalData` cases separately check shipped Journal unlocks through reload.
The initial probe needed its missing DOM parent/document-root and mission ID
supplied; those were fixture errors, not product findings.

The four boundary cases passed, then a fifth probe instantiated the real
router with partial content and checked that its "All objectives complete"
heading, 1/1 count and two-star DOM text match the reloaded best rating.
The final probe run passes **5/5**, exit **0**, **479 ms**. Command:
`./node_modules/.bin/vitest run --config .cache/4040-vitest.config.mjs
--configLoader runner --cache=false`. Log: `/tmp/4040-boundaries.log`.

## Confirmed finding and small fix

When a mission objective's POI is absent, `Mission.resolve` marks it unresolved
and excludes it from completion and the objective count. `diveStars` still
includes that objective. A resolved primary scan can therefore produce an
"All objectives complete" debrief with zero stars and persist a zero best
rating. The same code also caps the rating at one star when only an incomplete
optional objective is unresolved, despite all counted objectives being complete.

This is a partial-content recovery defect, not a claim that shipped POIs are
currently missing. It affects the same objective array used by the completion
banner and mission-system rating callback. Small proposed fix: have the shared
rating function exclude explicitly unresolved objectives, preserving ordinary
rating inputs used by legacy migration. Implemented in
[`Progress.ts`](../../src/game/Progress.ts#L25): one
optional field on `RatingObjective`, one explanatory comment and one shared
filter. Banner previews and persisted debrief ratings now use the same
eligibility rule. No save-schema migration or historical rating rewrite.

Added one regression to the existing `progress.test.ts` capability, using real
Mission resolution, scan events, end state, Progress and ProgressSave. Before
the fix it fails at `previewStars`: expected **2**, received **0**; 23 existing
tests pass. Command: `npm test -- --configLoader runner --cache=false
tests/unit/progress.test.ts`; exit **1**. The final regression was also rerun
against the original HEAD implementation through a temporary import alias,
and failed at the same assertion (23 existing tests pass). That preserves the
final failing-before evidence without reverting the working source during
the broader gate run. Command:
`./node_modules/.bin/vitest run --config .cache/4040-before.config.mjs
--configLoader runner --cache=false`; exit **1**.
Log: `/tmp/4040-rating-before.log`.

After the fix, this single new capability test checks a real mission's
resolved count, successful end, preview stars, final rating, persisted reward
tokens and best stars after reload. It also guards zero stars when no primary
resolves, with and without a bonus. Existing plain-object and migration tests
protect callers without a `resolved` property. No other defect was confirmed
in the requested boundaries.

Simplicity: three added production lines unify rating eligibility with the
existing mission rule; one test extends the ratings/save capability. No new
module, dependency, setting, UI, site branch or Config mutation. No assertion,
timeout, skip, snapshot or tolerance was relaxed. The two-round audit stays
within DIRECTOR Backlog 7. Rendered beauty, readability and Phone-OK remain
outside this headless audit.

## Validation

- Final focused command: `npm test -- --configLoader runner --cache=false
tests/unit/progress.test.ts tests/unit/progressMigration.test.ts
tests/unit/saveSoak.test.ts tests/unit/settingsSave.test.ts
tests/unit/gameDiscoveryStore.test.ts tests/unit/journalData.test.ts
tests/unit/missionCore.test.ts tests/unit/missionRouter.test.ts
tests/unit/debriefSummary.test.ts tests/unit/debriefReopen.test.ts`.
  **10 files / 413 tests passed**, exit **0**, **1.81 s**.
  Log: `/tmp/4040-focused.log`.
- Final `npm run typecheck`: exit **0**. Log: `/tmp/4040-typecheck.log`.
- Production build of the final source: `npm run build -- --outDir
.cache/debrief-save-final-build --config
.cache/gates/vite-debrief-save-final.config.mjs --configLoader native`.
  Exit **0** (TypeScript and Vite); log: `/tmp/4040-final-build.log`.
  Reused the gate's bundled configuration in a writable location because
  dependencies are shared read-only. Build retains the existing chunk-size
  warning. This final build follows the fix; the aggregate gate's build
  started before the edit.
- Aggregate no-browser gates: `GATES_CONFIG_MODE=writable bash tools/gates.sh
--no-e2e`, exit **1**, **FAIL gates (e2e=none)**. Config preparation, content,
  build, attribution and repository-wide Prettier passed. This run started
  before the fix; it picked up the new regression with pre-fix rating code.
  Units: **191 files passed / 1 failed; 4,236 passed / 1 failed / 4 expected
  failures** (4,241 total), **694.65 s**. The sole failure is this regression's
  expected 2/received 0 assertion; the four existing collision expected failures
  are unchanged. This mixed-source run is not final-source unit validation.
  Aggregate summary log: `/tmp/4040-gates.log`; individual logs:
  `.cache/runs/20261025-063150-7-kuvBSo/`.
- Final full unit run against the completed, unchanged source:
  `npm test -- --configLoader runner --cache=false`. Exit **0**:
  **192 files / 4,237 passed / 4 existing expected failures** (4,241 total),
  **604.05 s**. Log: `/tmp/4040-final-unit.log`. This resolves the regression
  failure from the initial mixed-source run. The full gate wrapper was not
  rerun; Python remains a failed check.
- Final owned-file Prettier and `git diff --check`: **passed**.

The aggregate Python gate ran **167 tests: 162 passed / 5 failed**, **9.023 s**.
Four `test_ci_build_manifest.TestCiBuildManifest` cases fail with
`spawnSync git EPERM`: both-base provenance, manifest mismatches,
missing-output/workflow-SHA mismatch, and symlink/manifest-overwrite checks.
`test_golden.TestGolden.test_golden_tooling` reports `Unexpected end of JSON
input` in the golden comparison child-output parsing. These match earlier
audit signatures; the empty golden output's cause is not established here.
They remain failed checks. Run them unchanged on a runner that permits the
subprocess and capture the golden child's status/stdout/stderr before
proposing a tooling fix.

Actual e2e mode: **none**, following DIRECTOR's browser-off Codex lane.
No browser, screenshots, WebGL, full-page boot, physical journey, GPU or
real-phone validation; no merge, push or tag.

## Final result

One confirmed partial-content rating defect fixed with three production lines
and one added test in the existing ratings/save capability. All four requested
state/persistence boundaries pass the headless probes, with no additional
confirmed defect. Final units, production build, focused tests and probes
pass. Five previously recorded Python failures remain; browser acceptance is
unverified. Final status contains only `src/game/Progress.ts`,
`tests/unit/progress.test.ts` and this note.
