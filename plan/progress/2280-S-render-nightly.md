# S-render: nightly failure diagnosis and bounded reporting

2026-10-16. DIRECTOR backlog item **S-render**, brief 2280. Base `e142419`.
No art, gameplay, capture poses, render settings or dependencies changed.

## Round 1: hosted evidence

Both scheduled runs are confirmed failures:

| Run                                                                                                     | SHA        | Golden step    | Continuous guard step        | Perf step                    |
| ------------------------------------------------------------------------------------------------------- | ---------- | -------------- | ---------------------------- | ---------------------------- |
| [38574704463](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38574704463) (Oct 14) | `41f7b278` | 15m39s, exit 1 | 60m13s, Actions step timeout | 13m10s, exit 1               |
| [38743060407](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38743060407) (Oct 15) | `cbe7559b` | 14m22s, exit 1 | 60m12s, Actions step timeout | 30m15s, Actions step timeout |

Executed `gh run view <id> --log-failed` for both IDs. It returned exit 0 and
empty output, as did `--log`; this is not evidence that the steps had no errors.
Retrieved the full logs with `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<job-id>/logs`
(job IDs `115888633564`, `116449471808`), plus step metadata via the jobs API.
Downloaded all four requested artifact families with:

```bash
gh run download <id> --pattern 'render-logs-*' --pattern 'golden-*' \
  --pattern 'render-guards-*' --pattern 'perf-*' -D .cache/s-render-nightly/<id>
```

Artifact names have run/attempt/SHA suffixes, so exact names such as `golden`
do not match. Logs, metadata and original downloaded artifacts remain under
`.cache/s-render-nightly/`; full job logs are `job-earlier.log` and `job-latest.log`.

- **Golden: screenshot infrastructure/readback failure.** Every hero context
  reached capture, then Playwright's 30-second screenshot and the 30-second
  Chromium viewport fallback timed out. Each primary manifest has zero captures
  and eight failures. Additional two-gallery manifests from the sediment review
  also contain zero captures. There are no golden PNG pairs to compare in these
  artifacts. The current branch already has the longer 90-second fallback;
  no additional timeout increase is justified here.
- **Guards: suite duration exceeds the hosted step budget.** Both hit the hard
  60-minute limit before completing 47 selected tests, losing the final JSON
  reporter output. The latest log reaches test 34. Low/Medium approach checks
  pass; High Monterey fails at four minutes and High Challenger/Endurance at
  eight minutes each. These durations match per-test deadlines, suggesting
  software-rendering exhaustion, but the killed reporter cannot establish the
  precise assertion/error for each test. The six event checks failed on Oct 14
  and all passed on Oct 15; no assertion is weakened based on the earlier log.
- **Perf: slow software GL and screenshot/step deadlines.** Oct 14 records only
  Titanic Low/Medium, then throws `page.screenshot: Timeout 90000ms exceeded`.
  Oct 15 records five of 15 pairs before the 30-minute step timeout. Mean frame
  intervals range from 1169 to 4203 ms in that run; Titanic High p95 is 7999.6 ms.
  The benchmark has no timing threshold that could cause these failures.
- **Not a golden mismatch.** Neither run executes a golden pixel comparator.
  Dependency/browser installs and preview/build steps succeeded. These are
  capture and execution-budget failures, not demonstrated art regressions or
  an apt/browser dependency failure.

## Changes

Nightly golden capture, continuous `@render` checks and the software-GL benchmark
now report outcomes without failing the workflow. The summary explicitly marks
failure/skipped evidence as incomplete/unaccepted and emits a warning. Existing
assertions still execute; reports, captures, logs and manifests remain available.
These full-resolution High captures and long frame sequences have not completed
reliably on the standard hosted CPU runners, so their output cannot be a reliable
blocking gate there.

The original 47-test guard selection is divided into 30 blocking behavior tests
and 17 reporting `@render` tests. Both use Playwright's 30-minute global deadline
inside a 35-minute Actions step, allowing the reporter to finish before Actions
kills the process. The perf command has a 25-minute process deadline inside its
30-minute step. Build/install/provenance failures and behavior/capability
assertions remain blocking. A failed capture no longer prevents sharing its
successfully built production output with capability-review shards; a failed
build still fails manifest creation/upload.

Perf now writes each measurement before screenshot readback, includes the planned
matrix, per-pair failures, capture status and an explicit `complete` flag, and
continues to later pairs after errors. A process deadline leaves an incomplete
report rather than presenting the measured prefix as a completed benchmark.
The tool still exits nonzero when it records failures.

`tools/golden-compare.mjs <before-dir> <after-dir>` replaces exact identity as the
documented numeric screen. Each RGB channel may differ by two byte levels
(2/255, about 0.78% of the encoded channel range). Larger changes may occupy at
most 0.1% of each image (1440 pixels at 1600 x 900). This narrowly permits byte
rounding and sparse edge variation while retaining review signals for broader
shading changes and lost geometry/detail. No blur, masking, alignment, resampling
or per-site exception is applied. Raw changed counts, significant counts, RGB
MAE and maximum channel delta remain in the JSON output.

