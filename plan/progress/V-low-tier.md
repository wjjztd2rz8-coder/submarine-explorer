# V-low-tier

Mission-mode portrait captures at Low. Before: `.cache/golden/2026-10-15-182213` (all 13 sites). After: `.cache/golden/2026-10-15-182550` (dark sites, Lost City, Beebe). High re-check: `-182756` (Blake).

## Scores (1-5, first frame and +10 s)

| Site       | Low before | Low after | Notes                                                                    |
| ---------- | ---------- | --------- | ------------------------------------------------------------------------ |
| Hudson     | 2.5        | 3.5       | Ledge, floor and lamp pool readable.                                     |
| Bismarck   | 3          | 3.5       | Hull plates and dropstones read.                                         |
| Hunga      | 3          | 3.5       | Rim slope and basin patches read.                                        |
| Blake      | 2.5        | 3         | Still the darkest; jelly target small and dim.                           |
| Lost City  | 2 (frame 1 black) | 3.5 | Slope and towers visible from frame 1; slightly bright slope.          |
| Beebe      | 2 (no seabed in frame 1) | 3 | Floor and stack visible, still muted.                               |
| Titanic, Blue Hole, Monterey | 4 | 4 | Unchanged; fine at Low.                                              |

High is unchanged by construction (tier gate, covered by the unit test); Blake High re-captured.

## What changed (data only)

- `LOW_SEABED_LIGHT` ambient 3 -> 6 (matches the Medium/High dark-site floor); `lost-city` and `beebe-vent-field` added to `LOW_READABILITY_SITES`.
- `tests/unit/lowSweepReadability.test.ts` updated to match.

## Remaining

Blake needs a brighter carbonate palette in its biome entry. Beebe and Lost City at Low are readable but not pretty; the Lost City slope is a little washed out.
