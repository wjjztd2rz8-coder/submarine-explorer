# 3250 — R-ci-green: static-check timeout

Serves item **R-ci-green**, static-check job timeout. No push, merge or tag.

## Hosted evidence

Inspected `gh run list`, `gh run view --json jobs,headSha,url` and
`gh run view --log`. The cancelled run returned an empty combined log, so
retrieved its static job log with `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/119906874181/logs`.

| Stage                                    | [Run 39802535646](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39802535646/job/119906874181) | [Run 39889492252](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39889492252) |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Dependency installation                  | 3 s                                                                                                                 | 3 s                                                                                                |
| Python, content and TypeScript gates     | 20.7 s                                                                                                              | 19.5 s                                                                                             |
| Unit start → cancellation                | 14m44.9s                                                                                                            | 14m41.7s                                                                                           |
| Completed unit files before cancellation | 154 / 192                                                                                                           | 128 / 192                                                                                          |

Both jobs hit the 15-minute deadline during unit tests. The check phase only
typechecks; deployment builds run in separate jobs. There were no unit shards.
The npm download cache already exists, and installation is negligible. Geometry
work is distributed across many specs: `props-geo` takes about 127–128 s,
`marineSnowReadability` 109–110 s, `missionApproach` 109 s in the earlier run,
and several other terrain/mission audits take 55–79 s each. This is cumulative
suite work rather than one stalled install or one anomalous slow assertion.

Raw hosted evidence: `/tmp/3250-static-timeout.log` and
`/tmp/3250-static-latest.log`.

## Change

- Run the existing static gate phase on three independent runners, with Vitest
  shards `1/3`, `2/3`, `3/3`. Keep two workers per runner and the 15-minute limit.
- Pass the optional `VITEST_SHARD` through the existing npm test command using
  POSIX shell expansion. With the variable unset, local tests run the full suite
  exactly as before. Watch mode is unchanged.
- Preserve the required `build and static checks` status with an aggregate job
  that requires all three shards to succeed. It runs even when a dependency
  fails or is cancelled, and rejects any result other than success. Disable
  matrix fail-fast so a failing shard does not suppress the other shards.

Net simpler than a new balancer or fixture cache: use Vitest's existing sharding,
retain one canonical gate definition and add no dependencies or runtime code.
The short Python/content/typecheck/attribution/format gates repeat on each
runner to avoid a second gate definition or changes to `tools/`. No assertion,
test case, timeout budget, site tuning or test exclusion changes.

## Validation and local timings

Evidence is under `.cache/ci-static-timeout/`. Local Node is 22.23.2, versus
22.23.4 hosted. The dependency directory is a shared, read-only symlink, so local
runs use `--configLoader runner --cache=false`. Both timing configurations use
`--pool=threads --no-file-parallelism`: one worker for the unsharded baseline,
then one worker in each of three concurrent shard processes on the same machine.
Hosted CI retains the configured two workers per runner. These are local
measurements, not a hosted speedup prediction.

The unsharded baseline was interrupted after **922.8 s (15m22.8s)** without a
completed result, bounding the experiment at the existing job budget. This is a
**lower bound**, not a full-suite duration or a passing baseline. The npm command
was started before the edit, with the optional shard variable absent:

```bash
npm test -- --configLoader runner --cache=false --pool=threads --no-file-parallelism
```

| Local unit run    | Files          | Tests               | Wall time | Result                                               |
| ----------------- | -------------- | ------------------- | --------- | ---------------------------------------------------- |
| Before, unsharded | 192 discovered | No completed report | >15m22.8s | Interrupted at job budget; duration is a lower bound |
| After, shard 1/3  | 64             | 1,557               | 7m58.9s   | PASS                                                 |
| After, shard 2/3  | 64             | 1,393               | 8m28.9s   | PASS                                                 |
| After, shard 3/3  | 64             | 830                 | 4m10.8s   | PASS                                                 |

The **slowest measured unit shard is 8m28.9s**. The after runs were concurrent,
not sequential. All **192 files / 3,780 tests** completed, including the four
existing expected-failure cases; zero unexpected failures, skips or todos.
Validated the actual JSON reports against the independent discovery roster:
each original file executed exactly once, with no omitted or duplicate files.
Evidence: `unit-after-{1,2,3}.json`, `unit-after-{1,2,3}.time` and
`executed-roster-check.json`.

For gate validation, `/tmp/3250-after-gates.sh` exports an npm function that only
adds the local pool/reporting flags to unit invocations; every other npm command
passes through unchanged. It times the actual unit command with `/usr/bin/time`.
The three concurrent invocations are equivalent to:

```bash
npm() {
  if [[ "${1:-}" == test ]]; then
    command npm "$@" --pool=threads --no-file-parallelism
  else
    command npm "$@"
  fi
}
export -f npm
GATES_CONFIG_MODE=writable VITEST_SHARD=1/3 PW_PORT=4393 bash tools/gates.sh &
GATES_CONFIG_MODE=writable VITEST_SHARD=2/3 bash tools/gates.sh --phase checks &
GATES_CONFIG_MODE=writable VITEST_SHARD=3/3 bash tools/gates.sh --phase checks &
wait
```

Static gate phases 2/3 and 3/3 both **PASS**, in **9m01.9s** and **4m41.0s**
respectively, including all their static gates. Shard 1's all-mode gate runs the
production build, root smoke and project-base checks in addition to its units.
Its final result is **PASS gates (e2e=smoke)**, exit 0, in **10m26.6s**.
Root smoke **PASS**, 3 tests / 24.7s; project-base **PASS**, 8 tests / 1.4m.
Python **PASS**, 167 tests per invocation. Strict content validation,
TypeScript/production builds, attribution and repository-wide Prettier all
**PASS**. This validates the complete gate list and the combined unit roster;
the browser mode is smoke plus project-base, not the full hosted e2e suite.

- TypeScript, changed-file Prettier and `git diff --check` pass.
- Workflow matrix/aggregate audit passes. Executing the aggregate's actual
  shell command accepts `success` and rejects `failure`, `cancelled`, `skipped`
  and an empty result. No green required status can come from one passing shard
  while another failed or did not run.
- Vitest discovery finds **192 files**. Applying the installed Vitest
  `BaseSequencer.shard` to that discovery gives **64 / 64 / 64 files**; the union
  is exactly the original roster with no duplicates. `vitest list --filesOnly`
  does not apply sharding in this version, so its output alone is not treated as
  a coverage check.
- Hosted improvement remains unmeasured until this change runs on GitHub.
