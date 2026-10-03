# F-DAILY-TOUCH progress

## Changes

- Traced the Daily card to `shellBaseHref()` and `missionUrl()`: both dropped
  `touch=1`. Shared `shellUrl()` retains touch and tier preferences while
  clearing dive-specific params, including when boot params outlive a history
  change. Mission URLs retain both preferences; free-dive URLs already do.
- Pause-to-home and the mission debrief's fallback home navigation use the same
  route handling. Continue, mission/free-dive selection, globe selection and
  mission-to-free-dive navigation preserve the touch flag through their existing
  URL builders. Plain reloads keep the current URL.
- `detectTouchPrimary()` reads the existing `subexplorer.touch.v1` flag.
  TouchControls saves hardware detection, touch input and `?touch=1` activation,
  then restores `html.is-touch` on construction without waiting for another tap.
  Mouse/keyboard mode switching remains immediate; remembered touch capability
  remains available for the next boot. Storage failures fall back to hardware
  detection and URL forcing.

## Validation

- Regression tests cover Daily-card navigation under a project base, home and
  mission/free-dive URLs, desktop routes, boot-param retention, existing saved
  touch flags, hardware detection, invalid/blocked storage, forced/pointer/hardware
  reboots and mouse/keyboard switching. Focused run: 4 files, 31 tests passed.
- TypeScript strict check passed. Prettier applied to changed files.
- `tools/gates.sh --no-e2e` passed every available gate: production build
  (including strict TypeScript), 89 unit files / 905 tests, 126 Python tests,
  strict content validation, attribution and repository-wide Prettier.
- E2E cannot run in this sandbox; Playwright and project-base E2E are skipped.
- Vite's bundled config initially failed because the shared `node_modules`
  symlink targets read-only storage. Validation uses a local, ignored dependency
  wrapper with writable Vite cache directories and links to the same packages.
  The original symlink was restored after validation. No commits.

## Orchestrator gate follow-up

- The outside-sandbox run passed build, unit, Python, content, attribution,
  Prettier and project-base E2E. Main E2E passed seven tests, then logged
  `[WebServer] Terminated` during test 9 (Lost City mission flow). Fourteen tests
  were skipped by their existing conditions.
- Inspected all 215 failed-test blocks in `.cache/gates/e2e.log`: every block
  contains `ERR_CONNECTION_REFUSED` or `ECONNREFUSED` against preview port 4370.
  The first failure records refused asset requests in the already loaded Lost
  City page; later failures cannot load pages or fetch content. This is one
  preview-server lifetime failure, with no independent gameplay assertion
  failure in this run.
- Preserved the supplied log at `.cache/f-daily-touch/orchestrator-e2e.log` and
  extracted the counts into `.cache/f-daily-touch/orchestrator-diagnosis.txt`.
- Checked gate cleanup, Playwright launch/ownership and Vite shutdown handling.
  The gate deletes its temporary build only after both E2E gates finish;
  Playwright owns a separate process group and does not reuse a server by
  default. The supplied log does not identify who terminated the preview.
  A Vite stdin shutdown exits normally; the literal shell `Terminated` message
  does not justify treating stdin EOF as the observed cause.
- Requested the orchestrator's launch command and timeout/process-cleanup logs
  to identify the termination source. No application change, signal shielding,
  server restart workaround, assertion relaxation or extra skips are justified
  by this evidence. Main E2E still needs a run with a preview process that stays
  alive; it cannot be rerun in this sandbox. No commits.
