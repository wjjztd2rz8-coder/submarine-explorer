# V-challenger-ripples-2

## What changed

- New optional per-biome field `rippleFadeM` (near/far metres). `TerrainMaterial` resolves it once into the existing
  `uFadeRipple` uniform (`biome.rippleFadeM ?? config.detailFadeRippleM`); no shader change, no new uniform, no site branch.
- Challenger sets `rippleFadeM: [70, 200]`, so ripples carry across the opening view and fade out smoothly with distance.
- Geometry untouched: Low lander budget stays 1985/2000. Nothing cut; net one optional data field and one fallback expression.

## Tests

`biomeFloorVariety.test.ts`: the trench fade starts beyond the global fade; the material binds the biome fade (or the global
default) into `uFadeRipple`. `beebeIsolation` snapshot updated: only Challenger's biome digest and its tier uniform digests changed.

## Screenshots

`.cache/codex/shots/V-challenger-ripples-2/`: `before-open.png`, `after1-open.png` (mission opening, Low tier, desktop), `after1-plus10s.png`.
After: clear fine ripples across the lower two thirds of the lit floor, thinning into smooth ooze toward the horizon. Never dark.
Caveat: the foreground ripples are fairly crisp and regular, a little busier than a documentary still; the fade is smooth.

## Honest score

4/5 for the opening ripple target (was 2/5: no ripples). Ripples fade smoothly, but are somewhat uniform in the near field.

## Gates

`PW_PORT=5741 tools/gates.sh`: all green except the beebeIsolation snapshot (expected digest change, updated and re-run green).

## Simplicity rules

1 net-neutral, 2-3 n/a, 4 per-site data only, 5 n/a, 6 extended existing spec, 7 no package numbers in code.
