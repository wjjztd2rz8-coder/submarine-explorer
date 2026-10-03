# F-BUGHUNT-11 — gate defaults and CI coverage audit

2026-10-03. Verified F-CI-SPLIT and audited gate callers and documentation.
No application code, test content, package scripts or CI scheduling changed.
No commit, push or hosted workflow run.

## Findings and fixes

- CI runs unfiltered `npm run test:e2e` across all 16 shards with `CI: true`,
  test-level sharding and one worker. Static and project-base checks remain
  separate required jobs. `npm run ci` still runs the full browser suite.
- The default local gate correctly selects the existing smoke spec plus
  project-base, while retaining all six static gates. A nonempty `CI` or
  `--full-e2e` selects full discovery. Explicit `--no-e2e` remains static-only.
- `tools/codex-task.sh` previously provided no full-suite opt-in and discarded
  the mode line from its result summary. Added `FULL_E2E=1` to pass
  `--full-e2e` on every feedback round, retained the mode in results, and made
  feedback name the actual gate command. Invalid values fail before launching
  Codex. The local default stays smoke; inherited `CI` still selects full.
- `tools/resume.sh` loads `plan/RESUME-PROMPT.md`. Updated that prompt to
  distinguish routine feedback from package acceptance and to require full
  gates on the final main commit before pushing, since Pages runs independently
  of CI. Package screenshots must come from a fresh full run.
- Updated Phase D briefs/contracts/process, Phase F operating rules, title
  acceptance, deployment docs and the deployment workflow comment. Phase D's
  existing full-suite contracts now launch the wrapper with `FULL_E2E=1`.
  Queue metadata already passes this environment option through the dispatcher.
- Searched `tools/`, `docs/`, `plan/`, `.github/`, README and contributor docs
  for gate callers, full-suite claims and screenshot requirements. The only
  executable gate caller is the task wrapper; status tools only observe logs.
  Historical progress/QA/archive records retain their original run descriptions.
  Corrected still-actionable full rerun commands in F-BUGHUNT-4/-5/-FIXES and
  F-LOSTCITY-MIP-VERIFY to include `--full-e2e`. Current instructions make
  explicit when full regression coverage is required.
- Logged the wrapper behavior change in `CHANGELOG.md`.

## Validation

- Existing offline gate and dispatcher suites: **9 tests passed**, including
  smoke/static/project-base retention, unfiltered full opt-in and CI default,
  invalid flags, preview ownership/cleanup and failure propagation.
- Isolated task-wrapper checks: **6 cases passed** (default smoke, explicit full,
  inherited CI, full-mode retry, failed gate exit and invalid option). Verified
  actual command arguments, result mode lines and retry feedback. Temporary
  command shims were outside the repository; test files were not changed.
- Using the actual CI workflow command and `CI=true`, compared full discovery
  with all 16 shard lists: **252 tests in 49 files**, each assigned exactly once.
  Twelve shards contain 16 tests and four contain 15. Local smoke discovers
  three tests; project-base discovers one. Existing optional visual-review
  opt-ins and conditional skips remain unchanged. Discovery verifies selection,
  not browser execution or hosted passing duration. Lists and the comparison
  summary are saved under `.cache/f-bughunt-11/`.
- Ran `PW_PORT=4299 tools/gates.sh`: **PASS build, unit (99 files / 1,044
  tests), Python (136 tests), strict content, attribution and Prettier**.
  **FAIL e2e and e2e-base at preview startup**, before browser assertions. The
  project-base build passes, the base gate still runs after smoke fails, and
  the gate script exits 1. Direct Vite preview confirms `listen EPERM`
  (`operation not permitted`) on `127.0.0.1:4299`. No browser pass or fresh screenshots
  are claimed. Logs: `.cache/gates/`, `.cache/f-bughunt-11/gates.log` and
  `.cache/f-bughunt-11/preview-startup.log`.
- Shell syntax, final formatting and `git diff --check` pass. Confirmed no
  changes to `tools/gates.sh`, `.github/workflows/ci.yml`, package scripts,
  application code or test files.
- The supplied dependency symlink points outside the writable worktree. Checks
  used a temporary dependency copy under `/tmp/f-bughunt-11-validation`, without
  its nested absolute `node_modules` symlink. Restored the original worktree
  link and removed the temporary copy after validation; no dependency or
  lockfile changes.
