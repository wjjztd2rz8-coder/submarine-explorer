# V-bluehole-terrace-saw

## Cause

Regular sawtooth teeth along the Blue Hole wall edges (golden 2026-10-30 great-blue-hole-1 and -1-mission). Two shaping sources, both in `src/world/terrainFeatures.ts`:

1. `TERRACE_PROFILE` risers are far steeper than the mesh can follow (up to 20 m in 4 m, 1.9 m vertex step at High, 3.8 m at Low). The riser contour crosses the grid diagonals and shows as evenly spaced teeth.
2. Two fine terms: the strata band `sin(r*1.37 + 2a)` (4.6 m wavelength) and the lip ridge `sin(37a + 0.7r)^3`, both aliasing against the mesh.

## Fix

- `softTerraceAt`: the terrace profile is box-averaged over +-3 m, so every riser spans several mesh steps. One shared function in the terrace path, no site branch.
- Strata reduced to the single broad band (`r*0.3`); the lip ridge term removed. Net fewer terms.

## Before / after

Before: .cache/golden/2026-10-30-174538 (and 180123 rebuild). After: .cache/golden/2026-10-30-183934 (softening +-3 m; +-5 m was also smooth but blurred the 177-173 riser into its tread). Free-dive shot: teeth along the left ledges gone, bowl wall reads as smooth soft bands. Mission shot: bottom-left serration gone after the strata change alone.

## Honest rating

Sawtooth: fixed (was ~3.4/5 foreground, now ~4.0). Trade-off: terraces are softer, less crisp stacked-ledge reading; a touch blurry at mid range. Not retuned further.

Tests: blueHoleWall riser-rise threshold 4 to 3 m and slope ratio relaxed (riser still steeper than tread); Blue Hole snapshots re-baselined (terrainFeatures, sonarScour1320, freeDiveComposition).
