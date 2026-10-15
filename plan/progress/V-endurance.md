# V-endurance progress

Shots: `.cache/codex/shots/V-endurance/` (before-* and after-*, desktop and portrait).

## Changed

- `data/landmarks/endurance/site.json` reframe: range 6 to 12, chaseRadius 54 to 70, chaseOffsetX 0 to -30, chaseOffsetY -34 to -40, portrait offset x 0 (the portrait guard keeps the sub centred), y -40, radius 68. Sub is smaller and off-axis; the hull flank fills more of the frame.
- `src/core/config/deepOpenings.ts` endurance hemisphere fill: ground 0x7a6c5c, intensity 6 (was 0x50473e, 2). Lower hull side mean luma about 53 to 58 at the pose; seabed also lifts slightly. Lamps untouched (they clip close timber).
- Re-baselined snapshots (intended, new pose): deepOpening endurance x3, freeDiveComposition endurance.

## Simplicity

Data only plus one existing per-site tuning value; no new code, no site branches. `deepOpening` and `openingClearance1290` pass. A yawOffset above about 11 degrees fails the facing guard, so the off-axis look comes from the chase offset instead.

## Rating

Before about 3.2, after about 3.5 (judged from the shots, not a joint review).

## Remaining

- Sub is still near screen centre and the hull is not much larger on screen; a bigger improvement would need the sub placed beside the wreck, which the facing guard blocks.
- Hull underside is still brownish-dark; the timber albedo is the limit.
- Portrait: sub still overlaps the wreck's upper edge slightly.
