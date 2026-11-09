# T-verify-first-sixty

Status: coverage implemented; browser acceptance blocked by this workspace's execution restrictions (2026-11-09).

Extended the existing first-minute capability in `tests/e2e/phone-accept.spec.ts` to the catalogue's 13 sites at 390×844 phone portrait, 844×390 phone landscape, and 1280×800 desktop: 39 cases. Every case selects its site from Home, reads the real briefing, verifies the resolved default Arcade mode and Low tier, and checks an ordinary mission URL without pose or briefing shortcuts. Unlocking the catalogue leaves onboarding and discoveries fresh.

The approach follows the visible guidance card through real touch gestures or keyboard input. The scanner's live objective/candidate check identifies the first objective and verifies eligibility; desktop pitch direction uses that same guidance check. No pose injection, target-coordinate lookup, physics replacement, scanner configuration change, or synthetic scan completion is used in this journey. Normal 100 ms frames preserve physics steps and scan time; the mission clock must advance the full 60 seconds even in CI. The wall-clock test budget is 15 minutes to accommodate software rendering without shortening game time. Guidance and modal checks run every half second, with the shared composed-HUD overlap guard every second. Each run attaches its guidance, scanner checks, commands and game time, plus screenshots.

After the first scan, the case surfaces, verifies the scan and primary-objective counts in the first debrief, closes it through Keep exploring, and proves piloting works again. It surfaces a second time and checks every debrief action before returning Home. Existing phone-specific settings, large-scale HUD, scan, Journal and exploration checks remain in the same capability spec.

## Simplicity and cuts

Replaced the narrower Titanic-only journey and the idle-only all-site loop with one table-driven capability. Removed the CI-only 30-second shortcut. The fresh tutorial now runs during the real approach, while the existing large-scale phone HUD test retains the 21-second idle marker assertion at both phone sizes without a site branch in the catalogue matrix. The native input driver also serves the existing scan helper. The spec is smaller overall. These cuts are logged in `CHANGELOG.md`.

No production, layout, art, site data, settings resolution or guidance surfaces changed. No behavior defect or art/design decision was confirmed: browser execution could not start. Existing visual/design backlog items remain outside this verification work.

## Validation

- `npm run typecheck`: passed.
- Attribution, repository-wide Prettier and `git diff --check`: passed.
- Focused guidance, first-movement, debrief-reopen and debrief-summary units: **283 passed across four files**, using the thread pool (`--pool=threads --maxWorkers=2 --configLoader runner --cache=false`).
- `npx playwright test tests/e2e/phone-accept.spec.ts -g 'guidance reaches first scan within sixty seconds and debrief exits' --list`: passed, 39 cases across all three viewports.
- The same targeted command without `--list`, also selecting the retained `briefing and opening HUD fit at large scale` regression: attempted; Playwright's preview server exits before tests run. A direct preview launch confirms `listen EPERM: operation not permitted 127.0.0.1:4161`.
- `GATES_CONFIG_MODE=writable PW_PORT=4161 bash tools/gates.sh`: invoked. Configuration, content validation and production build passed. Python ran 169 tests with five failures: four build-manifest checks encounter `spawnSync git EPERM`; the golden comparison subprocess supplies empty JSON. The unit stage produced no test results and was interrupted after several minutes. Gate result is **not green**; browser acceptance remains outstanding.

Writable config mode is necessary because dependencies are shared through a read-only symlink. Gate logs are under `.cache/runs/20261109-011322-2-ZOATyx/`. A retained preview build is under `.cache/first-sixty/dist/` for rerunning the targeted command with `PW_OUTDIR=.cache/first-sixty/dist` in an environment that permits the preview server and test workers.

## Verification rerun

Reviewed the matrix against the live scanner view, guidance priority, onboarding, native input bindings and debrief implementation. The first-minute pilot still makes its decisions from guidance and the scanner's own check; it does not use target positions. No additional production defect was confirmed.

- Repeated discovery with `--repeat-each=3 --list`: **117 cases**, covering all 39 site/viewport combinations three times. Listing establishes coverage only, not acceptance.
- Attempted the actual three-round run:

  ```sh
  GATES_CONFIG_MODE=writable PW_PORT=4161 PW_OUTDIR=.cache/first-sixty/dist npx playwright test tests/e2e/phone-accept.spec.ts -g 'guidance reaches first scan within sixty seconds and debrief exits' --repeat-each=3 --output=.cache/first-sixty/test-results
  ```

  It exits before any case runs because the preview cannot start. The retained large-scale opening regression was also selected in a separate attempted run. A direct preview again reports `listen EPERM: operation not permitted 127.0.0.1:4161`.

- Re-ran `GATES_CONFIG_MODE=writable PW_PORT=4161 bash tools/gates.sh`. Configuration, all 13 sites' content validation and the production build pass. Python again runs 169 checks with the same five failures: four `spawnSync git EPERM` failures and the golden-tooling subprocess's empty JSON result. The full unit stage was interrupted without test results; the gate is **not green**. Current gate logs are under `.cache/runs/20261109-074702-2-qXB31X/`.
- Focused units pass again: **283 tests across four files** in 60.29 seconds with `npx vitest run tests/unit/guidance.test.ts tests/unit/firstMove.test.ts tests/unit/debriefReopen.test.ts tests/unit/debriefSummary.test.ts --pool=threads --maxWorkers=2 --configLoader runner --cache=false --reporter=verbose`.
- TypeScript, attribution, repository-wide Prettier and `git diff --check` pass again.

The backlog remains IN FLIGHT. Browser execution, including the three requested rounds, is still outstanding; no visual or art conclusion can be drawn from these blocked runs.
