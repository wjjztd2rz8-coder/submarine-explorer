# F-BLUEHOLE-SPAWN

## What changed
- `src/game/Spawn.ts`: Blue Hole free-dive opening altitude -6 -> -17 (about 14 m under the ledge, 50 m depth), range 235 -> 205. Frame now has banded wall, light shafts, shoals above the ledge, alcove and sub.
- `src/world/TerrainBiome.ts` (great-blue-hole): rockBias 0.15 -> 0.3, strata 0.34 -> 0.5, contrast 0.7 -> 0.85, detail 0.55 -> 0.6, stain 0.2 -> 0.3. No new draw calls.
- `src/world/props/geo/stalactites.ts`: alcove shelf tops/roofs less darkened (0.66 -> 0.86, warm instead of cool grey), apron floor darkening reduced. Applies to both alcoves.
- `tools/golden-shots.mjs`: heroes accept an authored fixed pose; both alcoves are framed from inside the hole on the ledge (40 m and 30 m). New `great-blue-hole-east-2/3.png`; `GOLDEN_SITES` accepts `great-blue-hole-east`. Sites without a fixed pose behave as before.
- No extra fish were added: the existing life systems already place shoals around the new pose.

## Screenshots (worktree `.cache/golden/`)
- Before: `/home/vijay/submarine-explorer/.cache/golden/2026-10-04-031944/great-blue-hole-1.png`
- After spawn: `.cache/golden/2026-10-04-052810/great-blue-hole-1.png`
- West alcove: `.cache/golden/2026-10-04-053030/great-blue-hole-2.png`, `-3.png`
- East alcove: `.cache/golden/2026-10-04-052937/great-blue-hole-east-2.png`, `-3.png`

## Left over
- West alcove close shot (-3) sits behind the stalactites and is murky; a per-hero range would help.
- Alcove floor sediment is still one tone near the foot; no new formations were added.
- Spawn view is still mostly wall; pitch cannot be set by the spawn pose.
