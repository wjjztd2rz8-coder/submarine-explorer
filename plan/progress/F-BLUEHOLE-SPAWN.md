# F-BLUEHOLE-SPAWN

Branch `claude/f-bluehole-spawn`. The floating dark dome at the Great Blue Hole spawn was the `karst-grotto` (stalactite-cluster) prop: its wall plane sat at the lip of the 40 m ledge with a 32 m shelf projecting out over the 125 m drop, 20+ m in front of the real hole wall.

## Changes
- `data/landmarks/great-blue-hole/props.json`: grotto moved outward onto the ledge against the wall (lon -87.53705), dims 84x32x28 -> 70x22x18, so its shelf is carried by the ledge.
- `src/world/terrainFeatures.ts`: steeper upper wall into a wider flat ledge (~40 m), second step near 75 m, plus gentle ledge undulation and floor ripples/hummocks (1-3 m).
- `src/world/TerrainBiome.ts`: Blue Hole depth shade starts at 12 m, ends at 100 m, deeper blue tint.
- `src/world/props/geo/stalactites.ts`: faint vertex glow so the limestone reads pale tan, not a dark silhouette.
- `src/game/Spawn.ts`: Blue Hole opening altitude 12 -> -6 so the spawn stays ~30-40 m deep (clear of the surface camera ceiling).
- `tests/unit/blueHoleProps.test.ts` (new): every geo prop at the site has its foot within 3 m of the sampled carved terrain, its shelf lip is within 20 m of the ledge height and ground rises behind the wall. Fails on the old placement.
- `tests/unit/f-bughunt-4.test.ts`: retargeted characterization numbers that the smoother carve changed (depth shade 12/100, buried-sub depth, mismatch threshold).

## Screenshots (spawn pose, 1600x900)
- Before: `.cache/golden/2026-10-03-175645/great-blue-hole-1.png`
- After: `.cache/golden/2026-10-03-180500/great-blue-hole-1.png` (ledge close-up: `...180206/great-blue-hole-2.png`)

## Notes / open
- Extra N/S shelf props were tried and removed (read as floating dark slivers at frame edges).
- Cream flat patches (talus apron) still show on the ledge in the 40 m approach shot; candidate follow-up.

## Gates
`PW_PORT=4411 tools/gates.sh`: see final report.
