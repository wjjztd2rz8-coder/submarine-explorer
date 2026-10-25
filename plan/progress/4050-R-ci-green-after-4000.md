# 4050 — R-ci-green: hosted CI after the collected fixes

DIRECTOR Backlog **8, R-ci-green [Codex]**, 2026-10-25.
Local baseline and remote main observed at **11:30:35 UTC**:
`164da7fe6e82e4abfcee270c123106f36bda2707`; initial worktree clean.
Report-first investigation; no source, test or workflow changes.

## Result

Newest fully green main SHA: **`164da7fe6e82e4abfcee270c123106f36bda2707`**.
[CI 40186087006](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40186087006)
was created at **10:45:33 UTC** and completed successfully at **11:17:35 UTC**.
All **45 jobs succeeded**, with zero failed, cancelled or skipped jobs:

- **38** e2e shards;
- **3** static-check shards and **1** aggregate gate;
- **2** deployment-base builds;
- **1** project-base browser check.

Downloaded hosted logs confirm **743 e2e passed, 68 skipped**, with no failed
or flaky results. All 38 shards invoked `--retries=0`. Project-base has
**8 passed**. Static unit shards total **4,236 passed and 4 expected failures**
across **192 files**. Existing expected collision failures, e2e skips and
CI's exclusion of `@render` diagnostics remain coverage limits; fully green
means every CI job succeeded, not that these excluded cases were exercised.

[Pages 40188251967](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40188251967)
also succeeded on that SHA: **2/2 jobs** (build and deploy), completed at
**11:18:12 UTC**. Deployment is separate evidence from full CI.

## Main commits after `8f69ef63`

`git log 8f69ef63..HEAD` contains exactly these three commits.
`gh run list --branch main` and individual `gh run view --json jobs` queries establish:

| SHA        | Hosted CI                                                                                      | Result    | Job counts       |
| ---------- | ---------------------------------------------------------------------------------------------- | --------- | ---------------- |
| `164da7fe` | [40186087006](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40186087006) | Success   | 45/45 successful |
| `e72b0542` | [40179899866](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40179899866) | Success   | 45/45 successful |
| `1e80c105` | [40179248204](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40179248204) | Cancelled | 0 jobs created   |

The boundary commit `8f69ef63` itself has
[CI 40179233655](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40179233655)
cancelled with **0 jobs created**. Neither cancellation identifies a failing
spec. There are **no failed runs after the boundary**, and no unfinished CI
run in the observed newer history. No cancellation cause is inferred.

## Latest earlier failure

The prior evidence note left `1c620c84` unfinished. It has now completed with
**44 successful jobs and 1 failed job** in
[CI 40174754472](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40174754472).
Only [`e2e (12/38)`](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40174754472/job/121113004608)
failed. Its sole failing case was:

`tests/e2e/content-missions.spec.ts:124:3` — **monterey-canyon: briefing to
primary scans to debrief**.

The assertion at **line 195** waited **15,000 ms** for `.obj-banner` to become
visible; the element remained hidden. The downloaded error-context artifact
shows **2 of 5 objectives · primaries done** and the last scan's New Journal
entry status. This is an assertion timeout, not exhaustion of the overall
240 s CI test budget. The snapshot does not establish why the banner had not
appeared.

Smallest candidate correction, **if delayed rendering is confirmed**, is to
remove this assertion's local 15 s override and retain `toBeVisible()` with
the existing shared expectation budget (60 s in CI, 20 s locally). This would
keep the selector, visibility requirement, title, voluntary surface action,
debrief and error assertions intact. A selector change has no supporting
evidence: the element exists and is hidden.

**No fix applied.** The failure predates the requested boundary and the same
case passes on newest main (**2.7 min**, retry disabled). Newest main also
passes the previously adjusted `journal-debrief` progression flow (**2.0 min**).
These later passes support keeping the current scope report-only; they do
not prove that the historical timeout cannot recur. If it does recur and
timing is confirmed, validate the one-line correction using the existing
Monterey case in `content-missions.spec.ts`, without adding a package-named
spec or weakening behavior assertions.

## Validation and simplicity

- Read-only hosted inspection: `gh run list`, `gh run view`, branches API,
  job logs, full newest-run logs and the earlier failure artifact.
- `gh run view --log-failed` returned no text; direct job-log REST retrieval
  supplied the failure evidence above.
- Updated DIRECTOR Backlog 8's stale green SHA and linked this evidence.
- Documentation formatting and `git diff --check` passed.
- No local behavior tests run: no behavior changed. Hosted results above are
  evidence for the observed main SHA, not a fresh local suite run.
- Simplicity: documentation only; no added machinery, site branches,
  settings or package numbers in code. No additional capability test needed.
- No push, tag, rerun, workflow dispatch or deployment action performed.
  Release tagging remains with R-release.
