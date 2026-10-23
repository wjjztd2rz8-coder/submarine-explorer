# 3260 — R-ci-green Chromium install

Item: **R-ci-green**. Scope: hosted Chromium setup; no gameplay or assertion changes.

## Evidence

Audited [CI run 39889492252](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39889492252),
SHA `a8490bdac8652f36654f0dc9dfc23016f8c65936`. Thirteen browser jobs
failed in `Install Playwright Chromium`, including project-base.
`gh run view --log-failed` returned no text for this run and run 39802535646;
retrieved individual logs with `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<id>/logs`.
Raw evidence: `.cache/chromium-install/{latest.json,project-base.log,shard5.log}`.

[Project-base job 120205664964](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39889492252/job/120205664964)
starts apt at 02:26:16 UTC. Its first installer attempt times out at
02:28:15; attempts two and three fail on `/var/lib/dpkg/lock-frontend`, held
by the same process, `2575 (apt-get)`. That process continues downloading
packages after the final retry. More retries would retain the privileged
process/lock failure mode. Shard 5 independently exhibits the same sequence.
The apt output lists the Chromium runtime libraries as already installed;
requested additions are fonts/X server packages. All four browser job definitions
use the hosted `ubuntu-24.04` image and headless Playwright.

## Change

Use one local composite action for CI e2e, project-base, nightly diagnostics
and nightly capability review. It caches Playwright browsers by Ubuntu image,
architecture and lockfile, then runs `npx playwright install chromium`, including
on cache hits so partial caches are repaired. Playwright selects the browser
revision from the installed dependency. Hosted runtime libraries supply the OS
dependencies; setup no longer invokes apt or the timed retry helper. Each caller
retains its eight-minute bound. Nightly retains the installer log artifact.

Net simpler: consolidate three duplicated cache blocks and four installer calls
into one cache/install definition; no custom retry or process cleanup added.
The existing helper and its tests remain untouched because `tools/` is outside
the authorized edit scope. No site branches, package-number comments, dependencies,
or weakened regression assertions. No push, merge or tag.

## Validation

- Workflow lint: `actionlint` passes for both changed workflows.
- Checked all four callers: hosted Ubuntu 24.04 and eight-minute step bound.
- Executed the actual composite shell with stubbed commands: the invocation
  requests only the browser; apt/sudo are forbidden; success and exit 23 both
  propagate correctly through `tee`, and the log file is retained.
- Executed the actual composite shell against an empty isolated browser cache,
  then against the populated cache. Both pass. Fresh Chromium launches and
  successfully handles a page/button interaction without OS installation.
  Evidence: `.cache/chromium-install/browser-probe.log`.
- Existing Playwright configuration capability tests pass: one file / seven tests.
  Evidence: `.cache/chromium-install/config-probe.log`.
- Aggregate invocation: `GATES_CONFIG_MODE=writable PW_PORT=4391 bash tools/gates.sh`.
  **PASS gates (e2e=smoke)**, exit 0. Python (167 tests), strict content,
  TypeScript/production build, unit (192 files; 3,776 passed and four expected
  failures; 817.72 seconds), root smoke (three tests), project-base (eight tests),
  attribution and repository-wide Prettier all pass. This is the default smoke
  gate, not the full hosted e2e suite. Evidence: `.cache/chromium-install/gates.log`
  and `.cache/runs/20261022-223216-8-L64tzJ/`.
- `git diff --check` and focused Prettier pass.

Hosted validation requires a future run after these changes are integrated;
no hosted green claim is made.
