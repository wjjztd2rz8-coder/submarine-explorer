# 4470 S-bughunt — pause menu, home menu and overlay focus

Item: **V-journal-polish**. Two review rounds, focused on the opaque Journal and
the CSS-hidden home/pause menus beneath it.

## Plan and scope

1. Trace Journal, Home, PauseMenu, FocusTrap, shell state, input gating and
   touch/back paths; reproduce reachable defects with failing unit tests.
2. Fix minimally, review the transition boundaries again, record remaining
   issues and validation gaps, and run `tools/gates.sh`.

## Round 1 — confirmed shortcut ownership defect

On the title screen, open **Your sub**, then press **J** or **D-pad Left**.
The home frame hook checked Settings, Globe and Controls by name, but did not
check whether Home actually owned the overlay stack. It opened Journal while
Your sub was still open. Journal took keyboard ownership, while Your sub's later
DOM order at the same z-index (95) kept it painted above Journal. Escape then
closed the covered Journal first. V-journal-polish's broad `.field-guide`
visibility selector also hides Home beneath Your sub, so hidden-menu shortcuts
must respect the active overlay rather than menu visibility alone.

Added keyboard and gamepad regressions in `overlayFocus.test.ts`, using the real
Input, shell, Home, SubScreen and Journal lifecycles. Only the independent WebGL
preview is stubbed. Both fail before the fix at `expect(guide.isOpen).toBe(false)`:
**2 failed, 179 skipped**, with no unhandled errors. Evidence:
`.cache/4470-before.log`.

Minimal fix: expose Home's existing focus trap ownership as `Home.isTop`, and
require it before the home shortcut opens a closed Journal. An already open
Journal still requires `Journal.isTop` to close. Ignored input edges are consumed;
the tests also cover a held button after closing Your sub, a fresh press opening
Journal, and focus return to the original menu button.

## Round 2 — remaining boundaries

Added six shell integration cases: home / pause / dive, each dismissed with
Escape or the Journal close button used by touch. They exercise real Journal
home-mode wiring, forward/reverse Tab, repeated Escape, focus return, app state,
menu activation, and shell/input simulation gates. Closing Journal from pause
keeps the dive paused until a separate Escape; closing from a dive restores its
simulation gate without showing Home or Pause. Closing from Home restores Home.

Reviewed alongside existing overlay tests:

| Boundary                            | Result                                                                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escape closes the wrong layer       | Confirmed for the shortcut-created covered Journal above; fixed by preventing that opening. Normal nested traps consume Escape before callbacks and reject repeats.                                   |
| Focus lost or trapped               | New cases retain focus in Journal and return to a visible opener. Existing tests cover hidden/removed openers, rotation and out-of-order overlay teardown.                                            |
| Menu reappears after Journal closes | CSS visibility depends on an open `.field-guide`; Journal hides before focus restoration. Shell app state independently determines which menu is active. New cases preserve all three source states.  |
| Stale hidden menu clicks/keys       | CSS `visibility: hidden` suppresses native hit testing/focus. Fixed the reachable home shortcut bypass. Native CSS hit testing remains a browser QA gap.                                              |
| Pause restoration                   | Journal does not change app state. New gate checks verify zero simulation steps under Home/Pause, and resumed steps only for a dive. Existing clock tests cover the first resumed interval.           |
| Touch Back                          | Journal's arrow navigates entry → site → front; the close button dismisses it. Existing phone-sheet tests cover the arrow. Home's sheet swipe changes sheet expansion rather than dismissing Journal. |

Remaining issues / limits, without speculative runtime changes:

- There is no Journal-specific `popstate` or browser/OS edge-back interception.
  Hardware/browser Back follows browser history rather than the overlay stack;
  physical-device behavior and the desired navigation policy remain unverified.
- Programmatically opening Settings above Journal gives Settings keyboard ownership
  at z-index 90 below Journal's 95. Existing tests support that stack, but current
  normal menu flows do not expose the retired O binding; saved retired bindings
  are removed. This is a latent API/
  visual-order inconsistency, outside the reachable shortcut fix.
- Native CSS visibility/focus timing, touch edge gestures and WebGL preview visuals
  require browser/device verification; the unit DOM double does not establish
  rendered appearance or hit testing.

## Validation

- Before fix: the two new shortcut regressions fail; see `.cache/4470-before.log`.
- After fix: **213 passed** across `overlayFocus`, `journalGroups` and
  `shellEscape`, exit 0, 2.17 s. Log: `.cache/4470-focused.log`.
- `npm run typecheck`: passed. `git diff --check`: passed.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4470 tools/gates.sh` (default smoke
  and project-base mode). Logs: `.cache/runs/20261026-160553-2-ACxlnX/`.
  - Passed: config preparation, strict content validation, production build
    including TypeScript.
  - Python: **167 tests, five failures** in unchanged tooling. Four
    `test_ci_build_manifest` cases fail with `spawnSync git EPERM`;
    `test_golden_tooling` fails parsing empty comparison-child output with
    `Unexpected end of JSON input` (24/25 Node subtests pass). The empty-output
    cause was not established. These signatures also appear in the earlier
    4430 report; no tooling correction is included here.
  - Full unit phase produced only its RUN banner for about 90 seconds, then was
    interrupted with Ctrl-C, exit **130**. No full-unit pass is claimed. The
    gate run did not reach browser, attribution or formatting stages.
- Separate existing shell browser check:
  `PW_PORT=4471 PW_OUTDIR=.cache/runs/20261026-160553-2-ACxlnX/dist npx playwright test tests/e2e/d-shell.spec.ts --output=.cache/4470-browser-results`
  exited **1** before any test body: the preview server could not start.
  `.cache/4470-browser.log` records the failure; a direct preview diagnostic
  using the writable config loader confirms
  `listen EPERM: operation not permitted 127.0.0.1:4471` in
  `.cache/4470-preview.log`. No browser/device acceptance is claimed.
- Separate `python3 tools/check_attribution.py`, repository-wide
  `npx prettier --check .`, and `git diff --check`: passed.

**Aggregate gates are incomplete, not green.** The focused regressions and
TypeScript pass; full unit execution and browser/device verification remain
validation gaps in this sandbox. No retries, skips, timeout increases or gate
edits were used to manufacture a passing result.

No dependencies, saved-state schema, visual policy, factual content or gate
definitions changed.
