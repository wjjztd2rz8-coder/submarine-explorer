# Status

The one-page answer to "where is the project?". Each comprehensive review rewrites it (plan/REVIEW-PROMPT.md step 5). Details live in [REVIEWS.md](REVIEWS.md) (dated reviews), [DIRECTOR.md](DIRECTOR.md) (priorities) and [OVERNIGHT-LOG.md](OVERNIGHT-LOG.md) (each run). The Phase D2 status page it replaces is [archived](archive/STATUS-2026-09-24-phase-d2.md).

**Updated:** 2026-10-11 by Claude (owner-requested review, Claude alone; a joint review with Codex Sol is scheduled after the Codex reset).

## Stage

**Phase F (art, feel and release), about 75% of the way to 1.0, roughly 3 weeks left.**

Play: <https://wjjztd2rz8-coder.github.io/submarine-explorer/> (deployed on every push; the last push is f51, and local main is ahead).

## What 1.0 means

| Requirement                                                                   | Now                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views | Not yet: 3.25 to 3.75 (Blue Hole lowest, Titanic highest)                             |
| The other eight sites are coherent with no major visual defect                | Unknown: not in the screenshot set yet                                                |
| A new player understands the first five minutes on desktop and phone          | Mostly: tutorial, scan targeting and objective hints fixed; phone portrait is cramped |
| Acceptable Low-tier performance on a real phone                               | Untested on a real device (owner check pending)                                       |
| Hosted CI green                                                               | 29 of 30 shards green on the last push                                                |
| No known blockers                                                             | Release f52 is waiting on 3 failing browser tests                                     |

## Done

- 13 real sites on real bathymetry; 5 hero sites (Titanic, Beebe vents, Great Blue Hole, Lost City, Monterey Canyon) plus Challenger Deep and Endurance set pieces.
- Arcade and Realistic modes, free dive, Daily Dive, progression and upgrades, star ratings, marine life, Journal, debrief, photo mode, audio and music.
- Bathyline brand and title screen, touch controls, installable offline app (PWA), quality tiers.
- First-player flow: tutorial, scan targeting, objective chip, missions that lead to the hero scenery.

## Left for 1.0

1. Release f52 and get hosted CI fully green.
2. Phone first five minutes: an unaided capture on the current build; rework the portrait HUD stack.
3. Hero art to 4: Blue Hole gallery and bowl, Endurance opening, Titanic close-up, Beebe trunk, Lost City opening.
4. Add the eight non-hero sites to the screenshot set and fix what looks broken.
5. Prune the test suite (Codex sweep, then Claude) so a full run no longer blocks releases.
6. Owner real-phone check; README and a playtest checklist; tag v1.0.

## Needs owner

- A five-minute play on a real phone once f52 is pushed.
