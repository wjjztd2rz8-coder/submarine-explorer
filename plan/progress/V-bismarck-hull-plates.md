# V-bismarck-hull-plates

## What changed

- `src/world/props/wrecks/bismarck.ts`: the pale green-grey slab was the teak deck. It is now a dark tarred brown (`DECK_BROWN`, Bismarck's own constant; Endurance and the shared teak colour are untouched), with less green growth and silt, and a streaked shade field so long stains cross the planking. The deck line now sags under the aft island and wanders by a fraction of a metre, so the hull and far silhouette are no longer a flat ruler line. Barbettes, superstructure and rails follow `top(s)`.
- `src/core/config/terrain.ts` + `src/world/Terrain.ts`: scour gains an optional `shade` that darkens the moat floor against the footprint (vertex colour only; `scourAt` also returns the moat weight). Bismarck sets `shade: 0.55` and its pale rim `tint` drops from 0.45 to 0.15. Titanic and Blue Hole data unchanged. Geometry and the seamount flank (`guide.json`) are not touched.
- The shared steel shader was not changed again (the previous item already darkened Bismarck steel).

## Screenshots

`.cache/codex/shots/V-bismarck-hull-plates/`: `before-`, `after1-` (deck shade only, still green-grey), `after2-` (kept) for bismarck-1-mission (opening), bismarck-1/2/3 (free-dive spawn, approach, detail). Two iterations.

## Simplicity rules

Per-site values sit in the terrain scour table and in bismarck.ts; no site branches in shared code. Net small: one optional field, one constant. No new tests, no package numbers, no snapshots rebaselined (see gate result below).

## Remaining issues

- No true listing or roll; the silhouette break is only a deck sag plus edge wander. A heel needs colliders and the far silhouette rotated together.
- Opening hull is dark and low contrast against the seabed (readability screen still passes); the far horizon dome is unchanged.
- Rim shadow is visible in the approach frame but subtle in the opening.

## Rating

Opening about 3.5, approach about 3.8 (was about 3.2): brown, streaked, no longer green-grey; shadowed scour reads in the approach.
