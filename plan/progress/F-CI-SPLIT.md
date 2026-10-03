# F-CI-SPLIT — local smoke gates, full CI coverage

Date: 2026-10-03. Scheduling-only follow-up to
[`F-CI-CHECK.md`](F-CI-CHECK.md). No commits or remote workflow runs.

## Decision

The just-merged CI change already distributes the full suite across 16
single-worker runners and gives static and project-base gates independent
budgets. Increasing local worker counts would increase contention for the
same software-rendering CPU. Tightening individual test deadlines would risk
rejecting valid slow rendering without improving throughput.

Keep that CI schedule and shorten repeated task-local gates instead. Discovery
now contains 252 cases in 49 files (the earlier note recorded 236 in 47).
The existing smoke spec checks the home shell and renders Titanic and Monterey
Canyon with depth, terrain, fatal-overlay and console/page-error assertions.
Together with the existing project-base check, the default local gate schedules
four browser cases. Full regression coverage remains a CI requirement.

## Changes

- `tools/gates.sh` defaults to the existing smoke spec locally and still runs
  all six static gates plus the separate project-base build/browser check.
- `--full-e2e` schedules the full local suite. A nonempty `CI` also defaults
  to full discovery. The existing explicit `--no-e2e` option remains available.
  Unknown or conflicting flags fail before any gates run.
- The summary identifies smoke versus full coverage. Owned preview servers,
  unique temporary build/test outputs, explicit retained outputs and nonzero
  failure propagation remain intact. The base gate still runs if smoke fails.
- No browser spec, assertion, skip, timeout, retry or worker count changes.
  The 16-shard workflow and `npm run ci` still discover the complete suite.
- Documented commands, scope, port isolation and full pre-release validation
  in `docs/deploy.md`; logged the scheduling change in `CHANGELOG.md`.
- Extended the existing offline orchestration tests to cover local smoke,
  full opt-in, CI full default, static-only mode and invalid options.

## Verification

- Shell syntax and seven offline gate-orchestration tests pass.
- Playwright discovers the three existing smoke cases. Using CI's test-level
  scheduling and suite-budget flags, compared full discovery with all 16 shard
  lists: all 252 cases occur exactly once, with 15–16 cases per shard. Existing
  conditional skips and optional visual-review cases remain in discovery.
- Ran `PW_PORT=4197 bash tools/gates.sh`: production build/typecheck, 1,000 unit
  tests, 132 Python tests, strict content, attribution and whole-repository
  Prettier pass. The project-base build also passes. Both browser gates fail
  before assertions because their preview servers cannot start. The script
  correctly exits 1 and still attempts project-base after the smoke failure.
- A direct Node listener reproduces the environment's localhost bind denial:
  `listen EPERM: operation not permitted 127.0.0.1:4197`. Playwright's server
  debug output also shows localhost connection `EPERM`. Browser assertions,
  screenshots and passing duration cannot be validated here.
- As in F-CI-CHECK, supplied `node_modules` points outside the writable worktree.
  Ran gates using a temporary dependency copy under `/tmp`, restored the original
  symlink and removed the copy afterward. No dependency or lockfile edits.
- Ran Prettier on all changed paths with `--ignore-unknown` (Markdown formatted;
  shell and Python have no installed Prettier parser), then checked formatting
  and `git diff --check`. Reviewed the final diff for scheduling-only scope:
  no application files, browser specs, package scripts or workflows changed.

## Follow-up

Measure smoke gate and hosted shard durations in an environment that allows
localhost preview servers. A smoke pass only establishes its selected coverage;
all CI shards and the separate project-base check must pass for full regression
validation. Existing optional visual-review opt-in remains as authored.
