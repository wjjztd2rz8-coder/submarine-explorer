# V-monterey-banding

## What changed

- `src/world/props/geo/scarp.ts` (canyon wall vertex paint): laminae are now warped in x and y and each lamina's tone is mixed with local 3D noise (eroded beds only), so no tone runs unbroken along the wall. The ledge shadow line fades with the laminae instead of ruling every bed. Per-bed albedo swing uses a data table.
- `src/core/config/monterey.ts`: new `laminaWarp`, `laminaBreak`, `lipFloor`, `bedTone`; minimum bed thickness 0.3 to 0.7, so fewer, bolder beds replace many thin ones.
- No site branches, no Low-tier draw changes (vertex colours and bed offsets only), no tests touched.

## Before / after (monterey-canyon-3, desktop golden)

- Before: dense, evenly spaced horizontal streaks over the whole face.
- After the lamina break alone: barely different. Adding thicker beds and calmer per-bed tone gave the visible change: fewer stripes, wider tonal beds, the fine moire-like ruling is mostly gone. The wall is still clearly bedded (that is correct for thin-bedded mudstone) and no darker or less readable than before. Sub unaffected.

## Honest rating

About 3.8 (from 3.6). Banding is reduced, not eliminated; the vertical rill pattern in the centre of the face and the regular ledge geometry still read as stripes. A next step would be per-bed lateral pinch-out of ledges.

## Gates

The first gates run failed unit specs that hash Monterey wall geometry and colours (scarp equivalence, Low buffers, opening snapshot). The wall geometry and vertex colours changed on purpose, so I regenerated those hashes and snapshots. Draw counts (30) and triangles (284010) in the Low pin are unchanged; the placement hash is unchanged. Rerun: all gates pass (python, content, build, unit, e2e smoke, e2e-base, attribution, prettier).
