# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-03 comprehensive review; golden set 2026-10-03-175107)

Run `tools/golden.sh` at the start of any run that merged visual work. Compare against the previous set. If this list runs dry, refill it from the newest golden set rather than idling.

Claude visual backlog (Sonnet agents, in order of player impact):

1. **Great Blue Hole spawn:** a dark dome-shaped prop floats mid-frame above the floor (the first thing the player sees). Seat it on the wall/floor or remove it. Then: ledges and stalactites on the hole walls, a darker blue fall-off with depth, and a floor that is not a flat pale slab.
2. **Lost City close-up:** Codex 400 owns the first pass (worktree 400-f-lostcity-readable, stalled by the Codex floor). The 15–30 m view is still a smooth, smeared white tower with soft ring-shaped blobs. Needs carbonate texture (flanges, fluted columns, tan staining), triplanar UVs and a darker, less milky ambient. Review 400 before starting anything new here.
3. **Beebe plumes:** still smooth grey funnels with a clean cone edge. Make them billowing and turbulent, widening and drifting with the current, black/dark grey and with orifice shimmer. Keep the chimney close-up as is.
4. **Monterey:** the ridge now has strata and a lit face (improved). Remaining gaps: the canyon reads as a lone mound, not a canyon; add the opposing wall and depth fall-off, and sponges/corals on the lit face.
5. **Titanic:** spawn view is the reference for the other sites. Lift the far field slightly; Codex 460 reduces the foreground snow clutter.
6. **Rebrand rollout (Bathyline):** Codex 440-f-rebrand-bathyline is queued; Claude reviews the diff. A proper logo for the share image is still open.
7. **Fewer, better sites:** Codex 450-f-site-triage is queued; decide after reading it.

Codex queue (all unblocked): 410 modes bughunt, 420 verify tests, 430 hero-props bughunt, 440 CI red fix (f2-life scan), 440 rebrand, 450 HUD attribution footer, 450 site triage, 460 marine-snow audit.

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
