# 121 S-verify: hosted CI after journey and phone-accept merges

Checked 2026-11-04 at 06:45 UTC for **R-ci-green**. Verdict: **GREEN**.

Ran `gh run list -L 10`, then filtered the ten newest CI runs with
`gh run list -L 10 --branch main --workflow CI`. Eight succeeded and two were
cancelled; none failed. The three newest CI runs all succeeded:

| Run                                                                                            | Commit     | Created (UTC, 2026-11-04) | Result  |
| ---------------------------------------------------------------------------------------------- | ---------- | ------------------------- | ------- |
| [41783588231](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/41783588231) | `a8336f1c` | 06:08:44                  | success |
| [41774532703](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/41774532703) | `233e496e` | 04:39:34                  | success |
| [41770407066](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/41770407066) | `30a2ac4f` | 03:59:14                  | success |

The GitHub branch API confirms current hosted `main` is
`a8336f1cbafc537554453966df5980936a093ac0`, matching the latest successful CI run.
Inspected its jobs with `gh run view 41783588231 --json ...`: **45/45 jobs
succeeded, including all 38/38 e2e shards**, with no failed, cancelled, or skipped
jobs. The downstream Pages run, [41787457495](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/41787457495),
also succeeded.

No failing shard or spec requires repair. Stopped at the green result as
requested. This evidence note is the only change; no behavior or assertions
changed, so the behavior-change requirement to grep and run focused local
Playwright tests does not apply. No local application suites were run.
No merge, push, CI rerun, or `DIRECTOR.md` edit was performed.

Validation: scoped Prettier check and `git diff --check`.
