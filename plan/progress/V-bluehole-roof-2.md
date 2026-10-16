# V-bluehole-roof-2

## What changed

- **Roof thickness** (`stalactites.ts`): the front lip's rise is scaled by a per-x `lipThick`, so thin plateau fronts alternate with thick ones while the roof top behind keeps its height.
- **Notches and overhangs**: three drop-offs where the roof top steps down (`NOTCHES`, near-sharp sides), with the flanking blocks drawn forward over the gap (`overhangAt`) through the existing wall displacement. Colliders only grow relative to the visual.
- **Tilted beds**: the ledge and painted strata indices gain an x (and z) slope, so beds no longer run parallel.
- **Sand shelf** (`terrainFeatures.ts`, `blueHoleApron`): each step gets its own height and a bearing-dependent wander, plus low sediment mounds, and the apron window reaches further out. No new data path.

## Screenshots (`.cache/codex/shots/V-bluehole-roof-2/`)

`before/` and `after/` (golden, `GOLDEN_SITES=blue-hole`); poses `great-blue-hole-east-2/3` and `great-blue-hole-2`.

## Tests

`props-geo` and `terrainMerge1140` snapshots re-baselined (intended geometry only); all other specs, including envelope and collision, pass unchanged. Full `tools/gates.sh` run.

## Simplicity rules

- 1 net simpler: a small table of notch positions and two helper arrows; no new settings or modules.
- 4 no site branches: still the existing `hood` flag; terrain edit is in the per-site feature function.
- 6 tests: existing capability specs, snapshots moved.
- 7 no package numbers in code.

## Remaining issues

- The roof is still a rolled slab in outline; the notches break it up but the underside is unchanged.
- The pool is smaller and the sand shelf reads varied but still pale; terrain colour not touched.
- Own rating about 4.0.
