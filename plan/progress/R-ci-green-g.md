# R-ci-green-g

## Blue Hole scan-edge hint (f-bughunt-960)
Cause: the debug spawn for the first POI (min_depth_m 10) lands where the hull's own floor
(Submarine.floorFor on its terrain) lifts the sub from -12 m to about -9.3 m on the rim ledge.
That is shallower than the POI's minimum scan depth, so the POI was never in range, the
scan candidate was null, and the objective's edge hint stayed visible. Titanic has no min depth.
Fix (test setup only): for POIs with a minimum depth, walk from the spawn toward the POI to the
first spot where the hull floor allows hovering below the minimum depth. Depth rule and the
expected-target guard are unchanged.

## settings keyboard-only overlay test
Failed every run locally (5/5), flaky in CI. Cause was a product bug: the dive's
"Device layout" header button stays visible in the Controls view and precedes Back in the DOM,
so showControls focused it instead of Back. Fix: Settings.showControls hides the layout
shortcut in the Controls view. 5/5 pass after.

## Results
f-bughunt-960 great-blue-hole arcade high + titanic arcade low: 6/6; all arcade low: 6/6.
