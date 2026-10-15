# R-ci-green

## Plan

1. Inspect CI run 38769418092 and later completed main runs, including cancellation/job metadata.
2. Repair failing capability specs or the production defects they establish, preserving regression assertions.
3. Run the affected capability matrix, the failing shard and `tools/gates.sh`; record release and workflow conclusions.

## Evidence and repair

Inspected `gh run list --workflow CI -L 10` and `gh run view 38769418092 --log`. The latter returned only the build/check logs; `gh run view 38769418092 --job 116554940076 --log` returned no content. Retrieved the failed job log, full run log ZIP and failure artifact through `gh api` instead.

[Run 38769418092](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38769418092), head `eba803b2d82a743f63faf0c6773eebf8199b6a87`, has one failed job: **e2e (1/38)**. Both builds, static checks, project-base and the other 37 shards pass. Full logs account for **709 passed, 68 pre-existing skips and one failed case**, with no interrupted/unexecuted cases. The sole failure is `hud-touch.spec.ts`, animal guidance placement, Monterey at 1280×720 / 100%: the 240 s deadline expires inside the real-frame hint-lifetime loop. The failure snapshot still shows the hint, but does not establish how much simulated time elapsed. The unchanged case passes locally with `CI=1`, zero retries, in **32.7 s** (`/tmp/r-ci-green-baseline.log`). Software rendering overhead is a supported diagnosis; the precise hosted stall is not reproduced locally, and no timer defect is established.

The existing animal-guidance capability stops drawing the 3D scene **after** its screenshot and layout assertions, while the real game loop continues to run the hint lifetime. This avoids repeatedly drawing the same held scene merely to test expiry. All eight viewport/scale cases still exercise real wildlife triggering, scan-card precedence for ten simulated seconds, deferred seen-state, device-specific text, full-resolution layout/overlap/fit checks and expiry within fifteen simulated seconds. The hint engine, guidance timer, DOM updates and frame clock are not stubbed. Replaced the bounded hint-appearance polling loop with the next real game frame that publishes the deferred hint. No product code, skips, retries, timeouts or assertion thresholds changed. Net simpler: removed the polling loop; no new helper, setting or UI.

## Concurrency and release

The later cancelled main runs have **zero jobs**:

| Pending run | Created (UTC) | Cancelled (UTC) | Superseding push              |
| ----------- | ------------- | --------------- | ----------------------------- |
| 38773796610 | 17:01:02      | 17:06:22        | 38774536364, created 17:06:20 |
| 38774536364 | 17:06:20      | 17:24:18        | 38777043754, created 17:24:16 |
| 38779968359 | 17:45:24      | 17:45:31        | 38779982682, created 17:45:30 |

These cancellations match replacement of the single pending run in the main concurrency group; they are not interrupted running jobs. Main run 38769418092 finished while newer pushes waited. `cancel-in-progress` is already false for main and true for pull requests. **No behavioral change to `ci.yml` is needed.** Corrected only its comment to acknowledge that pending main runs can be superseded.

Deploy continues to depend only on its own build. For release tags, require a completed successful CI and Pages deployment on the exact candidate main SHA; do not add a CI dependency to deploys. No tag, push, dispatch or rerun was requested or performed.

## Validation

- **PASS:** all eight animal-guidance layouts, `CI=1`, zero retries, one worker: **8 passed in 2.3 min** (`/tmp/r-ci-green-animal-final.log`). The formerly failing Monterey case takes **21.6 s**, versus 32.7 s in the unmodified local baseline. This is local timing, not a guaranteed hosted speedup.
- **PASS:** actual discovery-balanced shard **1/38**, `CI=1`, zero retries: **18 passed, one pre-existing render skip, 3.6 min** (`/tmp/r-ci-green-shard1-final.log`). The repaired Monterey case passes in **22.6 s** in shard context.
- In progress: aggregate gates (smoke plus project-base).

The default local fork-pool unit invocation produced no results and was interrupted. A serial thread-pool probe reported passing tests, so the final gate invocation runs the same complete unit roster with thread workers and serial files. No test selection or test configuration was changed in the repository. The writable config mode avoids writes to the shared read-only dependency tree. Reproducible local gate invocation:

```bash
npm() {
  if [[ "${1:-}" == test ]]; then
    command npm "$@" --pool=threads --no-file-parallelism
  else
    command npm "$@"
  fi
}
export -f npm
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/r-ci-green-dist PW_PORT=4192 \
  bash tools/gates.sh
```

At the initial inspection, later main run 38777043754 was still running with no failed jobs, and 38779982682 was pending. Recheck after local validation before declaring hosted status.
