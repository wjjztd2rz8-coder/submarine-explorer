# R-ci-green: bounded settings capabilities

## Findings and change

Reviewed the two reported timeout paths in three rounds: trace navigation and
frame ownership, simplify the test sessions, then check assertion coverage and
run validation.

The Aa case left the real animation loop running during every click, tap,
keyboard action and DOM assertion. Pausing the game through Settings does not
stop `render.draw`; software WebGL can still compete with browser automation
on the hosted runner. It now uses the existing paused-clock helpers, pumping
frames for initial/reloaded readiness and the final layout observation.

The phone matrix previously shared one test budget across three quality tiers,
three reloads and 27 mode/scale combinations. Each tier now has its own isolated
capability case with one reload and nine live mode/scale combinations. Across
all cases, every original combination remains covered. This trades the old
four boots per matrix for six isolated boots, while keeping the total number
of persistence reloads at three and reducing each case to one. Redundant menu
cleanup between tiers disappears. Both scale capabilities enforce a 60 s test
budget; this is a guard, not a measured hosted timing result.

Neither reported case waits on a separate event that can never fire: the Aa
case used game-ready polling, and the matrix already pumped clock frames.
The two other settings actions that initiate reloads now observe
`domcontentloaded`, then game readiness, rather than waiting for all page
subresources through `load`.

All 95 original expectation blocks are unchanged in order, ignoring whitespace:
saved/in-memory/CSS scale equality, readouts,
reload persistence, actual booted tier, keyboard cycling, minimum touch target,
readout clipping/overlap/reachability, Home/HUD grid and canvas invariance,
Advanced panel/mode overflow, and rotation at 150%. There are no production,
dependency, global timeout, quality or assertion changes. Existing helpers are
reused; the tier loop moves from execution to test declaration and the
between-tier menu cleanup is removed. Tests use capability names.

These mechanisms are established by source inspection. Fetching the supplied
hosted run through `gh run view 40331865229 --log-failed` failed to connect to
`api.github.com`; the exact hosted blocking call and runner timings remain
unverified.

## Validation

- Typecheck passes.
- Targeted unit suite passes: **6 files, 255 tests**, 2.13 s (`overlayFocus`,
  `settingsSave`, `settingsScreen`, `predive`, `uiHud`, `mobileResize1350`), using
  `vitest run --configLoader runner --cache=false`.
- Repository-wide Prettier, attribution and `git diff --check` pass.
- Playwright discovery with `--repeat-each=2` finds **52 executions**: all 26
  settings cases twice in the configured Chromium project, including desktop,
  portrait and landscape cases. No project filter is applied.
- Attempted the actual two-repeat run with hosted settings:

  ```sh
  CI=1 GATES_CONFIG_MODE=writable PW_OUTDIR=dist-settings \
    npx playwright test tests/e2e/settings.spec.ts --repeat-each=2 \
    --retries=0 --output=.cache/settings-repeat --reporter=list
  ```

  It exits before any test body because the preview server cannot start.
  Starting the same preview directly confirms `listen EPERM` on
  `127.0.0.1:4371`. Logs: `/tmp/settings-repeat.log` and
  `/tmp/settings-list.log`. Browser assertions, screenshots and the 60 s hosted
  target are **not verified**.

- Attempted `FULL_E2E=1 GATES_CONFIG_MODE=writable bash tools/gates.sh --full-e2e`.
  Content validation and the full production build pass. Python runs 167 tests
  with five failures: four build-manifest subprocess checks report
  `spawnSync git EPERM`; the golden-tool subprocess check fails its output
  assertion. The full unit phase emits only its RUN banner and is interrupted
  with exit 130 after making no further progress. Logs:
  `.cache/runs/20261026-094805-19-esLX1h/`.
- A second diagnostic full-gate attempt reaches every phase. Its only command
  adjustment is an exported shell function that runs `npm test` through
  `timeout 60s`; all other npm invocations run normally. This bounds the stalled
  unit subprocess without editing the gate or skipping later phases:

  ```sh
  npm() {
    if [[ "$1" == test ]]; then
      timeout 60s "$(type -P npm)" "$@"
    else
      command npm "$@"
    fi
  }
  export -f npm
  FULL_E2E=1 GATES_CONFIG_MODE=writable bash tools/gates.sh --full-e2e
  ```

  Content, build, attribution and repository-wide Prettier pass. Python has
  the same five failures. The full unit phase times out without results.
  Root full-suite e2e and project-base e2e both fail before browser startup
  because their preview servers cannot start. The project-base production
  build succeeds before that failure. Logs:
  `.cache/runs/20261026-095125-7-62FZ9c/` and
  `/tmp/settings-gates-bounded.log`.

The full gate and hosted/browser acceptance are not claimed green.
