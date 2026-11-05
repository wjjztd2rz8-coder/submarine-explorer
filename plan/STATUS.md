# Status (2026-11-05 evening review, Claude + Codex Sol first round)

**Stage:** about 86% to 1.0 (Claude 88%, Sol 85%); 3-4 weeks. Tag **f73** is the newest green release; **f74 is blocked because hosted CI is red** (five touch/phone specs, test defects, fix in flight) and Pages has not deployed since 18:29.

## 1.0 table

| Requirement                               | State                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Five heroes beautiful (4 of 5)            | Openings: Beebe 4.1, Titanic 3.9, Blue Hole 3.8, Lost City 3.7, Monterey 3.6; Sol, counting close-ups: 3.0-3.5. Close-up materials are next |
| Other eight sites coherent                | Endurance 3.9 (seabed fixed, hull a third of the frame), Bismarck 3.6 (debris plates being fixed), Axial ~4.0, others coherent              |
| New player understands first five minutes | No dead ends in the last walk-through (Nov 3); a fresh unassisted capture is queued                                                         |
| Acceptable Low-tier phone performance     | iPhone 17 Pro Low great; weaker phones and Medium untested                                                                                  |
| Hosted CI green, releases tagged          | RED since Codex 140 touch specs; R-ci-red-5 in flight                                                                                       |
| Code simple enough                        | Dead-code and verification sweeps merged                                                                                                    |

## Done recently

Lost City tower and Bismarck hull scale, Endurance seabed and hull framing, Monterey wall pose and striation fade, Blue Hole gallery reads, touch cancellation fix, Lost City perf audit, Journal fact-check pass 2, dead-code sweep 3.

## Left

CI fix, Bismarck debris, Monterey objective marker, close-up materials for the heroes, deploy gate, unassisted first-five-minutes check, weaker-phone performance.

## Needs owner

- A short phone retest on the newest build using `plan/progress/4410-P2-phone-accept-checklist.md` (note: the public build is stale until CI is green).
