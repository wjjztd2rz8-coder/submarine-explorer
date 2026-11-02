# R-ci-red-4: four specs red in hosted CI run 41419337643

The hosted job logs were empty from `gh run view --log-failed`, so each spec was reproduced locally
(`CI=1 PW_PORT=5871 PW_OUTDIR=<build> npx playwright test <spec> -g <name>`).

All four were stale tests, not product regressions. The product intentionally hides the mission
checklist (`.objectives-panel`) until the first objective completes (`MissionRouter.showPanel`,
`ObjectivesPanel.setVisible`). The completion banner lives inside that panel, so it is hidden with it.

| Spec                                                            | Verdict | Fix                                                                                                                                                |
| --------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| content-missions `bismarck` (plus every mission)                | stale   | Dropped the checklist-visible assertion made right after "Begin"; it is now asserted after each primary scan completes.                            |
| hud-touch `surface HUD arcade` (plus realistic)                 | stale   | At dive start the desktop checklist is asserted hidden; the rest of the surface HUD checks are unchanged.                                          |
| f-a11y `completion banner contrast` (plus "choices accept Tab") | stale   | The test reveals the checklist (`panel.setVisible(true)`) before `showBanner`, matching the real flow after a completed objective.                 |
| f-first-minute-620 `animal scan card` (desktop)                 | stale   | `expectObjectiveGuidance` (desktop branch) checks the current step is named (`toHaveCount(1)`) instead of requiring the hidden list to be visible. |

Also stale in the same run (same cause, found by running the full spec files locally):

- hud-touch desktop "card, objectives and readouts do not overlap" and "top info, guidance and controls"
  now reveal the checklist before measuring it; the completion-banner landscape test reveals it before `showBanner`.
- f-copy-regress desktop "all authored current-objective titles fit" reveals the checklist in its fixture.

Local results after the fixes: content-missions bismarck pass; hud-touch Surface 1280 (2 pass), the
touch/desktop overlap and banner tests (14 pass in the filtered run); f-a11y completion banner (2 pass);
f-first-minute-620 animal in range (3 pass); f-copy-regress (2 pass). Full hud-touch before the
checklist-reveal edits: 179 pass, 5 fail, all the stale cases listed above.

No product code changed.
