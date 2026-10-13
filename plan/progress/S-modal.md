# S-modal — overlay ownership, partial implementation

2026-10-13; base `075c264`; branch `codex/1540-S-modal-overlay-stack`.
Backlog item **S-modal**, priority 12, remains **INCOMPLETE** until the owned
consumers and system-order integration can be converted. No visual acceptance
is claimed.

## Ownership and pending work inspected

The worktree started clean. Inspected live worktree status, branch changes
against main and commits awaiting collection, then read the pending S-flow and
S-rov source changes before selecting consumers. Rechecked ownership during
implementation and before final checks, including the launched S-dead,
S-unused and S-boot briefs and progress notes.

- **S-flow:** `claude/S-flow` at `abd6d24`, not merged into this base. Its shell,
  Settings, MissionRouter, onboarding, Home/Briefing/Pause UI, context, docs and
  owned tests remain excluded. Its pending shell removes the pause site list;
  its Settings change removes control tips; its MissionRouter adds banner
  stars; its onboarding changes tutorial behavior. Their existing Escape
  contracts still need migration after collection.
- **S-rov:** `codex/1496-s-rov` at `3e71e33`, not merged, plus live edits to its
  progress note and app-system/save tests. Its registry, power/input/runtime
  integration and app-system tests remain excluded. Its pending registry
  removes ROV while retaining the power/onboarding/Settings ordering comments;
  its power changes remove ROV drain without replacing the Escape guard.
- **S-dead:** live edits include Journal, PhotoMode, Debrief, GlobeModel,
  FieldGuide and other consumer/helper files. Those files remain excluded;
  the new helpers have not landed in this base. No helper implementations or
  DOM construction copies were migrated here.
- **S-unused/S-boot:** their launched scopes and live changes do not own the
  three source files changed here. Catalogue sharing is explicitly deferred
  in S-unused; S-boot is limited to its new lifecycle module and coverage.
- `FocusTrap.ts`, `Upgrades.ts`, `Globe.ts`, the new overlay capability spec and
  this progress note were available. No shared README/CHANGELOG, protected
  source/spec, `tools/` file or `plan/DIRECTOR.md` was edited. No merge, push or
  tag was performed.

## Inventory of the nine original capture registrations

