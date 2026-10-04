# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-04 review for tag f23; golden set 2026-10-04-062459)

Run `tools/golden.sh` at the start of any run that merged visual work. Compare against the previous set. If this list runs dry, refill it from the newest golden set rather than idling. Claude weekly budget is tight (~20%), so one Sonnet package per run.

Claude visual backlog (Sonnet agents, in order of player impact):

1. **Titanic far-field lift and haze horizon:** far field is near-black; add a faint haze horizon (snow density is Codex 570, avoid its files).
2. **Beebe sub scale:** sub reads small in shot 1; nearer default camera or vent framing (seabed texture is Codex 560).
3. **Blue Hole spawn pitch and west alcove:** frame 1 is still mostly wall; west alcove close shot is murky.
4. **Lost City and Monterey close shots:** the golden poses are tight cockpit views with little context; pull back poses so the sub or a landmark is in frame, and make the Monterey coral less flat white (Lost City banding is Codex 600).
5. **Debrief/Journal polish** from the 510 audit design questions (F-FLOW-AUDIT-510.md): dead ends and clutter.
6. **Merge 530 (HUD footer/touch)** once Codex 580 lands, and review its screenshots.

Codex queue (all unblocked): 540, 550, 560 running; 570 (Titanic snow), 580 (530 fix), 590 (Blue Hole/Journal bughunt), 600 (Lost City). Merged through f23: 480-520. 450-triage holds only a spec.

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
