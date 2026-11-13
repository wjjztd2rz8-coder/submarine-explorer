# V-bluehole-lower-frame (DIRECTOR item 31)

## What changed

The Blue Hole opening's lower frame was a black void because the wall below the ledge was multiplied to near black by the biome `depthShade` tint, and the reef ambient was too low to reveal it. Data-only retune, no code branches:

- `TerrainBiome.ts` great-blue-hole: `depthShade` tint 0x3f6a82 -> 0x9cc0d0, depth window unchanged; `horizonFadeM` [80,260] -> [140,360] so the far wall is not fogged away.
- `data/landmarks/great-blue-hole/mission.json`: reef preset `ambientScale` 1.5 -> 3.2 (fades out by 200 m as before).
- Unit test: every depth-shaded biome keeps its deep tint above a quarter of albedo (walls never go black).

## How to see it

`GOLDEN_SITES=great-blue-hole GOLDEN_MODE=free-dive tools/golden.sh` (and `GOLDEN_TIER=low`); `great-blue-hole-1.png`. Mission opening: GOLDEN_MODE=mission.

## Result

High: curved wall plus the hole-floor ring now read under the sub, the halocline disc and floor coral stay as accents. Low: was fully black below the lamp; now shows wall form (still dark, which is honest for a 57 m station). Mission opening gains a readable wall base. Other sites are untouched (the settings are per-site data in the great-blue-hole biome and mission only).

## Performance

No new draw calls, triangles, or shader work; values only. Low stays as cheap as before.

## Self-rating

6/10. The lower 40% now has structure instead of a void, but at 57 m it is still a dark, quiet area; no extra life or particles were added (snow scaling and fog haze were tried and were invisible or muddied the grotto, so reverted). A later pass could stage a faint group of fish below the sub via `life.opening`.

## Gates

`PW_PORT=5731 tools/gates.sh` passes (e2e=smoke + project-base). `tools/site-specs.sh great-blue-hole`: 88 pass; 4 touch-viewport failures (journal-debrief journey 844x390 / 390x844 and phone-accept first-minute 390x844 / 844x390, pause menu never opens) also fail for titanic, so they are not caused by this change. Five other initial failures were a stale dist (served SHA mismatch) and passed after a rebuild.
