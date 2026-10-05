# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-05 comprehensive review; golden set 2026-10-05-054554)

Run `tools/golden.sh` at the start of any run that merged visual work. If this list runs dry, refill it from the newest golden set. Claude weekly budget is tight (~13%), so one Sonnet package per run; Codex integrates and verifies.

Claude backlog (ordered by player impact; items 2-6 are unblocked and self-contained):

1. **Land the 660 integration batch** (590/600/610/620/630/640/650 plus 670/680 when done): review 660's shots, `git merge --ff-only codex/660-f-integrate-batch`, smoke gates, push, tag f28, remove worktrees 590-660. No full-e2e on main if main has not moved.
2. **Real first-60 s playthrough captures (Claude/Playwright, not Codex):** Codex sandboxes cannot start a browser, so 620 has zero screenshots and its checklist is "pending" for all 13 sites. Capture Home -> site -> 60 s on desktop and portrait for the 5 hero sites, plus the Journal and debrief, and fix confusion found (Survey wording, nav target vs waypoint target, tutorial asking for lights while a scan is ready).
3. **Blue Hole opening:** the wall is flat orange-yellow, the scan target is 203 m away and the toast and scan card stack at the top. Add depth to the wall (darker banding toward the water, a visible ledge) and make the first target closer or the first pose face it (690 covers the east grotto only).
4. **Beebe:** the sub hides the nearest chimney; shift the pose so sub and smoker sit side by side (680 does the framing; review it).
5. **Lost City beehive and Poseidon tower:** banded vertex colours and base life (600 and 710 cover this; review shots, redo in Claude if weak).
6. **Debrief/Journal polish** from the 510 audit design questions (F-FLOW-AUDIT-510.md).
7. Titanic far-field sky: 670 adds a dim blue-grey backdrop; review whether the hard horizon band is gone.

Codex queue: 660 (integration), 670 (Titanic horizon), 680 (Beebe framing) running; queued 690 (Blue Hole grotto), 700 (Monterey canyon read), 710 (Lost City close-up texture). Refill from this list when fewer than 3 are queued: next candidates are a Challenger Deep/Endurance golden pass, a phone-tier pitch pass for the non-hero sites and a Journal copy audit.

Demoted: further title polish; rebrand logo (done).

## Review rubric (every package, before merge)

- **Readable in the first 10 s:** you can see the sub, the seabed and something interesting.
- **Beautiful:** looks like a documentary still, not a prototype.
- **Simple:** a new player understands what to do without reading much.
- **Rewarding:** there's something to find, and it feels good to find it.
- **Honest:** real sites are factual and additions are tagged once.
- **Phone-OK:** a touch layout with no overlaps, and the low tier still looks good.

If it fails, send it back to the same agent or Codex session with concrete feedback (what's wrong, which screenshot, what good looks like). Don't merge and fix later.

## Golden screenshots

`tools/golden-shots.mjs` (to be written) captures the 5 hero sites at fixed poses into `.cache/golden/<date>/`. Compare the newest set with the previous one every night. A merge must not make them worse.

## Needs owner

(The newest items go first. Codex resets: assume the owner will use them, but list here when Codex is blocked.)

(none)
