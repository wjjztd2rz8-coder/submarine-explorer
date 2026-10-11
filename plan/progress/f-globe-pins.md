# f-globe-pins

Owner phone feedback: globe dots were fanned out on rings with leader lines and could not be read.

## What changed
- `GlobeModel.ts`: removed `spreadOverlaps`. Added `clusterPins` (greedy, seeded, allocation-free), `distanceToSeparate`, `shortName`; `OrbitState` gained `faceLatLon(lat, lon, distance?)` (eased zoom), `setFitDistance` / `maxDistance` / `minDistance` (embedded globe zooms in from its fit view).
- `Globe.ts`: SVG leaders removed; every pin is drawn at its projected point (transform written only when it changes). Pins are 32 px (mouse) / 44 px (touch) transparent buttons around a 12 px dot (`--globe-hit`, from `Config.globe.pinHitPx` / `pinHitTouchPx`, replacing `pinOverlapPx`). Playable pins whose hit areas overlap merge into a counted cluster button (pooled); click zooms in, or opens a chooser at full zoom. Cluster buttons are `tabindex=-1`; members stay Tab stops and a focused/previewed pin is always drawn alone. Name label on the focused/hovered/selected pin. On touch the first tap names a pin, the second launches. Keyboard focus rotates the globe; mouse press no longer does (it moved the pin from under the click). + / - zoom buttons.
- Catalogue pins: 4 px faint specks, `pointer-events: none`, still keyboard-focusable.
- `globe.css`, `home.css`, `menus.css`: new pin/cluster/chooser/zoom styles; removed the embedded pin size overrides. Phone portrait globe wrap: 160 px -> `clamp(220px, min(100vw, 42dvh), 440px)` (globe ~85% of width at 390x844, list still below).
- Removed `Home.sizeGlobeTargets` (48 px inline sizes) and its call in `systems/title.ts`; CSS owns hit size now.
- `docs/globe.md` updated.

## Tests
- Unit (`tests/unit/globe.test.ts`): spread tests replaced by clustering, zoom-target, short-name, eased-zoom and fit-distance tests. Removed the `sizeGlobeTargets` tests (`homeFocus`, `titleLifecycle` mock) since the method is gone.
- e2e: new `tests/e2e/globe-pins.spec.ts` (no leaders, dot 10-14 px, hit area, dot centred; cluster count/zoom/members hidden; Tab into a cluster member shows it with label; chooser at full zoom + Escape; touch: 44 px, globe >= 60% width, first tap labels without launching). `f-title-audit.spec.ts`: pin size check changed from >=48 on all pins to >=44 on non-catalogue pins (catalogue specks are no longer targets).
- Gates: `PW_PORT=4612 tools/gates.sh` all PASS (build, unit, python, content, attribution, prettier, smoke e2e, project-base e2e). Also ran globe, d-shell, f-a11y, f-title-*, f-touch-audit specs green.

## Screenshots (`.cache/codex/shots/f-globe-pins/`)
`portrait-*.png` (390x844), `landscape-*.png` (844x390), `desktop-*.png` (1280x720): `1-sites` default, `2/3-cluster-zoom` after tapping a cluster, `4-titanic-label`; `desktop-overlay.png`, `desktop-overlay-chooser.png` (fullscreen globe; chooser forced with a large hit size). Script: `tools/globe-pins-shots.mjs`.

## Left / notes
- Only 13 sites are playable, so default-zoom clusters are few (Belize/Great Blue Hole pair, Pacific coast). The vent clusters are catalogue specks now.
- Chooser is only reachable with real overlaps at max zoom; the e2e forces it by inflating the hit size.
- No pinch-zoom; + / - buttons and wheel only.
