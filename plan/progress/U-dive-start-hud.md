# U-dive-start-hud

## What changed

- **Mission panel hidden until the first objective is done.** `ObjectivesPanel` now starts hidden, and `MissionRouter.showPanel()` shows it only when `counts().completed > 0` (on begin, on keep-exploring and on each mission change while diving). The panel repeated the step banner's goal, so the guidance slot is the single surface at dive start. Dive start now shows the sonar, the step banner and the compact depth readout.
- **One name per objective.** The only source of a different name was `systems/mission.ts`, which rewrote the first objective's title to "Head to X" during a near-site approach. That rewrite is deleted. The objective title is always the mission definition's title ("Scan the stalactite gallery"). The approach state is now `ObjectiveStatus.approachTo` (the destination label, set only while travelling), read by `waypoints.ts` (keeps the marker in Realistic) and `onboard.ts` (the "Follow the marker toward X" step text). This replaced two `title.startsWith('Head to ')` string checks.

## Merged or removed

- Removed: the title rewrite and its panel refresh, the `original` lookup in `mission.ts`, and the two title-prefix checks. Merged: the mission checklist into the guidance slot at dive start (it appears later, with progress). No CSS changes, no site branches.

## Tests

- Unit: `missionApproachSystem`, `missionApproachWaypoint` and `overlayFocus` now use `approachTo`, and the title stays "Scan the bow".
- E2E: `mission.spec` guards the regression (panel hidden at dive start with the guidance slot visible, visible after the first scan). `d-polish` asserts hidden and drops the panel screenshot and stacking check. `f-arcade-access`, `opening-framing` and `d-polish` copy updated from "Head to" to "Scan".
- Passed with `PW_OUTDIR=dist-hud PW_PORT=4881`: mission, d-polish, f-arcade-access (11/11 after spec updates). Unit: the three specs above. `PW_PORT=4881 tools/gates.sh` passed (smoke + project-base e2e, prettier, attribution).

## Screenshots (Great Blue Hole, 2.5 s and 10.5 s in)

`.cache/codex/shots/U-dive-start-hud/`: `desktop-start.png`, `desktop-10s.png` (1600x900), `phone-portrait-*.png` (390x844), `phone-landscape-*.png` (844x390). Dive start shows only sonar, step banner and depth; phone layouts are unchanged apart from the missing panel.
