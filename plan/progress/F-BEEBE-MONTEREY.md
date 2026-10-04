# F-BEEBE-MONTEREY

## What changed

- `src/game/Spawn.ts`: Beebe opening pose gets `chaseRadius: 54`, `chaseOffsetY: -16` (default arm is 97 m, 38 m up); uses the per-site hook from F-BLUEHOLE-PITCH. Other sites unchanged.
- `src/world/props/geo/scarp.ts`: Monterey (`canyon` preset only) apron boulders use `fracturedBoulder`: a lump cut by 3-5 random planes, fine noise, bedding-band and patch vertex colours; each instance is also stretched along a random axis. Wall sponges (vase, tube, dome) go through `roughen` with more segments: the 6-segment dome was the hexagonal "boulder" in the golden close shot. Hunga Tonga and Challenger boulders are untouched.
- `CHANGELOG.md`.

## See it

`GOLDEN_SITES=beebe-vent-field,monterey-canyon tools/golden.sh`. Screenshots: `.cache/codex/shots/f-beebe-monterey/` (before: `.cache/golden/2026-10-04-110818/`).

## Tiers and performance

Instance counts unchanged, same draw calls. Boulders only exist at medium+ (`rubble` false on low). Boulder template detail is max(2, sphereDetail): about 320 faces x3 templates; sponge templates gain a few dozen triangles. Negligible.

## Known gaps

- Beebe frame 1: the sub hides the nearest chimney; the lit smoker stands to its right. The seabed beyond the amber glow is still dark by design.
- Boulders are flat-shaded; at a distance they read as rock, close up still faceted.
