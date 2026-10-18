# Status (2026-10-18 midday, joint review with Codex Sol)

**Stage:** about 80% to 1.0 (was 82%: art moved up a little; the owner's phone test added eleven concrete playability items). 4-5 weeks targeted, 4-6 for planning.

## 1.0 table

| Requirement                               | State                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Five heroes beautiful (4 of 5)            | None consistently at 4: Titanic 3.5, Lost City 3-3.5, Blue Hole 3-3.5, Beebe 3.5-3.8, Monterey 3.5               |
| Other eight sites coherent                | Challenger 3.5, Endurance 3.5-3.7; mission-spawn acceptance for all eight not certified (V-spawn-capture queued) |
| New player understands first five minutes | Owner phone test: scan range, boost and events confuse; P2-scan-range and P2-boost-cut queued, then V-journeys   |
| Acceptable Low-tier phone performance     | iPhone 17 Pro: Low great; High (opt-in only) stutters at Lost City; weaker phones untested                       |
| Hosted CI green, releases tagged          | Red for two runs (stale test), fixed in 9b57c01; deploy not gated on CI (R-deploy-gate queued)                   |
| Code simple enough                        | Standing S-verify / S-bughunt; R-merge-verify queued so smoke-only gates can't hide a red e2e                    |

## Done recently

Titanic opening (hull fills the frame; plate tint varied by lanes), Beebe flank (crust ridges catch warm light), owner phone test written up as P2 items, red CI fixed.

## Left

First-five-minute scanning and guidance (agreed top blocker), deploy gating, phone defects (Class A clipping, Beebe Low caps), Lost City tower, Titanic plating patchwork, Monterey bands, Challenger seabed, Blue Hole hood and overlap, eight-site acceptance.

## Needs owner

- None for budget: the Claude reset is already used, so the Claude week (resets Oct 22) is paced by the run gate and Codex carries more work (dispatch head start widened to 30%).
- A short phone retest once the P2 items land.
