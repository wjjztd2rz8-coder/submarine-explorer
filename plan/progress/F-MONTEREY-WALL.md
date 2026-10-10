# F-MONTEREY-WALL

## Built

- `src/world/props/geo/scarp.ts` (canyon preset, non-low tiers): five seeded slump scars per wall (`Scar`, `scarBowl`, `scarDisp`, `scarHead`) added to the wall displacement, so colliders follow them; ledge strength is cut inside scars; silt tint on the floor and a darker headwall.
- Per-bed ledge reach noise (0.35 to 1.85) so ledges pinch out and jut along the wall.
- Up to 15 larger fallen blocks on the apron below the scars, replacing the same number of ordinary rocks (counts unchanged).

## See it

`GOLDEN_SITES=monterey node tools/golden-shots.mjs`; shots in .cache/codex/shots/f-monterey-wall/ (before-N, v2-N).

## Tiers / perf

Same mesh and instance counts as before; scars are vertex displacement only. Low has no fidelity wall, so unchanged.

## Gaps

Overhangs remain the existing bed lips; scars are shallow bowls, not true undercut caves. Perched blocks on mid-face ledges not added.
