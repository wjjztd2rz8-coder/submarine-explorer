# V-kama-subject

## What changed

Data only, no code. `data/landmarks/kamaehuakanaloa/props.json` gains two outlying `smoker-cluster` instances (`hiolo-north-outlier-1`, 16x14x6 m; `-2`, 12x10x4.5 m), placed on the opening line between the sub and Hiolo North, 25 to 40 m left of the route. They reuse the existing kit (stacks, smoke, warm glow), so the vent field now reads as a field in the lower-left/centre of the opening instead of one small group far up the slope. Each carries the standard "Game addition" note (once per prop, reconstruction flag).

Positions derive from the golden pose (sub at world -90, 569; yaw -4.5 deg; chimney-1 about 100 m away at the 110 m scan range). The spawn is computed from the objective, so moving the objective or `opening.mission` re-places the opening and these props.

Not changed: the opening range (110 m is the scan contact radius, so closer would break the "approach outside scan range" guard), the glow overrides, the main chimney size (earlier passes with a taller main cluster broke line-of-sight pins).

## Images

- Before: `/home/vijay/submarine-explorer/.cache/golden/2026-11-03-044523/kamaehuakanaloa-1-mission.png`
- First try (outliers at screen edge): `.cache/golden/2026-11-03-174453/kamaehuakanaloa-1-mission.png`
- After (final): `.cache/golden/2026-11-03-174647/kamaehuakanaloa-1-mission.png`

## Rating (honest)

About 4.1 (was ~3.6 against the new target). Warm chimneys with glow now sit lower-left/centre and the slope is no longer a blank wall; not dark. Gap: the vent group still fills well under a quarter of the frame, and the right half is still plain slope. A larger main glow pool would need a code or environment change that was not attempted.

## Gaps

- Desktop opening only; portrait/landscape not reviewed (phone opening-guidance specs pass).
- Right-hand slope is unchanged and flat.
