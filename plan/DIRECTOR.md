# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-03 evening review; golden set 2026-10-04-002012)

Run `tools/golden.sh` at the start of any run that merged visual work. Compare against the previous set. If this list runs dry, refill it from the newest golden set rather than idling.

Claude visual backlog (Sonnet agents, in order of player impact):

1. **Monterey golden poses 2/3 + wall texture:** pin poses to wall-life views in tools/golden-shots.mjs; sediment banding/texture so the wall is not a smooth slab.
2. **Blue Hole spawn pose and east grotto:** reduce the flat sand-wall view at spawn, east-alcove golden pose, grotto reads as a dark mound.
3. **Toast placement (395 merged; after 450 hud footer merges):** "Animal nearby" toast to top centre or below the legend; it sits under the sonar and crowds the left column.
4. **Titanic far-field lift (after Codex 460 worktree merges):** lift the near-black far field; thin the marine snow over the ship.
5. **Beebe sub/seabed readability:** seabed around the vents is near black-brown and the sub reads small; add subtle floor lift and chimney texture (plumes are now good).
6. **Lost City banding stronger and tower-base corals:** the slope is better but banding is faint.

Codex queue (all unblocked): 470 touch-150 overlap, 480 verify rebrand, 490 Lost City camera bughunt, 500 CI red triage, 510 journal/debrief flow audit, 520 verify Lost City/Beebe visuals. Worktrees 450 hud footer, 450 triage, 460 hold work.

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
