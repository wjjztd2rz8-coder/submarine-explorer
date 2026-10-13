# S-flow progress

Branch `claude/S-flow`, worktree `/home/vijay/subexp-wt/S-flow`. Not merged.

## What changed

1. **Home:** one primary **Dive** button (`Home.diveButton`, filled mint). First run (no saved last mission) opens the Titanic briefing; afterwards it opens the last mission. A saved mission the catalogue no longer lists falls back to the opening mission. The disabled Continue and `Home.setContinue` are gone. Dive sites and Free dive stay as the secondary pair.
2. **Pause:** **Mission select** removed (the same list is reached with Quit to home, so there is one site picker). How to play / Controls and Data credits stay on the menu.
3. **Completion:** the existing `.obj-banner` shows the stars earned so far (`Progress.previewStars`, no rewards granted early) on the summary line; Keep exploring is the filled primary action. No new screen; completion still never ends the dive.
4. **Settings:** `controlTips` removed from `Save`, `Settings.ts`, `HudContext`, docs. `migrate` drops the key and `Save.load` rewrites the stored file once. Hull-warning style and SFX slider untouched. The desktop control-tip footer is gone with it (`.hud-control-tips`, its CSS in five files, the `controlsLearned` record, `cameraTips.until`, `ControlsCard.compactTips`). `cameraTips` is now `{ moved }` (still used by the animal hint).
5. **HUD:** seabed status text row removed (`FIELDS`, five `data-field='status'` selectors in `hud-layout.css`; the touch hull gauge now takes row 2 across the grid). Warning banner and gauge are unchanged. Reset camera button kept.
6. **Briefing:** the start-position radio group moves into the briefing's existing Advanced panel (collapsed by default).
7. **Tutorial:** `move`, `depth`, `scan`. Lights and Photo/Journal steps removed (lights and photo already have contextual hints; the Journal needs nothing). The scan step still completes only on `scan:complete`, including an earlier completion; started/progress show "Scanning…". The tutorial card is hidden only while `overlay.promptActive` (an actionable, non-dim scan card: target in range, scanning, result). Dim navigation/objective cards leave it up. The finish toast says "How to play" on touch.
8. README, `docs/settings.md`, `docs/architecture.md`, CHANGELOG updated (every removal logged).

## Removed, and what replaced it (rule 1)

| Removed                                                                                      | Replaced by                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Home Continue (disabled on first run)                                                        | Dive                                     |
| Pause Mission select, `pauseSites`, `.pause-sites-scroll`                                    | Quit to home, then Dive sites            |
| Control tips setting + desktop tip footer + learning record                                  | How to play / Controls in Pause          |
| HUD status row                                                                               | warning banner + gauge (same conditions) |
| Tutorial steps Headlights, Photo/Journal                                                     | existing one-shot hints                  |
| `Home.setContinue`, `ControlsCard.compactTips`, `FIRST_MINUTE_GUIDANCE` use in camera system | none (deleted)                           |

Nothing new was added except the `previewStars` read-only method, one banner `span`, and a `FIRST_MISSION_ID` default.

## Tests updated, and why

Tests that pinned removed UI were rewritten to pin the new behaviour; none that guarded a real past bug was loosened.

