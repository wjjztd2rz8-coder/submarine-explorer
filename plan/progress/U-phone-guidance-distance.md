# U-phone-guidance-distance

## Changes

- `Tutorial` tracks idle time on the move step (`MOVE_IDLE_S` = 20 s, reset by any input) and exposes `stalled`.
- `tutorialText` takes an optional `markerDistanceM`; on touch with a destination it returns `Marker N m ahead` (N rounded to 5 m, min 5) in the same guidance card/slot.
- `onboard.ts` passes the already-computed scanner distance when `tutorial.stalled`.
- Unit test in `tests/unit/guidance.test.ts` covers the threshold, rounding and length.

## Simplicity-rule check

One guidance surface, no new HUD element, no layout patch, no site branch, no package numbers in code, test by capability.

## Remaining issues

Distance is the scanner objective distance (3D), refreshed live while idle. Not verified on a real phone.
