# S-bughunt — Settings header shortcut transitions

Backlog item **8, S-verify / S-bughunt [Codex, standing]**, 2026-10-20.
Audited HEAD `bd2e569701ee5aba039b3ea44a3b622d3839ebfd`, specifically
`863b865f682a108f983dd0f9afec5f60ddba487b^..863b865` in
`src/ui/Settings.ts`. Subsequent changes to that source are formatting only.
Run 67 identified the dive's Device layout button taking focus ahead of Back
in Controls; the audited fix assigns its `hidden` state from the resolved pane.

## Ownership and prior evidence

Read the Director rules/rubric, newest joint review (2026-10-20), overnight
runs 66–69, the Settings diff, and completed 2750's brief/result/progress.
2750 already fixes touch suppression, hidden focus requests and lingering
binding capture; those assertions and production behavior are preserved.
2790's brief and available run log review the earlier merge batch, including
`76a325e`'s touch focus/capture fix. Its last report file is empty and no
separate result/progress file remains in this checkout; its available log is
evidence, not a passing browser check.

Before editing, rechecked queued/launched briefs, available reports and all
active worktree file lists. 2810's active diff/progress owns scene/resource
teardown, late callbacks and the Low journey; it has no Settings.ts or
overlayFocus.test.ts edit. 2800 owns Lost City/Beebe numerics and sessile
geometry; 2820 owns scan/fidelity CI watch; 2830 owns steel shader/wrecks
coverage; queued 2850 owns power initialization. Monterey files remain excluded,
even though the current Director records that visual package as merged.
Challenger's active lander edits and main's Director edit are also excluded.
No overlapping file ownership was taken.

## Clean production result and regression protection

**No new correctness bug reproduced. No production change.**

The existing `settings.spec.ts` keyboard-only Pause/Settings/Journal case
already asserts Back is focused after entering dive Controls, then checks
Escape returns focus to Pause's Settings invoker. Its other Controls case
checks Tab containment and axe. `d-input-hud.spec.ts` checks the Controls pane
and Back navigation. These browser specs were inspected read-only.

Existing Settings cases in `overlayFocus.test.ts` cover visible descendant
focus, touch suppression, binding capture cancellation, repeated dismissal,
held-key protection and connected invoker return, but instantiate Settings
without the dive-injected `.settings-layout-open` button. They do not guard
that button's visibility, restoration or nested guide focus return.

Added five cases to that existing capability spec, using the actual
SettingsScreen, Input, Save, ControlsCard and FocusTrap with its existing
EventTarget/DOM fixture. Injection matches onboard's existing extension point:
a button immediately after Controls, opening the real device guide. No
source-text assertions, new fixture machinery or routing edits were added.

To establish regression sensitivity, a temporary ignored Vite load plugin
substituted Settings.ts from `863b865^`, leaving working production source
untouched. The five selected cases produced **3 failed / 2 passed / 118
unselected**: both dive entry paths and the touch-transition case fail because
the visible shortcut receives initial focus instead of Back; both Home-style
cases without the shortcut pass. Log: `/tmp/2840-parent.log`. The temporary
config was removed. All five cases pass against audited HEAD.

## Shortcut / pane / focus matrix

| Instance and transition                                         | Observed headless behavior                                                                                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dive, direct `open(); showControls(true)`                       | Shortcut hidden and absent from focusables; Controls pane visible; Back receives initial focus.                                                                                     |
| Dive, Settings → Controls button                                | Same pane/shortcut/focus result; complete forward and backward Tab cycles stay inside visible Settings descendants.                                                                 |
| Controls → Back to Settings                                     | Bindings pane hidden; title becomes Settings; Controls focused; next Tab reaches the restored shortcut.                                                                             |
| Restored shortcut → device guide → Escape                       | Real guide opens and closes; Settings stays open; focus returns to the connected shortcut.                                                                                          |
| Three open/close cycles per entry/instance combination          | Opening retains held-key protection; Escape from either pane and Close from Settings restore the connected external invoker. Reopen resets to Settings.                             |
| Home-style Settings without injected shortcut, both entry paths | Back remains first in Controls; returning to Settings focuses Controls; repeated dismissal/restoration works without a missing-element error.                                       |
| Keyboard Controls → touch class → Controls request              | Request resolves to Settings; rebinding pane, Controls and Back remain hidden; shortcut becomes visible and receives focus, opens the touch guide and regains focus on guide close. |
| Touch → keyboard Controls request                               | Shortcut hidden again; pane visible; Back focused; Escape returns to the outer invoker.                                                                                             |

