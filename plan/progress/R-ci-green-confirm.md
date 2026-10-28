# R-ci-green: hosted main confirmation

Checked 2026-10-28 at 06:46 UTC. Serves **R-ci-green** in
`plan/DIRECTOR.md`; follows its simplicity rules and
`CONTRIBUTING-AGENTS.md`. Starting worktree was clean at `8e74fda8`.

**Verdict: GREEN.** Hosted `main` is
`b281656231c49b0043f9e7c276fa78ca9d96d95f`, confirmed with the GitHub branch
API. Its latest CI and Pages deployment both completed successfully.

## Hosted evidence

Ran `gh run list -L 10`, then
`gh run list -L 10 --workflow CI --branch main --json ...` to distinguish CI
from downstream deploys. The four newest CI runs are all successful:

| Run                                                                                            | SHA        | Created (UTC, 2026-10-28) | Completed (UTC) | Verdict |
| ---------------------------------------------------------------------------------------------- | ---------- | ------------------------- | --------------- | ------- |
| [40637905228](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40637905228) | `b2816562` | 05:25:22                  | 05:56:43        | PASS    |
| [40631315014](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40631315014) | `2dd0fd88` | 04:15:39                  | 04:47:11        | PASS    |
| [40622811363](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40622811363) | `73b5a5a3` | 02:45:36                  | 03:19:24        | PASS    |
| [40620000645](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40620000645) | `43f3221a` | 02:16:57                  | 02:47:49        | PASS    |

For each run, inspected `gh run view <id> --json ...` and executed
`gh run view <id> --log-failed`. All four log commands exited 0 with empty
stdout and stderr. The job metadata independently confirms **45/45 successful
jobs per run**, including **38/38 e2e shards**, both build bases, all three
static-check shards, the aggregate static check, and the project-base browser
check. No jobs failed, were cancelled, or were skipped.

The 4695 merge is `cd6e1216d26d0b961bad369f6bfa9f3527a7565b`, committed
2026-10-27 at 11:56:18 CDT (16:56:18 UTC). Verified it is an ancestor of every
SHA above using `git merge-base --is-ancestor`. These are hosted runs after
2026-10-27 that include the merge, resolving the earlier network-limited
verification in `plan/progress/4695-ci-spec-guard.md`.

Pages run
[40640901669](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40640901669)
also passed at the same `b2816562` SHA: build and deploy both succeeded,
completing at 05:57:52 UTC.

The workflow-filtered history also contains older failures and a cancelled
run; the four consecutive successful CI runs supersede those results. The
latest hosted main is green, so no failing current specs require repair.

## Changes and validation

This package adds only this evidence note. No product behavior or specs
changed, so the matching-capability grep and local Playwright execution
requirement for behavior changes does not apply. Local build, unit, Python,
and browser suites were not rerun; the hosted checks above are the evidence
for this confirmation. No assertions, timeouts, retries, or skips changed.

Report-only validation: scoped Prettier check and `git diff --check` passed.
Raw job metadata and failed-log outputs are retained locally under
`/tmp/R-ci-green-confirm-<run-id>.json` and
`/tmp/R-ci-green-confirm-<run-id>-failed.log`.

No hosted rerun, push, tag, or deployment was initiated. This verdict applies
to the hosted main SHA above; local HEAD additionally changes only the
Director's in-flight status, and this note has no hosted CI run yet.
