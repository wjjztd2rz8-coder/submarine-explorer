# V-endurance-hull progress

Shots: `.cache/golden/2026-10-27-112931/endurance-2.png` (after) vs `/home/vijay/submarine-explorer/.cache/golden/2026-10-27-094529/endurance-2.png` (before).

## Changed

- `endurance-stern` scatter kit (`src/world/props/wrecks/scatter.ts`): now an ellipse (rx = dims[0], rz = dims[1]) instead of a disc; planks 18 to 44 and timbers 3 to 8 placed in a ring so they sit beside the hull; new `mounds` (40 low sand-tinted silt mounds, partly sunk, varied size, existing `mudBlock` piece) and `stones` (16 pale stones, the lit accent). Both are `small`, so Low draws no new meshes (planks/timbers already drew there).
- `data/landmarks/endurance/props.json`: the helm-marker prop moved from the stern to the hull centre with dims [30, 12, 2] so the skirt covers both flanks including the camera side. `tests/unit/wrecks.test.ts` dims table updated. Prop count pin (3) untouched; it only counts props, nothing constrains this move.
- Discarded: mounds in the rigging kit (grey boulders), dark tints (black puddles), olive tints (lily pads).

## Simplicity

Rule 4: data plus the kit's own spec, no site branch. Rule 1: no new prop, UI or setting. Rule 7: no package numbers. Low draw count unchanged.

## Rating

Before about 3.4, after about 3.6 (from `.cache/golden/2026-10-27-115042/endurance-2.png`). The near flank now has sand-coloured mounds and a few pale stones; the hull stays the subject.

## Remaining

- Mounds are still smooth round blobs, not true rubble; a dedicated irregular piece would help.
- The helm-marker anemones and squirts now spread over a larger area (fewer near the wheel).
- Warm lit accent is only pale stones; no separate warm patch.
