# V-lostcity-tower-blown

## Change

Data only, in `data/landmarks/lost-city/mission.json`: `glowIntensity` 60000 to 10000 and `ambientFill` 16 to 32. The blown bloom was the three glow point lights saturating the tower face; material albedo and emissive changes had no effect on it (tried 1.5 to 0.7 and 0.22 to 0.1, reverted).

## Evidence

- Before: `.cache/golden/2026-11-02-022248/lost-city-1.png`
- After: `.cache/golden/2026-11-02-023102/lost-city-1.png`
- Hero pose 1: tower-top region peak 208 (flat plateau, halo, sd 48) to peak 206 with a visible gradient and left face now readable; whole-frame mean 57 to 66, so not darker.
- Hero pose 3: brightest tower pixel 242 to 215 (below the 245 clip line); frame mean 77 to 85.
- Flank in pose 1 is darker (mean 119 to 100) but still lit and readable.
- `golden-compare` refuses the pair ("Incompatible: position"), so it gave no numeric screen; judged by eye and pixel stats.

## Self-rating

About 7/10. The halo is gone and detail shows; the near face in pose 3 is still pale, and the pose-1 flank is dimmer than before.

## Remaining gap

The right-hand lit face in pose 1 is still a smooth pale plateau at about 205; stronger carbonate texture contrast would need a material change.
