# V-hunga-kama-subject

## What changed (data first, one shared preset tweak)
- Hunga (`data/landmarks/hunga-tonga-caldera/props.json`): tuff wall dims [90,30,45] -> [150,60,28] (wider, lower).
- Tuff preset in `src/world/props/geo/scarp.ts`: apron reach 0.6 -> 0.9, rubble glow raised, drape tone lightened toward the tan seabed so the apron fades into the slope instead of ending in a dark hard skirt. Only the tuff preset (Hunga) uses it.
- Kama (`data/landmarks/kamaehuakanaloa`): both Hiolo chimneys use the existing `smoker-cluster` feature (12x10x3.2 and 14x12x3.3 m, tallest stack under 5 m); pillow field shrunk 36x30x5 -> 24x20x3.5; opening reframe now heroes the vent (no aimHero), yaw -22, range 30, altitude 10.
- Cut: none of the content; hiolo-north-chimney-2 kept as is.

## Before / after
- Before: /home/vijay/submarine-explorer/.cache/golden/2026-10-28-091604/{hunga-tonga-caldera,kamaehuakanaloa}-1.png
- After: .cache/golden/2026-10-28-130044/hunga-tonga-caldera-1.png, .cache/golden/2026-10-28-130358/kamaehuakanaloa-1.png (worktree)

## Honest rating
- Hunga: modestly better (~+0.3). Apron now blends into the slope; still reads as a dark mound, not a clear caldera wall.
- Kama: small gain. A vent cluster with smoke and fauna is now visible beside the sub, but it is small and dark at opening and the brown pillow egg still dominates. Not a clear win.

## Simplicity check
No siteId branches, no layout patches, no new specs, reuses existing props; net code change is three constants.
