# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-04 review for tag f22; golden set 2026-10-04-031944)

Run `tools/golden.sh` at the start of any run that merged visual work. Compare against the previous set. If this list runs dry, refill it from the newest golden set rather than idling.

Claude visual backlog (Sonnet agents, in order of player impact):

2. ~~510 and 520 merged (f23).~~ **530 (HUD footer/touch) is still unmerged and waits on Codex 580 (license link hit-test fix).**
3. ~~Blue Hole spawn pose and east grotto~~ merged (f23: sub inside the hole, banded wall, lighter alcoves). Left: spawn pitch can't be set so frame 1 is still mostly wall; west alcove close shot is murky.
4. **Lost City banding stronger and tower-base corals** (queued as Codex 600).
5. **Titanic far-field lift:** lift the near-black far field and add a faint haze horizon (snow density is Codex 570).
6. **Beebe sub scale:** sub reads small in shot 1; nearer default camera or vent framing (floor and chimney texture is Codex 560).
7. **Blue Hole spawn pitch + west alcove** follow-up, then debrief/Journal polish from the 510 audit design questions (F-FLOW-AUDIT-510.md).
8. **Debrief/Journal polish from audit 510** once it lands (dead ends, clutter).
   Codex queue (all unblocked): 540, 550, 560, 570, 580, 590 (bughunt Blue Hole/Journal), 600 (Lost City). Merged through f23: 480-520. 450-triage holds only a spec.
   Codex queue (all unblocked): 540 merge residue bughunt, 550 toast placement, 560 Beebe seabed lift, 570 Titanic snow density. Merged through f22: 480, 490, 500. Finished but unmerged: 510, 520, 530; 450-triage holds only a spec.

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
