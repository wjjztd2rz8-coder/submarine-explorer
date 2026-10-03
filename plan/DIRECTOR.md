# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-03 12:40; golden set 2026-10-03-172730)

Run `tools/golden.sh` at the start of any run that merged visual work (it builds, serves on 127.0.0.1 and captures; the earlier "needs a browser host" blocker was just a missing preview server or `localhost` resolving to ::1). Compare against the previous set.

The Claude visual backlog below always has unblocked work. If it runs dry, refill it from the newest golden set rather than idling (15 h of Claude capacity went unused on 2026-10-02/03 because this list had run out).

1. **Lost City close-up (cockpit view):** the tower surface is a blurry, stretched white smear at 15–30 m. It needs real carbonate texture: flanges, fluted columns, chalky white with tan staining, and triplanar UVs instead of stretched ones. The wide shot now reads well.
2. **Great Blue Hole spawn:** a dark dome-shaped prop floats above the floor in the middle of the frame (the grotto/alcove?). Seat it or remove it. The hole walls read as a smooth tan ring and need ledges, stalactites and a darker blue fall-off with depth; the floor is a flat pale slab.
3. **Beebe plumes:** still smooth grey cones. Make them billowing, turbulent black smoke that widens and drifts, with shimmer at the orifice. The chimney close-up is good (keep it).
4. **Monterey:** the canyon wall is a dark, muddy ridge and the close view is almost empty. It needs readable strata and a lit wall face, some life (corals or sponges on the wall), and an opening that frames the canyon depth.
5. **Titanic:** the closest to the vision. The cockpit shot of the bow (rails, portholes, life) is the reference quality for the other sites. The spawn view is still dim; lift the far field a little.
6. **Rebrand rollout: the owner approved "Bathyline" as the working name (2026-10-03).** Roll it out everywhere (title, README, manifest, meta) and replace the draft "P"-like mark in the share image with a proper logo.
7. **Fewer, better sites:** after 1–5, decide which of the other 8 sites earn their place (review a golden-style capture of each) and trim or polish.

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
