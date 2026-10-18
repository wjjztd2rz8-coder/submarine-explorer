# R-merge-verify — 2026-10-18

Gate guard implemented; merge guard still needs the actual merge entry point.

## Change and evidence

`tools/gates.sh` now ends with `PASS/FAIL gates (e2e=smoke|full|none)`.
Checks/build-only phases report `none`. Local smoke keeps smoke and project-base,
and adds one explicit array of existing specs when the branch diff from the
merge base with `main`, tracked working changes, or untracked files touch
`data/landmarks/`, `src/game/Spawn.ts`, `DeepOpeningSpawn.ts`, or camera source:

- `opening-framing.spec.ts`: authored spawn, mission approach, camera clearance
  and chase-radius assertions.
- `d2-camera.spec.ts`: chase framing, free look and reset controls.
- `d-input-hud.spec.ts`: drag/orbit and wheel radius behavior.
- `f-bughunt-18.spec.ts`: reset/zoom/photo and site-specific radius regression
  assertions, including the Titanic expectation fixed in 9b57c01.

These were selected by grepping existing e2e assertions for spawn/camera/radius.
Full mode already includes them; explicit `--no-e2e` still means no browser tests.
No player-facing UI, settings, visuals, gameplay assertions or timeout changes.

## Unfinished merge guard

There is no merge helper or git/PR merge invocation under `tools/` in this
checkout (also checked the main checkout's tools). `tools/resume.sh` launches
Claude with `plan/RESUME-PROMPT.md`; that prompt's collect-work section tells
Claude to merge directly, and its push rule explicitly says merges do not wait
for CI. A new unused helper would not guard that path. Asked for the intended
helper location; did not edit the prompt or add an unconnected helper outside
the authorized two-file tooling scope. This item is not complete or merge-ready.

## Validation

- `bash -n tools/gates.sh` and `git diff --check`: pass.
- Offline checks in `/tmp/r_merge_verify_checks.py`: 26 pass, using the existing
  gate-command harness with external commands stubbed. Cover committed, dirty
  and untracked sensitive paths, unrelated paths, smoke/full/none, CI selection,
  checks-only summary and failure propagation. This is orchestration validation,
  not a browser pass.
- Existing `python3 -m unittest tools.tests.test_gates -v`: now **18 pass** after
  the follow-up correction below. The exact gate-order assertion is preserved
  and now requires the final summary too.
- Targeted Vitest with existing `--configLoader runner --cache=false`:
  `heroMissionSpawn`, `freeDiveComposition`, `cameraControls`, `cameraCeiling`:
  **33 tests pass in 4 files**.
- Playwright `--list` for the array: **114 tests discovered in 4 files**.
  Execution attempted; preview startup fails. Debug output reports localhost
  connection `EPERM`; no browser assertion ran, no visual acceptance claimed.

## Environment failures

`tools/gates.sh` was run with default smoke mode. Build/unit and project-base
build could not write config bundles to the read-only shared
`node_modules/.vite-temp` (`EROFS`); root e2e correctly refused without a build.
Content, attribution and Prettier passed. The Python suite ran 166 tests with
6 failures: the one summary-output mismatch above, four manifest checks failing
on Node `spawnSync git EPERM`, and a golden child-process check ending in
`Unexpected end of JSON input`. A baseline run of the same 166 Python tests,
substituting the original `HEAD:tools/gates.sh` only in the harness's source read,
reproduced those five failures and passed all gate tests. Baseline log:
`.cache/r-merge-verify-python-baseline.log`. The golden failure's root cause is
unclassified; it predates this edit. The four manifest failures are explicit
sandbox process errors.

Retried using the existing supported configuration, without changing tooling:
`GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/r-merge-verify-dist tools/gates.sh`.
Config bundling, content, build, the full unit suite (**3,224 tests in 192 files**),
attribution and Prettier passed. Python still has the six failures separated above. Both browser gates
failed at preview startup; project-base built successfully first. Final result:
`FAIL gates (e2e=smoke)`. Logs:
`.cache/runs/20261018-112337-2-yZEj7x/`.

`gh run list --workflow CI --branch main --limit 1 --json
databaseId,status,conclusion,headSha,url` failed connecting to api.github.com.
Current hosted CI state is unverified. No merge, push or tag was performed.

## Outside-sandbox feedback and correction

The orchestrator's run at `.cache/runs/20261018-113327-2418592-liGiwd/`
passed content, build, all 3,224 unit tests, smoke e2e, project-base, attribution
and Prettier. Its sole failure was the old exact-output expectation in
`test_canonical_order_and_checks_phase`; the five local baseline failures did
not reproduce outside the sandbox.

The follow-up instruction to fix that root cause authorizes updating the
existing `tools/tests/test_gates.py`. Its expected output now includes
`PASS gates (e2e=none)`; no assertion was removed or weakened. Existing tests
also require smoke/full/none and failure summaries. One additional test uses
real temporary Git repositories to check 24 committed, dirty and untracked
path cases against the exact expected spec list, including unrelated CSS/docs.
Full and no-e2e modes are checked with sensitive diffs as well.

After correction, `npm run test:py` ran 167 tests locally: all 18 gate tests
pass, with only the same five baseline sandbox failures remaining. Log:
`.cache/r-merge-verify-python-followup.log`. A complete outside-sandbox gate
rerun after this test-only correction is still pending. The missing merge-helper
entry point remains unresolved; this item is not fully implemented.
