# f-sonar-flat: sonar minimap on flat sites (brief 1250)

## What changed
- `src/ui/Sonar.ts`: `sonarFlatProfile(actualSpan, viewSpan)` gives flatness 0..1 from relief slope (0 at about 0.1 m/m, as Blue Hole; 1 below about 0.02), a hillshade gain boost (up to 8x) and a depth tint strength. `sonarLocalContourInterval` aims for about six contours across the actual relief (1 m floor) on flat views and defers to the old interval otherwise.
- Flat views also get a tint by depth within the view's own range (luminance only; the shared palette ramp and `sonarPalette1200` are untouched), faint dashed range rings every quarter span about the sub (not on whole-tile view), and a dashed soft footprint halo under each contact at its scan radius (min 11 px).
- Everything scales with flatness, so Blue Hole and Hunga Tonga (already read) are unchanged. HUD size untouched; phone: no labels added.
- Tests: `tests/unit/uiSonar.test.ts` (flat profile, local interval). CHANGELOG entry added.

## Screenshots (desktop golden, 1000 m view, crops 2x)
- Before: `plan/progress/f-sonar-flat-shots/before.png` (titanic 1/3, endurance 1/3, blue hole 1/3)
- After: `plan/progress/f-sonar-flat-shots/after.png`; Hunga Tonga unchanged: `after-hunga.png`

## Gaps
- Endurance seabed in the survey really is a gently tilted plane (about 6 m across 1 km), so it still shows as roughly vertical bands; the tint, rings and halo give context but the terrain itself has no features to show. The two Endurance contacts sit almost on top of each other.
- Titanic halos are slightly busy beside the contours. Phone and expanded views not separately captured.
