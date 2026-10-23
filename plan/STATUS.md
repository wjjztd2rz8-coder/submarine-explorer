# Status (2026-10-22 night, joint review with Sol)

**Stage:** 80-83% to 1.0 (agreed with Sol); 5-7 weeks. Claude capacity limits art; Codex runs verification and CI.

## 1.0 table

| Requirement                               | State                                                                                                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Five heroes beautiful (4 of 5)            | None consistently at 4: Titanic 3.5-3.8, Lost City 3-3.4, Blue Hole 3-3.4, Beebe 3.5-3.6, Monterey 3.5-3.75                                                       |
| Other eight sites coherent                | Challenger 3.4, Endurance 3.4; mission-spawn review done (2.6-3.2), follow-ups queued; acceptance acceptance for all eight not certified (V-spawn-capture queued) |
| New player understands first five minutes | Owner phone test: scan range, boost and events confuse; P2-scan-range and P2-boost-cut queued, then V-journeys                                                    |
| Acceptable Low-tier phone performance     | iPhone 17 Pro: Low great; High (opt-in only) stutters at Lost City; weaker phones untested                                                                        |
| Hosted CI green, releases tagged          | Main red on the latest runs from stale specs; most repaired 2026-10-20, one wildlife fixture still red (R-ci-green-f); deploy waits for green CI                  |
| Code simple enough                        | Standing S-verify / S-bughunt; R-merge-verify queued so smoke-only gates can't hide a red e2e                                                                     |

## Done recently

Boost cut, 100 m scan floor, anchored optional events, quieter ambience, Lost City perf cap, deploy waits for green CI, spawn captures, copy fixes (P2-copy), stale touch specs fixed. Titanic opening (hull fills the frame; plate tint varied by lanes), Beebe flank (crust ridges catch warm light), owner phone test written up as P2 items, red CI fixed.

## Left

Unaided journeys at 1280x720 and phones (queued with Codex), CI triage (28/38 shards red on one run; latest run pending), Class A hull clipping, Beebe Low caps. First-five-minute scanning and guidance (agreed top blocker), deploy gating, phone defects (Class A clipping, Beebe Low caps), Lost City tower, Titanic plating patchwork, Monterey bands, Challenger seabed, Blue Hole hood and overlap, eight-site acceptance.

## Needs owner

- None for budget: the Claude reset is already used, so the Claude week (resets Oct 22) is paced by the run gate and Codex carries more work (dispatch head start widened to 30%).
- A short phone retest once the P2 items land.
