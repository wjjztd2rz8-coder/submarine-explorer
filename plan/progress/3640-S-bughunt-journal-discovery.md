# 3640 — S-bughunt: Journal discovery state

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited checkout SHA:
`7351399422cdf6d8911459e2eeb0aac82722958e`.

Clean audit: existing guards adequately cover scan → one Journal entry,
reload retention, repeated scans and single provenance tags. No supported
defect or materially missing contract was found. **Only this progress note
changes**; no test addition or production correction is justified. There is
no failing-before/passing-after product evidence or proposed fix.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md, DIRECTOR Backlog/simplicity/rubric, both the
topmost targeted review and the newest dated comprehensive review
(2026-10-24 early), and OVERNIGHT-LOG through run 109. Read the launched
3640–3660 scopes, the relevant prior Journal results/progress (3070, 3180,
3210, 3220, 3290), and 3580–3600 completion reports. Historical wrapper
PASS/smoke labels conflict with some reports' actual failed gates; they are
not substituted for this checkout's validation.

The task brief says 3580–3600 are uncollected, but this pinned checkout's
OVERNIGHT-LOG runs 106–107 records their collection and removal, followed by
3610–3630. The registered worktree list agrees: none of those worktrees is
registered. Their code is already in HEAD; no patch was collected here.

Inspected registered worktree statuses, working-diff summaries and branch
diff summaries against main, including finished held work. Explicit diffs
for `tests/unit/journalData.test.ts` and this note across every registered
worktree were empty before editing. The adjacent 3650 slice owns persistence
tests; 3660 owns missionRouter tests. Neither claims this slice. Held 3310
includes Journal journey e2e edits; those remain unverified and are not used
as evidence here. 3320/3340/3380 and 2980/3050 remain with their owners. No
collision expected-failure case, snapshot, source, content, fixture, tool,
DIRECTOR or other package's note was edited or imported.

## Production trace and existing capability guards

Line citations below refer to the pinned checkout, whose tests are unchanged.

