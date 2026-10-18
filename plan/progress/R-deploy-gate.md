# R-deploy-gate — gate Pages on CI for the deployed SHA

2026-10-18. Scope: `.github/workflows/deploy.yml` and this progress note.

## Change

Confirmed the release blocker: Pages previously started independently on every
push to `main`, so a failed or unfinished hosted CI run could still publish.

Replaced the push trigger with `workflow_run` for completed `CI` runs on `main`.
The build job requires a successful push run from this repository, excluding
pull requests, forks and unsuccessful conclusions. Checkout uses the triggering
run's `head_sha`: for `workflow_run`, `github.sha` can already name a newer,
untested default-branch commit. The existing deploy job still requires the build
job to succeed.

Kept `workflow_dispatch`. Before checkout or building, manual runs query `ci.yml`
for the selected SHA's latest main push CI run and require completed success.
Missing, queued, running, failed, cancelled or skipped CI blocks deployment;
API failures also stop the job. Added `actions: read` for this lookup. Dispatch
before CI finishes fails with an explicit message; dispatch again after CI passes.

Net simpler: automatic deployment now follows the existing complete CI workflow
instead of racing it. No polling, duplicated CI job list, new workflow, UI,
setting, dependency or game change. Existing deployment serialization, build
checks and timeouts remain intact.

References: GitHub documents the default-branch SHA and conclusion filtering for
[`workflow_run`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run),
and the workflow-specific run query's SHA, branch and event filters in its
[REST API reference](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow).

## Validation

- PASS: YAML parsing, trigger matches CI's actual name, manual trigger preserved,
  read permission, gate before checkout, exact checkout expression and deploy's
  dependency on build.
- PASS: temporary local harness exercised eight automatic cases (successful main
  push, failure, cancellation, skip, unfinished, PR, other branch, fork), manual
  entry, and checkout with a newer default-branch SHA. Eight manual API response
  cases cover same-SHA success, no run, different SHA, failure, cancellation,
  skip, running and queued; an API exception also rejects. These are offline
  expression/script checks, not a hosted Actions execution. No test file added.
- PASS: existing gate-orchestration capability, 17 tests:
  `python3 -m unittest discover -s tools/tests -p 'test_gates.py' -v`.
- PASS: workflow Prettier check and `git diff --check`.

## Environment and unrelated failures

Ran `GATES_CONFIG_MODE=writable PW_PORT=4196 bash tools/gates.sh`; writable
configuration is the existing mode for this checkout's shared dependency tree.
Python reported 166 tests with five failures: four CI-manifest cases fail on
`spawnSync git EPERM`; the golden comparison CLI case receives empty JSON output
(`Unexpected end of JSON input`). The standalone existing CI-manifest capability
check reproduced all four EPERM failures. No tooling or assertions were changed.

The first aggregate run passed configuration, content and build, then stalled
at Vitest without any test results and was interrupted. A standalone serial
thread-pool attempt also stalled and was interrupted. A follow-up aggregate run
used the same serial thread configuration, with an external 60-second bound on
the unit subprocess so the remaining gates could report; expiry counted as
failure. Reproduction (the wrapper is shell-only; tooling remains unchanged):

```bash
npm() {
  if [[ "${1:-}" == test ]]; then
    timeout 60s /home/vijay/.local/node/bin/npm "$@" --pool=threads --no-file-parallelism
  else
    command npm "$@"
  fi
}
export -f npm
GATES_CONFIG_MODE=writable PW_PORT=4196 bash tools/gates.sh
```

Final aggregate exit: **1**. Configuration, strict content, root build,
attribution and repository-wide Prettier passed. Python retained the five
failures above. Unit tests produced no results before termination, so they are
unverified. Smoke and project-base browser gates failed before tests because
their preview servers could not start; the project-base build itself passed.
A direct Node listener probe confirmed the sandbox disallows binding
`127.0.0.1:4196` (`listen EPERM`). No browser or visual acceptance is claimed.
Logs: `.cache/runs/20261018-114738-2-6UvxIf/`; focused gate capability log:
`/tmp/r-deploy-gate-orchestration.log`. The golden CLI's empty output and Vitest
stall remain unexplained; neither establishes a regression in the workflow.

No hosted workflow, deployment, push, merge or tag was performed. The workflow
must reach the default branch before its completion trigger becomes active.
`docs/deploy.md` still describes independent deploys; it was left untouched
because this brief authorizes only workflow edits and this progress note.
