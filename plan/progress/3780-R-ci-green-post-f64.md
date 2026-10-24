# 3780 — R-ci-green after f64

DIRECTOR Backlog **10, R-ci-green [Codex]**. Read-only audit on 2026-10-24;
bounded second API snapshot finished **15:05:24 UTC** (10:05:24 CDT).

**Remote main has completed the configured full hosted CI, but is red:**
`60cb8a91de837931b48be2d0cb8ab19252ad4936`,
[run 40093365361](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40093365361),
main push, attempt 1: **43 successful jobs, two failed, all 45 completed**.
No required CI job is queued, in progress, skipped, cancelled or awaiting a retry.

**Newest fully green main SHA after f64:**
`d2dba6e75319b4be556a2372834f3cef4be8d567`,
[run 40084573478](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40084573478),
main push, attempt 1: **45/45 successful jobs**. Last job completed
11:12:41 UTC; run updated 11:12:42. This green SHA predates **both** the Blake
backdrop and Challenger fade deltas. No fully green main run in this interval
covers those two changes together.

## Pins, intake and ownership

Local HEAD at entry and before writing:
`d09ed68a105262e72335dc905dbd24f6ed1bf2b4`; working checkout initially clean.
Read-only `gh api repos/wjjztd2rz8-coder/submarine-explorer/commits/main`
returned remote main `60cb8a91de837931b48be2d0cb8ab19252ad4936`;
`gh api repos/wjjztd2rz8-coder/submarine-explorer/git/ref/heads/main`
confirmed the same SHA in the second round. Local HEAD is ahead of remote main
through the Lost City work; the exact-local-SHA Actions query returns **zero
runs**. Its production/data/snapshot delta has no hosted evidence in this audit.
DIRECTOR still lists V-lostcity-foot-2 IN FLIGHT; no status change is made here.

Read DIRECTOR Backlog, simplicity rules and rubric; CONTRIBUTING-AGENTS;
[REVIEWS, 2026-10-24 midday](../REVIEWS.md) (the newest dated entry, below an
older targeted entry); and [OVERNIGHT-LOG](../OVERNIGHT-LOG.md) through run 114.
The review says latest hosted pushes were pending; the early review records
f64 green at `bb72bf1961efd8d85d8863836308c83b08f766bb`. That baseline's
[run 40045836005](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40045836005)
remains completed/success (updated 01:09:23 UTC).

Read the retained
[3380 result](/home/vijay/submarine-explorer/.cache/codex/3380-R-ci-green-watch-taggable-result.md),
[3380 progress](/home/vijay/subexp-wt/3380-R-ci-green-watch-taggable/plan/progress/3380-R-ci-green-watch-taggable.md)
and launched brief. Its October 23 green `2ea5cc7` is historical evidence;
its old failure inventory is not repeated here. Read 3320's brief/result/note
only to establish its separate full-e2e ownership: its wrapper says PASS while
its report records localhost EPERM, zero executed browser tests and other gate
failures. That wrapper cannot establish hosted success. Likewise the finished
3730–3750 wrappers advertise smoke PASS, but their reports record local e2e
**none** and gate exit 1; they do not own this hosted slice.

