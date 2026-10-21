# V-monterey-foot

## Changes

- `src/world/props/geo/scarp.ts` (canyon preset data and the existing Monterey-gated apron colour callback only): the upper wall profile now steps through three short ledges (riser then bench) instead of one long vertical rise to a clean crest; the apron gets dark, rubble-flecked colour patches on the Monterey path so the silt slope is not one smooth streaked tone.
- Tests: canyon geometry/collision hashes in `scarpTerrain.test.ts` and the Monterey Low buffer snapshot in `terrainMerge1140` rebaselined (geometry and vertex colour changed; draws 30 and triangles 284010 unchanged).
- Tried and reverted: raising the canyon rock count (160 to 230/340). It breaks the pinned instance counts and pushed the Medium frame budget to 908k over 900k, and showed little in the shots.

## Simplicity rules

Net change is a handful of data lines plus one colour line inside the existing `erodedBeds` branch; no site branch, setting, UI, new spec or package numbers. No terrain relief (offset-invariance test untouched). No new draws or triangles.

## Shots

`.cache/codex/shots/V-monterey-foot/{before,after}-{1,2,3}.png`

## Rating and remaining issues

About 3.7 to 3.8: the stepped crest is visible in shot 2 and the apron mottle is subtle. Honest: the talus apron still reads as a smooth, vertically streaked slope with a row of boulders at its rim, and in shots 1 and 3 the change is barely noticeable. The terrain bank crest on the right (shot 1) is untouched, since fixing it needs relief or a prop. Next step would be fragments/pebbles on the apron face itself (a small cap-neutral swap of ordinary rocks for pebbles, with the instance-count tests updated) and breaking the apron's streaky texture, which comes from the shared rock texture rather than vertex colour.
