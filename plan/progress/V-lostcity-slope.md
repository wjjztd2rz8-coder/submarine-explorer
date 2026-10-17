# V-lostcity-slope

## What changed

- `TerrainFidelity` gains an optional `terrace` (bed thickness, strength). `Terrain.detailHeight` adds a stepped-bed term on rock slopes inside the fidelity focus: the survey height is pulled toward warped beds, each bed with its own strength, so the slope steps down in irregular shelves with broken treads. Lost City sets `terrace: { periodM: 12, amount: 0.9 }` in `LOST_CITY_FIDELITY`.
- Geometry and physics share `detailHeight`, so props, seats and collision follow the shelves. No site branch, no new material, setting or test.

## Screenshots (`.cache/codex/shots/V-lostcity-slope/`)

`before/`, `a1/` (period 7, too ribbed and regular), `a2/` (period 12, wider warp), `a3/` (final, High desktop + portrait), `low/`.

## Simplicity rules

Net: one optional field and one small term, reusing the existing relief path. No snapshot re-baselines were needed (gates green: python, content, build, unit, e2e, e2e-base, attribution, prettier).

## Rating

Before about 3.7; after about 3.9. The slope now reads as broken faceted shelves between the towers instead of a smooth hill, on High and in portrait.

## Remaining issues

- Low is unchanged: its coarse mesh does not resolve fine relief, so the slope is still smooth there.
- Shelves are somewhat faceted (triangle-edged) at the ~7 m High mesh; a finer near subdivision or a rubble-scatter pass on the treads would soften them.
- Shelf terrain shading is still plain; no per-tread sediment colour.
