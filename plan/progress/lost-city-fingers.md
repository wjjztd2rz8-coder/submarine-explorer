# lost-city-fingers

Changes

- spire.ts: new `irregular` option on tieredSpire (rotating elliptical section, partial ledges, broad lumps, sharp meandering flow ridges). Black smokers unaffected (off by default).
- towers.ts: carbonate spires use it; 6 leaning side fingers on the main tower, 2 on others and lone chimneys; flanges cut from 7 to 4 (main), narrower and shorter arcs; dark vertical flow seams in vertex paint.
- Colliders, scan targets (beehive/slab) and Low-tier meshes unchanged in structure; fingers use dens-scaled segments (about 14 x ~10 verts each on Low).

Before: .cache/golden/2026-10-08-202656/lost-city-2.png
After: .cache/golden/2026-10-08-210714/lost-city-2.png (worktree .cache)

Gates: PW_PORT=4872 tools/gates.sh all PASS (build, unit, python, content, attribution, prettier, e2e, e2e-base). No snapshot changes.

Weaknesses

- Fingers still read slightly tubular with flat cut tops; a flared/branching tip would help.
- Seams are subtle at distance; lost-city-1 wide view still reads as a tiered spire.
- Low tier and phone not visually checked.