| Supported contract                                                                | Production path                                                                                                                                                                                                          | Existing guard                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A completed scan records once during a dive, before notifying consumers           | [Scanner.ts:482](../../src/game/Scanner.ts#L482) checks site/target membership, records, then emits completion; resetDive clears session membership only                                                                 | [gameScanner.test.ts:648](../../tests/unit/gameScanner.test.ts#L648); [journalData.test.ts:691](../../tests/unit/journalData.test.ts#L691) holds Scan again, restarts, checks firstTime false, count 2, unchanged first timestamp, identical two unlocked keys, and equal reloaded snapshot                                                                                                                                                                |
| New-dive rescans retain one persistent discovery rather than creating entries     | [DiscoveryStore.ts:181](../../src/game/DiscoveryStore.ts#L181) updates the existing site/target record; keys and unlocks read that map                                                                                   | [gameDiscoveryStore.test.ts:45](../../tests/unit/gameDiscoveryStore.test.ts#L45) and [:59](../../tests/unit/gameDiscoveryStore.test.ts#L59) check exact saved document and reload/repeat behavior                                                                                                                                                                                                                                                          |
| Authored scans open their intended entries and retain site isolation on reload    | [Guide.ts:172](../../src/game/Guide.ts#L172) dedupes fallback IDs; [JournalData.ts:249](../../src/game/JournalData.ts#L249) groups linked POIs into entries; isEntryUnlocked reads discoveries without appending entries | [journalData.test.ts:105](../../tests/unit/journalData.test.ts#L105) covers four hero POIs; [:149](../../tests/unit/journalData.test.ts#L149) covers eight non-hero primaries with content/store reload and no writes; [heroMissionJournal.test.ts:8](../../tests/unit/heroMissionJournal.test.ts#L8) includes Monterey; [copyJournal.test.ts:20](../../tests/unit/copyJournal.test.ts#L20) checks every objective at all 13 sites and distinct entry keys |
| Wildlife common/rare appearances share one per-species entry                      | [JournalData.ts:221](../../src/game/JournalData.ts#L221) uses a seen set in lifeEntries; life unlocks use life:<species>                                                                                                 | [journalData.test.ts:236](../../tests/unit/journalData.test.ts#L236) covers all 100 shipped site/species combinations, exact entry lists, one saved key/write, reload, same-dive suppression, new-dive repeat and isolated counters; 3180's progress note documents the same contract                                                                                                                                                                      |
| Optional finds retain their identities and unlock only the intended Journal entry | JournalData builds secret:<id> and sample:<id> links, and isSiteUnlocked admits those finds                                                                                                                              | [journalData.test.ts:884](../../tests/unit/journalData.test.ts#L884) covers find grouping/counters; [gameExplore.test.ts:199](../../tests/unit/gameExplore.test.ts#L199) covers coexisting namespaces/reload; [modesExploration.test.ts:130](../../tests/unit/modesExploration.test.ts#L130) covers all 26 shipped samples through Scanner/collection/Journal reload. 3210 already audited all 39 secrets; no repeat probe was added                       |
| Plausible additions have one provenance tag without repeated caveats              | journalEntryTag returns Game addition / Recreation / null; [Journal.ts:914](../../src/ui/Journal.ts#L914) creates one span. refresh re-renders after clearing body/nav children, rather than appending articles          | [copyJournal.test.ts:55](../../tests/unit/copyJournal.test.ts#L55) checks all 13 sites' tag/prose policy and exactly one entry per POI; [journalGroups.test.ts:347](../../tests/unit/journalGroups.test.ts#L347) and [:380](../../tests/unit/journalGroups.test.ts#L380) check one addition tag and one front-page honesty note through refreshes using a DOM double                                                                                       |
| Reload does not rewrite saves or multiply content rows                            | DiscoveryStore construction migrates in memory; Journal load assigns its sites once; parseGuide and the mission index dedupe IDs                                                                                         | [journalData.test.ts:464](../../tests/unit/journalData.test.ts#L464) checks duplicate legacy discoveries and duplicate index rows with preserved bytes/writes; [:543](../../tests/unit/journalData.test.ts#L543) checks restored shared-entry grouping after guide failure; [:791](../../tests/unit/journalData.test.ts#L791) checks read-only v1 reads                                                                                                    |

Discovery.onComplete recomputes unlocked entry IDs, reports only IDs absent
from the previous set, then focuses/refreshes the Journal. SessionStats keeps
new entries in a Map. The Journal renders a static content model against the
current store: discoveries unlock entries; scans do not append content rows.
This distinction explains why repeat scan counts may increase across dives
while the Journal entry count remains unchanged. Grouped POIs and site
overviews legitimately share unlocks; they are not duplicate scan discoveries.

The prior [3290 audit](3290-S-bughunt-debrief-journal.md) already checked
five-hero entry uniqueness, one Recreation tag through refresh, and new-entry
bookkeeping. Its temporary probe and historical wrapper are not counted as
tests run here. The committed capability assertions above provide adequate
coverage at this SHA, so another fixture would repeat existing work.

## Simplicity and rubric

Net simpler: retain production and tests as they stand; add only auditable
evidence. No new runtime machinery, UI/guidance surface, settings, site
branches, schema, dependencies, retries, skips, timeout changes or relaxed
historical assertion. Correct persistence, distinct discoveries and existing
single provenance tags support the simple/rewarding/honest rubric. All 13
sites, five heroes, GMRT terrain, scan/Journal/life, inputs, accessibility and
Arcade default remain unchanged. Visual readability, beauty, touch layout and
real-phone performance remain with Claude/owner.

## Validation

- Focused command:
  `./node_modules/.bin/vitest run tests/unit/journalData.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/gameScanner.test.ts tests/unit/copyJournal.test.ts tests/unit/journalGroups.test.ts tests/unit/heroMissionJournal.test.ts tests/unit/gameExplore.test.ts tests/unit/modesExploration.test.ts --configLoader runner --cache=false`
  — **PASS, exit 0; 8 files / 312 tests**, 2.74 s.
  Log: `/tmp/3640-focused.log`.
- Required command: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`
  — **FAIL, exit 1; `FAIL gates (e2e=none)`**. Writable config, strict
  content validation, TypeScript/production build, full units, attribution
  and repository-wide Prettier all passed. Units: **192 files / 4,132 passed /
  four existing expected failures (4,136 total)**, 613.35 s. The four
  collision cases remain untouched. Python failed as detailed below.
  Aggregate log: `/tmp/3640-gates.log`; detailed logs:
  `.cache/runs/20261024-041805-18-a2nP2M/`.

Python ran **167 tests in 9.694 s: 162 passed / 5 failed**. Four
`test_ci_build_manifest` cases fail with `spawnSync git EPERM`:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
The fifth is `test_golden_tooling`, whose Node subtest fails parsing an empty
report at `tools/tests/golden-manifest.test.mjs:151` with
`Unexpected end of JSON input`. These match the prior recorded tooling
failures, outside this Journal ownership. The first four demonstrate a
subprocess environment block; the fifth cause is not established here.
Smallest proposed next step: run the unchanged checks in a runner that
permits the subprocess, capturing the golden child status/stderr/stdout
before proposing a code correction. No tooling edits, retries or bypasses.

Final checks: `./node_modules/.bin/prettier --check plan/progress/3640-S-bughunt-journal-discovery.md`
and `git diff --check` passed. HEAD remains the pinned SHA; final status
contains only this new note. Rechecked registered worktree statuses and
diffs for the owned test/note; no conflicting ownership appeared.

Actual local e2e mode: **none**. Focused tests use CPU scan/data logic, local
JSON fetch and Map storage fixtures, plus existing DOM/resource doubles.
No browser, game rendering, WebGL context, screenshots or image acceptance.
No hosted CI, unaided journey, native localStorage/device interaction,
screen-reader session or real-phone validation is claimed. No merge, push,
tag, workflow dispatch or dependency on uncollected patches.
