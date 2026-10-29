# V-kama-opening

## Cause

Kamaʻehuakanaloa used the `seamount` environment preset, which only adds a faint glow light and no smoke or shimmer. The opening spawned 110 m from Hiolo North with the chimney tiny and off-frame, so the pillow-lava mound read as the "target": a brown egg on a bare slope.

## Change (data only, no shared code)

- `data/landmarks/kamaehuakanaloa/mission.json`: environment preset `vent` with a rust-brown, lighter plume and haze glow. The existing vent preset supplies smoke, shimmer and haze. Glow-light settings stay at the vent defaults (the per-site preset spec has a table for authored glow; a stronger glow would need a row there).
- `data/landmarks/kamaehuakanaloa/props.json`: hiolo-north-chimney-1 moved ~35 m north to sit by the scan POI, so the stack is where the target marker points. The iron-stained mounds and pillows are kept.
- `data/landmarks/kamaehuakanaloa/site.json` `opening.mission`: `yawOffset` 30 (existing shared opening table). Range stays 110 m: a 70 m try broke the approach-distance guards (110 m minimum) and was dropped.

No new HUD, setting or code branch. Logged in CHANGELOG.md; nothing cut.

## Result

Before/after Low-tier desktop shots in `.cache/codex/shots/V-kama-opening/{before,after}/`. After: a smoking rust-brown vent stack is visible mid-left above the scan marker, the pillow mound is mid-right, and the sub is centre. Readability scene/sub 0.173 (cutoff 0.125), pass. A yawOffset of -18 put the stack on the right but the frame was too dark (0.103, flagged), so +30 was kept.

Rating: 2.5 of 5. The vent reads as a smoking structure now, but it is small at 110 m, there is no visible glow, and the sub is centred rather than in the lower-left third.

## What is left

- Sub in the lower-left third and a larger stack: needs a chase-offset change; a first `chaseOffsetX` try swung the camera badly.
- Visible orifice glow at Low tier (needs an authored-glow row in the preset spec).
- Portrait and landscape layouts not reviewed.
