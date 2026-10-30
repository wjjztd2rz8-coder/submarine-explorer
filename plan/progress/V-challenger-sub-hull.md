# V-challenger-sub-hull

Cause: the Class C foam hull painted its red crown by face normal (`n.y > 0.55`). On the raked, narrowing bow the normals of neighbouring quads swing across that threshold, so the red/white boundary came out torn (ragged notch on the upper bow). Not a clipping plane, depth fight or decal issue.

Fix: `classC` hull painter in `src/vehicles/hulls.ts` now paints red by height below the section's own top (`c.y > hull(c.z).top - 0.3`), a smooth contour that follows the hull.

Screenshot (golden challenger-deep-1, desktop): the bow now has a clean, smooth red cap and white face with no notch.

Gates: tools/gates.sh all PASS (e2e=smoke).
