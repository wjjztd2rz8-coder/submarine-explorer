# V-monterey-wall-face

Result: no product change merged. Data left exactly as on main. Screenshots in `.cache/codex/shots/V-monterey-wall-face/`.

Tried (all through `tools/golden.sh`, Monterey mission opening, desktop):

| Variant | Frame | Verdict |
| --- | --- | --- |
| baseline | `before.png` | marker on ridge crest, pale east face right of centre, striped rock left (about 3.8) |
| scan POI lon -122.0120, yaw 0 | `try1.png` | face centre-right, marker on the crest left of it; slightly better |
| POI lon -122.0113, yaw -10 | `try2.png` | best composition: one pale face dead centre, calm left; marker at the wall foot beside the sub, not on the face (about 4.0) |
| POI lon -122.0116, yaw -5 | `try3.png` | worse: large striped wall fills the right |
| yaw -10 only (POI unchanged) | `yaw-only.png` | slightly worse than baseline; face pushed to the edge |

Why not kept: moving `monterey-canyon-wall` east by 150 to 180 m breaks real invariants, not just snapshots. Unit failures: `montereyOpening.test.ts` (scan target must be within 60 m of the `canyon-wall-ledge` hero; got 156 m), and `terrainCarveAgreement.test.ts` for all three tiers (scan target must stay inside the 200 m carve focus at `terrain.ts` / `terrainFeatures.ts`; got 210 to 232 m). Loosening those is forbidden by this package, and the carve, hero ledge and POI share one coordinate on purpose.

Generic scarp displacement fade: not built. The remaining stripes (left dome, right rock) come from displaced ledge geometry (see V-monterey-striation); a fade needs camera-aware geometry, which is not small or net-simple.

To finish this properly (new package): move the carve focus, `canyon-wall-ledge` hero and the POI together about 180 m east (all three are coupled), then re-baseline the habitat and carve tests; try2 shows the composition that gain would give (about 4.0).

Honest rating of the shipped opening: unchanged at about 3.8. Gap: no single wall face with the marker on it.

Gates: data identical to main, so no product gate was re-run on the final tree. The intermediate tree (POI moved) failed unit as above; python, content and build passed.
