# Director's plan: two-day fun sprint (2026-11-14 to 2026-11-16)

This file is the single source of forward work. The earlier backlog is in
`plan/archive/DIRECTOR-HISTORY-2026-11-14-pre-sprint.md`; nothing there starts again without
being re-listed here.

## Why the plan changed (owner, 2026-11-14)

An independent played review found that a whole dive lasts 30-90 seconds of one repeated
action (steer to a marker, hold scan for 2 s from 100 m away at up to 28 knots), and that the
reward is a small "New Journal entry" card. Six weeks of work had gone into the first frame of
each dive, tests and process. The owner made Claude the orchestrator for two days with one
goal: make the game as playable, fun and educational as possible. No earlier rule is binding
except the usage floors.

## Goal

A casual player spends 3-5 minutes per site, sees each landmark up close, learns one real
thing per discovery, and is led on to the next site. Thirteen sites, about 45 minutes in all.

## How work runs

- Codex (fresh weekly budget) writes the code, in parallel worktrees with separate file
  ownership. Claude (this thread) designs, briefs, plays the build with a scripted player,
  looks at the result and merges.
- Gate for a merge: typecheck, unit tests, build, and a played session by the orchestrator.
  Text-coupled e2e specs are updated when trivial and deleted when not. Hosted CI is cut to
  static checks, unit tests, build and a small smoke set (item 6).
- No progress notes, review logs, percent-to-1.0 estimates, golden captures or CHANGELOG
  entries during the sprint. Git history is the record.
- Acceptance is measured by play: time to first discovery, time to finish the primaries, and
  screenshots of each reveal, per site.

## Backlog

1. **F-reveal [Codex]:** discovery moment. When a scan of a fixed point of interest completes,
   the camera swings to a close, framed view of it for a few seconds and a card shows its name
   and one or two sentences of fact from the Journal entry. That frame becomes the Journal
   picture. Wildlife gets the card without the camera move.
2. **F-pacing [Codex]:** survey speed near unscanned targets (Arcade slows to about 5 m/s on
   approach), a clear "turn toward the marker" message when a scan cannot start, plain turn
   hints (left/right) and no objective placed kilometres from the rest.
3. **F-unknown [Codex]:** only the primary objectives are named. Every other point of interest
   is an unnamed sonar contact ("?") until scanned, so the reveal answers a question.
4. **F-flow [Codex]:** debrief shows what was found (pictures, "3 of 7 at this site", one
   fact) and its main button is "Next dive: <site>". Home's Dive button follows the same tour
   order.
5. **F-tune [Claude]:** play all 13 sites after items 1-4 merge; tune reveal framing, speeds
   and ranges per site from screenshots and timings.
6. **R-ci-trim [Codex, after 1-4]:** hosted CI runs static checks, unit tests, build and at
   most eight smoke journeys that assert capabilities, not copy. The rest of the e2e suite
   moves out of the push workflow.
7. **F-touch [Claude, day 2]:** real touch-input pass at phone portrait and landscape.
8. **R-ship [Claude, day 2]:** push, confirm Pages deploy, hand the owner a 10-minute phone
   test.

## Later (not in this sprint)

Opening-frame art passes, Codex bug hunts and verification briefs, CI shard tuning, Realistic
mode work, cosmetics.
