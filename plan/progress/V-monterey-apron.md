# V-monterey-apron

## What changed

Data only, in `MONTEREY_RUBBLE` (`src/core/config/monterey.ts`): smaller block and scar-fall radius ceilings (blocks 3.2 to 2.4, fragments 2.2 to 1.8, scar blocks 2.8 to 1.8) and a steeper radius skew (1.8 to 2.6), so most apron rocks are small and only a few are large. The 160-instance count is unchanged (so the instance-count tests did not move); the pebble floor stayed at 0.3 because `montereyBoulders` (exposure > 0.25 m) and `montereyRubble1320` (nearest neighbour > 0.25 m) need rocks of about that size. A first try with a lower floor broke both tests. No code change, no site branch. Right-bank crest untouched. Rebaselined the canyon medium/high scarp hashes in `scarpTerrain.test.ts` (rubble matrices only changed).

Net simpler: no new code or settings, four constants retuned.

## Before / after (golden, monterey opening, desktop)

Before: a run of large round boulders along the foot beside the sub. After: the biggest boulders are smaller and the foot reads as a mix of sizes with more small fragments, but the change is modest; the slope itself is still smooth, and true pebbles would need a size-tier or a lower floor with new test thresholds.

## Score

Beautiful about 3.75 to 3.85. Not a step to 4.

## Gates

`PW_PORT=4871 tools/gates.sh`: python, content, build, unit, e2e, e2e-base, attribution PASS. prettier FAIL on `plan/PROCESS-LOG.md` only (pre-existing, not touched here).
