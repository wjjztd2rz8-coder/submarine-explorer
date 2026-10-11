# f-hud-overlap-fix

Status: done. The 1390 sweep passes in all 52 cases (13 sites x 4 layouts).

First real browser run of `tests/e2e/f-bughunt-hud-touch-overlap-1390.spec.ts` on main: 30 failed, 22 passed.

## Failures by class

1. **Real layout bug (all 1280x720 touch and keyboard sites, 22 cases).** The desktop/tablet `.hud-notice` sits at `top: 72px` and is 37px tall (bottom 109px). `.scan-stack` started at `max(84px, 15%)` = 108px at 720px high, so the scan card, tutorial hint and objective chip overlapped the "New discovery" notice by about 1px. Fix: `.scan-stack` top is now `max(112px, 15%)` in both desktop rules in `src/styles/hud-layout.css`. Phone landscape and portrait have their own overrides and were already clean.
2. **Spec bug (hudson-canyon and kamaehuakanaloa, every layout, 8 cases plus the 1280 ones).** `away()` moved the sub +10000 m in x. Both sites have procedural deep-coral life targets that spawn around the sub a frame after it moves, so `.scan-panel` stayed visible (21s timeout waiting for it to hide). `away()` now tries several far offsets, stepping the clock and checking `scanner.view.nearestInRange` until none is in range. No assertion was removed.
3. **Spec timing flake (hunga-tonga-caldera 1280 keyboard, about 1 in 8).** `.objectives-panel` overlapped `.hud-readouts` by 9px when measured before the panel's ResizeObserver republished `--obj-panel-bottom`. The observer runs on the real rendering step, not the fake clock, so a user never sees it. `layout()` now waits for one ResizeObserver callback before measuring. 20 repeats pass.

The predicted portrait reward `bottom: 232px` vs tutorial strip overlap was not reproduced: all 390x844 cases pass, so no CSS change was made there.

## Results

- `PW_PORT=4451 tools/gates.sh`: build, unit, python, content, attribution, prettier, e2e smoke, e2e-base all PASS.
- 1390 spec: 52 passed, 0 failed.
