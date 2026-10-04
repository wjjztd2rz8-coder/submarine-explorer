# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-04 review for tag f24; golden set 2026-10-04-082207)

Run `tools/golden.sh` at the start of any run that merged visual work. Compare against the previous set. If this list runs dry, refill it from the newest golden set rather than idling. Claude weekly budget is tight (~18%), so one Sonnet package per run.

Claude visual backlog (Sonnet agents, in order of player impact):

1. ~~Batch-merge 540/560/580/530~~ merged (f26/f27). Codex 610 (portrait/low-tier pitch verification) and 620 (first-minute audit) finished and need gates + review next.
2. ~~Titanic snow~~ merged (570, shots good: sparse snow, hull readable). Remaining: sky above the far field is near-black; add a lighter horizon gradient.
3. **Lost City beehive chimney:** smooth white slab with no life at its base (600 queued for Codex; if it stalls, do it in Claude with banded vertex colours and base corals).
4. **Beebe sub scale (partly done in f27: nearer pose, sub now fills frame but hides the nearest chimney; seabed still dark):** sub is small in shot 1 and the flat seabed is dark; nearer default camera or vent framing (560 covers seabed only).
5. **Blue Hole east grotto and stalactite gallery:** shot 1 is good now; east grotto poses still need a close shot with context.
6. ~~Monterey hex boulder~~ done in f27 (fractured boulders, rough sponges). Old text:  the boulder reads fake; replace or break up with rock variants.
7. **Debrief/Journal polish** from the 510 audit design questions (F-FLOW-AUDIT-510.md).

Codex queue (f27 update: 600, 610, 620 finished/running; queued 630, 640, 650); older: 570, 580, 590 running; 540, 550, 560 finished and awaiting merge; queued 600 (Lost City), 610 (portrait/low-tier verification of f24 poses), 620 (first-minute audit and fixes), 630 (Lost City/Monterey fact check). 450-triage holds only a spec.

Demoted: further title polish; rebrand logo (done, Codex 440).

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
