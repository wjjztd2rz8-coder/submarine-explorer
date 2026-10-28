# Status (2026-10-28, joint review with Sol round 1)

**Stage:** about 85% to 1.0; 4-5 weeks (Claude 90%, Sol 82%). Tag **f68** is the newest green release.

## 1.0 table

| Requirement                               | State                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Five heroes beautiful (4 of 5)            | None at 4: Titanic 3.9, Lost City 3.8, Blue Hole 3.5-3.7, Beebe 3.9, Monterey 3.9 (Sol reads 0.3-0.7 lower)            |
| Other eight sites coherent                | Hunga 3.4 and Kama 3.4 (subject does not read), Axial 3.5 (blotchy ground), Challenger 3.6, Endurance 3.6              |
| New player understands first five minutes | Flow works; debrief shows "2 of 4 objectives" after both primaries; journey captures lack a build stamp (Codex 60, 62) |
| Acceptable Low-tier phone performance     | iPhone 17 Pro Low great; weaker phones untested                                                                        |
| Hosted CI green, releases tagged          | f68 tagged; CI green; e2e shard weights stale (Codex 61)                                                               |
| Code simple enough                        | Dead-code sweeps 4750-4780 merged; standing S-verify items                                                             |

## Done recently

Blue Hole floor, mission-start camera clearance, Journal scan-focus fix, dead config/asset/type sweeps, golden set back to ten sites.

## Left

Shared terrain-tint fix for blotchy ground, Hunga and Kama subjects, Titanic aft light, Lost City upper frame, Monterey sand, Blue Hole floor, debrief objective count, e2e timings, journey acceptance, real-phone retest.

## Needs owner

- A short phone retest on the newest build using `plan/progress/4410-P2-phone-accept-checklist.md`.
