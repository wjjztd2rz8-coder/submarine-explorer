# Status

The one-page answer to "where is the project?". Each comprehensive review rewrites it (plan/REVIEW-PROMPT.md step 5). Details: [REVIEWS.md](REVIEWS.md) (dated reviews), [DIRECTOR.md](DIRECTOR.md) (the Backlog, single source of forward work), [OVERNIGHT-LOG.md](OVERNIGHT-LOG.md) (each run).

**Updated:** 2026-10-15 pm by Claude, comprehensive review (Claude alone; Codex 5h at 6%) (golden 2026-10-15-093704).

## Stage

**Phase F (art, feel and release): about 79% of the way to 1.0. Plan about three and a half weeks (four credible).**

Play: <https://wjjztd2rz8-coder.github.io/submarine-explorer/> (deployed on every push to main).

## What 1.0 means

| Requirement                                                                   | Now                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views | Not yet: none at 4 (Titanic 3.8, Monterey 3.5, Lost City 3.3, Beebe 3.2; Blue Hole, Challenger, Endurance 3)                                                               |
| The other eight sites are coherent with no major visual defect                | Unknown: not captured at real mission spawns yet (tooling queued, then V-eight-sites)                                                                                      |
| A new player understands the first five minutes on desktop and phone          | Improving: one guidance slot merged and clean on phone shots; unaided journeys on the merged build not yet recorded (V-journeys)                                           |
| Acceptable Low-tier performance on a real phone                               | Untested on a real device (owner check)                                                                                                                                    |
| Hosted CI green, and a full run no longer blocks releases                     | No completed result yet: most runs on main were cancelled by the next push (fixed 2026-10-15); failures were down to 2 specs, both repaired; runs take 45 min (brief 2080) |
| No known blockers; code simple enough to keep changing                        | Mostly: settings resolve once, modal stack, boot split, cosmetics-only rewards merged; per-site manifest and HUD regions remain                                            |

## Done

- 13 real sites on real bathymetry; five hero sites plus Challenger Deep and Endurance set pieces.
- Arcade and Realistic modes, free dive, Daily Dive, star ratings, marine life, Journal, debrief, photo mode, audio.
- Bathyline brand, touch controls, installable offline app, quality tiers.
- Simplification wave: shared helpers, dead code and assets removed, ROV cut, settings resolved once, FocusTrap stack, deferred boot, fixed equipment with cosmetic rewards and Journal finds, one guidance slot, simplified Home/tutorial/banner.

## Left for 1.0

The ordered list with owners is the Backlog in [DIRECTOR.md](DIRECTOR.md). In short:

1. Hosted CI green and faster (brief 2080), then tag f53.
2. Opening framing: the sub dominates Endurance, Beebe and Blue Hole frames; scan reach so the Blue Hole dive happens; a picture in the fresh-scan Journal entry.
3. Hero art to 4: Endurance, Titanic close-up, Beebe, Blue Hole terraces, Lost City towers, Challenger lander.
4. Eight non-hero sites at real mission spawns.
5. Per-site manifest (Ultra is already cut).
6. Owner real-phone check; playtest checklist; tag v1.0.

## Needs owner

- A five-minute play on a real phone on the newest push (Low-tier performance and first five minutes).
- Nothing else; the five simplification decisions are made (2026-10-12).
