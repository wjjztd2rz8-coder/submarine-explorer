# F-HUD-LAYOUT progress

Status 2026-10-02: **done**, pending orchestrator review.

## Done

- `src/styles/hud-layout.css` (new, imported last): the one place that positions the tutorial card, hint chip, scan-target panel, map credit and the phone-landscape compaction.
- `src/styles/onboard.css`: removed the old touch bottom-centre placement; compact phone text only.
- `src/app/systems/camera.ts`: controls hint bar hides once move, turn and rise/sink are used, and after three dives (localStorage `subexplorer.controlsLearned.v1`). Help (Pause > Controls) unchanged.
- `tests/e2e/f-hud-layout.spec.ts`: bounding-box overlap assertions at four viewports (every tutorial step), a real mission (objectives visible) at desktop and phone, and a hint-bar learned test. Screenshots in `.cache/codex/shots/f-hud-layout/` (before-_, after-_, mission-*).

## Layout rationale

The chase camera keeps the sub low and central, so the bottom centre belongs to the sub. The scan panel therefore moved to the top centre (below warnings), the card to the left under the sonar.

## For review

- Scan panel is top-centre, not bottom-centre as the brief suggested, because the sub sits there (see mission-desktop-1280.png).
- The in-world waypoint marker label can still pass behind the scan panel on phones; it is world-anchored.
- Hull-breach banner (test artefact: titanic at 3,800 m with a 1,000 m hull) overlaps the pause button on phone/tablet; that goes away with Arcade depth gating (priority 3).
- Portrait phones were not re-laid out.
