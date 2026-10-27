# R-ci-green / S-verify: e2e spec drift guard

2026-10-27. Base: `ea2626d56ffc5f23bace68d0aaf29240538a5128`.

Added one standing instruction to the initial prompt in `tools/codex-task.sh`:
packages changing behaviour must grep `tests/e2e` for the affected capability
and run matching cases with `npx playwright test <spec> -g '<test name>'`
before reporting. The instruction applies with or without browser access.
This keeps the existing workflow and adds no test machinery or dependencies.
No product or spec changes were needed from the evidence available locally.

Hosted CI remains **unverified**. Attempted:

```sh
gh run list --branch main --limit 8 --json databaseId,headSha,status,conclusion,name,createdAt,url
```

Exit 1: `error connecting to api.github.com`. This task runs with `NET=0`;
no hosted run status, job logs or failing shard evidence could be retrieved.
The checkout already contains the legacy-save and float32 audio spec fixes
from `b8e13c7f`, described in `plan/REVIEWS.md`. That is not evidence of a
green hosted run. When network access is available, rerun the command, inspect
any failing e2e jobs by spec, and fix and rerun the affected cases before
claiming R-ci-green complete.

Validation:

- `bash -n tools/codex-task.sh`, `git diff --check`, and Prettier on this
  progress note pass.
- A temporary Bash harness evaluated the actual initial prompt assembly with
  and without a browser note: the reminder, optional browser note and original
  brief were preserved in order. No test files were added.
- Targeted browser attempt (exit 1 before tests ran):

  ```sh
  GATES_CONFIG_MODE=writable PW_PORT=4196 PW_OUTDIR=.cache/runs/20261027-103042-2-DCnEDt/dist npx playwright test tests/e2e/journal-debrief.spec.ts tests/e2e/f3-audio.spec.ts -g 'legacy save persistence|modal gestures' --output=.cache/spec-drift-results
  ```

  Repeated with `DEBUG=pw:webserver` to diagnose startup: localhost connections
  to both `::1:4196` and `127.0.0.1:4196` fail with `EPERM`, and the web server
  exits 1. Evidence: `.cache/spec-drift-e2e.log`. This did not verify either
  repaired spec.

- `GATES_CONFIG_MODE=writable PW_PORT=4195 tools/gates.sh`: **exit 1,
  `FAIL gates (e2e=smoke)`** (default smoke plus project-base mode). The writable
  config mode avoids writing config bundles into the shared dependency tree. Logs:
  `.cache/runs/20261027-103042-2-DCnEDt/`.

  Config preparation, content validation, root TypeScript/production build,
  units (192 files / 4,336 tests), attribution and repository-wide Prettier
  pass. The project-base build also passes. Smoke and project-base browser
  gates both fail before tests run: `Process from config.webServer was not
able to start. Exit code: 1`. Actual local browser coverage: **none**; the
  full e2e suite was not run.

  Python: 167 tests, 162 passed and 5 failed. Four CI-manifest
  tests fail with `spawnSync git EPERM`; golden tooling fails with
  `Unexpected end of JSON input` while parsing a child command's output. These
  match the existing failures recorded in
  `plan/progress/3850-S-bughunt-journal-scan-reward.md`. No assertions were
  weakened or unrelated tooling changed.
