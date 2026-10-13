# Status

The one-page answer to "where is the project?". Each comprehensive review rewrites it (plan/REVIEW-PROMPT.md step 5). Details: [REVIEWS.md](REVIEWS.md) (dated reviews), [DIRECTOR.md](DIRECTOR.md) (the Backlog, single source of forward work), [OVERNIGHT-LOG.md](OVERNIGHT-LOG.md) (each run).

**Updated:** 2026-10-13 by Claude, joint comprehensive review with Codex Sol (golden 2026-10-13-091650).

## Stage

**Phase F (art, feel and release): about 75% of the way to 1.0. Plan four weeks (three to six plausible).**

Play: <https://wjjztd2rz8-coder.github.io/submarine-explorer/> (deployed on every push to main).

## What 1.0 means

| Requirement                                                                   | Now                                                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views | Not yet: 3.0 to 3.5 (Titanic, Blue Hole, Lost City, Monterey 3.5; Beebe, Challenger, Endurance 3)                  |
| The other eight sites are coherent with no major visual defect                | Unknown: not in the screenshot set at their mission spawns yet (V-eight-sites)                                     |
| A new player understands the first five minutes on desktop and phone          | Partly: Home, tutorial and banner simplified (S-flow); the phone HUD is still dense (S-guidance)                   |
| Acceptable Low-tier performance on a real phone                               | Untested on a real device (owner check)                                                                            |
| Hosted CI green, and a full run no longer blocks releases                     | No: several e2e shards fail on the hosted runner (software-GL timeouts); Codex 1610 queued                         |
| No known blockers; code simple enough to keep changing                        | Mostly: dead code, unused assets, the ROV and the sonar-ping/globe bugs are gone; settings and modal rework queued |

## Done

- 13 real sites on real bathymetry; five hero sites plus Challenger Deep and Endurance set pieces.
- Arcade and Realistic modes, free dive, Daily Dive, star ratings, marine life, Journal, debrief, photo mode, audio.
- Bathyline brand, touch controls, installable offline app, quality tiers.
- Simplification wave merged: shared helpers, dead exports, unused decoders and 2.8 MB of assets, ROV cut, CI builds once, nightly render workflow, FocusTrap stack stage 1, simplified Home/tutorial/banner (S-flow), Blue Hole bowl and collision, Beebe trunk.

## Left for 1.0

The ordered list with owners is the Backlog in [DIRECTOR.md](DIRECTOR.md). In short:

1. Phone first five minutes: unaided capture, one guidance slot, a three-region HUD (V-first-five, S-guidance, S-hud).
2. Hosted CI green (Codex 1610), then release.
3. Hero art to 4: Endurance (exposure and framing), Titanic close-up, Beebe opening, Blue Hole detail, Challenger lander.
4. Eight non-hero sites in the screenshot set at real spawns.
5. Settings resolved once, remaining modal/boot work, cosmetic-only rewards, per-site manifest.
6. Owner real-phone check; playtest checklist; tag v1.0.

## Needs owner

- A five-minute play on a real phone on the newest push (Low-tier performance and first five minutes).
- Nothing else; the five simplification decisions are made (2026-10-12).
