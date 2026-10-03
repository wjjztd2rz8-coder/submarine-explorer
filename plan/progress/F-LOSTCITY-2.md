# F-LOSTCITY-2: Lost City readability pass (progress)

Branch `claude/f-lostcity-2`. Shots: `.cache/codex/shots/f-lostcity-2/{high,low}-{desktop,phone}.png`, golden set `.cache/golden/2026-10-03-0251/`.

## What changed

- `src/world/TerrainBiome.ts`: `lost-city` biome lifted to pale grey carbonate sediment (`0x5f6360`, `0x4e524f`, `0x585c58`), stain `0x7a7660` at 0.07 (was an orange-brown 0.18), `contrast 0.5`, `detail 0.45` (soft texture, less grid repeat). Biome is per site, so no other site changes.
- `data/landmarks/lost-city/mission.json`: `ambientFill` 8 to 12 (vent preset, per site).
- `data/landmarks/lost-city/props.json`: seven `far-spire-*` carbonate chimneys (24-52 m) 75-330 m north and around Poseidon, so the far ridge shows silhouettes. Poseidon (~60 m), depth and facts untouched. They join the vent shimmer sources (cap 12 sources, 12 props total).
- No HUD, spawn, sub or tower framing changes.

## Tiers

Both tiers read; the low tier looks slightly brighter (fewer lights). Draw calls rise by about one per far spire (instanced chimney builders), not measured separately.

## Known gaps

- The haze on the far spires is the global fog only; no dedicated haze layer.
- The Poseidon apron (talus skirt) is now darker than the surrounding seabed; a lighter apron colour would help.
- Plume glow was left as is (clear fluid has no glow by design).
