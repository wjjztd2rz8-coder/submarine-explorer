# P2 text size: Aa in Settings

## Plan and scope

1. Trace the existing UI scale and persistence path.
2. Merge Aa into the existing Settings scale row, cycling the existing steps.
3. Extend the settings capability spec; judge layout using DOM metrics only.
4. Run the focused checks and `tools/gates.sh`; record the results here.

No merge, push, commit, `tools/` edit or `plan/DIRECTOR.md` edit.

## Implementation

- `SettingsValues.uiScale` already exists in `src/core/Save.ts`: default 100,
  integer range 80–150, persisted under `subexplorer.settings.v3`.
- `stepUiScale` in `src/ui/Settings.ts` already advances to the next multiple
  of five. Aa replaces the existing + button and uses that helper, returning
  from 150 to 80. The slider, decrease button and separate percentage readout
  remain, preserving fine adjustment and the existing clipped-value guard.
- The existing `Save.save` listener in `src/app/systems/settings.ts` applies
  `--ui-user-scale` immediately. Home startup and dive resize restore it;
  `--ui-scale` multiplies it by the automatic viewport factor. No new key,
  config mutation, listener, HUD element or guidance surface is introduced.
- Both scale buttons have a minimum 44×44 CSS pixel tap target. Only the
  existing Settings scale rules in `predive.css` change. `hud-layout.css` and
  Home CSS remain untouched, including the short-phone HUD scale cap.
- The settings capability spec covers Home and dive at 1280×800, 390×844 and
  844×390: every five-point step, max-to-min wrap, live CSS scale, actual
  Settings font growth, saved value after reload, keyboard activation,
  readout clipping/overlap, button hit testing and unchanged grid/canvas
  geometry. The pre-dive capability spec keeps its existing slider and
  clipped-readout assertions and addresses Aa by its accessible name.

## Validation

Validation runs use `FULL_E2E=0 PW_RENDER_REVIEW=0 VISUAL_QA=0`.
The settings spec's existing screenshots now use the existing opt-in review
helper. No screenshots were generated or inspected, and no screenshot-based
layout judgments or visual approval are claimed.

- Focused unit checks: **4 files / 213 tests passed**, including a real
  Settings button dispatch through Save, the whole cycle, a saved value of
  137 between steps, and reset synchronization. Command:
  `node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/overlayFocus.test.ts tests/unit/predive.test.ts tests/unit/settingsScreen.test.ts tests/unit/settingsSave.test.ts`.
- `node_modules/.bin/tsc --noEmit`: **passed**.
- Changed-file Prettier and `git diff --check`: **passed**.
- Playwright discovery: **19 cases in the two affected e2e specs**, including
  all six new table-driven Aa cases.
- Focused browser execution: **blocked before tests**. The preview probe fails
  with `connect EPERM` on both `::1:4281` and `127.0.0.1:4281`; preview startup
  then exits 1. Log: `.cache/aa-e2e.log`. DOM metrics and browser persistence
  assertions are authored but could not be executed in this sandbox.
- Requested aggregate command:
  `FULL_E2E=0 PW_RENDER_REVIEW=0 VISUAL_QA=0 GATES_CONFIG_MODE=writable PW_PORT=4280 PW_OUTDIR=.cache/aa-validation-dist bash tools/gates.sh`.
  **Exit 1: `FAIL gates (e2e=smoke)`**. Config preparation, root and project-base
  builds, strict content, full unit suite, attribution and repository-wide
  Prettier passed. Full units: **192 files / 4,239 passed / 4 existing expected
  failures (4,243 total)**, 678.32 s. Python reports 5 failures among 167 tests:
  four build-manifest checks hit
  `spawnSync git EPERM`; the golden comparison tooling check receives empty
  output and fails JSON parsing. These checks do not exercise Settings.
  The same failures are documented in
  [the prior floor/ceiling fix](4000-S-fix-life-floor-ceiling.md).
  Root smoke and project-base browser gates could not start their preview
  servers, so no browser test ran. The focused Aa invocation above independently
  exposes the localhost permission error. No assertions were weakened or
  tests skipped to bypass these failures.
  Gate logs: `.cache/runs/20261025-181836-2-RJ3VCE/`.
- `git diff --exit-code -- src/styles/hud-layout.css src/styles/home.css src/app/systems/settings.ts src/core/Save.ts tools plan/DIRECTOR.md`:
  **passed**, confirming all those paths are unchanged.

The focused 213-test run includes the added button regression, which was added
while the aggregate unit run was already executing. Production behavior was in
place before both runs. The generated validation build was removed afterwards;
logs remain under `.cache/`.

## Screenshots for Claude to review afterwards

With `PW_RENDER_REVIEW=1`, the Aa cases in `tests/e2e/settings.spec.ts` expose
these opt-in shots through Playwright's per-test output directory:

- `settings-aa-{home,dive}-{desktop,phone-portrait,phone-landscape}-150.png`:
  Settings scrolled to Aa and the 150% readout, especially phone target spacing.
- `aa-{home,dive}-{desktop,phone-portrait,phone-landscape}-150.png`:
  Home and live HUD after closing Settings at maximum scale. The landscape
  HUD intentionally retains its existing short-phone scale cap.

Review readability, label balance and visual hierarchy in those views.
Automated acceptance uses DOM metrics; Claude owns screenshot review.
The task's explicit DOM-only and deferred screenshot-review instructions take
precedence over `CONTRIBUTING-AGENTS.md`'s generic screenshot inspection rule.
