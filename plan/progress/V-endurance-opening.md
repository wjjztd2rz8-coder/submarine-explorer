# V-endurance opening framing

Changed (data only plus one table row):

- `src/core/config/deepOpenings.ts` endurance opening: camera straight behind the sub (chaseOffsetX 0, chaseOffsetY -34, chaseRadius 54), range 6, yawOffset -10. The sub is small and centred; the hull lies broadside ahead and fills about a third of the 1600 px frame (was ~380 px / 24%).
- `src/game/Spawn.ts` FREE_DIVE_OPENINGS endurance bearing 60 -> 90 so the base pose views the hull broadside (this also moves the Endurance mission approach side; beebeIsolation snapshot of Spawn.ts source updated).
- Guard relaxed narrowly: `deepOpening.test.ts` wreck/sub gap on landscape may now be horizontal or vertical (the sub sits above the hull's near edge, not beside it). `openingClearance1290.test.ts` reads the radius from DEEP_OPENINGS instead of a literal 70. No other assertion loosened.

Shots (before / after), .cache/golden:

- before: 2026-10-15-013151 (endurance-1, -portrait-1, -landscape-1)
- after: 2026-10-15-014555 (same names)

Gates: PW_PORT=4421 tools/gates.sh all PASS; full unit run 2215 tests pass.

Remaining gap: hull is ~33% on desktop (target 35%), ~27% on phone landscape (the wide phone view shifts the image left; hull clear of touch buttons). The sub is small but sits above the hull rather than at the lower side; going further needs a camera look-ahead per opening (code). Hull is still a little dark/low-contrast on the lower sand side.
