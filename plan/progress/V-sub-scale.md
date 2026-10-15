# V-sub-scale

## Changes (data only)

- Beebe (`FREE_DIVE_OPENINGS` in `src/game/Spawn.ts`): range 76 to 80, chase radius 54 to 66, offsets (-48, -12) to (-62, -14). The gain is modest: the sub is about 10% smaller on desktop and the smokers and plumes still outsize it. A bigger radius (100 with range 100) looked clearly better, but it breaks the `heroReadability` max range of 80 and the `beebeFraming` rule that keeps the orifice left of centre, and those assertions stay as they are.
- Challenger Deep (`DEEP_OPENINGS` in `src/core/config/deepOpenings.ts`): chase radius 48 to 84, offsets (-28, -10) to (-48, -17), including the portrait offset. Range stays at 30, because the scan target must remain within reach (range below 28 drops the candidate).
- Endurance: tried radius 70 and range 4. The hull got narrower (about 425 px against 530 px) while the sub barely shrank, so this was reverted. The hull is already about three times the sub's width, so it is unchanged.
- Titanic, Lost City, Blue Hole: untouched; golden frames compared and unchanged.

## Findings and limits

- The Beebe framing test fixes the orifice left of centre, the camera 25 to 45 degrees off the stern and the sub within about 11 degrees of the hero, so range and radius had to grow together. Smaller range with a bigger radius moved the orifice right and failed.
- Challenger: the lander is a small marker, so the camera alone cannot make it larger than the sub. With a bigger radius it is about two-thirds the sub's height, down from about one-third. The frame is emptier, so this is a judgment call. It is not fully met.

## Before and after (golden `-1` frames)

- Before: `.cache/golden/2026-10-15-105607/` (desktop and `-portrait-` frames for all six sites).
- After: Beebe `.cache/golden/2026-10-15-114935/`; Challenger, Endurance, Titanic, Lost City, Blue Hole `.cache/golden/2026-10-15-112705/` (that run's Beebe frames are an invalid intermediate).

## Gate

See the final report in the session; result recorded below.
