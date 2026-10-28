# Status (2026-10-28 evening, joint review with Sol)

**Stage:** about 84% to 1.0 (range 82-86%); 4-6 weeks. Tag **f68** is the newest green release.

## 1.0 table

| Requirement                               | State                                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Five heroes beautiful (4 of 5)            | None firmly at 4: Titanic 3.5-3.9, Lost City 3.5-3.8, Blue Hole 3.0-3.7, Beebe 3.5-3.8, Monterey 3.5-4.0 (Sol / Claude bands) |
| Other eight sites coherent                | Axial ~3.5 (calmer), Hunga 3.0-3.5, Kama 3.0-3.3 (subject does not read), Challenger and Endurance ~3.5; three sites unrated  |
| New player understands first five minutes | No dead ends; ten small confusions found (guidance, clipped labels, repeated reward) now queued as Codex 93-95                |
| Acceptable Low-tier phone performance     | iPhone 17 Pro Low great; Medium auto-tier and weaker phones untested                                                          |
| Hosted CI green, releases tagged          | CI green at the last check; shard weights refreshed; f68 newest tag                                                           |
| Code simple enough                        | Dead-code and test sweeps merged; standing S-* audits                                                                         |

## Done recently

Terrain blotch fix, Hunga apron, debrief objective count, journey acceptance captures, e2e shard weights, Kama/perf pin fragility fixes, Journal home fix, dead-dependency sweep.

## Left

Kama subject retry, Titanic aft light, Lost City upper frame, Monterey sand, Blue Hole floor, first-journey guidance/labels/Journal wording (Codex), mission-spawn golden captures (Codex), real-phone retest.

## Needs owner

- A short phone retest on the newest build using `plan/progress/4410-P2-phone-accept-checklist.md`.
