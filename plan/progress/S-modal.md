# S-modal — finish overlay ownership

2026-10-13; base `66da04a`; branch `codex/1580-S-modal-finish`.
Backlog item **S-modal** (brief item 12; now listed as S-modal remainder at
position 13 in `plan/DIRECTOR.md`). Stage 1 is merged; this follow-up completes
its deferred consumers and host teardown. **Implementation COMPLETE**; final
unit/build/format checks pass. Python/browser verification remains blocked by
this sandbox, as recorded below. No visual acceptance is claimed.

## Changes

- The existing `FocusTrap` stack owns Escape and Tab for Settings, mission
  briefing/debrief, Home, Pause, ControlsCard, Journal, PhotoMode and selected
  prop editing, alongside the already migrated Upgrades and Globe/chooser.
  Construction order no longer selects the overlay that closes.
- Shell pause and the closed Settings toggle use the same dispatcher's fallback
  subscriptions. The shell's modal guard list and capture listener are gone.
  The top overlay consumes Escape before its callback, including repeat events;
  opening/closing another overlay cannot handle that same event twice.
- Settings keeps binding cancellation, Tab cancellation, reset-confirmation
  cancellation, native form defaults, rebinding, toggle and typing guards.
  Its copied return-focus field/restore and independent capture handler are gone.
- Mission Escape means Keep exploring when resuming is possible. Aborted mission
  and free-dive power debriefs consume Escape without dismissing; Journal or
  Settings above them still closes first. Discovery's separate Escape handler,
  MissionRouter's capture handler and the power capture guard are gone.
- Home retains site-list back navigation and its site opener. Pause retains
  Objectives/Data credits back navigation. PhotoMode exits through the existing
  photo-system callback, restoring its camera and pending-input state.
- Onboarding device detection and audio unlock use passive observers inside
  the dispatcher, before the top overlay consumes a key. Pointer/touch device
  detection and audio gestures remain. Onboarding's two window keydown handlers
  and audio's independent keyboard capture registration are gone.
- The remaining prop-placement debug Escape registration now joins the stack
  while a prop is selected. Settings above it closes first; editing/nudging,
  deselection and the persistent debug panel remain. Its host disposes the
  keyboard entry and pointer handlers.
- Shared `FocusTrap.show()` / `hide()` replaces copied hidden/deactivation
  mechanics across the modal consumers. Eight duplicate visibility-state fields are
  removed in favour of stack membership. Briefing, Settings, Globe and
  ControlsCard reuse `ui/dom.ts` rather than copied element factories. First Tab selects an opening dialog's
  control; held Space cannot activate an automatically focused dialog button.
  Home keeps its established primary Dive focus.
- Shell, Discovery, MissionRouter, Settings, PhotoMode and both hosted Globes
  now dispose their UI owners.
  Globe disposal is idempotent, prevents reopening and ignores late catalogue
  completion. Pending MissionRouter discovery/start callbacks cannot start a
  disposed dive. Separate shell/globe/key cleanup scopes preserve host lifetimes.
- Removed obsolete power/onboarding/Settings listener-precedence comments in
  `src/app/systems.ts` and system modules. Initialization dependencies, frame
  order and `app:state` contracts remain.

## Simplicity and scope

Work only serves **S-modal**. No new screen, guidance, setting, layout change,
site branch, config mutation or dependency. Shared lifecycle and keyboard helpers
replace consumer copies; production source is **54 lines smaller overall**
(304 insertions / 358 deletions). No capability
was cut, so no cut entry is required in `CHANGELOG.md`. No appearance tuning or
visual acceptance. `plan/DIRECTOR.md` and `tools/` are unchanged. No merge, push
or tag. No commit was created: this workspace grants read-only access to Git
metadata.

## Capability coverage

Extended `tests/unit/overlayFocus.test.ts` (46 cases total): actual Settings,
ControlsCard, Briefing, MissionRouter, free-dive power/debrief, Home, Pause,
Journal, PhotoMode and selected prop lifecycles. Checks nested Escape, repeat
suppression, init-order independence, forward/reverse Tab reachability, eligible
focus return, binding/reset cancellation, non-dismissible debriefs, passive
observation and both hosted Globes' teardown/late catalogue behavior. The stage 1
focus-eligibility, nested-removal, Upgrades and Globe controls regressions remain.

Existing shell regression outcomes are unchanged; fixtures now register their
overlay policies rather than relying on the removed shell guard list. Existing
Home/Journal/photo fixtures perform final disposal; Daily and Journal async
fixtures use the shared lifecycle API. Mission host tests assert router disposal. Audio gesture/restart
assertions remain and now check unlock through a consuming modal. No assertion
that guards an existing player bug was weakened and no tests were skipped.

Added a keyboard-only regression to the existing `tests/e2e/settings.spec.ts`:
Tab/Enter reaches Settings and Journal from Pause, Escape dismisses one owner
and restores its opener, then a separate Escape resumes the dive. No screenshots
or appearance assertions added.

## Verification

- Typecheck: PASS.
- Overlay capability unit suite: PASS, 46 tests.
- Audio keyboard/touch unlock integration: PASS, including consumed Escape.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`: final-source run
  under `.cache/runs/20261013-075900-2-Tq74Ai/`. **PASS**: content, build,
  full unit, attribution and Prettier. **FAIL / environment-blocked**: Python
  manifest subprocess checks only (details below); overall gate exit 1.
- Final full unit suite (`npm test -- --configLoader runner --cache=false`,
  invoked by that gate): **PASS, 192 files / 2,061 tests**, 345.22 s. This run
  uses the final source and fixtures. No tests skipped.
- Production build: **PASS**, including TypeScript, ordinary public copy and
  service-worker stamping, 282 modules. Both root and project-base builds ran.
  Existing large-chunk warning remains. Gate writable-config mode bundles the
  unchanged Vite config locally; it disables no production plugin or assertion.
  An independent root build also passed using the stage 1 temporary config
  re-export method in `/tmp`.
- `npm run format:check`: **PASS**, repository-wide. `git diff --check`: **PASS**.
- Default full-stage gate attempt:
  `GATES_CONFIG_MODE=writable PW_PORT=4180 bash tools/gates.sh`, logs under
  `.cache/runs/20261013-074932-2-nhKQUw/`: build, content, attribution and
  Prettier passed. The initial unit run exposed old Home/Journal fixtures and a
  mission teardown assertion against the earlier loaded system module; these
  were corrected and their affected capabilities passed before the final rerun.
- Python gate: **environment-blocked**, 161 / 165 tests pass. Four
  `test_ci_build_manifest` cases fail because sandboxed Node rejects
  `spawnSync git` with `EPERM`. Reproduced by the final gate. No `tools/`
  source or test was changed and no assertion was weakened.
- Browser smoke, project-base and the new keyboard-only regression:
  **environment-blocked before tests execute**. Playwright cannot start its
  preview server. Direct reproduction:
  `npm run preview -- --port 4181 --strictPort --outDir dist-S-modal --configLoader runner`
  reports `listen EPERM: operation not permitted 127.0.0.1:4181`. The focused
  browser attempt used an isolated build/port and preserved all assertions.
  The final gate rerun omits repeated browser startup after this confirmed
  environment denial. No test skips were added and no screenshots/appearance
  acceptance is claimed.

## Remaining

No deferred S-modal source migration remains. Run the four blocked Python
manifest checks and browser smoke/project-base/keyboard-only regressions in an
environment that permits Git subprocesses and localhost listeners. Claude
retains visual review. Changes remain uncommitted because Git metadata is
read-only in this workspace; no merge, push or tag was attempted.
