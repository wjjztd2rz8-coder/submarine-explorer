# 1250 — Sonar minimap on flat sites

## Plan and implementation

- Measure relief in the visible viewport; derive flatness from relief / view span. Fade enhancements between 0.02 and 0.06 m/m and preserve the existing renderer above that boundary.
- Choose a rounded 1/2/5 contour interval targeting about six lines on flat views, with a 1 m floor, no contours below 2 m total relief, and the configured line budget. Blend toward the existing interval through the transition rather than switching as soon as flatness is nonzero.
- Raise the relief-derived hillshade multiplier cap from 8 to 16 for gentle slopes; reduce the depth tint from 0.4 to 0.24 and flat contour opacity to 35% of its existing value. Retain faint quarter-span range rings and Endurance's existing authored scour shading. Endurance now retains measured contours too.
- Wire authored hull dimensions, position, scale and heading through the `props:loaded` event into sonar footprints. Use a 24 px minimum length / 4 px minimum beam for small hull symbols, while omitting hulls smaller than 4 projected pixels at distant zooms. Cap contact glows at 18 px and remove their large dashed scan-radius outlines. Apply the same sensor visibility rules as POI symbols. Reduce marker backgrounds only on flat views so the hull ends remain visible.
- Keep HUD dimensions, palettes and text unchanged. Compact maps continue to omit tiny contour labels; no new caveat text.

## Real-data check at 1 km

| Site            | Local relief | Contour interval | Hillshade multiplier | Enhancement                                                             |
| --------------- | -----------: | ---------------: | -------------------: | ----------------------------------------------------------------------- |
| Titanic         |       9.63 m |              2 m |                8.31× | Hull plan, smaller contact glows, faint contours/rings and tint         |
| Endurance       |       4.85 m |              1 m |                  16× | Hull plan and measured contours beneath existing scour shading          |
| Great Blue Hole |     123.53 m |             10 m |                   1× | Pixel-identical to the previous renderer                                |
| Hunga Tonga     |     400.06 m |             50 m |                   1× | Pixel-identical at the authored caldera-wall view; relief already reads |

Titanic, Endurance and Blue Hole use the opening positions from the reported `2026-10-10-030121` golden manifest. Hunga Tonga uses the first authored prop position. These checks use the actual `Terrain` sampling methods and `Sonar.update` at DPR 2, after settling the cached raster for the fixed pose. The first authored POI is explicitly assigned as the objective in the previews. Metadata: [measurements](1250-f-sonar-flat-sites/measurements.json), [pixel comparisons](1250-f-sonar-flat-sites/pixel-checks.json).

## Visual review

[Desktop before/after renderer previews](../archive/progress-images/1250-f-sonar-flat-sites/comparison-desktop.png) and [compact previews](../archive/progress-images/1250-f-sonar-flat-sites/comparison-compact.png) were generated and inspected. Titanic's bow outline and Endurance's hull ends are visible beneath the smaller objective marker. The large overlapping scan-radius circles are gone. Blue Hole and Hunga Tonga preview pixels match their previous-renderer counterparts exactly in both sizes.

The reported browser golden's original minimap crops are retained unchanged: [Titanic](../archive/progress-images/1250-f-sonar-flat-sites/titanic-reference-golden.png), [Endurance](../archive/progress-images/1250-f-sonar-flat-sites/endurance-reference-golden.png), [Blue Hole](../archive/progress-images/1250-f-sonar-flat-sites/great-blue-hole-reference-golden.png). Fresh browser goldens are outstanding: `tools/golden.sh` built successfully but preview startup failed with `listen EPERM` on `127.0.0.1:4298`. The new previews record the actual canvas renderer and composite its operations with Pillow; they do not establish browser HUD layout or replace the requested fresh golden captures.

External capture command:

```sh
GATES_CONFIG_MODE=writable GOLDEN_SITES=titanic,endurance,great-blue-hole,hunga-tonga-caldera GOLDEN_LAYOUTS=desktop,portrait,landscape tools/golden.sh
```

## Validation

- PASS: 26 focused sonar tests (interval/noise floor/budget/transition, gain/tint, shared palette and bilinear shading, hull orientation/minimum size, guide visibility).
- PASS: 67 mission/loadout tests after moving footprint wiring into the sonar system's `props:loaded` subscription; 90 tests passed in that focused run before the three guide tests were added.
- PASS: Production build, TypeScript typecheck, 153 Python tests, strict content validation, attribution, repository-wide Prettier check and source whitespace check. Logs: `.cache/1250/{python,content,attribution,prettier}.log`.
- Existing 1200 browser regression now requires finite Endurance contours whenever local relief is at least 2 m; Playwright discovers all ten cases. Execution was attempted but its configured preview server could not start in this sandbox.
- `GATES_CONFIG_MODE=writable tools/gates.sh`: PASS config, build, **1,736 unit tests in 175 files**, Python, strict content, attribution and repository-wide Prettier. FAIL smoke E2E and project-base E2E because their preview servers could not start. Overall exit 1; this is not a complete gate pass. Final log: `.cache/1250/gates.log`; detailed logs: `.cache/gates/*.log`. The initial run used superseded footprint wiring and was terminated before completing; it is not counted as validation.
- CHANGELOG entry added.