| Registration                            | Existing behavior                                                                                                                                                                                                                                                           | This portion                                                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/FocusTrap.ts` keydown               | Top trap cycles Tab/Shift+Tab; activation blurs outside focus without selecting a button; deactivation restores a visible connected opener within the returning trap.                                                                                                       | Extended this same stack/listener for optional Escape and other modal keys.                                                                                             |
| `ui/Upgrades.ts` keydown                | Open workshop consumes Escape and closes; opening exits pointer lock and focuses Back; a copied `previous` field restores focus a second time.                                                                                                                              | Capture listener, Escape helper, copied focus record/restore and opening button focus removed.                                                                          |
| `ui/Globe.ts` keydown                   | Full-screen globe stops gameplay keys, handles orbit/zoom/selection, permits the trap's Tab listener and closes on Escape; chooser closes first, including in embedded mode.                                                                                                | Capture keydown listener removed. Full-screen keys go through the stack; chooser has a nested entry in that same stack. Embedded ordinary controls use a root listener. |
| `ui/Settings.ts` keydown                | Closed-dialog toggle and typing guard; while open, blocks game keys. Escape cancels binding capture, then reset confirmation, then closes. Tab cancels capture while still allowing the trap to cycle. Has its own return-focus record; opening focuses a non-button panel. | Deferred to S-flow ownership. Legacy trap Escape and Tab side effects remain available.                                                                                 |
| `game/MissionRouter.ts` keydown         | Escape on debrief means Keep exploring; Journal takes priority. Aborted debrief remains a decision point. Briefing/debrief already have traps and hide/dispose paths.                                                                                                       | Deferred to S-flow ownership.                                                                                                                                           |
| `app/systems/shell.ts` keydown          | Guards open modals; skips repeats. Escape exits PhotoMode, closes Home's sites or steps back through Pause/toggles dive pause; exits pointer lock where appropriate.                                                                                                        | Deferred to S-flow ownership. Original shell-Escape assertions retained and run.                                                                                        |
| `app/systems/onboard.ts` Escape keydown | Controls card closes before Settings/Pause; card already owns a trap, pointer-lock exit and close lifecycle.                                                                                                                                                                | Deferred to S-flow/S-rov ownership.                                                                                                                                     |
| `app/systems/onboard.ts` device keydown | Passive capture observer switches the controls guide to keyboard device.                                                                                                                                                                                                    | Deferred with onboarding; observer/integration semantics must survive consolidation.                                                                                    |
| `app/systems/power.ts` keydown          | Consumes Escape without dismissing the free-dive aborted debrief, unless Journal is above it.                                                                                                                                                                               | Deferred to S-rov ownership; stack supports this with `onEscape: null`.                                                                                                 |

The repeated root-hide/trap-deactivation shapes also occur in Settings,
Briefing, Debrief and Journal. Their visibility setters and content-specific
cleanup remain in their owning files. This portion removes Upgrades' redundant
focus-close machinery; it does not claim all five reported helpers are gone.
Globe still owns clearing held arrows, drag/orbit and hover/chooser state.

## Behavior and lifecycle contracts

- **One existing stack, one shared capture listener.** No second overlay stack
  or independent global dispatcher. Activation order selects the owner, rather
  than the construction order of the migrated consumers.
- **Backward-compatible Escape:** `new FocusTrap(root)` keeps legacy handling.
  An omitted `onEscape` leaves Escape untouched, including when an unmigrated
  overlay sits above a migrated overlay. A callback consumes Escape before
  running it; `null` consumes Escape without closing. Repeat Escape is consumed
  without dismissing another overlay. Only one owner handles a key event.
- **Listener priority survives reopen.** Migrated traps reserve the shared
  listener during construction and release that reservation on idempotent
  `dispose()`. While the stack is empty, the listener consumes nothing. Closing
  and reopening do not re-register it behind surrounding legacy handlers.
  Final disposal removes it once no reservation or active trap remains.
  Legacy-only callers keep activate/deactivate listener attachment/removal.
- **Tab containment:** only the top trap moves focus; migrated Tab also stops
  underlying listeners. Legacy Tab keeps caller side effects, such as cancelling
  Settings binding capture. Empty dialogs still prevent Tab from escaping.
- **Safe focus:** activation never chooses a button, so held Space cannot fire
  Back or select a chooser site. Upgrades' repeated `open()` is idempotent.
  Chooser activation leaves its first button for the first Tab, and closing it
  restores the cluster opener when eligible.
- **Focus return:** only removal of the top trap restores focus, within the
  returning top root if one exists. Disconnected, hidden, inert, disabled,
  invisible and collapsed-details targets are excluded. Focusable traversal
  also excludes negative tab indices, absent layout boxes and disabled fieldset
  controls. A nested summary inside a closed outer details panel is excluded.
  Removing underlying traps carries their return target through higher traps,
  without blurring a still-active nested owner.
- **Preserved consumers:** no modal content, styles, layout, bindings, save or
  gameplay change. Upgrades still exits pointer lock; Globe's arrow/zoom/Enter,
  pointer handlers, keyup release and rendering code remain. Closed embedded
  choosers leave ordinary Tab/Escape to their host.
- **Net simpler ownership:** two per-consumer capture-keydown registrations and
  Upgrades' copied focus helper are replaced by the existing stack. No new UI,
  settings or guidance surface. Consumer-specific state cleanup stays local.

**Partial-integration limit:** legacy window capture handlers still exist. The
reserved listener protects the current Globe/Upgrades construction and reopen
paths, and migrated overlays share activation-based ownership. A legacy
capture handler already installed ahead of it can still preempt dispatch in a
mixed nesting scenario (for example the existing power guard). This portion
cannot guarantee initialization-order independence across all owned consumers
without converting those handlers. Their ordering comments are deliberately
retained; the full S-modal item is not done.

## Checks and environment limits

Final permitted-source checks:

- `npm run typecheck`: **PASS**. Also run by the final production build.
- `VITE_CACHE_DIR=/tmp/S-modal-vite-cache npm run build -- --config /tmp/S-modal-vite.config.mts`:
  **PASS**, 293 modules; includes ordinary public copy and PWA service-worker
  stamp. Existing large-chunk warning remains. The temporary config contains
  only a re-export of this worktree's unchanged `vite.config.ts`; no plugin or
  build gate is disabled.
- `npm test -- --configLoader runner --no-cache --fsModuleCachePath /tmp/S-modal-vitest-cache tests/unit/overlayFocus.test.ts tests/unit/shellEscape.test.ts tests/unit/subInput.test.ts tests/unit/homeFocus.test.ts tests/unit/globe.test.ts tests/unit/journalGroups.test.ts tests/unit/photoMode.test.ts tests/unit/debriefReopen.test.ts tests/unit/f3Onboard.test.ts tests/unit/onboardCompletion.test.ts tests/unit/powerSystem.test.ts tests/unit/appSystems.test.ts tests/unit/touchControls.test.ts tests/unit/touchControlsAudit.test.ts`:
  **PASS, 14 files / 204 tests**, on final source. Existing owned specs were
  executed without editing any assertions. Covers actual shell behavior with
  Upgrades, keyboard/pad/touch parity, Journal, PhotoMode, debrief, onboarding
  and power alongside the new capability tests.
- Earlier full suite:
  `npm test -- --configLoader runner --no-cache --fsModuleCachePath /tmp/S-modal-vitest-cache`:
  **PASS, 193 files / 1,986 tests**, 288.36 s. This preceded the final listener
  reservation refinement and the last added cases; final affected capabilities
  were rerun in the 204-test command above.
- New `overlayFocus.test.ts` uses the existing EventTarget/minimal-DOM approach,
  without a new DOM dependency. It checks nested Escape, one close per event,
  repeat suppression, non-dismissible overlays, forward/reverse Tab, eligible
  controls/return targets, repeated activation, out-of-order removal, held
  Space safety, shared-listener disposal/reopen, legacy Escape/Tab compatibility,
  actual Upgrades/shell interaction and modal/embedded Globe chooser lifecycle,
  orbit/zoom and keyup release. Rendering and Upgrades content construction are
  stubbed in lifecycle tests; there is no visual claim.
- `npm run format:check`: **PASS**, repository-wide. Prettier check for every
  permitted changed file and `git diff --check`: **PASS** (final progress note
  included).

Environment recovery, with checks left intact:

- Initial default Vitest startup was **BLOCKED** by `EROFS`: shared read-only
  `node_modules/.vite-temp`. The CLI-only runner/cache options above resolved it.
- Build with `--configLoader runner` was **BLOCKED** in the existing PWA hook:
  `Vite module runner has been closed`. A temporary config re-export in `/tmp`
  lets the normal bundle loader write there and run the original config/plugins.
- The first new-test run caught a missing catalogue `missions` type field and
  a missing fake-DOM `createTextNode`; both were fixed before passing checks.
- Browser/e2e renders, screenshots, appearance tuning and visual gates were
  **NOT RUN**, as required by the brief. Claude owns visual acceptance.

## Remaining S-modal work — ownership deferred

1. **Settings:** register dialog ownership with its capture-cancel/reset-confirm/
   close Escape policy; preserve Tab capture cancellation and toggle/rebinding
   behavior. Remove its copied return-focus record and redundant capture handler
   only after those paths route through the stack.
2. **MissionRouter / Briefing / Debrief:** register Keep exploring and
   non-dismissible aborted-debrief ownership; preserve Journal nesting and all
   content callbacks. Consolidate common focus/hide mechanics when files are free.
3. **Shell / Home / Pause:** move view-specific Escape policies into stack
   ownership, leaving a dive-pause fallback after no overlay handles the event.
   Preserve Home site return focus, Pause back navigation, PhotoMode exit and
   pointer lock; retain shell-Escape/input-parity regressions. Wire both existing
   Globe instances' `dispose()` methods into owned host teardown: the current
   `globeSystem` has no disposal hook, so final consumer teardown cannot be
   asserted for the whole app in this portion.
4. **Onboarding / ControlsCard:** register the card's close policy; preserve
   pointer-lock and device detection, including the passive observer's semantics,
   and remove the redundant Escape registration/opening button focus.
5. **Power:** register the free-dive aborted-debrief non-dismissible policy on
   the existing debrief trap; preserve Journal above it and teardown. Remove the
   power capture guard only with its owned integration and regression checks.
6. **S-dead consumer remainder:** Journal/PhotoMode and other pending consumer
   files stay untouched. Recheck ownership before any follow-up; migrate their
   policies as part of S-modal after they are available.
7. **`src/app/systems.ts`:** remove the power/onboarding/Settings precedence
   comments only once those registrations are gone. Keep unrelated state-event,
   title/render and system-order contracts. This is deferred S-modal work in
   S-rov's registry, not a new backlog item.

Do not label S-modal DONE until these owned migrations land and mixed legacy
capture ordering is gone. No replacement work was started for this remainder.