- Deleted `tests/unit/hudControlTips.test.ts` (only tested the removed tip footer) and the `controls hint bar` describe in `f-hud-layout.spec.ts` (two tests of the removed footer's fade and learning record). Net `--numstat` deletions are these plus the learn-counter tests in `cameraControls.test.ts`; the first-move detection and reset-camera guards in that file are kept.
- `settingsSave.test.ts`: the key is now asserted dropped (in `migrate` and from stored JSON on load). This is the new migration test.
- `onboardCompletion.test.ts`, `f3Onboard.test.ts`, `tutorialCardDevice.test.ts`: three steps; scan-step rule ("started/aborted never complete, an early completion is remembered") kept and extended; new unit test that the card never shows alongside the scan card.
- Home specs (`d-shell`, `f-title-*`, `titleAudit`, `f-flow-audit-510`, `f-touch-audit`, `homeFocus`): Continue becomes Dive; the disabled-Continue and "removed saved mission redirects focus" cases now assert Dive stays enabled and focused.
- Briefing specs (`d-start`, `d2-predive`, `f-verify-740`): open Advanced first through `helpers/briefing.ts`; `d2-predive` also pins that Start is hidden until Advanced opens.
- Pause specs (`globe`, `f-a11y`): the Mission select checks became "pause still works / Data credits stays keyboard reachable".
- Tutorial layout specs (`f-touch-audit`, `f-bughunt-15`, `f-hud-layout`, `f-touch-stack`, `f-toast-placement`, `f-monterey-portrait-hud`, `f-bughunt-960`, `f-flow-audit-510`, `1390`, `f-first-minute-620`, `f-verify-lander-firstdisc-1240`): they used to lay out the tutorial card and the scan card together. They now check each alone (scan card up and tutorial hidden; then the scan card held hidden with `helpers/tutorial.ts: setScanCardSuppressed` and the tutorial laid out). `f3-onboard.spec.ts` gained "tutorial card yields to the scan card instead of stacking with it" (guards the overlap the old specs measured). `expectCompactPhoneHud` runs its card checks only while the card is up.
- `d-flow.spec.ts`: banner carries the stars.
- Specs that listed `.hud-control-tips` or the status field in their selector lists: entries removed.

## Gate results

- `PW_PORT=4581 GATES_CONFIG_MODE=writable tools/gates.sh`: config, build, unit (190 files, 1926 tests), python, content, attribution, prettier, e2e smoke and e2e-base all PASS.
- Focused e2e on `dist-sflow` (port 4582), after merging main: all touched specs pass (last runs: 102 passed + 129 passed, 26 skipped by project config, 0 failed; one `f-touch-stack` failure fixed by shortening the scan-step copy and retargeting the compact last-step strip CSS from `journal` to `scan`).
- Late fixes found by the focused runs: `f-briefing-900`, `f-bughunt-18`, `f-bughunt-960` read the start radios by role; they are now inside the collapsed Advanced panel.

## Screenshots

`.cache/codex/shots/S-flow/` (390x844 `portrait-`, 844x390 `landscape-`, 1280x720 `desktop-`): `home-first-run`, `home-returning`, `briefing-collapsed`, `briefing-advanced`, `tutorial-move`, `tutorial-depth`, `tutorial-scan`, `completion-banner`, `pause`, `settings`.

## Review follow-ups (second pass)

- **Tutorial visibility:** softened to `promptActive`. A capture of the first 30 s of Titanic on phone portrait and landscape (`*-first30-*.png`, real stick and slider holds) shows the move step at t+2 s, the rise/sink step after the first push, and the scan step after the slider, all with the dim objective card up and the card visible each time (portrait 13.4 s, landscape 13.6 s to reach the scan step).
- **Landscape completion banner:** main HEAD (f9bd422, temp worktree, removed) already had the banner covering Sonar, Lights, Photo, Boost and the slider at 844x390, so this is a pre-existing blocker. Fixed by moving `.obj-banner` into the centre lane (`--hl-col-left` / `--hl-col-width`, row layout) in one `max-height: 460px` landscape block; the scan stack and tutorial card hide while it is up. No per-element offsets. `f-touch-stack.spec.ts` gained "completion banner clears every touch control and the telemetry" (844x390, 667x375, 932x430). The compact last-step tutorial strip CSS now targets `scan`.

## Open questions for the director

1. `Discovery.update` re-applies overlay suppression every frame, so e2e needs the overlay's hooks held to keep the scan card hidden (done in `setScanCardSuppressed`). A real `hideForTutorial` input on the overlay would be cleaner for S-tests.
2. Pause still lists Upgrades (appended by the progress system); the review wants it in the Journal or debrief, which is out of this package.
