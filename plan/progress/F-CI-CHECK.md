# F-CI-CHECK — bounded hosted CI

Date: 2026-10-03. Repository-only investigation; no `gh`, remote requests,
workflow runs or commits. Scope: CI workflow, deployment comments/docs, two
suite scheduling declarations, changelog and this note.

## Findings

The reported two recent approximately 55-minute failures cannot be verified
from repository files. `plan/progress/CI-TIMEOUTS.md` records an older run with
four failing e2e shards lasting 14.6–29.4 minutes, while Python, content, build
and unit checks passed and Pages deployed. It attributes failures to slow
SwiftShader rendering, cumulative UI action cost and explicit short waits.
The previous mitigation already increased the matrix to eight, seeded CI's
low graphics preference, raised default test/expect limits and enabled a retry.

The current files explain how the suite can still run for roughly an hour:

- `playwright.config.ts` uses one worker and `fullyParallel: false`. Sharding
  therefore keeps whole files together, rather than distributing individual
  cases. Current discovery finds 236 tests in 47 files; the old eight shards
  contain 30, 30, 31, 40, 24, 27, 31 and 23 tests, respectively. Counts include
  existing optional visual-review cases; duration is not measured by `--list`.
- Default CI tests allow four minutes plus one retry. Some suites override
  that limit; the new ten-dive soak permits ten minutes per attempt. Repeated
  failures or a long file can dominate a single-worker shard even with eight
  runners. More workers on the same runner would compete for software-GPU CPU.
- Jobs allow 75 minutes and matrix `fail-fast` is false. There is no whole-suite
  deadline or first-final-failure stop. Per-test and preview startup timeouts
  already exist; they do not bound the cumulative suite duration.
- All eight jobs repeat static gates, and shard 1 runs the project-base build
  and browser check after the main suite. Failed e2e skips those later gates.
- Chromium installation is already cached and restricted to Chromium, but
  `playwright install --with-deps chromium` has no step-specific timeout and
  always performs OS dependency checks. There is no evidence here that the
  install itself caused the reported failures.
- `deploy.yml` triggers directly on `push` and `workflow_dispatch`, independently
  of CI. Pages success is expected even when CI fails. Its existing 20/10-minute
  job limits remain intact. The deployment guide incorrectly described a
  `workflow_run` success dependency; the guide and workflow comment now match
  the actual behavior.

## Changes

- Static gates run once in a 15-minute job: Python, strict content, typecheck and
  build, unit tests, attribution and whole-repository Prettier.
- E2e runs across 16 independent runners with a **24-minute job limit**,
  `--workers=1 --fully-parallel`, and a denominator derived from matrix size.
  Each runner builds its own preview. There are no dependencies between the
  jobs, avoiding additive prerequisite runtime. The matrix plus static and
  project-base jobs uses 18 runners when capacity is available.
- Removed redundant `mode: 'default'` overrides in `f-geo-scarp.spec.ts` and
  `visual-qa.spec.ts`: they prevented the CLI parallel setting from splitting
  those groups. Timeout values, fixtures, assertions and existing optional
  visual-review opt-in remain unchanged. Local config still uses one worker
  and `fullyParallel: false`, preserving ordinary local scheduling.
- `--global-timeout=1200000` bounds an e2e suite at 20 minutes;
  `--max-failures=1` stops after a final failure, after the existing retry.
  Matrix `fail-fast: true` cancels remaining shards. Neither limit turns
  unexecuted cases into a pass: incomplete or failing suites fail CI.
- Project-base build/browser validation gets its own 15-minute job, a
  10-minute step budget and eight-minute Playwright suite deadline. It no
  longer follows a potentially slow e2e shard. The original script and base
  assertions remain intact.
- Dependency installation and browser installation have five-minute step
  limits; e2e preview builds have a five-minute step limit. Chromium cache keys
  retain OS, architecture and lockfile hash. `--with-deps chromium` still runs
  on hits; no OS dependency or browser verification is removed.
- Failure reports/screenshots and retry traces remain available with 14-day
  artifact retention; uploads have two-minute step limits. A job deadline can
  still interrupt an upload if setup consumes the reporting headroom.
- Every gate in `tools/gates.sh`/`npm run ci` remains required for overall CI
  success. No application behavior, assertions, retry count, per-test limits,
  gate scripts or deployment triggers changed.

The longest executing job is now bounded at 24 minutes. This is a runtime
budget, not proof of a passing hosted run under 25 minutes: runner queue delays
and cancellation overhead are outside job budgets. A slow or failing suite
fails promptly. The recorded files support the scheduling diagnosis but do
not establish the exact failure of either recent hosted run.

## Verification

- Parsed workflow YAML; verified every CI job limit is below 25 minutes, jobs
  have no serial dependencies, browser installs retain OS dependencies and
  explicit limits, the matrix is contiguous, and fail-fast/CLI limits exist.
- Ran Playwright discovery with the exact e2e scheduling flags for all 16
  shards. Compared their union to pre-change discovery: all **236 tests** are
  present **exactly once**, with 14–15 cases per shard. No selection filters
  or new skips were introduced.
- Ran full `PW_PORT=4197 bash tools/gates.sh`: build, **888 unit tests**, **126
  Python tests**, strict content, attribution and whole-repository Prettier
  passed. Both e2e and project-base browser gates fail before tests because the
  sandbox denies localhost listening. A direct Node server reproduced
  `EPERM: listen EPERM: operation not permitted 127.0.0.1:4197`.
- The supplied `node_modules` symlink points outside the writable worktree;
  Vite/vitest initially failed creating `.vite-temp`. Ran validation with a
  temporary dependency copy under `/tmp`, preserving executable symlinks, then
  restored the original worktree symlink. No dependency or lockfile changes.
- The project-base workflow command accepts its appended budget/reporter/worker
  flags and discovers the original single test. Production and project-base
  builds both pass. Browser assertions remain unverified in this sandbox.
- Ran Prettier on every changed file and checked whitespace with
  `git diff --check`. No commits made.

## Follow-up

Run CI after merge and record passing shard durations, retries, setup time and
runner queue delay. Investigate any surviving explicit scan/pose waits or
fixed-time motion failures using existing retry traces. Budget exhaustion is
still a failure, and should be addressed through throughput or state-based
synchronization while retaining asserted outcomes. No remote success or
browser runtime validation is claimed by this repository-only change.
