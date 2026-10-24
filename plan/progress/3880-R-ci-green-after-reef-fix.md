# 3880 — R-ci-green after the reef correction

DIRECTOR Backlog **R-ci-green [Codex]** (ordinal 10 in this pinned checkout).
Read-only report, 2026-10-24; final bounded API attempts at **20:19:25 UTC**
(15:19:25 CDT). **Access blocked: no new hosted CI verdict is available.**
Keep R-ci-green open. This report completes the access-limited audit, not the
Backlog item's hosted-green requirement.

Local audited HEAD, unchanged at intake and pre-edit recheck:
`38afe4991d121c6b6c295b6a47d27fd6c45eeffb`. Current remote main **could not be
obtained through the API**. Local `origin/main` also points to `38afe499`, but
its reflog records `2026-10-24T13:45:33-05:00: update by push`; that cached ref
is not a live remote observation.

## Intake and ownership

Read [DIRECTOR](../DIRECTOR.md), including Backlog, all seven simplicity rules
and the rubric; CONTRIBUTING-AGENTS; the newest dated
[REVIEWS entry, 2026-10-24 afternoon](../REVIEWS.md); and
[OVERNIGHT-LOG](../OVERNIGHT-LOG.md) through run 121. The afternoon review
leaves hosted CI for the run-117 reef correction pending. Run 121 says
"Latest Pages deploy green"; it supplies no full-CI run/job evidence.

