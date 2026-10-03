# f-monterey-polish

Status 2026-10-03: done, not merged.

## Changed

- `data/landmarks/monterey-canyon/props.json`: flank walls now face inward (east wall heading 270, west wall heading 90; they were facing away). West wall moved ahead-left of the spawn pose and enlarged to 120 x 48 x 50 m so it shows in shot 1. New `canyon-wall-far` (220 x 90 x 80 m, collision none) behind the near walls gives the gap beyond them a dark mass, done via props data only (no Spawn/props/camera changes).
- `src/world/props/geo/scarp.ts`: wall sponges are now three kinds (small vase, tall tube, low encrusting dome), scale at most 2.4 (was up to 4.4), HSL saturation 0.14-0.30 and lightness 0.26-0.46 (was 0.4 / 0.58-0.78), lower glow. `wallSpongeSpec` and `SPONGE_LIMITS` exported for tests. Instance counts unchanged, so low tier cost is the same.
- `tests/unit/f-monterey-polish.test.ts`: sponge bounds and variety, flank facing/placement.

## Shots

- Before: `.cache/golden/2026-10-03-200302/monterey-canyon-{1,2,3}.png` (same code as 195811 in this worktree).
- After: `.cache/golden/2026-10-03-200728/monterey-canyon-{1,2,3}.png`. Shot 1: west ridge visible lower-left, far wall visible upper right, sponges subtle. Shots 2 and 3 choose different auto approach poses, so they show less wall life than before.

## Gates

See final report; `PW_PORT=4471 tools/gates.sh`.
