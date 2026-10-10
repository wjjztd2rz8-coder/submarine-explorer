# f-beebe-blobs

Branch claude/f-beebe-blobs. Files: src/world/TerrainBiome.ts (Beebe entry only), src/world/props/geo/beebe.ts, src/world/props/geo/crustChimney.ts, tools/beebe-chimney-shots.mjs (screenshot timeout 180 s), 3 snapshots, CHANGELOG.

## Finding

The pale tan blobs were not the terrain shader's cobble/stain layer (setting patch 0 and removing all scatter left them unchanged; painting talus magenta/black confirmed). They were `beebe-seabed-talus` (apron rubble), painted with the bright ochre `stain_color` (0x876c40) at up to 45%, plus habitat chunks with a hard-edged pale top (ny > 0.6 -> 0x5a5347).

## Changed

- Apron talus: dark rust stain (stain x0.3, 30% max), sediment dusting 0.1 -> 0.04.
- Habitat chunks: dark basalt with a smooth dust gradient on upward faces (no hard edge).
- Beebe biome (shader, per-site): colorA 0x736e63 -> 0x58534b, contrast 0.85 -> 0.62, ripple 0.38 -> 0.22, ripple length 0.8 -> 0.55 m, stain 0x3e3229 at 0.12.
- Chimneys 2-3: painted colour lerped 22% toward the hero's mound tone and x0.92.

## Shots

- Before: `.cache/golden/2026-10-10-081418/beebe-vent-field-{1,2,3}.png`
- After: `.cache/golden/2026-10-10-082509/beebe-vent-field-{1,2,3}.png` (colorA slightly lifted afterwards)
- Chimneys: `.cache/codex/shots/f-beebe-blobs/b0-*` (before), `b1-*` (after)

## Gates

PW_PORT=4871 tools/gates.sh (smoke + project-base): build, unit, python, content, attribution, prettier, e2e, e2e-base all PASS.

## Remaining gaps

- A few lit rocks near chimney 2 still read tan under the headlights; they are now much darker and softer but not black.
- Spawn shot is dark overall; the sand needs lamp light to read. Hero flange rims still catch highlights.
- Low-tier visual not re-captured (only buffer hash changed in tests).
