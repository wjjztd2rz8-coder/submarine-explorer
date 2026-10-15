# V-sub-scale

## Changes (data only)

- Beebe (`FREE_DIVE_OPENINGS` in `src/game/Spawn.ts`): range 76 to 100, chase radius 54 to 100, offsets (-48, -12) to (-88, -20). The camera sits further back with the sub farther from the stack. The two smokers and their plumes now span about three times the sub's height.
- Challenger Deep (`DEEP_OPENINGS` in `src/core/config/deepOpenings.ts`): chase radius 48 to 84, offsets (-28, -10) to (-48, -17), including the portrait offset. Range stays at 30, because the scan target must remain within reach (range below 28 drops the candidate).
- Endurance: tried radius 70 and range 4. The hull got narrower (about 425 px against 530 px) while the sub barely shrank, so this was reverted. The hull is already about three times the sub's width, so it is unchanged.
- Titanic, Lost City, Blue Hole: untouched; golden frames compared and unchanged.

## Findings and limits

- The Beebe framing test fixes the orifice left of centre, the camera 25 to 45 degrees off the stern and the sub within about 11 degrees of the hero, so range and radius had to grow together. Smaller range with a bigger radius moved the orifice right and failed.
- Challenger: the lander is a small marker, so the camera alone cannot make it larger than the sub. With a bigger radius it is about two-thirds the sub's height, down from about one-third. The frame is emptier, so this is a judgment call. It is not fully met.

## Before and after (golden `-1` frames)

- Before: `.cache/golden/2026-10-15-105607/` (desktop and `-portrait-` frames for all six sites).
- After: `.cache/golden/2026-10-15-112705/`.

## Gate

See the final report in the session; result recorded below.
