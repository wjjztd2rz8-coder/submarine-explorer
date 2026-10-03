# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-03 night review; golden set 2026-10-03-230949)

Run `tools/golden.sh` at the start of any run that merged visual work. Compare against the previous set. If this list runs dry, refill it from the newest golden set rather than idling.

Claude visual backlog (Sonnet agents, in order of player impact):

1. **Lost City surroundings (unblocked, 400 merged):** carbonate rubble and flanges on the small towers, darker ambient, textured slope; ground the pasted-on corals.
2. **Beebe plume variety:** per-vent width and lean, lit hot-water haze above orifices, a bent plume in the current.
3. **Monterey golden poses 2/3 + wall texture:** pin poses to wall-life views in tools/golden-shots.mjs; add sediment banding/texture so the wall is not a smooth slab.
4. **Blue Hole spawn pose and east grotto:** reduce the flat sand-wall view at spawn, east-alcove golden pose, grotto reads as a dark mound.
5. **Toast placement (395 merged, unblocked once 450 hud footer merges):** "Animal nearby" toast to top centre or below the legend.
6. **Titanic far-field lift (after Codex 460 worktree merges):** lift the dark far field slightly.

Codex queue (all unblocked): 470 touch-150 overlap, 480 verify rebrand, 490 Lost City camera bughunt, 500 CI red triage, 510 journal/debrief flow audit, 520 verify Lost City/Beebe visuals. Stalled worktrees 450 hud footer, 450 triage, 460 resume after the 21:15 Codex reset.

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
