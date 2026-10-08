# bluehole-ledges

## Changes

- `src/world/terrainFeatures.ts`: new exported `blueHoleTerraces(a, r)`, added to the Blue Hole carve alongside `blueHoleWallRelief`. It quantises the wall profile height into treads and steep risers (period 6-13 m and phase wander with bearing, so no ring is constant), adds a ~1 m crest lip and ~1.3 m dip under it (slope shading reads this as an undercut shadow). Active between roughly -34 and -100 m (fades at both ends), zero at both gallery mouths (same mask as the wall relief) and on the floor. Max vertical shift ~8 m.
- Single heightfield only (`Terrain.surfaceHeight` carve), so the visual mesh and physics sampling stay identical; the carve sampling fix is untouched. No new materials, no darkness added.
- Tests: new terrace test in `tests/unit/blueHoleWall.test.ts` (bounded, seamless, zero at mouths/floor). `blueHoleWallRelief` is unchanged so its test and the beebeIsolation snapshot needed no update.

## Screenshots

- Before: /home/vijay/submarine-explorer/.cache/golden/2026-10-08-202656/great-blue-hole-*.png
- After: .cache/golden/2026-10-08-211623/great-blue-hole-*.png (desktop and portrait 390x844, in the worktree)

## Gates

`PW_PORT=4881 tools/gates.sh`: unit, python, content, attribution, e2e, e2e-base passed; first run failed unit (signed terrace broke the non-negative relief test, fixed by splitting it out) and prettier (fixed). Re-run recorded in the final report.

## Known weaknesses

- A heightfield cannot overhang; lips and undercuts are +-1 m cues, not true cave roofs.
- The left/near wall in the first pose reads jagged where terraces meet the existing flute noise.
- Undercut shadow relies on slope shading; no dedicated material darkening. Low tier not captured separately.
