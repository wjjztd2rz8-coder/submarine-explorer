# V-lostcity-tower-top

## Change

Material only, `src/world/LostCityCarbonate.ts`: lit radiance now passes through a highlight shoulder (`out *= 0.55 / (0.55 + maxChannel)`) just before `opaque_fragment`, so glow-lit carbonate faces roll off instead of clipping to flat white. One constant (`shoulder`), no site branches, no light edits. Program cache key renamed so the old shader is not reused. Unit test pins the shoulder after `lights_fragment_end` and before `opaque_fragment`. CHANGELOG entry added.

Review of the earlier wip commits: the approach is right (the carbonate material, not lights). The only fix: a stray `;` in a test comment.

## Evidence

- After: `.cache/golden/2026-11-02-142459/lost-city-1.png` and `lost-city-3.png` (free-dive hero poses, desktop).
- Peak channel value (max over R,G,B) on the Poseidon tower top: pose 1 184, pose 3 194. Target was below 235; earlier tower-blown note had pose 3 at 215 and the pose-1 region at 206-208.

## Verdict

Pose 3 (close tower top): the cap and face now show vertical streaks and mottling in pale blue-grey and tan; not a white blob. It is still the palest object in the frame and the streaks are soft rather than crisp. Pose 1 (distance): the top reads as a pale lit crown with a light vertical streak on the face, small detail only. Side effect: the shoulder dims mid-bright carbonate a little everywhere (about 15 percent at low radiance), which is acceptable here. Rating about 7/10.

## Gate

See the bottom line of this file (filled in after the run).
