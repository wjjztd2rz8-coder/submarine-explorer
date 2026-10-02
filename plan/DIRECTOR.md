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
