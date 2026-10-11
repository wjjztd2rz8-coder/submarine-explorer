# f-bluehole-map

Changed: `blueHoleSonarShade` (multiplicative blotch noise) replaced by `blueHoleSonarReef` in src/world/terrainFeatures.ts; src/ui/Sonar.ts blends outside the hole (d>215..285 m) to a palette gradient, shallowT 0.97 at the rim to 0.52 at ~700 m, ignoring measured reef noise and hillshade there. Inside the hole, contours, labels and measured palette are untouched. Palette-agnostic (uses the active palette stops).

Gotcha: the first two captures hit another worktree's server on port 4298; use GOLDEN_PORT.

Screenshots viewed: before .cache/golden/2026-10-11-010335, after .cache/golden/2026-10-11-010546 (3 iterations; flat then gradient strengthened). Verdict: reads in 2 s as shallow flat, dark hole, ring, depth labels, sub; unit tests 1730 pass untouched.
