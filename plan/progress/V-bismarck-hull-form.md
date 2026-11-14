# V-bismarck-hull-form

## Changes (data only, no code branches)

- `data/landmarks/bismarck/props.json`: main hull `y_offset_m` 5 (was none) and height 15 to 19 m. The hull used to snap to the lowest footprint sample and then sit mostly buried on the slope, so only a thin slab of deck showed. It now stands out of the bed with its flanks, four barbettes and torn aft end readable. Note text updated to say the lift is a build choice.
- `src/core/config/terrain.ts` Bismarck scour profile: depth 4 to 7.5 m, width 26 to 30 m, rim 1 to 1.5 m, rim tint 0.15 to 0.45, moat `shade` removed (was 0.55, which darkened the floor). Same fields the Titanic profile already uses; nothing new added.
- Net: no new props, settings or code paths.

## Screenshots (`.cache/codex/shots/V-bismarck-hull-form/`)

`before/`, `a1/` (y_offset 3, depth 6), `after/` (final). High desktop mission opening.

## Rating

Opening about 3.3 before, about 3.8 after. The hull now reads as a long ship with a torn stern, sunk in a visible scour ring with a pale rim; it no longer floats as a slab.

## Remaining gap

- The hull is still dark brown-grey on a dark bed; edge separation is from the pale rim and moat, not a lit pool. A real lit ground pool needs a light/terrain-colour change not done here.
- No explicit sediment drape along the hull base; the moat reads as a ring only.
- The bow end (left) is still a plain wedge; the raised bow is mostly the deckBow sheer.
- Unverified on Low and from the approach/detail poses.

## Gates

`tools/gates.sh` green (unit, e2e smoke, e2e-base, attribution, prettier). Updated the free-dive opening snapshot (camera y shifted 0.6 m with the deeper scour).
