# V-endurance-aim progress

Shots: `.cache/codex/shots/V-endurance-aim/` (after-desktop, after-portrait).

## Changed

- New optional per-site `chaseAim {x,y,z}` (m, sub frame) in `site.json` opening data. It offsets the chase look-at point only; the eye and the sub heading are untouched. Plumbed through `setChaseRadiusDefault` like the other chase fields. Sites without it keep the stock look-at.
- Endurance: chaseRadius 34, chaseOffsetX -60, chaseOffsetY -48, chaseAim (14, -27, 30). The camera now looks at the hull instead of past it, so a shorter arm no longer lets the sub hide the hull.
- Spec: one case added to `subCameraRig.test.ts` (aim moves look direction, not eye; default unchanged). Snapshots re-baselined for the new endurance pose (deepOpening, freeDiveComposition) plus an explicit `chaseAim: undefined` key on other sites' poses; no pixel change for them.

## Result

Hull about 45% of frame width on desktop (was 37%), sub secondary and clear of the hull. Portrait about 59%, sub above the hull. Short of the 55-60% desktop goal: a larger hull needs a shorter arm, which makes the sub (nearer the camera than the hull) too dominant.

## Gates

`PW_PORT=4871 tools/gates.sh`: all PASS (e2e smoke, e2e-base, attribution, prettier; full unit run 2320 pass after snapshot refresh).

## Left

Desktop hull 45% not 55-60%; the sub is still large at this arm. A nearer-hull option would need the camera to sit forward of the sub.
