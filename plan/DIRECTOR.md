# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-03 evening review; golden set 2026-10-03-190819)

Run `tools/golden.sh` at the start of any run that merged visual work. Compare against the previous set. If this list runs dry, refill it from the newest golden set rather than idling.

Claude visual backlog (Sonnet agents, in order of player impact):

1. **Monterey canyon:** the ridge has strata and a lit face, but it still reads as a lone mound. Add the opposing wall, depth fall-off and sponges/corals on the lit face.
2. **Lost City surroundings:** the tiered tower now reads (400 may still add texture). The slope around it is bare brown and the light is milky. Add carbonate rubble, flanges on the small towers, a darker ambient.
3. **Blue Hole wall and floor:** the wall is flat tan and the rim apron is smeared. Add banding, overhangs, a second stalactite cluster and a textured floor.
4. **Beebe plume variety:** plumes are uniform tall columns. Vary the width and lean per vent, add a lit hot-water haze above the orifice, and a bent plume in the current.
5. **Titanic far-field lift:** lift the dark far field slightly. Codex 460 handles the snow clutter.
6. **Toast placement:** the "Animal nearby" toast overlaps the sonar legend at 1600x900. Move it below the legend or to the top centre.
7. **Rebrand logo (Bathyline):** a proper mark for the share image. Codex 440 rebrand does the rollout; Claude reviews.

Codex queue (all unblocked): 410 modes bughunt, 420 verify tests, 430 hero-props bughunt, 440 CI red fix (f2-life scan), 440 rebrand, 450 HUD attribution footer, 450 site triage, 460 marine-snow audit. Stalled worktrees 390/395/400 resume after the 15:45 Codex reset.

Demoted: further title polish (the title is good: Bathyline, Arcade/Realistic cards, readable at 844x390).

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
