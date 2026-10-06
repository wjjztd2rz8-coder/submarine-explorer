# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-06 comprehensive review; golden set 2026-10-06-121603)

Run `tools/golden.sh` at the start of any run that merged visual work. If this list runs dry, refill it from the newest golden set. Claude weekly budget is ~10% until 2026-10-08 07:00, so Claude does review/merge/push only until then; Codex builds.

Claude backlog (ordered by player impact; all unblocked):

1. **Real first-60 s playthrough captures (Claude/Playwright):** Home -> site -> 60 s on desktop and portrait for the 5 hero sites, plus Journal and debrief. Fix confusion found (Survey wording, nav target vs waypoint target, tutorial asking for lights while a scan is ready).
2. **Review and merge 770 (Blue Hole first target within ~110 m, opening toast delay) from its screenshots.** Redo in Claude if the wall still reads flat.
3. **Review and merge 780 (Titanic horizon band).** Hull must remain the brightest thing.
4. **Hosted CI green (790):** push Codex's fixes, check `gh run list`; if still red after one more round, cut shard-heavy specs rather than loosen assertions.
5. **Monterey first frame:** raise ambient/sub light so the canyon is readable in 10 s without being flat, and add fish density near the start pose.
6. **Lost City beehive/slab at distance:** banded vertex colours on the beehive like the Poseidon tower.
7. **Beebe seabed:** sparse and dark beyond the lit pool; add sediment variation and a few tube-worm clumps.

Codex queue: 770 (Blue Hole target), 780 (Titanic horizon), 790 (CI) queued. Next candidates: Challenger Deep/Endurance golden pass, a Journal copy audit of the 720 changes, a regression bug hunt over 740/760.

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