Touch assertions only establish the new shortcut's behavior around the already
approved suppression. Existing rebinding tests are unchanged. No Home routing,
active journey or broader device-guide behavior was reimplemented.

The existing fixture models visibility and focus but permits direct `focus()`
on hidden elements. Evidence here is the actual screen's hidden flags,
FocusTrap traversal and active element after transitions. Clicks dispatch the
real button listeners; browser layout and native Enter/touch activation are
not established by this fixture.

## Simplicity and rubric

No UI surface, guidance, setting, dependency, site branch, runtime config
mutation, layout patch or visual change. The title matches the displayed pane,
Back remains the first usable Controls action, and Device layout remains usable
when returning to Settings. This supports clear information, simple behavior
and accessible keyboard/touch operation. Rewards are unaffected. Beauty,
composition, phone appearance and screenshot acceptance remain with
Claude/owner.

## Checks and limits

- Focused headless run: **4 files / 180 tests PASS**, exit 0, 2.59 s:
  `npm test -- --configLoader runner --pool=threads --cache=false tests/unit/overlayFocus.test.ts tests/unit/settingsScreen.test.ts tests/unit/settingsSave.test.ts tests/unit/settingsPalette.test.ts`.
  Log: `/tmp/2840-capabilities.log`.
- Required gate command:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Logs: `/tmp/2840-gates.log` and `.cache/runs/20261020-171639-28-fsdznS/`.
  **Incomplete, exit 130**: the default fork-pool unit stage emitted only its
  RUN header for about ten minutes and was interrupted. Config/content/build
  completed; the Python stage failed as detailed below. No unit assertion
  results or full-suite pass were obtained from this invocation.
- Python gate: **FAIL, 5 failures / 167 tests**. Four unchanged build-manifest
  cases report `spawnSync git EPERM`; the unchanged golden-tooling wrapper
  reports `Unexpected end of JSON input`. These match prior 2750/2810 reports;
  tools and assertions were not changed.
- Config preparation, strict content validation and production build/typecheck:
  **PASS**. Attribution and repository-wide Prettier were not reached by the
  interrupted gate; separate results follow below.
- Separate attribution check: **PASS**, 14 assets, exit 0
  (`/tmp/2840-attribution.log`). Repository-wide `npx prettier --check .`:
  **PASS**, exit 0 (`/tmp/2840-prettier.log`). Final owned-file formatting
  and `git diff --check`: **PASS**.
- Because earlier audits recorded full-suite fork-pool stalls, also started
  the full unit suite with `--pool=threads --configLoader runner --cache=false`.
  It also emitted only its RUN header for about ten minutes and was interrupted
  (**exit 130**, `/tmp/2840-unit-threads.log`). These are execution stalls with
  cause unestablished here, not demonstrated assertion failures or passes. A
  default-pool environment probe of settingsPalette passed all 6 tests
  (441 ms, `/tmp/2840-fork-probe.log`); this alone does not establish full-suite
  completion. No tooling, pool configuration or test timeout was changed.
- Actual e2e mode: **none**. No smoke, full e2e, project-base browser assertions,
  game rendering, screenshots or real-phone acceptance were attempted. Wrapper
  PASS labels in older result files do not establish those checks ran here.

Only `tests/unit/overlayFocus.test.ts` and this progress note are changed.
No source, CSS, e2e, tooling, Director, snapshot, budget or timeout edits;
no retries/skips added, merge, push or tag.
