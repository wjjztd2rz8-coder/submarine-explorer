# V-endurance progress

Shots: `.cache/codex/shots/V-endurance/` (before-* and after-*, desktop and portrait).

## Changed

- `data/landmarks/endurance/site.json` reframe: range 6, yawOffset -11, chaseRadius 50, chaseOffsetX -45, chaseOffsetY -34; portrait offset x 0 (the portrait guard keeps the sub centred), y -40, radius 50. The hull is about 590 px wide (37%) on desktop (was about 520), the sub sits right of centre above the hull and clear of its top edge.
- `src/core/config/deepOpenings.ts` endurance hemisphere fill: ground 0x7a6c5c, intensity 6 (was 0x50473e, 2). Lower hull strip mean luma about 53 to 58; lamps untouched.
- Re-baselined snapshots (intended, new pose): deepOpening endurance x3, freeDiveComposition endurance.
- Director review rejected the first attempt (pulled the camera back, hull smaller). Tried closer cameras, strong lateral chase offsets and a sub-sideways spawn offset (reverted). Under the facing guard (heading within about 11 degrees of the hero) the sub always sits between camera and hull, so a closer camera makes the sub huge and hides the hull.

## Simplicity

Data only plus one existing per-site tuning value; no new code, no site branches. `deepOpening` and `openingClearance1290` pass. A yawOffset above about 11 degrees fails the facing guard, so the off-axis look comes from the chase offset instead.

## Rating

Before about 3.2, after about 3.5 (judged from the shots, not a joint review).

## Remaining

- Hull is about 37% of frame width, not 60%. Reaching 60% with the sub secondary needs the camera to look at the hero independently of the sub heading (a per-site chase aim), which changes shared camera code.
- Sub is still fairly large; hull underside still brownish-dark (timber albedo).
