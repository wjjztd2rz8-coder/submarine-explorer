# 3980 — R-ci-green: current-main hosted evidence interval

DIRECTOR Backlog **8, R-ci-green [Codex]**. Report only, 2026-10-25.
Pinned HEAD: `ddcaaac5c141473ba4823e85a675384f2e27d887`, initially clean.
**Keep R-ci-green open: hosted evidence remains inaccessible.**

This interval adds a fresh API-access failure observation and exact local
collection/ancestry evidence beyond [3880](3880-R-ci-green-after-reef-fix.md).
It adds **no hosted CI execution evidence**. Current remote main, a completed
full run containing both corrections, their case outcomes/timings, and the
newest fully green main SHA in this interval remain unknown. An inaccessible
run list is not an empty list or evidence that no qualifying run exists.

## Intake and ownership

Read [DIRECTOR](../DIRECTOR.md), including Backlog, seven simplicity rules and
rubric; [CONTRIBUTING-AGENTS](../../CONTRIBUTING-AGENTS.md); the newest dated
[review](../REVIEWS.md), **2026-10-24 night** (below the older leading Oct 23
entry); and [OVERNIGHT-LOG](../OVERNIGHT-LOG.md) through **run 133**.
The afternoon review still leaves hosted reef/shell verification pending;
run 122 reports local d-shell 5/5 after collection, and subsequent logs report
smoke/project-base passes. Run 133's clean/in-sync statement is historical
local-ref evidence. None establishes current full hosted CI status.

