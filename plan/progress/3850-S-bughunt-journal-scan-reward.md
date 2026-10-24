# 3850 — S-bughunt: repeat scans, Journal and rewards

Director Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited SHA: `38afe4991d121c6b6c295b6a47d27fd6c45eeffb`.

Clean audit: collected capability guards already cover this slice. No supported
defect or material coverage gap found. No new test or production fix is warranted.
The initial audit changed only this note; the explicitly authorized follow-up
also fixes DIRECTOR's ordered-list formatting, as recorded below. There is no
failing-before/passing-after product claim.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, simplicity rules and rubric;
REVIEWS' leading older targeted entry and newest dated comprehensive entry
(2026-10-24 afternoon); OVERNIGHT-LOG through run 121; launched 3850, adjacent
3820/3840 and relevant 3640/3740/3810 briefs; 3640/3740 result reports; and
3640, 3660, 3700, 3740, 3790 and 3810 progress evidence. The older result wrappers
say smoke PASS while their embedded reports record failed no-e2e gates; those
wrappers do not establish the outcome of this audit's commands.

Inventoried every registered worktree's HEAD, status, working diff statistics,
unique committed branch differences against main and owned-path diffs. Rechecked
HEAD and ownership before writing. Main, this checkout and adjacent 3820/3840
were clean at the pinned SHA. Adjacent ownership is d-shell journey tests and
lifeSim tests respectively. Held 2980/3050 collision edits, 3310's committed
journey/scanner/UI changes, 3320/3380 notes and 3340 touch tests/note remain
untouched. No working or unique committed diff claims gamePois or this note.
Older worktrees lack the collected gamePois registry assertions; that historical
baseline difference is not a new edit or ownership conflict. No held patch was
imported or relied on. Finished 3640/3740/3790/3810 evidence is already collected
in HEAD, consistent with OVERNIGHT runs 111, 116 and 118.

## Round 1: production trace and existing guards

Line citations refer to the pinned checkout. Persistent discovery keys, completed
scan totals, Journal entry counts and current-mission objective counts are
different quantities with existing explicit policies.

