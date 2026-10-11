# 1320 — Monterey wall-foot boulders and Endurance minimap stripes

## Plan

1. Capture both starting renderers at fixed poses; inspect rock placement and the shared Endurance relief.
2. Review two implementation rounds. Scatter Monterey rubble with size/spacing variation while preserving its wall silhouette and supported seating. Replace Endurance's parallel contour stripes with irregular ice-scour contours that leave the hull plan visible.
3. Retain all existing assertions, add focused regressions, update CHANGELOG, and run the complete gate suite including full and project-base E2E.

## Progress and review

- **Round 1:** introduced deterministic rubble patches, broader size variation and scar-block placement. Endurance contours followed measured height plus the existing authored ridge height. The fixed previews still showed a crowded apron edge and long straight contour segments beyond the ridge cluster. All 21 focused tests passed.
- **Round 2:** added radius-based separation and rock runout past the apron onto the surveyed seabed. Every rock still uses the final surface and existing rim support check. Large block sizes now have a shorter tail; scar blocks vary in size and distance instead of appearing in repeated triplets. No changes to wall/apron vertices, colliders, rock templates, draw batches or tier counts; the High hero retains 160 boulders and its wall position buffer is identical before/after.
- Endurance now contours the existing shared scour height above the local plain. Palette, depth limits and depth readout still use absolute survey heights. Relative reconstructed swells have no absolute-depth contour labels. The existing contour budget selects the interval from the local scour span. The shared 3D ridge layout and shading remain unchanged.
- Added regressions for deterministic placement/counts, supported seats and runout, size/spacing variation, real Endurance contours at DPR 1 and 2, preserved survey depth limits, and isolation of other sites. All earlier tests and assertions remain intact.

## Visual evidence

Before, first-round and final PNGs, raw geometry/sonar output and measurements are in `.cache/codex/shots/`:

- [Monterey before/after](../../.cache/codex/shots/monterey-comparison.png): fixed High-tier camera, actual mesh vertex colors and instance matrices. The wall outline is preserved; rubble has gaps and varied runout/size. This offline projection excludes terrain rendering, shader lighting, fog, life and the HUD.
- [Endurance before/after](../../.cache/codex/shots/endurance-comparison.png): actual sonar raster and contour operations at 1 km, DPR 2, on the real survey tile. The offline composite adds the existing minimum-size hull plan for context. Straight survey-plane contours are replaced by localized irregular scour loops; the hull ends remain visible. This is not a browser HUD screenshot.
- [Measurements](../../.cache/codex/shots/measurements.json): identical Monterey wall positions and unchanged 160-boulder count.

Both before/after pairs were opened and inspected. Browser capture is **blocked**: the browser runtime has no connected browsers, and local Vite startup fails with `listen EPERM 127.0.0.1:4320`. No fresh browser screenshots are claimed. The worktree's preexisting shots symlink targeted a read-only shared directory; it was retained as `.cache/codex/shots-shared`, and a local shots directory now holds this task's evidence.

## Validation

- Round 1: 21 focused tests passed.
- Round 2: 36 focused tests passed, but the first run had 15 unhandled texture errors because the new sonar test left a mocked document installed before constructing its next terrain. The test setup now restores globals before each render; this run is not counted as a clean pass.
- TypeScript typecheck passed after the final implementation.
- Baseline gates: build, 1,771 unit tests in 177 files, Python, strict content, attribution and repository-wide formatting passed using `GATES_CONFIG_MODE=writable` (the dependency tree is read-only).
- Clean Round 2 rerun: **36 tests in eight files passed**, with no unhandled errors. Log: `.cache/codex/1320-round2-clean-tests.log`.
- Final `GATES_CONFIG_MODE=writable PW_PORT=4320 tools/gates.sh --full-e2e`: **PASS** config, production build, **1,776 unit tests in 179 files**, **156 Python tests**, strict content validation, attribution and repository-wide Prettier. **FAIL** full E2E and project-base E2E: their configured preview servers could not start, so no browser assertions executed. Overall exit 1, not a full gate pass. Aggregate log: `.cache/codex/1320-final-gates.log`; individual logs retained in `.cache/codex/1320-gates/`.
- Direct preview reproduction: `listen EPERM 127.0.0.1:4320`, retained in `.cache/codex/1320-preview.log`.
- Final source whitespace check passed. No existing assertions, snapshots, test settings or budgets were loosened.

Browser verification remains required in an environment that permits localhost and provides a browser. Run the full gates below, then run the capture command against a separately started preview on port 4320:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4320 tools/gates.sh --full-e2e
GOLDEN_SITES=monterey-canyon,endurance GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs http://localhost:4320/
```

## External E2E follow-up

Camera fixes (Lost City 50 m default, Challenger centerHull) already landed on main; they were dropped from this branch when rebased onto main.
