# S-bughunt — touch Settings pane and focus

Backlog item 8 (`S-verify / S-bughunt`, standing), 2026-10-20. Audited merged HEAD
`09ec9f7b4c6fce24d715941824c3b62a7b042736`, specifically P2-copy `0272855`
and its completed progress note. Read Director rules/rubric, the newest
2026-10-19 joint review and overnight runs 64–65. This is a headless behavior
audit; no game rendering, screenshots or phone appearance acceptance.

## Ownership and earlier evidence

Reviewed controls/focus reports for J-home-controls, 2230, 2390 (`bb64ea3`),
2440 (`e3c729a`, merged in `219bf61`) and 2560 (`3521f78`, follow-up
`1464ce0`). Their guide routing, modal ownership, input interruption and live
mode coverage predate the P2-copy Settings gate. No separate 2560 worktree
remains; its report and committed changes were checked instead.

Rechecked the queue, launched briefs, available result files and all active
worktree change lists before editing. 2630–2650 retain boost/scan, anchored
contacts and audio/performance/release work; 2660–2680 retain the geometry,
shader and vent audits; 2700–2730 retain journeys, hull clearance, Low events
and hosted-CI triage. 2730 had no worktree diff or populated result file at
that check. Its hosted expectations remain outside this package. 2740 owns
Home/shell and homeFocus; 2760 owns Auto-tier wiring and quality tests. No
overlapping edit to Settings.ts or overlayFocus.test.ts was present.

## Reproduced defects and minimal correction

Five added cases in the existing `overlayFocus.test.ts` failed against the
unchanged merged Settings source: **5 failed / 113 skipped**. Log:
`/tmp/2750-before.log`.

- On touch, `showControls(true)` correctly suppressed the pane but explicitly
  called `focus()` on the hidden Controls button. Returning from desktop
  Controls after the `is-touch` class changed used the same hidden target.
  The existing permissive DOM fixture exposes that invalid focus request;
  this is not a browser observation. Ignoring that request provides no focus
  recovery for a previously focused control that the transition hides.
- Leaving the Controls pane retained its active binding capture. The desktop
  return case independently reproduced this state leak; the touch return and
  suppressed Controls request use the same transition. A following key could
  rebind an action while its binding button was hidden.

`showControls()` now cancels capture when the resolved pane is hidden and
focuses the first visible control returned by the existing FocusTrap, with
the existing panel as fallback. Desktop still targets Back while showing
Controls and Controls on return; touch targets Close. No new state, listener
or focus manager was added. The approved touch removal remains in place.

## Input / pane / focus matrix

All rows exercise the actual SettingsScreen with real Input and Save in the
existing headless DOM fixture.

| Input and transition                                    | Pane and focus evidence                                                                                                                                                                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Touch before construction                               | Controls/Back/pane hidden on first open; first Tab reaches Close.                                                                                                                                                           |
| Touch activated before first open                       | Same suppression after construction; opening retains held-key protection.                                                                                                                                                   |
| Three touch open/close cycles per initial-state case    | Escape and Close return to a connected, visible invoker; reopen starts in normal Settings.                                                                                                                                  |
| `showControls(true)` on touch                           | Normal sections stay available; no hidden navigation focus calls; full forward/backward Tab traversal excludes Controls, Back and binding pane. Graphics, captions and audio remain reachable; captions changes reach Save. |
| Desktop Controls → touch → Back                         | Capture cancelled, binding label restored, normal pane shown, Close focused; next key leaves bindings unchanged and one Escape closes.                                                                                      |
| Desktop Controls → touch → `showControls(true)`         | Suppressed request performs the same capture cancellation and visible focus transition.                                                                                                                                     |
| Desktop control case, plus return from touch to desktop | Controls opens the pane and focuses Back; return focuses Controls and cancels hidden capture; reopening on desktop restores Controls navigation. Existing successful rebind and Tab/Escape tests remain intact.             |

## Simplicity and rubric

Two local behavioral edits reuse existing visibility and capture cancellation.
No UI surface, guidance, setting, dependency, schema, site branch, base-config
mutation, tuning, layout or CSS change. Hidden key-binding work cannot silently
consume a player's next key, and normal settings remain keyboard accessible.
The title truthfully follows the displayed pane. Rewards are unaffected.
Beauty, composition, real-phone appearance and visual acceptance remain with
Claude/owner. No out-of-slice fix was needed or taken.

## Checks

- Focused Settings/overlay/Home capability run: **5 files / 177 tests PASS**
  (`overlayFocus`, `settingsScreen`, `settingsSave`, `settingsPalette`,
  `homeFocus`). Log: `/tmp/2750-capabilities.log`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **exit 1, `FAIL gates (e2e=none)`**, solely from the Python failures below.
  The repository-supported
  writable mode keeps temporary config/cache outside the read-only dependency
  tree. Gate logs: `.cache/runs/20261020-113556-3-pBpjTt/` and
  `/tmp/2750-gates.log`.
- Gate passes: config preparation, strict content validation, root production
  build/typecheck, complete unit suite (**192 files / 3,286 tests**, 534.77 s),
  attribution and repository-wide Prettier.
- Python gate: **FAIL, 167 tests / 5 failures**. Four unchanged build-manifest
  tests fail with `spawnSync git EPERM`; the unchanged golden-tooling wrapper
  fails with `Unexpected end of JSON input` in its comparison CLI check.
  These match failures recorded in earlier S-bughunt reports. No tooling was
  changed or assertions relaxed.
- Browser mode is **none**: smoke, full e2e and project-base browser checks
  are deliberately unexecuted, not passes.
- Final formatting of only the three owned files and `git diff --check` pass.

Only this note, `src/ui/Settings.ts` and `tests/unit/overlayFocus.test.ts` are
owned edits. Existing assertions, budgets and snapshots are preserved. No
tooling or Director changes, merge, push or tag.
