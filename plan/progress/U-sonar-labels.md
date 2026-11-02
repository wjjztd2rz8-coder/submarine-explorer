# U-sonar-labels

## Change

- `src/ui/Sonar.ts`: contour depth labels (the only sonar text near the range rings; the rings themselves carry no text) were checked by centre distance (32 px) and ignored label width, so "120 m" and "80 m" could overlap. Labels now get a box (text width + padding), and a new exported helper `keepSeparatedBoxes(boxes, LABEL_GAP_PX)` keeps labels in draw order and drops any that come within 4 px of one already kept.
- Nothing moved: label coordinates are unchanged, so the only effect is that overlapping labels are dropped. Contour and pixel hashes are unchanged.
- `tests/unit/uiSonar.test.ts`: new "sonar map labels" cases. Capability: no two kept labels closer than the minimum gap (200 random boxes), and the earlier label wins a collision while separated labels both stay.
- `tests/unit/__snapshots__/sonarScour1320.test.ts.snap`: 8 `labels` hashes updated; these hash the label list, so they change when labels are dropped. Pixel and contour hashes unchanged.
- `CHANGELOG.md`: a Changed line for U-sonar-labels (labels cut).

## Gate

- First `PW_PORT=4711 tools/gates.sh` run: unit failed only on the 8 `sonarScour1320` label snapshots (expected, see above); python, content, build, e2e, e2e-base, attribution, prettier passed.
- After the snapshot update: see the rerun result below.
