# V-bluehole-silhouette-2

## Changes (`src/world/props/geo/stalactites.ts`, net -40 lines)

- Deleted the roof-plateau machinery (`shelfStep`, `lipThick`, the notch/overhang tables, blocky nose, the draw-back term). It made the lip read as stacked slabs.
- Lip: continuous noise-driven nose reach (a thin edge overhanging a darker underside), stronger solution-pocket chipping for the hood, roof top is a smooth low crown cut by the existing fissures.
- Pendants (hood): length comes from a clump noise along x (a few long, many short stubs); girth grows with the clump so neighbours fuse into curtains. Main pendants are no longer special.
- Light shaft: not attempted.

## Tests

- `blueHoleProps` envelope test deliberately rewritten: pendants were pinned to the old longest/outermost positions, which forced uniform teeth. It now checks the gallery hangs no lower than before, stays within the prop's width, and keeps real hang (>40% of the old height). Reason: clump-driven lengths move the extremes by design.
- Re-baselined: `props-geo` great-blue-hole snapshots, `terrainMerge1140` Low buffers. Collision/spawn/footprint (`blueHoleWall`) tests unchanged and passing.

## Simplicity rules

Net deletion; uses the `hood` flag, no site branches; no new settings or specs; no package numbers in comments. Member counts are not raised (short pendants below 0.5 m are skipped, so counts can only drop).

## Shots

`.cache/codex/shots/V-bluehole-silhouette-2/{before,after}/` (high, and `low-` prefixed Low).

## Honest rating and remaining issues

About 3.8 (from about 3.4-3.5). Pendants now vary and clump, and the lip is a continuous undercut edge instead of terraces. Remaining: the roof top behind the lip is still a broad slab in east-2, Low shows a flat plank at the right end, and no light shaft.
