# V-endurance-hull progress

Shots: `.cache/golden/2026-10-27-112931/endurance-2.png` (after) vs `/home/vijay/submarine-explorer/.cache/golden/2026-10-27-094529/endurance-2.png` (before).

## Changed

- `endurance-stern` scatter kit (`src/world/props/wrecks/scatter.ts`): planks 18 to 44 (clustered), timbers 3 to 8, new `mounds` kind (30 low silt mounds, warm sand tints) using the existing `mudBlock` piece, new `stones` kind (60 rounded stones, small-debris tiers only) as the lit accent.
- `data/landmarks/endurance/props.json`: the stern prop disc grows from 4 m to 18 m so the skirt reaches the hull; `tests/unit/wrecks.test.ts` dims table updated to match. Prop count unchanged (3).
- First tries: mounds in the rigging kit (grey boulders, wrong place) and dark tints (black puddles). Both discarded.

## Simplicity

Rule 4: data plus an existing kit, no site branch. Rule 1: no new prop, UI or setting. Rule 7: no package numbers in comments. Low tier gets one extra instanced draw (mounds); stones are `small` so Low skips them. The Low budget bound (1500) is untouched.

## Rating

Before about 3.4, after about 3.5 (from the shots). Silt mounds and timbers now break up the sand on the hull's far side and the stones add a few pale glints.

## Remaining

- The foreground (camera side) is still empty sand: the kit disc is centred at the stern and cannot cover the near flank without moving its anchor or adding a prop (prop count is pinned at 3).
- No strong warm lit patch; mounds are subtle under the lamps.
