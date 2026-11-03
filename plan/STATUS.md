# Status (2026-11-03 review, Claude alone)

**Stage:** about 90% to 1.0 (range 87-91%); 3.5 weeks. Tag **f72** is the newest green release.

## 1.0 table

| Requirement                               | State                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Five heroes beautiful (4 of 5)            | Beebe 4.1, Lost City 4.0, Monterey 4.0, Titanic 3.9, Blue Hole 3.85; all 13 openings pass the readability screen   |
| Other eight sites coherent                | Axial ~3.5 (calmer), Hunga 4.0, Kama 3.5, Challenger and Endurance ~3.5; three sites unrated                      |
| New player understands first five minutes | No dead ends; walk-through found 8 confusions, 3 fixed (touch wording, one Home primary, dive-start HUD), 5 queued |
| Acceptable Low-tier phone performance     | iPhone 17 Pro Low great; Medium auto-tier and weaker phones untested                                               |
| Hosted CI green, releases tagged          | f72 tagged on green CI     |
| Code simple enough                        | Dead-code and test sweeps merged; standing S-* audits                                                              |

## Done recently

Lost City tower-top streaks, Kama thin plume, Journal first visit, sonar labels, CI spec fixes, Beebe horizon gradient (Beebe now 4.0), Hunga bed scale, Kama vent glow, Lost City tower glow cut, play walk-through, three first-minute UI fixes, CI-green and readability tooling.

## Left

Blue Hole hood (needs design call or code), Hunga bank, Kama subject framing and the remaining player-facing confusions; Codex 120-124 after the Nov 4 reset; real-phone retest.

## Needs owner

- Blue Hole opening: closer approach vs. pitch-up.
- A short phone retest on the newest build using `plan/progress/4410-P2-phone-accept-checklist.md`.
