# 4140 — R-ci-green after the collected rating and CI audits

DIRECTOR Backlog **8, R-ci-green [Codex]**, 2026-10-25.
Pinned HEAD: **`b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8`** on
`codex/4140-R-ci-green-after-4090-4110`; initial worktree clean.
Read `CONTRIBUTING-AGENTS.md`, all of `plan/DIRECTOR.md` (including Backlog 7,
simplicity rules and rubric), and the last 160 lines of `plan/OVERNIGHT-LOG.md`
before investigation. Report only; this note is the sole change.

## Findings and R-release eligibility

**Newest pushed main and its hosted CI remain unverified.** At the
**2026-10-25 16:45 UTC** audit, every read-only `gh` request failed to connect
to `api.github.com`. DNS checks at **16:45:49 UTC** failed for both GitHub
hostnames. Thus there is no current run ID, observed job list, conclusion or
failing-spec evidence to report. An unavailable API is neither a green run
nor a failed run. Cached `origin/main` equals pinned HEAD but cannot establish
the newest pushed remote SHA.

**`164da7fe6e82e4abfcee270c123106f36bda2707` is the last evidenced
R-release-taggable main SHA**, based on the collected
[4050 hosted audit](4050-R-ci-green-after-4000.md). This is historical evidence,
not a successful live revalidation today. Its recorded completed green run is
[CI 40186087006](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40186087006),
completed **2026-10-25 11:17:35 UTC**. Do not promote `b7f3ca59` or a newer
SHA on this audit's evidence: R-release requires completed green CI for that
exact main SHA. No tag was created.

## Recorded baseline, distinct from current verification

4050 records these successful jobs on `164da7fe`:

| Job group                            | Recorded result   |
| ------------------------------------ | ----------------- |
| e2e shards                           | 38/38 success     |
| Static-check shards                  | 3/3 success       |
| Build and static checks aggregate    | 1/1 success       |
| Deployment-base builds               | 2/2 success       |
| Project-base build and browser check | 1/1 success       |
| **Total**                            | **45/45 success** |

It records **743 e2e passed, 68 skipped**, no failed/flaky results, retries
disabled, project-base **8 passed**, and unit shards **4,236 passed plus
4 expected failures**. Separate
[Pages 40188251967](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40188251967)
records **2/2 successful jobs**, completed **11:18:12 UTC**. Pages success
alone does not satisfy the full CI gate. The local workflow still declares
the same 45-job structure; that declaration does not show that any current
jobs actually ran.

The historical failure in 4050 was on earlier SHA `1c620c84`,
[CI 40174754472](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40174754472):
`e2e (12/38)`, `tests/e2e/content-missions.spec.ts:124:3`, **monterey-canyon:
briefing to primary scans to debrief**. The line-195 banner visibility
assertion exhausted its 15 s allowance. That case passed on `164da7fe`
without retries. [4080](4080-R-ci-green-banner-triage.md) established a
possible counted-play-time mechanism but did not establish the hosted cause;
[4110](4110-R-ci-green-after-4030-4040.md) also lacked live API access.
None of this identifies a failing spec on current main or justifies a new
fix, timeout change or weaker assertion.

## Local comparison against `164da7fe`

`git merge-base --is-ancestor 164da7fe HEAD` succeeds. The baseline-to-pinned-HEAD
diff contains **21 files changed, 1,797 insertions and 16 deletions**,
including planning/progress documentation and `docs/missions.md`.
There are **four runtime files and three existing unit capability specs**:

- `LifeSim.ts` integrates after population passes so newborn movers receive
  water-limit enforcement that frame; `lifeSim.test.ts` adds its regression.
- `Progress.ts` excludes explicitly unresolved objectives from dive ratings;
  `progress.test.ts` adds mission, debrief and save consistency coverage.
- `MissionRouter.ts` and `ObjectivesPanel.ts` refresh the open completion
  banner's rating after a bonus without restarting its dismissal timer;
  `missionRouter.test.ts` adds the bonus/rating/timer regression.

There are **no workflow or e2e-spec changes** in that diff. These are inspected
code differences, not new test results or proof of hosted health. In
particular, the collected banner-star fix cannot be claimed to fix the
historical banner-visibility timeout. No demonstrated defect warrants a
production change in this audit.

## Commands and actual results

All hosted commands were read-only, with explicit repository selection.
The following commands ran from the pinned worktree:

```bash
gh api repos/wjjztd2rz8-coder/submarine-explorer/commits/main --jq '{sha: .sha, date: .commit.committer.date, message: .commit.message, url: .html_url}'
gh run list --repo wjjztd2rz8-coder/submarine-explorer --branch main --limit 15 --json databaseId,workflowName,headSha,status,conclusion,event,createdAt,updatedAt,url
gh run view 40186087006 --repo wjjztd2rz8-coder/submarine-explorer --json databaseId,headSha,status,conclusion,event,createdAt,updatedAt,url,jobs
gh run list --repo wjjztd2rz8-coder/submarine-explorer --branch main --workflow ci.yml --commit b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8 --limit 5 --json databaseId,workflowName,headSha,status,conclusion,event,createdAt,updatedAt,url
```

Each failed (exit **1**); none returned run or job data:

```text
error connecting to api.github.com
check your internet connection or https://githubstatus.com
```

Additional local commands and results:

| Command / check                                                                       | Actual result                                                                                      |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `git rev-parse HEAD origin/main`                                                      | Both `b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8`; remote-tracking ref is only a local cache         |
| `git status --short` before edits                                                     | Empty                                                                                              |
| `git rev-parse 164da7fe`                                                              | `164da7fe6e82e4abfcee270c123106f36bda2707`                                                         |
| `git rev-parse 'f64^{commit}'`                                                        | `bb72bf1961efd8d85d8863836308c83b08f766bb` (local existing tag)                                    |
| `git merge-base --is-ancestor 164da7fe HEAD`                                          | Exit 0                                                                                             |
| `git log --first-parent --format='%h %s' 164da7fe..HEAD`                              | 13 commits, from the 4050 evidence commit through the run-145 log                                  |
| `git diff --stat 164da7fe HEAD` and `git diff --name-status 164da7fe HEAD`            | 21 files; counts above                                                                             |
| `git diff 164da7fe HEAD -- src tests .github/workflows`                               | Runtime/test changes described above; no workflow changes                                          |
| Python `socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)` for both GitHub hosts | Both raised `gaierror: [Errno -2] Name or service not known` at `2026-10-25T16:45:49.330228+00:00` |

## Validation, simplicity and limits

- Formatted this file with `node_modules/.bin/prettier --write`, then checked
  it with `--check`; both passed. `git diff --check` passed, and checking this
  new file against `/dev/null` emitted no whitespace diagnostics. Final HEAD
  remains pinned; only this progress note is added.
- No source/test/workflow change, added machinery, settings, site branch or
  package number in code. No new regression test is warranted for a report.
  No local build, unit, Python or e2e run: those would not establish hosted CI.
- Existing baseline skips, expected collision failures and excluded render
  diagnostics limit its coverage. The visual/phone portions of the rubric
  were not assessed. No browser, WebGL, screenshots or visual work performed.
- No merge, push, tag, workflow rerun/dispatch, deployment action, credential
  change, or edit to `tools/` or `plan/DIRECTOR.md`.
- Completion requires working GitHub API access: resolve remote `main`, query
  CI for that exact SHA, enumerate its jobs, inspect any failure logs, compare
  with baseline 40186087006, and recheck remote `main` for a newer push.
  This audit leaves those facts unknown; it requires no workflow trigger.
