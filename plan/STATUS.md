# Status (2026-11-04 afternoon review, Claude alone)

**Stage:** about 92% to 1.0 (range 89-93%); 2.5-3 weeks. Tag **f73** is the newest green release.

## 1.0 table

| Requirement                               | State                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Five heroes beautiful (4 of 5)            | Beebe 4.1, Titanic 3.9, Lost City 3.9, Monterey 3.7, Blue Hole 3.7; all 13 openings pass the readability screen    |
| Other eight sites coherent                | Axial ~4.0, Hunga 4.0, Kama ~3.7, Endurance ~3.8, Challenger ~3.5; three sites unrated                             |
| New player understands first five minutes | No dead ends; walk-through found 8 confusions, 3 fixed (touch wording, one Home primary, dive-start HUD), 5 queued |
| Acceptable Low-tier phone performance     | iPhone 17 Pro Low great; Medium auto-tier and weaker phones untested                                               |
| Hosted CI green, releases tagged          | f72 tagged on green CI                                                                                             |
| Code simple enough                        | Dead-code and test sweeps merged; standing S-* audits                                                              |

## Done recently

Lost City tower-top streaks, Kama thin plume, Journal first visit, sonar labels, CI spec fixes, Beebe horizon gradient (Beebe now 4.0), Hunga bed scale, Kama vent glow, Lost City tower glow cut, play walk-through, three first-minute UI fixes, CI-green and readability tooling.

## Left

Small-subject openings (Lost City, Bismarck, Endurance), Monterey wall clarity, Blue Hole hood, Hudson ledge; Codex 130-135 (verification and framing numbers); real-phone retest.

## Needs owner

- A short phone retest on the newest build using `plan/progress/4410-P2-phone-accept-checklist.md`.