| Supported contract                                                                                              | Production guard                                                                                                                                                                                                                                                                              | Existing executable evidence                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Holding Scan or releasing and pressing again cannot complete the same contact twice during one dive             | [Scanner.ts:481](../../src/game/Scanner.ts#L481) checks site/target membership before record and emit; [:263](../../src/game/Scanner.ts#L263) resets only dive state                                                                                                                          | [gameScanner.test.ts:711](../../tests/unit/gameScanner.test.ts#L711) asserts one completion after held and released attempts, then a new-dive completion with firstTime false and the existing record at count 2                                                                                                                                                                                                                                  |
| Common/rare appearances and multiple individuals share one wildlife entry per site/species; reload preserves it | [JournalData.ts:221](../../src/game/JournalData.ts#L221) dedupes species IDs; [:383](../../src/game/JournalData.ts#L383) unlocks by life:species identity; [life.ts:86](../../src/app/systems/life.ts#L86) forwards firstTime to discovery bookkeeping                                        | [journalData.test.ts:264](../../tests/unit/journalData.test.ts#L264), all 100 shipped site/species combinations: exact entry list, one write/key, reloaded unlocks, no same-dive repeat, return-dive count 2 while wildlife progress remains 1                                                                                                                                                                                                    |
| Feature rescans retain entry identity and first timestamp; cumulative scan counts increase legitimately         | [DiscoveryStore.ts:181](../../src/game/DiscoveryStore.ts#L181) updates the existing record; [JournalData.ts:407](../../src/game/JournalData.ts#L407) counts unlocked content entries, not completed scans                                                                                     | [journalData.test.ts:691](../../tests/unit/journalData.test.ts#L691) checks identical unlocked keys through same-dive suppression and new-dive rescan, count 1 then 2, stable timestamp and equal reload snapshot; [gameDiscoveryStore.test.ts:59](../../tests/unit/gameDiscoveryStore.test.ts#L59) explicitly reloads between recordings                                                                                                         |
| Valid discoveries and counters survive migrations, next scans and reloads without loss or duplicate keys        | [DiscoveryStore.ts:59](../../src/game/DiscoveryStore.ts#L59) caps counters at the safe integer limit; [:82](../../src/game/DiscoveryStore.ts#L82) unions supported legacy/current evidence and reconciles totals; construction reads without writing                                          | [gameDiscoveryStore.test.ts:80](../../tests/unit/gameDiscoveryStore.test.ts#L80), [:120](../../tests/unit/gameDiscoveryStore.test.ts#L120), [:232](../../tests/unit/gameDiscoveryStore.test.ts#L232) assert exact retained keys/metadata and reload snapshots; [saveSoak.test.ts:169](../../tests/unit/saveSoak.test.ts#L169) checks six supported shapes, preserved records and scans increasing by exactly one                                  |
| Repeated completion events cannot increment an already completed objective or emit primary completion again     | [Mission.ts:516](../../src/game/Mission.ts#L516) accepts only matching unfinished resolved objectives while diving                                                                                                                                                                            | [missionCore.test.ts:441](../../tests/unit/missionCore.test.ts#L441) asserts the exact event list after a repeated first primary; [missionRouter.test.ts:516](../../tests/unit/missionRouter.test.ts#L516) repeats every objective with firstTime false and checks unchanged events plus one mission completion through continued exploration                                                                                                     |
| Reload retains Journal discoveries but starts a fresh mission; rescanning advances that new run once            | [Mission.ts:355](../../src/game/Mission.ts#L355) initializes objectives incomplete, independently of DiscoveryStore; Scanner's new instance starts with empty dive membership                                                                                                                 | [missionCore.test.ts:59](../../tests/unit/missionCore.test.ts#L59) scans one objective, partially scans another, reloads store/Scanner/Mission, verifies no write on load, zero mission progress and then exactly 1 of 3 after a firstTime-false rescan; [missionRouter.test.ts:579](../../tests/unit/missionRouter.test.ts#L579) guards fresh navigation after abort                                                                             |
| Persistent POI, species, objective and mission reward tokens are awarded once across return dives/reloads       | [progress.ts:33](../../src/app/systems/progress.ts#L33) maps scans to site/POI or global species tokens and objectives to mission/objective tokens; [Progress.ts:51](../../src/game/Progress.ts#L51), [:118](../../src/game/Progress.ts#L118) restore/check a Set and persist only new tokens | [progress.test.ts:130](../../tests/unit/progress.test.ts#L130) separates kinds and rejects repeats; [:318](../../tests/unit/progress.test.ts#L318) reloads damaged balance fixtures with existing tokens, rejects duplicate POI/objective rewards and retains tokens; [:363](../../tests/unit/progress.test.ts#L363) checks global species deduplication; [saveSoak.test.ts:198](../../tests/unit/saveSoak.test.ts#L198) round-trips reward state |

Discovery compares unlocked-ID sets before adding new entries
([Discovery.ts:181](../../src/game/Discovery.ts#L181)); wildlife only adds a new
entry when firstTime is true ([:212](../../src/game/Discovery.ts#L212)). SessionStats
uses Maps for both scans and new entries
([Objectives.ts:139](../../src/game/Objectives.ts#L139)). Journal rows come from
the authored content model; scans unlock rows rather than append duplicate rows.

## Round 2: policy and overlap review

Rechecked actual assertions and production consumers against the collected
[3640 discovery](3640-S-bughunt-journal-discovery.md),
[3740 reload](3740-S-bughunt-journal-reload.md),
[3790 persistence](3790-S-bughunt-save-roundtrip.md) and
[3660 mission-order](3660-S-bughunt-mission-objective-order.md) audits.
The DiscoveryStore, JournalData, Discovery, Progress, Mission and progress-system
sources, plus journalData/progress/saveSoak specs, have no diff from 3640's
audited SHA `7351399422cdf6d8911459e2eeb0aac82722958e` to this checkout.

No mission-in-progress save exists: reload starts a new run, retaining Journal
history and persistent reward tokens. Return-dive rescans intentionally complete
objectives anew and increment completed-scan counters. They do not duplicate
Journal rows or persistent reward tokens. Per-dive counters reset; monotonicity
applies to persistent discoveries absent explicit reset. Species discoveries are
site-scoped in the Journal; research species tokens are global. Those existing
policies are preserved. No ambiguous behavior becomes a new requirement.

The named gamePois spec already guards parsing duplicates and retention of every
authored POI on real terrain at all 13 sites ([:80](../../tests/unit/gamePois.test.ts#L80)),
collected in 3810. Adding duplicate reward/save fixtures there would repeat the
existing capabilities above. The brief's clean-audit completion path is used.

Simplicity: evidence only, no duplicated tests or runtime machinery. No UI,
guidance, settings, schema, dependencies, site branches, Config mutations,
retries, skips, timeouts, budgets, snapshots or historical assertions change.
Retention and one-time rewards support correct, simple, rewarding and honest
behavior. All 13 sites/five heroes, real GMRT terrain, scanning, Journal, marine
life, inputs, accessibility and Arcade default remain intact. Visual readability,
beauty, touch layout and real-phone performance remain with Claude/owner.

## Validation

- `npm test -- --configLoader runner --cache=false tests/unit/gamePois.test.ts tests/unit/gameScanner.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/journalData.test.ts tests/unit/missionCore.test.ts tests/unit/missionRouter.test.ts tests/unit/progress.test.ts tests/unit/saveSoak.test.ts`
  — **PASS, exit 0; 8 files / 383 tests**, **4.88 s**.
  Log: `/tmp/3850-focused.log`.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`
  — **FAIL, exit 1; `FAIL gates (e2e=none)`**. Writable config preparation,
  strict content validation, TypeScript/production build, full units and
  attribution **passed**. Units: **192 files / 4,180 passed / 4 existing expected
  failures (4,184 total)**, **636.84 s**. Collision expected-failure cases remain
  untouched. The build emitted its existing chunk-size advisory. Python and
  repository-wide Prettier failed as detailed below. Aggregate log:
  `/tmp/3850-gates.log`; detailed logs:
  `.cache/runs/20261024-143231-18-pRpvto/`.

Python ran **167 tests in 10.446 s: 162 passed / 5 failed**. Four
`test_ci_build_manifest.TestCiBuildManifest` cases fail with `spawnSync git EPERM`:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden.TestGolden.test_golden_tooling` fails parsing a comparison child's
report with `Unexpected end of JSON input` at
`tools/tests/golden-manifest.test.mjs:151`. These signatures match the collected
3640/3740 reports. The EPERM cases establish a subprocess environment block;
the empty-report cause is not established here. Smallest proposed next step:
run unchanged checks on a runner permitting those subprocesses and retain the
golden child's status/stdout/stderr before proposing any tooling correction.
No tool changes, retries, bypasses or assertion changes were made.

Repository-wide Prettier reports only `plan/DIRECTOR.md`. This file matches the
pinned HEAD and has no working diff; this audit did not edit it. Reproduction:
the required gate's `npx prettier --check .` warns `plan/DIRECTOR.md` and exits
nonzero. Smallest proposed correction is owner-side formatting of that file
with the existing Prettier configuration. DIRECTOR is explicitly read-only in
this brief, so it remains unchanged; no whole-repository formatting was run.

Initial owned-note formatting, citation-target validation and `git diff --check`
passed. Rechecked all registered worktrees' working, untracked and unique
committed changes for both owned paths: only this checkout's note appears.
HEAD remained pinned and initial final status contained only this new note. Tests,
production, content, fixtures, snapshots, tools and other progress notes have
no changes in this checkout.

Actual local e2e mode: **none**. Focused tests use CPU logic, local content and
storage/DOM doubles. No browser launch, game rendering, WebGL context,
screenshots, image/pixel acceptance, hosted CI, GPU, unaided journeys, native
storage/device interaction or real-phone validation is claimed. No merge, push,
tag or hosted workflow dispatch.

## Follow-up: orchestrator formatting failure

The user supplied the orchestrator's outside-sandbox `tools/gates.sh` result:
**FAIL, `FAIL gates (e2e=smoke)`**, with Python, content, build, units, smoke e2e,
project-base e2e and attribution **PASS**. Its sole failing gate was Prettier,
reporting `plan/DIRECTOR.md`; log:
`.cache/runs/20261024-144407-1182380-h4J83a/prettier.log`. This establishes that
the earlier sandbox Python failures do not reproduce on that runner. No Python
tooling correction or assertion change is justified by this result.

The follow-up instruction to fix the root causes authorizes the necessary
formatting-only exception to the original DIRECTOR read-only constraint.
Rechecked HEAD, status and registered worktree ownership before editing.
Adjacent 3820 also has an independent DIRECTOR working diff; its worktree and
patch remain untouched and are not dependencies of this correction.

Root cause: gaps in the Markdown ordered-list markers after removed Backlog
items. `./node_modules/.bin/prettier --write plan/DIRECTOR.md` normalizes those
markers. Comparing HEAD and the result after masking only leading numbered-list
markers proves that all item IDs, item order and prose are identical. The
original Backlog 9 reference above identifies the audit's entry at the pinned
SHA; Prettier now numbers that same S-verify / S-bughunt entry 7.

Failing-before/passing-after formatting evidence:

- Orchestrator `npx prettier --check .`: **FAIL**, only DIRECTOR flagged.
- Local `./node_modules/.bin/prettier --check .` after formatting: **PASS,
  exit 0**, all matched files use Prettier style. Log:
  `/tmp/3850-prettier-followup.log`.

The follow-up also updates this note; no tests, production, fixtures, snapshots,
tools, dependencies, assertions or policies change. No unit/build/browser rerun
is needed for ordered-list formatting and documentation alone. The entire gates
command was not rerun after this correction; its supplied failure is retained
rather than relabeled as a completed passing run. Final owned-file formatting
and diff checks pass; HEAD remains the audited SHA. Actual local e2e mode remains
**none**; outside-sandbox smoke/project-base results belong to the orchestrator,
with no hosted-CI, GPU, screenshot acceptance, unaided-journey or real-phone
validation claimed here.
