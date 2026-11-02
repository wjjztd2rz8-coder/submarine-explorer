# Status (2026-11-02 review, Claude alone)

**Stage:** about 89% to 1.0 (range 86-90%); 3.5-4 weeks. Tag **f71** is the newest green release.

## 1.0 table

| Requirement                               | State                                                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Five heroes beautiful (4 of 5)            | Beebe 4.0, Lost City 4.0, Monterey 4.0, Titanic 3.9, Blue Hole 3.85; all 13 openings pass the readability screen |
| Other eight sites coherent                | Axial ~3.5 (calmer), Hunga 3.45, Kama 3.3, Challenger and Endurance ~3.5; three sites unrated                      |
| New player understands first five minutes | No dead ends; walk-through found 8 confusions, 3 fixed (touch wording, one Home primary, dive-start HUD), 5 queued    |
| Acceptable Low-tier phone performance     | iPhone 17 Pro Low great; Medium auto-tier and weaker phones untested                                              |
| Hosted CI green, releases tagged          | f71 tagged and deployed; main was red on two specs (Beebe horizon assertion, Blue Hole touch journey); fixes pushed 2026-11-02, awaiting hosted run before tagging f72            |
| Code simple enough                        | Dead-code and test sweeps merged; standing S-* audits                                                             |

## Done recently

Beebe horizon gradient (Beebe now 4.0), Hunga bed scale, Kama vent glow, Lost City tower glow cut, play walk-through, three first-minute UI fixes, CI-green and readability tooling.

## Left

Blue Hole hood and Hunga silhouette (both need code), Lost City tower-top texture, Kama plume scale and the 5 remaining player-facing confusions; Codex 120-124 after the Nov 4 reset; real-phone retest.

## Needs owner

- A short phone retest on the newest build using `plan/progress/4410-P2-phone-accept-checklist.md`.
