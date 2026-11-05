# V-monterey-wall-clarity

Cause: the 2026-11-02 pose change touched only the free-dive pose. The mission opening was untouched; it takes the lowest-scoring safe pose, which put the sub on a ridge crest with the wall as a side detail.

Changed (data only, `data/landmarks/monterey-canyon/site.json`, `opening.mission`): `localAltitudeWeight` 6 (prefers poses low over the floor, the existing Spawn score term) and `yawOffset` 14 (turns the view so the wall face sits centre-right). No code, no strata change.

Simplified: reused the existing mission weight/yaw fields; no new capability, no new element.

Before: .cache/golden/2026-11-05-165243/monterey-canyon-1-mission.png. After: .cache/golden/2026-11-05-165927/monterey-canyon-1-mission.png. Tried yawOffset -12 (wall pushed off the right edge, worse) before 14.

Honest rating: ~5/10 (was ~3.7). One clear pale wall face with a hard crest now reads centre-right and the objective marker sits near it. Not done: the sub still sits on a talus slope rather than the canyon floor, and distant ridge striations on the left are unchanged. The distance fade of striation contrast needs a shader/vertex-colour change in `scarp.ts` and was not attempted; the next step.
