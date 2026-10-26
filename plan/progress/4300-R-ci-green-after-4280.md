# 4300 — R-ci-green after 4270 and 4280

DIRECTOR Backlog **8, R-ci-green**. Audit: **2026-10-26 03:15–03:16 UTC**
(**2026-10-25 22:15–22:16 CDT**). Initial audit report only; initial worktree
clean. Subsequent orchestrator feedback authorized the formatting correction
documented below.

## Verdict

**Hosted CI after the two merges is unverified. This audit does not establish
an eligible SHA for f66.** Both attempts at `gh run list -L 10` failed before
returning any runs. Additional main/API queries and a historical failed-log
request also failed. DNS resolution failed for both GitHub hostnames.
This is an audit access failure, not evidence of a failed product test or a
CI flake. No current run IDs, conclusions or failure logs were available.

The local checkout and cached `origin/main` both point to
`c99a71549f53945bd4565f40c5904b404b58773f`. This SHA includes both requested
merges, but a remote-tracking ref does not prove the current remote main tip.
Do not infer green CI from ancestry or the recorded local smoke results.
R-release needs completed successful full CI on the exact chosen main SHA
before tagging f66; no tag was created or changed.

## SHAs and historical evidence

| Reference                                    | Full SHA                                   | Evidence and limit                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pinned HEAD / cached origin/main             | `c99a71549f53945bd4565f40c5904b404b58773f` | Local refs agree; hosted state and run URL unavailable.                                                                                                                                                                  |
| 4270 merge                                   | `93062ffcca08fd3895bcd8ac7b23171fa2bc44ac` | Confirmed ancestor of HEAD; hosted run URL unavailable.                                                                                                                                                                  |
| 4280 merge                                   | `28e175e9870c1a4255f096a4542bc36457d2e4b7` | Confirmed ancestor of HEAD; hosted run URL unavailable.                                                                                                                                                                  |
| Existing local f65 target                    | `b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8` | Overnight log, run 146, records green CI and Pages and f65 pushed; no run ID recorded there and no live revalidation here.                                                                                               |
| Last collected green evidence with a run URL | `164da7fe6e82e4abfcee270c123106f36bda2707` | [CI 40186087006](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40186087006): 45/45 jobs successful, completed 2026-10-25 11:17:35 UTC, per [4050](4050-R-ci-green-after-4000.md). Historical only. |

4050 also records [Pages 40188251967](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40188251967)
successful on `164da7fe`, completed 11:18:12 UTC. Pages does not replace full CI.
The later f65 record in [OVERNIGHT-LOG](../OVERNIGHT-LOG.md) supersedes the
older green-SHA summary still in DIRECTOR Backlog 8; neither establishes a
post-4280 green SHA. All run links here are historical, not newly observed runs.

The overnight log's run 153 records smoke and project-base gates passing for
the two merges; run 154 records latest-push CI pending. These are prior
observations, not current hosted results. The [4270](4270-S-fix-lock-teardown.md)
and [4280](4280-P2-text-size-aa.md) implementation notes document their own
local checks and sandbox limits.

## Failure classification

- **Current post-merge runs: unknown.** No run list or failed-job logs could
  be retrieved; no product-versus-flake classification is supportable.
- **Access failure: environment/DNS.** This prevented inspection and is not
  a hosted CI conclusion. It cannot be counted as a green or red run.
- **Historical failure only:** on
  `1c620c846d0101e5650113ac9ae75ef2027c2d86`,
  [CI 40174754472](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40174754472)
  failed `e2e (12/38)`,
  `tests/e2e/content-missions.spec.ts:124:3`, Monterey briefing-to-debrief.
  Per 4050, the line-195 completion-banner visibility assertion timed out
  after 15 seconds; the same case later passed on `164da7fe` without retries.
  Classification remains **undetermined product/timing flake**: a later pass
  alone does not prove the cause. [4080](4080-R-ci-green-banner-triage.md)
  investigates a possible mechanism without establishing the hosted cause.
  Today's `--log-failed` request failed, so this is inherited evidence only.

## Read-only commands and outcomes

Two inspection passes were made. Every `gh` command below exited **1** with
no run, job or commit response:

```bash
# Executed twice; second attempt at 03:16:09 UTC.
gh run list -L 10
gh api repos/wjjztd2rz8-coder/submarine-explorer/commits/main --jq '{sha: .sha, url: .html_url}'
gh run list --repo wjjztd2rz8-coder/submarine-explorer --branch main -L 10 --json databaseId,workflowName,headSha,status,conclusion,event,createdAt,updatedAt,url
gh run list --repo wjjztd2rz8-coder/submarine-explorer --branch main --workflow ci.yml --commit c99a71549f53945bd4565f40c5904b404b58773f -L 10 --json databaseId,headSha,status,conclusion,url
gh run view 40174754472 --repo wjjztd2rz8-coder/submarine-explorer --log-failed
```

Common error:

```text
error connecting to api.github.com
check your internet connection or https://githubstatus.com
```

Python `socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)` returned
`gaierror [Errno -2] Name or service not known` for both `api.github.com`
and `github.com`. Local `git rev-parse HEAD origin/main 'f65^{commit}'`
returned the SHAs above. Both merge ancestry checks exited **0**.

To finish the hosted audit once API access works, read the latest main runs,
inspect each failure with `gh run view <run-id> --log-failed`, and record
the newest completed green main SHA and its run URL. Compare failures with
earlier passes before deciding product versus flake. No rerun is needed to
perform that inspection.

## Validation and scope

The orchestrator ran `tools/gates.sh` outside this sandbox, with Vite and
Chromium available. Its supplied output reports **PASS python, content,
build, unit, e2e (smoke), e2e-base and attribution**. The sole failure was
**Prettier**, identifying `plan/OVERNIGHT-LOG.md`; log path:
`.cache/runs/20261025-221719-1980974-14N1oT/prettier.log`. This is a deterministic
repository formatting defect, not a product failure or test flake.

Reproduced locally with
`node_modules/.bin/prettier --check plan/OVERNIGHT-LOG.md` (exit **1**).
`node_modules/.bin/prettier --write plan/OVERNIGHT-LOG.md` added exactly two
blank lines around the comprehensive-review heading at line 2036. No text or
assertions changed. The user's follow-up request authorizes this formatting
edit outside the original progress-only scope.

After correction, repository-wide `node_modules/.bin/prettier --check .`
and whitespace checks passed. Only this progress note and the two blank
lines in `plan/OVERNIGHT-LOG.md` are changed. No local behavior tests were
rerun for the formatting change. The orchestrator's aggregate run failed
before this correction; no passing aggregate rerun is claimed. Its smoke
and project-base results do not establish full hosted CI or f66 eligibility.

No source, test, workflow, tooling or DIRECTOR edits; no hosted reruns,
dispatches, tags, pushes, merges or deployments. No UI, settings, guidance or
runtime machinery added; simplicity rules are unchanged.
