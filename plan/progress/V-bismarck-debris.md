# V-bismarck-debris

## What changed

- `src/world/props/wrecks/scatter.ts`, Bismarck kits only (data in the existing kit tables): the pale hexagonal slabs were the slide `mudBlock` pieces (3-12 m) and turret-field mud and plates. They are now 1-5 m, sunk 45-50% into the bed, and tinted dark silt grey (`SLIDE_TINTS`, plus `gain` 0.8 on plates). Berms went from 25-45 m long and 2.5 m tall to 8-18 m and 1 m. The hull-field plates shrank and sink deeper, and a small `shards` kind (60 small fragments) adds variety.
- `bismarck.ts`: hull UV repeat 8 m to 20 m, so plating cells are larger and the stain shader no longer aliases into moire at 110 m; the plates read as panels with seams and rivets up close.
- No shared-code branches; Titanic and Endurance use the same helpers unchanged.

## Screenshots

Before: `.cache/golden/2026-11-05-222844/bismarck-1-mission.png`. After: `.cache/golden/2026-11-05-225755/bismarck-1-mission.png` and `bismarck-2.png` (62 m detail).
Note: `tools/golden.sh` silently reuses an already-running server on its port (4298 was taken by another worktree), so earlier captures showed old code. Use `GOLDEN_PORT=<free>`.

## Self-rating

Debris 7/10 (small, dark, mostly buried; nothing near 8% of frame width). Hull texture 6/10 at 110 m (calmer, still faintly streaky on the rusty superstructure), 7/10 close. Composition unchanged: upper ~35% still dark water.

## Left

- Camera pitch/pose to lift the hull in frame was not done (no cheap generic pose lever found; the opening pose is shared logic).
- Hull streak noise at distance comes from the shared `plateStains` shader; a fix belongs in a shared-material item.

## Rules bent

None.
