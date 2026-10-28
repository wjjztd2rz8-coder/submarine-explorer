# V-hunga-kama-subject

## What changed (data first, one shared preset tweak)
- Tuff preset in `src/world/props/geo/scarp.ts` (Hunga only): apron reach 0.6 -> 0.9, rubble glow raised, drape tone lightened toward the tan seabed so the apron fades into the slope instead of ending in a dark hard skirt. Wall dims unchanged: widening it ([150,60,28]) looked better but moved the hero centre beyond the 120 m scan-distance pins in phonePitch/eventsTerrain, so it was reverted.
- Kama (`data/landmarks/kamaehuakanaloa/props.json`): new `hiolo-north-vent-stack` prop reusing the existing `smoker-cluster` feature (10x8x3.6 m, stacks ~5 m, smoke and fauna) beside the chimneys; pillow field shrunk 36x30x5 -> 20x16x3. Opening framing, chimney-1 and chimney-2 untouched. A taller 18x16x6 cluster and a re-aimed opening both looked better but broke the mission line-of-sight and pillow-framing pins, so they were dropped.
- Test baselines refreshed for the tuff change: scarpTerrain hashes, terrainMerge1140, freeDiveComposition snapshots.

## Before / after
- Before: /home/vijay/submarine-explorer/.cache/golden/2026-10-28-091604/{hunga-tonga-caldera,kamaehuakanaloa}-1.png
- After (worktree): .cache/golden/2026-10-28-134236/{hunga-tonga-caldera,kamaehuakanaloa}-1.png. Intermediate Kama experiments: 2026-10-28-131853 (taller stack, re-aimed; best look, test-breaking).

## Honest rating
- Hunga: modest gain. Apron is lighter and blends into the slope; the dark hard skirt is gone, but the wall still reads as a wedge on the opening frame.
- Kama: not fixed at the opening. The vent stack is small and tucked beside the sub and the pillow heap is still a visible lump. The coordinator target (chimney hero 12-18 m ahead, warm light, centre-right) needs the opening/mission framing tests re-pinned; that is a follow-up.
- Cut/bend: none.

## Simplicity check
No siteId branches, no layout patches, no new specs, reuses existing props; net code change is three constants.
