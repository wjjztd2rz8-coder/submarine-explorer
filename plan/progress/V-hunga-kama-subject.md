# V-hunga-kama-subject

## What changed (data first, one shared preset tweak)
- Hunga (`data/landmarks/hunga-tonga-caldera/props.json`): tuff wall dims [90,30,45] -> [150,60,28] (wider, lower).
- Tuff preset in `src/world/props/geo/scarp.ts`: apron reach 0.6 -> 0.9, rubble glow raised, drape tone lightened toward the tan seabed so the apron fades into the slope instead of ending in a dark hard skirt. Only the tuff preset (Hunga) uses it.
- Kama (`data/landmarks/kamaehuakanaloa`): both Hiolo chimneys use the existing `smoker-cluster` feature (north 18x16x6 m, tallest stack ~9 m; south 14x12x3.3 m); pillow field shrunk 36x30x5 -> 18x15x2.5 and moved ~50 m east-southeast of the vent so it leaves the opening frame; opening reframe heroes the vent (no aimHero), yaw -16, range 26, altitude 9.
- Cut: none of the content; hiolo-north-chimney-2 kept as is.

## Before / after
- Before: /home/vijay/submarine-explorer/.cache/golden/2026-10-28-091604/{hunga-tonga-caldera,kamaehuakanaloa}-1.png
- After: .cache/golden/2026-10-28-130044/hunga-tonga-caldera-1.png, .cache/golden/2026-10-28-131853/kamaehuakanaloa-1.png in 2026-10-28-131853 (worktree)

## Honest rating
- Hunga: modestly better (~+0.3). Apron now blends into the slope; still reads as a dark mound, not a clear caldera wall.
- Kama (second pass): better. The pillow egg is now small at the frame edge; a taller vent cluster with dark smoke and fauna sits beside the sub. Still modest: the stack is next to the sub rather than 12-18 m ahead (camera/spawn pose did not respond to range tuning as expected), no warm light pool added. Not a hero shot.
- Cut/bend: north stack ~9 m exceeds the earlier 5 m honesty cap on Hiolo chimneys (logged in CHANGELOG).

## Simplicity check
No siteId branches, no layout patches, no new specs, reuses existing props; net code change is three constants.