This is a conservative **review trigger**, not an empirically calibrated claim
that every software-GL variation is harmless. The mixed-art, changed-pose sets
in 2210 cannot justify a broader tolerance. The command refuses incomplete sets,
missing images, invalid provenance, changed options/poses and dimension mismatches.
It exits 1 for changes beyond tolerance and 2 for invalid comparison inputs;
`--report` only suppresses the pixel-change failure. There is no automatic
selection of an older successful baseline and no claim of current visual parity.

## Ubuntu migration

GitHub's [migration notice](https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration/)
confirms the gradual October 19-November 19 migration from Ubuntu 24.04 to 26.04.
[Playwright release notes](https://playwright.dev/docs/release-notes#version-161)
document Ubuntu 26.04 support starting in 1.61. The lockfile and installed package
use 1.63.0; its platform detection, Chromium download map and native-dependency
map contain Ubuntu 26.04 x64/arm64 entries, including the correct t64 libraries.
`tools/install-playwright-chromium.sh` always installs OS dependencies, even on
browser-cache hits. There is no hard-coded obsolete apt package list to migrate.

Pin all browser jobs (CI e2e/project-base and nightly diagnostics/capability review)
to `ubuntu-24.04` and include that OS label in their browser-cache keys. This keeps
the tested font/render baseline stable and removes the automatic migration from
browser execution. Static/build/deploy jobs retain `ubuntu-latest`; they explicitly
install Node 22 and use npm/standard shell/Python tools, with no browser dependency.
No actual Ubuntu 26.04 VM run was performed, so compatibility beyond the audited
dependency mappings is not claimed. Update the browser baseline deliberately
when adopting that image.

## Round 2: verification

- All 25 browser-independent golden tooling tests pass. Added cases cover byte
  rounding, sparse edges, broad shading changes, missing detail, alpha/dimension
  errors, incomplete/missing captures, changed camera and invalid provenance.
- Fault-injected the perf tool's browser interface locally: confirmed numeric
  results exist with `capture: pending` before readback; an injected screenshot
  timeout retains that measurement, records failure, continues to the next pair,
  leaves `complete: false` and exits 1. The all-success probe completes and exits 0.
- The actual 2210 comparison inputs exit 2 as expected: the older set is incomplete.
  No tolerance was fitted to its intentional visual changes.
- Parsed all workflow YAML and checked every embedded shell script with `bash -n`.
  Playwright discovery confirms 30 blocking + 17 reporting tests, preserving the
  original 47-test selection. No test assertion or test timeout changed.

Ran `tools/gates.sh` with `GATES_CONFIG_MODE=writable PW_PORT=4221`. Its first
invocation passed Python/content/build, then stalled in Vitest with no test
results and was interrupted. Completed the aggregate with a shell-local npm
wrapper bounding the unit command to 60 seconds and selecting threads/serial
files; the wrapper changes no repository configuration:

```bash
npm() {
  if [[ "${1:-}" == test ]]; then
    timeout --kill-after=5s 60s npm "$@" --pool=threads --no-file-parallelism
  else
    command npm "$@"
  fi
}
export -f npm
GATES_CONFIG_MODE=writable PW_PORT=4221 bash tools/gates.sh
```

| Gate/check                               | Result                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Python tooling                           | PASS, all 166 tests                                                              |
| Strict content                           | PASS, all 13 sites                                                               |
| TypeScript and production build          | PASS; existing chunk-size warning                                                |
| Unit roster                              | FAIL/unresolved: Vitest starts, emits no test results, bounded command exits 124 |
| Smoke e2e                                | PASS, 3 tests                                                                    |
| Project-base e2e                         | PASS, 8 tests                                                                    |
| Attribution                              | PASS                                                                             |
| Whole-repository Prettier and whitespace | PASS                                                                             |
| Golden tooling                           | PASS, 25 tests, including CLI exit/report behavior                               |

The aggregate exits **1**, not green. A separate 90-second threads retry also
exits 124 without test results. A further single-worker/serial full-roster probe
still emitted only startup output and was interrupted; a single-file probe
(`journalGroups.test.ts`, threads, one worker) passes all 21 tests in 556 ms.
The full-roster startup stall remains unresolved; no failing unit assertion was
reported and no test was skipped or weakened to claim a pass. Logs are
`.cache/s-render-nightly/gates-bounded.log`, `unit-threads.log`, `unit-serial.log`
and `unit-single.log`, with individual aggregate logs under
`.cache/runs/20261016-062047-4-7K417X/`.

## Simplicity and disposition

This changes only diagnostics, their review command and documentation. It adds
no settings, guidance surface, runtime abstraction, site branch or layout patch.
The existing selected tests are partitioned by their established `@render` tag;
no new package-named spec or dependency is added. Hosted confirmation is pending:
the modified workflow has not been pushed/dispatched, and no current visual
acceptance is inferred from a future green diagnostic status. **S-render remains
open for hosted confirmation.**
