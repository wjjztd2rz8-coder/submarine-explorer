# V-beebe-ambient-reach

## Changes (data only, no code)

- data/landmarks/beebe-vent-field/mission.json overrides: ambientFill 6 -> 12, hullLight 0.9 -> 0.75 (the fill also lights the white hull, so hullLight is lowered to compensate).

## Measured (golden mission opening, desktop, tools/golden-readable.mjs)

|                                       | Scene Y | Sub Y | Scene/sub |
| ------------------------------------- | ------: | ----: | --------: |
| Before                                |   2.65% | 14.7% |      0.18 |
| ambientFill 12, hullLight 0.6         |   3.35% | 10.1% |      0.33 |
| ambientFill 12, hullLight 0.75 (kept) |   3.45% | 13.4% |      0.26 |

Screenshots: .cache/golden/2026-10-31-171557 (before), -171727 (hull 0.6), -171852 (kept). Seabed now reads well past the lamp pool and the third smoker base is visible; water stays deep blue-black.

## Tried and rejected

- hullLight 0.6: sub drops to 10%.
- Not retried: hemisphere fill and lamp distance (V-beebe-exposure found no effect).

## Simplicity

Two existing data values retuned; no code, no site branch, no shared config touched. No cut.

## Honest rating

About 7/10. Scene mean Y only +0.8 points (metric is dominated by the dark sky band); the gain is visible in the seabed by eye. Further ambient would flatten the cinematic dark.

## Left

Portrait sub still shadowed under the camera.