Inspected all registered worktree HEADs, statuses and diff paths/statistics,
including retained uncollected work. Rechecked the launched queue and result
files immediately before writing: only
[3780's launched brief](/home/vijay/submarine-explorer/.cache/codex/queue/launched/3780-R-ci-green-post-f64.md)
owns this post-f64 CI interval. Concurrent
[3760](/home/vijay/submarine-explorer/.cache/codex/queue/launched/3760-S-verify-blake-dome.md)
and
[3770](/home/vijay/submarine-explorer/.cache/codex/queue/launched/3770-S-verify-challenger-fade.md)
own CPU preset/material tests, not hosted CI. 3770's developing note is a clean
numeric fade audit, not a hosted verdict. No duplicate active/finished hosted
audit found. No patches collected or depended on; 2980/3050, all four collision
expected failures, 3310/3510, 3320, 3340, 3380, 3730–3750, V-lostcity-foot-2,
DONE/CUT work, parked Blue Hole art and owner-dependent Endurance remain untouched.

## Existing CI runs after f64

All times below are **2026-10-24 UTC**. The first page of 100 CI/main runs
reaches October 18 and contains f64, so the interval is complete without another
page. Each of these 13 SHAs is a strict descendant of f64, checked locally.
All attempts are 1. Created/started are API run timestamps, not the first job's
start; updated is the run's final update. All run statuses are completed:
**six success, four failure, three cancelled**. Cancelled does not mean green.

| Run                                                                                            | Full head SHA                              | Event / branch | Created / started   | Updated  | Status / conclusion       |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------- | ------------------- | -------- | ------------------------- |
| [40093365361](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40093365361) | `60cb8a91de837931b48be2d0cb8ab19252ad4936` | push / main    | 12:18:10 / 12:18:10 | 13:16:38 | completed / **failure**   |
| [40093337960](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40093337960) | `1dd447ef0f4461528e912dd19c8e13b2c463175f` | push / main    | 12:17:44 / 12:17:44 | 12:18:11 | completed / **cancelled** |
| [40091195847](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40091195847) | `cc3fc5803a0deefdb3ec581909952d4e2e16a91e` | push / main    | 11:45:46 / 11:45:46 | 12:45:08 | completed / **failure**   |
| [40090501991](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40090501991) | `5aec3f19bb301c03f456a386911fe33c3417d955` | push / main    | 11:35:18 / 11:35:18 | 12:11:35 | completed / **failure**   |
| [40084573478](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40084573478) | `d2dba6e75319b4be556a2372834f3cef4be8d567` | push / main    | 10:06:09 / 10:06:09 | 11:12:42 | completed / **success**   |
| [40084555746](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40084555746) | `1a38f66ef352eb53207b50ffafeadc2f53e7f72d` | push / main    | 10:05:53 / 10:05:53 | 10:39:24 | completed / **success**   |
| [40069169421](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40069169421) | `c4d1a97a29ff3a34cd59a3992ef0333ed4047716` | push / main    | 06:10:50 / 06:10:50 | 07:05:21 | completed / **success**   |
| [40069168586](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40069168586) | `8bcc63d24162d2684e6244032d75e22a162101a7` | push / main    | 06:10:49 / 06:10:49 | 06:10:51 | completed / **cancelled** |
| [40066474068](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40066474068) | `2ac721754547bc2a70adf0aa36f4edcd53f69aa1` | push / main    | 05:29:53 / 05:29:53 | 06:32:59 | completed / **failure**   |
| [40066472990](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40066472990) | `79c4e16a10a327718fa7bf1dab83fbdb1cbe2a3e` | push / main    | 05:29:52 / 05:29:52 | 06:02:09 | completed / **success**   |
| [40056059767](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40056059767) | `3311f715af9f844914ac25fb8d50037206611885` | push / main    | 02:53:38 / 02:53:38 | 03:40:27 | completed / **success**   |
| [40054824669](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40054824669) | `d07620c559d1a270c37e3a5e0ccea86a1e71321a` | push / main    | 02:35:45 / 02:35:45 | 02:53:39 | completed / **cancelled** |
| [40054810177](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40054810177) | `a59b933f9e4568d8e03c5faa13f60f729332845f` | push / main    | 02:35:32 / 02:35:32 | 03:06:58 | completed / **success**   |

These are `.github/workflows/ci.yml` **push / main** runs. The separate
`event=pull_request&created=>2026-10-24T00:36:49Z` CI query returned zero runs;
no PR result or merge ref is substituted for main. There are no queued or
in-progress CI runs in this interval at either snapshot. The exact remote-SHA
all-workflows query also shows scheduled diagnostics
[40095153894](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40095153894)
in progress and three completed/skipped Pages workflow_run entries
([40093367983](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40093367983),
[40095229292](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40095229292),
[40097441305](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40097441305)).
Those separate workflows establish neither full CI success nor release action.

## Required-job completeness

Read every latest-attempt job from `jobs?filter=latest&per_page=100` for every
completed, non-cancelled run in the table. Each has 45 jobs. Compared job names
against the unchanged pinned [CI workflow](../../.github/workflows/ci.yml):
**38 distinct e2e shards, three static shards, static aggregate, two builds and
project-base browser check**. No missing, unexpected or duplicate names in the
newest completed candidate or newest green candidate; every job completed.
The CI workflow is unchanged from f64 through remote main.

| Required jobs                        | Green d2dba6e / run 40084573478 | Remote main 60cb8a9 / run 40093365361 |
| ------------------------------------ | ------------------------------- | ------------------------------------- |
| static checks 1/3, 2/3, 3/3          | 3/3 success                     | 3/3 success                           |
| build and static checks aggregate    | success                         | success                               |
| build (root), build (project-base)   | 2/2 success                     | 2/2 success                           |
| project-base build and browser check | success                         | success                               |
| e2e 1–10/38                          | 10/10 success                   | 10/10 success                         |
| e2e 11/38                            | success                         | failure                               |
| e2e 12–20/38                         | 9/9 success                     | 9/9 success                           |
| e2e 21–30/38                         | 10/10 success                   | 10/10 success                         |
| e2e 31–37/38                         | 7/7 success                     | 7/7 success                           |
| e2e 38/38                            | success                         | failure                               |
| **Total**                            | **45 success**                  | **43 success, 2 failure**             |

The six successful run job lists each contain 45 completed/success jobs.
`5aec3f1` and `2ac7217` each have 44 success / one failure; `cc3fc58` and
`60cb8a9` each have 43 success / two failures. No non-cancelled job has a
`timed_out`, skipped or cancelled conclusion. The test deadlines below produce
job **failure**, not job `timed_out`. Successful jobs can contain configured
spec skips or expected failures: green means the configured hosted gates passed,
not every discovered test executed or every product behavior was accepted.

## Which deltas are covered

`git merge-base --is-ancestor <delta> <candidate>` gives:

| Delta                                               | Green d2dba6e | Remote main 60cb8a9 | Local HEAD d09ed68 |
| --------------------------------------------------- | ------------- | ------------------- | ------------------ |
| f64 bb72bf1                                         | yes (exit 0)  | yes (exit 0)        | yes (exit 0)       |
| Blake 0ad2bc901ec77b95025d16012ef5e51bebc5792b      | no (exit 1)   | yes (exit 0)        | yes (exit 0)       |
| Challenger 63d9d3ae4f33a6eba67aa0950142fb882659ee66 | no (exit 1)   | yes (exit 0)        | yes (exit 0)       |

The completed red remote-main attempt exercised the tree containing both changes;
it does not certify that combined tree as green. `5aec3f1` and `cc3fc58` already
contain Blake but precede Challenger's fade. Thus the reef assertion failure
observed on all three cannot be attributed to the later Challenger fade.

## All six failed jobs in the new interval

Each failed job reaches **End-to-end tests (Playwright)**. Dependency install,
build/download and Chromium install succeeded for those jobs. All logs below
were read directly using the job-log API; no local reproduction was attempted.

| Run / SHA             | Failed job                                                                                                                  | Capability and short error excerpt                                                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 40093365361 / 60cb8a9 | [120876021307, e2e 11/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40093365361/job/120876021307) | `presets.spec.ts:81`, reef enters and compiles its preset shader; `:114`: **Expected: 1; Received: 2** (`state.stats.draws`). 19 passed, 2 skipped, 1 failed.                                                    |
| 40091195847 / cc3fc58 | [120869194346, e2e 11/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40091195847/job/120869194346) | Same reef draw assertion and **1 vs 2**. 19 passed, 2 skipped, 1 failed.                                                                                                                                         |
| 40090501991 / 5aec3f1 | [120862092703, e2e 11/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40090501991/job/120862092703) | Same reef draw assertion and **1 vs 2**. 19 passed, 2 skipped, 1 failed.                                                                                                                                         |
| 40093365361 / 60cb8a9 | [120876021281, e2e 38/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40093365361/job/120876021281) | `d-shell.spec.ts:96`, home, site grid, pause, objectives, resume and quit; **Test timeout of 240000ms exceeded**, `locator.dispatchEvent` at `:245`, waiting for pause-menu `Quit to home`. 20 passed, 1 failed. |
| 40091195847 / cc3fc58 | [120869194357, e2e 38/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40091195847/job/120869194357) | Same shell capability, **240000ms**; `:246` waiting for `.home-screen` visibility after Quit; `Runtime.callFunctionOn … session closed`. 20 passed, 1 failed.                                                    |
| 40066474068 / 2ac7217 | [120797043199, e2e 38/38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40066474068/job/120797043199) | Same shell capability, **240000ms**; `page.evaluate` in `helpers/frames.ts:5`, called at `d-shell.spec.ts:252` during the final Home input-isolation frame wait. 20 passed, 1 failed.                            |

**Reef classification: stale numerical expectation exposed by corrected draw
accounting, rather than demonstrated new rendering work at Blue Hole.**
The unchanged table case uses
`/?tile=great-blue-hole&preset=reef&depth=20&tier=medium`, expecting one draw.
[0ad2bc9's shared ReefPreset diff](https://github.com/wjjztd2rz8-coder/submarine-explorer/commit/0ad2bc901ec77b95025d16012ef5e51bebc5792b)
changes the shaft accounting from `stats.draws = 1` to `stats.draws += 1`.
`buildHalocline` already creates one haze mesh and increments the count before
shaft construction. Blue Hole's mission params provide the halocline depth and
coordinates; its site manifest has no horizon. Two reported draws therefore
account for its existing **halocline + shafts**, not Blake's optional dome.
The green run's matching
[job 120851288137](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40084573478/job/120851288137)
passed that unchanged test (12.1 s); all three later logs show the same mismatch.
This is a reproducible hosted assertion failure with a source-supported stale
expectation explanation; no visual or GPU regression is established.

**Smallest proposed correction for director assignment:** update only the
existing reef table entry's exact expected draw count to **2**, with a comment
identifying halocline plus shafts. Preserve exact equality and shader-error
guards; do not add a tolerance, skip, site branch or revert truthful accounting.
No correction is applied in this report-only package. A future authorized
correction must be checked by subsequent normal hosted CI.

**Shell classification: observed timeout; underlying cause unknown.**
The shell spec and frame helper are unchanged from green `d2dba6e` through
remote main. The earlier failing `2ac7217` and immediately preceding successful
`79c4e16` differ only in the run-106 log; the later green
[job 120851288316](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40084573478/job/120851288316)
passes the same shell journey in **3.3 minutes**, near its four-minute budget.
Failures occur at different late journey operations, and one already predates
both new visual deltas. This supports a timing-sensitive hosted execution
hypothesis, not proof of infrastructure failure. A genuine slow transition or
product defect remains possible. Session closure after timeout is not evidence
of an independent browser crash. No stale selector, install outage or precise
bottleneck is established; no source fix is justified from these logs alone.

## Director recommendation

Keep **R-ci-green open**. Replace the pending-only review description with
completed/red evidence on exact remote SHA `60cb8a9`, and record `d2dba6e` as
the newest verified green baseline, explicitly excluding both later numerical
deltas. Assign the narrow reef expectation correction in its existing
capability spec. Treat the shell timeout as a separate unresolved diagnosis:
inspect existing timing/transition evidence before choosing a correction;
preserve the current assertions, retries and deadlines. At the next review,
inspect existing normal main CI for the exact collected SHA and require all
45 jobs before declaring these deltas green. No workflow dispatch/rerun, local
full-e2e rebrief, release or tagging action is part of this recommendation.
Concurrent 3760/3770 CPU findings do not replace the missing green hosted result.

## Method, validation and limits

Used installed authenticated `gh` 2.45.0, with no tool installation or credential
changes. API access succeeded; no network/auth command failed. Two bounded CI
list snapshots and the final remote-main/job recheck agreed; no indefinite poll.
The main read commands were:

```bash
git rev-parse HEAD
git worktree list --porcelain
gh api repos/wjjztd2rz8-coder/submarine-explorer/commits/main
gh api repos/wjjztd2rz8-coder/submarine-explorer/git/ref/heads/main
gh api 'repos/wjjztd2rz8-coder/submarine-explorer/actions/workflows/ci.yml/runs?branch=main&per_page=100'
gh api 'repos/wjjztd2rz8-coder/submarine-explorer/actions/runs/<run-id>/jobs?filter=latest&per_page=100'
gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<job-id>/logs
gh api 'repos/wjjztd2rz8-coder/submarine-explorer/actions/workflows/ci.yml/runs?event=pull_request&created=%3E2026-10-24T00%3A36%3A49Z&per_page=100'
gh api 'repos/wjjztd2rz8-coder/submarine-explorer/actions/runs?head_sha=60cb8a91de837931b48be2d0cb8ab19252ad4936&per_page=100'
gh api 'repos/wjjztd2rz8-coder/submarine-explorer/actions/runs?head_sha=d09ed68a105262e72335dc905dbd24f6ed1bf2b4&per_page=100'
git merge-base --is-ancestor <delta> <candidate>
git diff bb72bf1..60cb8a9 -- .github/workflows/ci.yml
git diff d2dba6e..60cb8a9 -- tests/e2e/presets.spec.ts tests/e2e/d-shell.spec.ts tests/e2e/helpers/frames.ts
```

Job-name completeness and summary checks passed against both candidates;
run-list/job outcomes were unchanged in round two. Expected ancestry exit 1
means not an ancestor, not an API failure. Temporary API JSON and plain-text
logs live only in `/tmp/3780-*`; durable run/job citations and excerpts are above.

Owned-note validation:

```bash
node_modules/.bin/prettier --write plan/progress/3780-R-ci-green-post-f64.md
node_modules/.bin/prettier --check plan/progress/3780-R-ci-green-post-f64.md
git diff --check -- plan/progress/3780-R-ci-green-post-f64.md
git diff --no-index --check /dev/null plan/progress/3780-R-ci-green-post-f64.md
git status --short
```

Prettier write/check and the owned-path `git diff --check` exit **0**. The
explicit no-index check includes this new, untracked note: it exits **1** with
no whitespace diagnostics (the added-file diff), so it is not reported as an
exit-0 check. Ownership check shows only this note. No full local gates or test
rerun is required or performed. **Actual local e2e mode: none.**
Historical wrapper PASS banners are not validation for this package.

Simplicity: one evidence note, no runtime/test machinery, UI, settings, branches,
policies, dependencies or historical assertion changes. Correct/simple/honest
reporting retains the configured guards and distinguishes observation from
hypothesis; rewarding exploration and the protected core remain unchanged.
Readability, beauty, touch layout and real-phone performance stay with
Claude/owner. No game rendering, browser/WebGL launch, screenshot or artifact
image inspection, visual/GPU acceptance, unaided-journey or physical-phone
validation. No merges, pushes, tags, workflow changes, dispatches or reruns.
