# V-bluehole-hood-geometry

## What changed

- `data/landmarks/great-blue-hole/site.json` + `src/core/SiteManifest.ts`: the hood prop gains `pendants`, seven authored `[u, f, length]` stalactites (position along the width, depth toward the lip, length as a fraction of the height). Lengths run 0.12 to 0.5 of the height, so they are clearly different.
- `src/world/props/geo/stalactites.ts` (hood only): pendant placement is extracted into one `hang` helper used by the random stub clusters and the authored feature cones. Stubs are now short (at most about 0.13 of the height) and fewer, which pays for the cones inside the Low triangle budget (20472 against 21300). The lip gets vertical ribs (a ragged fringe), the lip chip depth drops from 11 to 6 so the broken plates are less blocky, the outer lip face is lighter, and the underside is darker.

## Shots

`.cache/codex/shots/V-bluehole-hood-geometry/{before,after,after2}/` (golden blue-hole; `after2` is final).

## Tests

`props-geo` and `terrainMerge1140` snapshots re-baselined (Blue Hole only). Perf budget test unchanged and passing.

## Simplicity rules

1 net: one helper replaces the inline placement block, stubs reduced. 4: data lives in site.json, no `if (siteId)`. 6: existing specs only. 7: no package numbers in code.

## Remaining issues

- The 24 m opening pose (`great-blue-hole-1-mission`) is 150 m out: the hood is a small shape mid-frame and nothing fills the top 25%. That is camera framing, not geometry, so the target composition is not reachable by geometry alone.
- Close up (east-2, east-3) the thick curtain plates hanging to the seabed and the faceted lip remain; they read as folded sheets.
- Stalactites now show clearly varied lengths, but the underside is still lit blue-grey in places.
- Honest rating about 4.0 (from about 3.8): gain about 0.2, mostly from the pendants.