Read [3780's progress](3780-R-ci-green-post-f64.md), its
[finished result](/home/vijay/submarine-explorer/.cache/codex/3780-R-ci-green-post-f64-result.md)
and
[launched brief](/home/vijay/submarine-explorer/.cache/codex/queue/launched/3780-R-ci-green-post-f64.md).
Its bounded audit ended at 15:05:24 UTC, remote
`60cb8a91de837931b48be2d0cb8ab19252ad4936`, before the correction. Its old
failure inventory is not repeated here.

Read [3820's finished result](/home/vijay/submarine-explorer/.cache/codex/3820-bughunt-shell-journey-timing-result.md),
[worktree note](/home/vijay/subexp-wt/3820-bughunt-shell-journey-timing/plan/progress/3820-R-shell-journey-timing.md),
[brief](/home/vijay/submarine-explorer/.cache/codex/queue/launched/3820-bughunt-shell-journey-timing.md)
and shell-spec diff. Its wrapper reports smoke/project-base gates PASS; its
note explicitly leaves dedicated journey timing and hosted execution
unverified. The sandbox's journey attempt executed zero browser tests because
preview could not bind its port. None of those outcomes establishes a hosted
full-suite pass or an improvement to the 240 s journey deadline.

Checked registered worktree HEADs, statuses, tracked/staged diff paths and
statistics, including all finished packages awaiting collection. 3820 has
uncommitted shell-spec and DIRECTOR formatting changes at the same `38afe499`
HEAD; 3840 has lifeSim guards and 3850 has its scan-reward note. The primary
worktree also contains uncommitted copies of those package files; their
presence is not a committed run SHA or hosted evidence. This checkout was
clean. No patch was collected, changed or used as a dependency.

Rechecked launched briefs through 3880, available finished results and
relevant progress notes: 3820 owns shell maintenance, 3840 rooted-life
verification, 3850 scan rewards, and 3860/3870 scatter numerics/cost. No other
package found owns or verifies hosted CI at/after the reef correction.
[3880's launched brief](/home/vijay/submarine-explorer/.cache/codex/queue/launched/3880-R-ci-green-after-reef-fix.md)
owns this later report; its existing `-last.md` file was empty, not prior
verification. Historical 3380 and separate 3320 full-e2e ownership remain
unchanged. All other held work, including 2980/3050, the four collision
expected failures, 3310/3510, 3340, parked Blue Hole and owner-dependent
Endurance, remains untouched.

## Exact correction and scope boundary

`git show --format=fuller 82ea5a66 -- tests/e2e/presets.spec.ts` identifies
[`82ea5a66733b621b742993670ee449d89226301c`](https://github.com/wjjztd2rz8-coder/submarine-explorer/commit/82ea5a66733b621b742993670ee449d89226301c),
committed **16:17:15 UTC**. Its entire file delta replaces reef `draws: 1`
with `draws: 2` and the comment `halocline haze + light shafts` in the existing
Great Blue Hole preset table case. Exact equality and shader-error guards
remain. No shell repair is part of that commit.

`git merge-base --is-ancestor 82ea5a66733b621b742993670ee449d89226301c HEAD`
exits **0**. `git diff HEAD -- tests/e2e/presets.spec.ts tests/e2e/d-shell.spec.ts`
exits **0**, empty: this checkout contains the committed reef correction and
the pre-3820 shell journey. No observed hosted SHA is available against which
to prove inclusion of 3820's patch; no outcome is attributed to it.

Only existing **CI / push / main** runs whose heads contain the correction
and fall outside 3780's audited interval qualify. The time-filtered list
below is a discovery filter; ancestry would still require checking each head.
No older runs were queried or re-inventoried.

## API access and exact outcomes

Used existing `/usr/bin/gh`; no installation, authentication change or
alternative credential setup. Initial branch and CI-list requests failed;
one bounded repeat of each at 20:19:25 UTC returned the same errors.
The final commands were captured separately with their actual exit codes:

```bash
gh api repos/wjjztd2rz8-coder/submarine-explorer/branches/main --jq '{sha: .commit.sha, url: .commit.html_url, protected: .protected}'
gh api 'repos/wjjztd2rz8-coder/submarine-explorer/actions/workflows/ci.yml/runs?branch=main&event=push&created=%3E%3D2026-10-24T16%3A17%3A15Z&per_page=100'
```

**Each exits 1**, stdout empty, stderr exactly:

```text
error connecting to api.github.com
check your internet connection or https://githubstatus.com
```

This demonstrates a connection/access failure in this environment; it does
not establish invalid credentials or an outage at GitHub. No response JSON,
run/job URL, head SHA, event, timestamps, status, conclusion or failure log
was retrieved for the qualifying interval. **This is not an empty-run-list
result.** Whether qualifying runs exist is unknown. No further polling,
workflow dispatch or rerun was attempted.

## Findings and limits

| Question                                                | Supported answer                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Reef case passes on a completed run containing its fix? | **Unverified.** Source correction is present locally; hosted execution evidence is unavailable.                                           |
| Shell journey still fails or times out after that fix?  | **Unknown.** Neither persistence nor resolution is established by this audit. 3820 has no hosted timing evidence here.                    |
| Current remote main has full green CI?                  | **Unknown.** Neither the live main SHA nor its run/jobs could be read. Cached `origin/main` is insufficient.                              |
| Newest fully green main SHA in the new interval?        | **Not established.** No new green SHA can be named.                                                                                       |
| New hosted failures and causes?                         | **None observed due to access failure.** This is no evidence of absence; no failing capability, error excerpt or job URL can be supplied. |

The inherited newest fully green baseline remains
`d2dba6e75319b4be556a2372834f3cef4be8d567`,
[run 40084573478](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40084573478),
**according to 3780's historical 45/45-job audit**. It predates the reef
correction and is not revalidated or promoted to newest green by new evidence.

The pinned [CI workflow](../../.github/workflows/ci.yml) defines 45 jobs:
38 e2e shards, three static shards, their aggregate, two build variants and
the project-base browser check. No qualifying candidate's jobs were accessible,
so none is called fully green. A successful Pages deployment, a PR run or a
smoke/project-base wrapper PASS cannot fill that gap. Cancelled, skipped,
queued and in-progress checks do not establish completed CI success; the
review's older "pending" description is not asserted as today's API status.

## Director recommendation

Keep **R-ci-green open** and record the post-reef hosted verdict as
**unverified because API access failed**, rather than green or red. At the
next review with working existing access, read current remote main and
already-existing main CI runs, verify correction ancestry, and inspect every
required job/shard before declaring a SHA fully green. Read the actual reef
case and shell-journey results/timings. Attribute the shell repair only to a
run head proven to contain its collected commit; leave collection to 3820's
owner. Do not duplicate that repair or use its wrapper to close the blocker.

Remaining blockers are access to hosted evidence, a completed qualifying run
with every required job successful, and direct reef/shell outcome evidence.
No new product defect is demonstrated, so no additional source correction is
justified. Retain the existing exact reef assertion and timing budget. No
release, tag, merge, push, dispatch or rerun action is recommended by this
report; the release lane retains its existing owner.

## Validation and simplicity

The initial report wrote/formatted only this note. Validation commands:

```bash
node_modules/.bin/prettier --write plan/progress/3880-R-ci-green-after-reef-fix.md
node_modules/.bin/prettier --check plan/progress/3880-R-ci-green-after-reef-fix.md
git diff --check
git diff --no-index --check /dev/null plan/progress/3880-R-ci-green-after-reef-fix.md
git status --short
git rev-parse HEAD
```

Prettier write and check exit **0**; check reports all matched files use
Prettier code style. `git diff --check` exits **0**, no diagnostics. Because
the note is untracked, the additional no-index check explicitly includes it:
exit **1**, no whitespace diagnostics (the added-file difference), not an
exit-0 check. Status exits **0**, showing only
`?? plan/progress/3880-R-ci-green-after-reef-fix.md`; final HEAD check exits
**0**, still `38afe4991d121c6b6c295b6a47d27fd6c45eeffb`.

No tests or full gates are required or run for this report. **Actual local e2e mode:
none.** No browser launch, game rendering, WebGL context, screenshots, pixel
acceptance, visual/GPU, unaided-journey or physical-phone validation.

Simplicity: one evidence note; no runtime machinery, abstractions, UI,
settings, site branches, save schema, dependencies, assertions, skips,
retries, tolerances or budgets change. Supported/simple/honest behavior is
served by preserving uncertainty and ownership. Rewarding exploration and
the protected core (real GMRT terrain, 13 sites, five heroes, scanning,
Journal, marine life, keyboard/pad/touch input, accessibility and default
Arcade) remain unchanged. Visual readability, beauty, touch layout and
physical-phone performance remain with Claude/owner.

## Orchestrator follow-up: formatting repair

The user supplied an outside-sandbox `tools/gates.sh` result: Python,
content, build, unit, smoke e2e, project-base e2e and attribution **PASS**;
Prettier **FAIL**, flagging only `plan/DIRECTOR.md`; aggregate
**FAIL gates (e2e=smoke)**. Read the retained log in this checkout at
`.cache/runs/20261024-152057-1221272-wcYRDh/prettier.log`. An initial lookup
under the primary worktree's cache failed with `No such file or directory`;
the supplied relative path resolves here.

Reproduced the formatting failure with
`node_modules/.bin/prettier --check plan/DIRECTOR.md` (**exit 1**).
The root cause is a gap in Backlog ordered-list source numbering:
`1, 2, 3, 6, ... 13`. Prettier requires `1, 2, ... 11`.
The user's follow-up authorizes repairing the reported root cause, expanding
the original report-only scope to this formatting-only DIRECTOR change.

Applied `node_modules/.bin/prettier --write plan/DIRECTOR.md` (**exit 0**).
Compared the result against `HEAD:plan/DIRECTOR.md` after normalizing only
ordered-list numeric prefixes: **PASS, exit 0**. Item IDs, priority order and
all prose remain unchanged; R-ci-green now has source ordinal 8. No product,
test assertion, timeout, formatter rule or other package patch changed.

Follow-up verification:

- `node_modules/.bin/prettier --check .`: **exit 0**, all matched files pass.
- Owned-note Prettier write/check: **exit 0**.
- `git diff --check`: **exit 0**, no whitespace diagnostics.
- Added-note `git diff --no-index --check /dev/null plan/progress/3880-R-ci-green-after-reef-fix.md`:
  **exit 1**, no whitespace diagnostics, the added-file difference as above.
- Final status shows only `plan/DIRECTOR.md` and this note; HEAD remains
  `38afe4991d121c6b6c295b6a47d27fd6c45eeffb`.

The reported formatting blocker is repaired. Full gates were not rerun
inside this sandbox; the passing execution stages above are attributed to
the orchestrator. **Actual local e2e mode remains none.** Smoke/project-base
success does not establish hosted full-suite or shell timing evidence, so
the R-ci-green recommendation and API access limits remain unchanged.
