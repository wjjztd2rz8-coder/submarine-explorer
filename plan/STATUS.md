# Status

The one-page answer to "where is the project?". Each comprehensive review rewrites it (plan/REVIEW-PROMPT.md step 5). Details: [REVIEWS.md](REVIEWS.md) (dated reviews), [DIRECTOR.md](DIRECTOR.md) (the Backlog, single source of forward work), [OVERNIGHT-LOG.md](OVERNIGHT-LOG.md) (each run).

**Updated:** 2026-10-14 by Claude, joint comprehensive review with Codex Sol (golden 2026-10-14-064710).

## Stage

**Phase F (art, feel and release): about 76% of the way to 1.0. Plan four weeks (four to six credible).**

Play: <https://wjjztd2rz8-coder.github.io/submarine-explorer/> (deployed on every push to main).

## What 1.0 means

| Requirement                                                                   | Now                                                                                                                              |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views | Not yet: none at 4 (Titanic, Monterey 3.5; Beebe, Blue Hole, Lost City, Challenger, Endurance 3)                                 |
| The other eight sites are coherent with no major visual defect                | Unknown: not captured at real mission spawns yet (tooling queued, then V-eight-sites)                                            |
| A new player understands the first five minutes on desktop and phone          | Improving: one guidance slot merged and clean on phone shots; unaided journeys on the merged build not yet recorded (V-journeys) |
| Acceptable Low-tier performance on a real phone                               | Untested on a real device (owner check)                                                                                          |
| Hosted CI green, and a full run no longer blocks releases                     | No: red since 2026-10-13; 54 stale-test failures repaired and pushed, result pending (brief 1740)                                |
| No known blockers; code simple enough to keep changing                        | Mostly: settings resolve once, modal stack, boot split, cosmetics-only rewards merged; per-site manifest and HUD regions remain  |

## Done

- 13 real sites on real bathymetry; five hero sites plus Challenger Deep and Endurance set pieces.
- Arcade and Realistic modes, free dive, Daily Dive, star ratings, marine life, Journal, debrief, photo mode, audio.
- Bathyline brand, touch controls, installable offline app, quality tiers.
- Simplification wave: shared helpers, dead code and assets removed, ROV cut, settings resolved once, FocusTrap stack, deferred boot, fixed equipment with cosmetic rewards and Journal finds, one guidance slot, simplified Home/tutorial/banner.

## Left for 1.0

The ordered list with owners is the Backlog in [DIRECTOR.md](DIRECTOR.md). In short:

1. Verify unaided journeys on the merged build, desktop and phone (V-journeys); a three-region HUD (S-hud).
2. Hosted CI green, then tag f53 (briefs 1740, 1710).
3. Hero art to 4: Endurance opening, Titanic close-up, Beebe opening, Blue Hole detail, Lost City towers.
4. Eight non-hero sites at real mission spawns.
5. Per-site manifest, globe/site picker on phones, Ultra merged into High.
6. Owner real-phone check; playtest checklist; tag v1.0.

## Needs owner

- A five-minute play on a real phone on the newest push (Low-tier performance and first five minutes).
- Nothing else; the five simplification decisions are made (2026-10-12).
