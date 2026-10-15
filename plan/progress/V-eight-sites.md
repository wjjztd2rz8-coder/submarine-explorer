# V-eight-sites

Captured the eight non-hero sites with `GOLDEN_MODE=mission GOLDEN_LAYOUTS=desktop,portrait tools/golden.sh`
(mission spawn, frames 1 and +10 s). Sets: `.cache/golden/2026-10-15-121934` (first pass),
`2026-10-15-123941` (portrait fill-in), `2026-10-15-125057` (after the fix, four sites).

## Verdicts (1-5, desktop and portrait agree; scores are after the fix)

| Site            | Score | Notes                                                                                                         |
| --------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| Axial           | 3     | Dark but the glowing chimneys read at 180 m; orange lamp pool good. Unchanged.                                |
| Bismarck        | 3     | Was a bare dark slope (hull invisible at 240 m). Hull plates now read at 150 m. Still a low-contrast scene.   |
| Blake           | 3     | Mound silhouette now readable at 160 m (was empty). Seabed itself is nearly black.                            |
| Hudson          | 2.5   | Ledge still faint at 160 m; big pale sponge blobs near the sub look flat and out of scale. Not fixed (minor). |
| Hunga           | 3     | Rim slope silhouette visible at 160 m (was a faint ridge). Dark, cool, plausible.                             |
| Kamaehuakanaloa | 3.5   | Red pillow-lava field gives a clear subject and colour. Fine.                                                 |
| Monterey        | 4     | Canyon walls and floor clear and lit.                                                                         |
| Challenger      | 3.5   | Bright, readable floor; lander tiny but marked. Sub looks small vs. floor pattern.                            |

## What changed

Only the per-site `MISSION_APPROACH_M` table (`src/game/Spawn.ts`): Bismarck 240 to 150, Blake 260 to 160,
Hunga 260 to 160, Hudson 240 to 160. The first primary subject was invisible in the dark at the old distance.
Tests read the table, so they follow. No hero sites touched, no code branches.

## Remaining (not major)

Dark seabed at Blake/Bismarck/Hunga; Hudson sponge blobs; Axial and Kamaehuakanaloa subjects stay small.
