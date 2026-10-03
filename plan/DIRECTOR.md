# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (2026-10-01 night)

1. **Hero sites over breadth.** Polish five hero sites to postcard quality before adding more breadth: Titanic, Lost City, Great Blue Hole, Beebe vents and Monterey Canyon. The other sites may be trimmed later if they don't earn their place.
2. **The first 60 seconds at each hero site:**
   - Spawn close to the set piece at a readable altitude.
   - Add ambient fill so the seabed within ~40 m is always readable (never black).
   - Make set pieces bigger and more detailed.
   - Keep framing and the sub visible.
3. **Arcade has no depth gating.** In Arcade every site gets the hull it needs. Progression rewards upgrades, stars, cosmetics and secrets. Depth-locked hulls become a Realistic challenge. (A new player at Titanic currently sees black water at 1,000 m: unacceptable.)
4. **Bottom-centre HUD collisions:** the tutorial card, scan panel and controls bar overlap each other and the sub. Re-lay them out (tutorial to a corner; the controls bar hides once learned).
5. **Finish F2-MODES** (free dive, daily dive, simplified modes).
6. **Rebrand** (name, logo, title scene) using docs/research/brand.md.

## Director notes

- **2026-10-02 16:55** (golden set 2026-10-02-0704):
  - **Titanic:** much better. The bow is in frame, the new sub reads well and the HUD no longer collides. Still murky: at 110 m the wreck is a dim rust shape with little detail. Push it toward a documentary still: open closer (~50–60 m) or brighten the far field, and make the rail/deck silhouette readable.
  - **Lost City:** still fails "readable in 10 s". The tower is a dark silhouette on a black slope, and the seabed outside the headlight pool is invisible. Check that the later vent commits (4ed8c5f+) fixed this in a fresh golden set; if not, it's the top send-back.
  - **Both:** the "Something to scan is in range" hint duplicates the scan-target panel; show one, not both.
  - Capture a fresh golden set at the start of the next run and compare.

- **2026-10-02 20:10** (reviewed F-TITANIC-2 shots): Titanic now opens broadside at 70 m chase with rails/portholes readable; sub covers a slice of the upper deck (acceptable). Blue Hole halocline haze and lighter walls work. Still open: golden-run comparison (Codex f-golden-run), Lost City fresh check, Blue Hole grotto prop size verified only by geometry.

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