Read the launched briefs, finished results and progress notes for
[3780](3780-R-ci-green-post-f64.md), [3880](3880-R-ci-green-after-reef-fix.md),
[3820](3820-R-shell-journey-timing.md) and
[3860's shell audit](3860-S-verify-shell-coverage.md).
Results/briefs reside under
[/home/vijay/submarine-explorer/.cache/codex/](/home/vijay/submarine-explorer/.cache/codex).
The 3880 observation boundary is **2026-10-24 20:19:25 UTC**, at local
`38afe4991d121c6b6c295b6a47d27fd6c45eeffb`, with API requests failing.
Its finished wrapper's smoke/project-base PASS does not extend that boundary
with hosted evidence. The older run inventory is not repeated or queried.

Rechecked queued/held/launched brief files, the finished-result inventory,
newer results/progress for hosted-CI overlap, and every registered worktree's
HEAD, status and staged/unstaged tracked diff summaries/path sets. Queue and
hold have no pending Markdown briefs; launched evidence includes this 3980
slice and disjoint 3960/3970 correctness hunts. No other later hosted report
was found. This task's existing `3980-…-last.md` is zero bytes, with no finished
result or existing progress note at intake or the pre-edit recheck.

Finished **3930, 3940 and 3950 await collection**: respectively the untracked
`3910-S-verify-coral-costs.md` report; changes to `EffectiveSettings.ts` and
`S-resolve.md` plus untracked `effectiveSettings.test.ts`; and the untracked
settings-apply report. Their registered HEADs equal this baseline, but their
pending deltas are not ancestors of main. Read their results, brief scope and
progress introductions only for ownership; their wrapper passes supply no
hosted evidence. No uncollected patch is used or collected.

Primary main and this checkout were clean at the pre-edit recheck and both
still named the pinned SHA. Held 2980/3050 collision changes, four expected
failures, 3310/3510 journeys, 3320 full e2e, 3340 touch and 3380's historical
interval remain with their owners. No other worktree is changed. S-resolve is
not a current standalone Backlog item; no migration is taken on here.

## Collected commit identities

`git show` resolves the actual changes; `git merge-base --is-ancestor <sha> HEAD`
exits **0** separately for both correction commits below.

| Change                                                                         | Exact collected commit                                                                                                              | Commit time (UTC)              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Reef draw-count correction                                                     | `82ea5a66733b621b742993670ee449d89226301c`                                                                                          | 2026-10-24 16:17:15            |
| 3820 shell journey; collection also includes 3840/3850 and DIRECTOR numbering  | `50bc6ef90efc2be53d9a03d1b4639dbb011bbb2a`                                                                                          | 2026-10-24 20:36:12            |
| 3860 (both audits), 3870 scatter audit, 3880 CI report; scatter contract guard | `96319311224de4932f0449e0cc8df9e516a3370b`                                                                                          | 2026-10-24 21:25:52            |
| Coral lift (e), source / merge                                                 | `050c96cfe821516867e9871d9cf13ac97fef2920` / `bba49c0bf90e0fd76a0347b2242b6a80cf6f4a7b`                                             | 2026-10-24 21:33:51 / 21:50:53 |
| Coral lift (f), source / merge                                                 | `d20995d90f71ead6b6ef8d9da4e19833e46ef893` / `f80a0ba28b5a88d89012783063d7bec1e9cd959e`                                             | 2026-10-24 22:25:18 / 22:25:29 |
| Later 3870/3880/3890 bug-hunts and hazard boundary guards                      | `3bba4fd2e2bcc39950c4e6a3f0f67604a0204361`                                                                                          | 2026-10-25 01:26:11            |
| Partial 3900 materials / 3920 lifetime; collection merge                       | `8c63ce0db1192306a04ac58c89a3906043d280d5` / `5da4790dd3ccbb6725c502fe3557dcbb7d52b369`; `79e35347e483544be285698ec7fd06bcb56dd28e` | 2026-10-25 01:46:48            |
| Latest local main, run 133 log                                                 | `ddcaaac5c141473ba4823e85a675384f2e27d887`                                                                                          | 2026-10-25 05:45:31            |

The remaining first-parent updates from 3880's pinned HEAD through this HEAD
are review/log commits, resolved exactly with
`git log --first-parent --reverse --format='%H %cI %s' 38afe499..HEAD`:

```text
c1162a11eddb74862a9416a70d6985eb0c4bccf8  run 123
512c4ba79d78c68bc1718168432af42b8135c7a5  mark (e) done / run 124
e35ca9d87b83af1be24a6fec03a967c60e85aa6f  mark (f) done / run 125
cf8c3f0b06674510d98fde891d500be7b32ec2a0  run 126
f587b1650e345451211a2751b146f126fe2e26c0  run 127
59aec47e219307cd8221a65e301dd5bdf2470297  run 128
ee7dd11cf56a2f0bc7997a19da49ebb3b40d9fb5  run 129
8848beb599b70ab66005f672eab40656fcc1fdb2  targeted review / queue 3930–3950
378fe29198de03556f9ebb748e0b448ff3f0a238  run 130
6626e84abe25c6aa609f27152097d07ee35385ac  run 131
51f11feb6f3bba7fd272d7f26c2413f6a4216e24  run 132
```

`git diff 50bc6ef9 HEAD -- tests/e2e/d-shell.spec.ts tests/e2e/presets.spec.ts .github/workflows/ci.yml`
exits **0**, empty. These two specs and the workflow are unchanged since the
shell collection. Local `origin/main` also names the pinned SHA, but its last
reflog entry is **2026-10-25 05:45:32 UTC, update by push**. It is a cached
ref, not a current remote observation. No fetch or branch update was made.

## Bounded API requests and outcomes

Used existing `/usr/bin/gh` and its existing authentication configuration.
Exactly two read-only requests were attempted, each capped by `timeout 25s`:

```bash
timeout 25s gh api repos/wjjztd2rz8-coder/submarine-explorer/branches/main --jq '{sha: .commit.sha, url: .commit.html_url, protected: .protected}'
timeout 25s gh api 'repos/wjjztd2rz8-coder/submarine-explorer/actions/workflows/ci.yml/runs?branch=main&event=push&created=%3E2026-10-24T20%3A19%3A25Z&per_page=100'
```

Both started and ended at **2026-10-25 07:05:16 UTC** (02:05:16 CDT).
Each command exited **1**, stdout empty, stderr exactly:

```text
error connecting to api.github.com
check your internet connection or https://githubstatus.com
```

Neither reached its external time limit. The instrumentation shell ended
with a successful timestamp command (outer exit **0**); it explicitly captured
`command_exit=1` for each failed request. That outer result is not API success.
This establishes an environment connection/access limit, not invalid
credentials or a proven GitHub outage. No authentication changes, alternative
access route, installation, retry, polling, dispatch or rerun followed.

No JSON response, remote SHA, candidate run, run/job URL, run head SHA,
creation/start/completion timestamp, status, conclusion, retained job log or
test-report artifact was retrieved. Candidate ancestry and job completeness
therefore cannot be checked. No new product/test failure is observed or
attributed; this is not evidence that none exists.

## Full-CI acceptance and capability limits

Read the current [CI workflow](../../.github/workflows/ci.yml) and expanded its
actual matrix entries in a read-only script, rather than assuming the old
total. The resulting required job names are:

```text
build and static checks
static checks (1/3), static checks (2/3), static checks (3/3)
build (root), build (project-base)
e2e (1/38), e2e (2/38), e2e (3/38), e2e (4/38), e2e (5/38)
e2e (6/38), e2e (7/38), e2e (8/38), e2e (9/38), e2e (10/38)
e2e (11/38), e2e (12/38), e2e (13/38), e2e (14/38), e2e (15/38)
e2e (16/38), e2e (17/38), e2e (18/38), e2e (19/38), e2e (20/38)
e2e (21/38), e2e (22/38), e2e (23/38), e2e (24/38), e2e (25/38)
e2e (26/38), e2e (27/38), e2e (28/38), e2e (29/38), e2e (30/38)
e2e (31/38), e2e (32/38), e2e (33/38), e2e (34/38), e2e (35/38)
e2e (36/38), e2e (37/38), e2e (38/38)
project-base build and browser check
```

Derived total: **45 jobs**. Only an existing **CI / push / main** run with a
proven qualifying head and every required job completed successfully can
establish full CI green. Pages deployment and pull-request workflows do not
qualify. Queued, pending, in-progress, cancelled or skipped jobs are not
successful completion. The review/log's historical pending labels are not
asserted as the current API state.

| Question                                                   | Supported finding                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does a completed full hosted run contain both corrections? | **Unknown.** Both are local ancestors; no hosted candidate SHA was obtained.                                                                                                                                                                                                                                                                                                                                                     |
| Reef case outcome/timing after the correction?             | **Unverified.** [presets.spec.ts](../../tests/e2e/presets.spec.ts) retains the Great Blue Hole reef URL, medium tier, exact `draws: 2` (halocline haze + shafts), preset/source checks and empty shader/page-error list. No actual post-correction case result or duration is accessible.                                                                                                                                        |
| Shell journey outcome/timing after 3820 collection?        | **Unverified.** [d-shell.spec.ts:92](../../tests/e2e/d-shell.spec.ts#L92) retains the Home/site-grid/Pause/Objectives/Resume/Quit journey, exact paused pose and the 400 ms freeze window; the CI test budget remains 240 s. 3820 reports zero local browser tests due to preview access failure; run 122's local 5/5 report has no hosted duration. 3860 finds existing capability coverage adequate, without hosted execution. |
| Current remote main's full-CI status?                      | **Unknown**, including its live SHA. Cached refs and local smoke/base passes cannot answer it.                                                                                                                                                                                                                                                                                                                                   |
| Newest fully green main SHA supported by this interval?    | **None established.** The historical baseline cited by 3780/3880 is not revalidated or promoted by this report.                                                                                                                                                                                                                                                                                                                  |
| New failing capability, job/error evidence and cause?      | **None available because access failed.** No reef persistence, shell timeout resolution, infrastructure defect or new regression can be inferred.                                                                                                                                                                                                                                                                                |

## Director next action

Keep **R-ci-green open**, with the later interval explicitly **unverified due
to API connection failure**. At the next review with working existing access,
read live main and existing CI push/main runs covering the observation
interval, including any earlier-created run that completed after the boundary.
For each candidate, prove both correction commits are ancestors of its exact
head; inspect every required job/shard, then read retained reef and shell
case outcomes/timings. Record run/job URLs, exact heads, timestamps and actual
conclusions. Check live main separately from the newest completed green head.
Propose a repair only from observed job/log evidence; no source, test,
workflow, timeout or tooling correction is justified by this access failure.
No release recommendation is made; **R-release remains in its Haiku lane**.

## Validation, simplicity and limits

Only this note is written/formatted. Commands:

```bash
node_modules/.bin/prettier --write plan/progress/3980-R-ci-green-current-main.md
node_modules/.bin/prettier --check plan/progress/3980-R-ci-green-current-main.md
git diff --check
git diff --no-index --check /dev/null plan/progress/3980-R-ci-green-current-main.md
git status --short
git rev-parse HEAD
```

Owned-note Prettier write/check: **exit 0**, all matched files formatted.
`git diff --check`: **exit 0**, no diagnostics. The explicit no-index check
includes the untracked added note: **exit 1**, no whitespace diagnostics
(added-file difference), not an exit-0 result. Final status: only
`?? plan/progress/3980-R-ci-green-current-main.md`; HEAD remains pinned above.
No local test, build or full-gate run is required or performed. **Actual local
e2e mode: none.** Historical wrapper and orchestrator results are attributed
above; they are not this package's execution evidence.

One evidence note adds no runtime machinery or redundant tests. Correct,
simple, rewarding and honest behavior is served by preserving capability
guards, reporting uncertainty and keeping ownership separate. No UI,
guidance, settings, site branches, runtime config mutation, save schema,
dependencies, authored data, assertions, tolerances, budgets, retries or skips
change. GMRT terrain, all 13 site identities, five hero set pieces, scanning,
Journal, marine life, keyboard/pad/touch input, accessibility and default
Arcade remain protected. No browser launch, rendering, WebGL, screenshots,
pixel acceptance, GPU, unaided-journey or real-phone validation. Beauty,
visual readability, touch layout and phone performance remain with
Claude/owner. No merge, push, tag, fetch or workflow mutation.
