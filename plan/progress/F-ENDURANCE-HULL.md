# F-ENDURANCE-HULL

## What changed

- `src/core/config/deepOpenings.ts`: Endurance opening now range 32, yawOffset 10, altitude 10, chaseRadius 70 (global is 98.5), chaseOffsetX -220, chaseOffsetY -20. The hull is about 380 px wide in the 1600 px frame (was 280 px), still beside the sub with a gap, scan target "main hull" unchanged. Yaw is capped by the unit test (opening must face the hero within about 11 degrees), and radius is capped near 70 because the sub must fit the frame.
- `tests/unit/deepOpening.test.ts`: the Endurance case expected the global chase radius; it now expects the authored one (other assertions untouched).
- `src/world/props/wrecks/materials.ts`: `plankTone` paint option (per-strake tannin brown to silver grey, plus slow patches along the hull).
- `src/world/props/wrecks/endurance.ts`: `plankTone` on the hull; 13 broken ribs (starboard waist and poop, port poop) from their own RNG so other placement is unchanged; rail growth clusters (anemones plus pale sponge-tinted squirts) added to the existing instanced lists.

## See it

`GOLDEN_SITES=endurance tools/golden.sh`; shots in `.cache/codex/shots/f-endurance-hull/` (`base-high-*` before, `after-high-*`, `after-low-*` after).

## Tier behaviour

Rib geometry is merged into the one wood mesh (no new draw call, about 13 small beams). Rail clusters scale with `detail.growth` (Low 0.2: about 3 clusters; High 14). Plank tone is vertex colour only.

## Known gaps

Hull is not scaled up (published 44 m kept). The opening camera cannot pitch further down, so the hull sits in the lower third of the frame. Ribs are subtle at the opening distance and show in the close shots.
