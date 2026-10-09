# f-firstminute: first-minute verification (DIRECTOR backlog 7)

Flow checked after the Journal/Debrief polish (1060): Home, Dive sites, pick site, briefing,
about 60 s of play, Journal, Surface and debrief. Fresh player (default progress and
onboarding), Arcade default, low graphics tier, SwiftShader. Sites: Titanic and Beebe.
Layouts: desktop 1280x720 (keyboard) and phone 390x844 (touch, stick held via CDP).

Tool: `tools/firstminute-shots.mjs` (serve a build with `vite preview --port 4390`, then
`node tools/firstminute-shots.mjs`; `FM_SITES`, `FM_LAYOUTS`, `FM_OUT` override). It is a
script, not a spec, so it is not in the gates.

Screenshots (gitignored cache): `.cache/codex/shots/firstmin-f44/<layout>-<site>/NN-*.png`
with layouts `desktop`, `phone` and sites `titanic`, `beebe-vent-field`. Files: 01-home,
02-dive-sites, 03-briefing, 04-t00, 05..10 = t10..t60, then journal and debrief
(phone adds 11-pause).

## Rubric result

| Check                                 | Desktop                                    | Phone                                      |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Sub, seabed, one target in first 10 s | Pass (Titanic bow, Beebe smoker in frame)  | Pass                                       |
| HUD uncluttered                       | Pass (mission, readouts, scan card, sonar) | Pass (compact top stack, thumb controls)   |
| Clear next action                     | Pass (scan card bearing and turn cue)      | Pass                                       |
| No overlap or clipping                | Pass; one cosmetic overlap, see finding 3  | Pass; tutorial hint overlap, see finding 2 |
| Journal opens, contained, closes      | Pass (J)                                   | Pass (pause menu, Journal)                 |
| Debrief has one primary action        | Pass (Dive sites), see finding 1           | Pass                                       |

## Findings

1. Debrief with 0 scans: the single primary button is "Dive sites" while the copy says
   "Next: Face a target and hold Scan." and "Keep exploring" is a text link. The 720 spec
   asserts `dive-sites` as primary, so left as is. Suggest making Keep exploring primary
   when the dive has no scans and can resume (needs spec update). Owner/director call.
2. Phone: the tutorial hint bar (bottom, above the buttons) sits over the lower part of the
   sub and, at Beebe t10, the base of the smoker target. It is skippable and the target is
   still visible above it, but a higher or shorter hint would be better. Larger layout change.
3. Desktop: the in-world target bracket draws across the target label text
   ("Beebe-125 black smokers", "33 m - 12 m - IN RANGE") when the target is near screen
   centre. Cosmetic; label offset belongs to the waypoint overlay.
4. Desktop: mission panel title truncates with an ellipsis for long titles
   ("BEEBE VENT FIELD: THE DEEPE..."). Acceptable; phone does the same.
5. The briefing is dense on phone (fills the viewport, no scroll needed). Fits, no defect.
6. Scan card says "IN RANGE" at 172 to 193 m (Arcade long-range sensors); fine for Arcade.

## Fixes

- Briefing eyebrow showed the raw landmark slug (`MISSION BRIEFING · BEEBE-VENT-FIELD`,
  also `LOST-CITY`, `MONTEREY-CANYON`). Now hyphens become spaces
  (`src/game/MissionRouter.ts`). Logged in CHANGELOG.md.
