# 1380 — Verify merged 1320: Monterey rubble and Endurance sonar

## Plan

1. Verify the merged main baseline in a real browser if available; otherwise use the actual placed geometry, authored opening cameras, survey tiles and sonar drawing commands.
2. Complete two verification rounds. Check Monterey at its default opening and 844×390, including boulder clearance along the submarine's initial approach. Check Endurance's hull ring/plan and scour contours on High and Low.
3. Fix only clear small defects, preserve existing assertions, and record checks and limitations here.

## Baseline and browser availability

- Started clean on `codex/1380-f-verify-1320-monterey-endurance`, with HEAD and local `main` both at `a2f63ba171e6abf98ce97c669beac04cd5a5ee95`. The baseline includes 1320's `48335e8` through merge `94fb96e`.
- Browser runtime initialization succeeded, but browser selection reported **No browser is available**. Following its connection troubleshooting instructions, discovery returned `[]`.
- Local Vite startup (`npm run dev -- --host 127.0.0.1 --port 4320 --strictPort --configLoader runner`) failed with **listen EPERM 127.0.0.1:4320**. Live browser verification is blocked in this sandbox. No fresh browser screenshot or E2E pass is claimed.
- Used the user-authorized unit/geometry fallback. The shared screenshots symlink and all existing assertions remain untouched.

## Round 1

- Added `tests/unit/merged1320Verification.test.ts`, loading the real survey tiles and all placed props through the production terrain/prop builders and default free-dive spawn selection.
- Monterey passed on Medium (the application's default graphics tier), High and Ultra. At 1280×800 and 844×390, more than 20 hero-wall rock centres project inside the camera frame; their bounding radii vary by more than 4×, and local positions span more than 40 m along the wall and 10 m across its foot.
- Every placed Monterey boulder clears an 8 m-radius capsule along the first 34 m of the submarine's forward approach at spawn depth. All also clear a 6 m-radius capsule from the spawn to the chase camera. Conservative enclosing spheres use each fractured template's actual geometry and full instance/world transforms.
- Endurance's full `Sonar.update` drew the hull marker ring and seven-point hull plan on Low and High, at DPR 1 and 2, using real placed POIs, hull footprints and default spawn positions.
- The first focused run finished with **8 passed, 4 failed**. All four failures were in the new harness: it selected contour paths with width below 0.7, whereas production contours use width 0.8. Corrected the selector to identify the contour stroke colour; no renderer defect or production fix was involved. This run is not counted as a clean pass. Log: `.cache/codex/1380-round1-tests.log`.
- TypeScript typecheck passed.

## Round 2

- Retained every existing test/assertion and reran the corrected integration checks alongside the 1320 regressions and earlier Monterey seating/opening and flat-sonar/scour tests.
- The Endurance integration checks require the actual hull marker to be visible, its ring to be drawn at that marker, and the hull footprint to be at least 24 canvas pixels long. Contour paths must exist and remain within a 121-pixel span on both axes, rejecting map-spanning vertical survey stripes.
- Clean focused rerun: **27 tests in eight files passed**, including all seven new integration checks. No unhandled errors were reported. Log: `.cache/codex/1380-round2-tests.log`.
- No clear production defect was found; changes are limited to verification tests and this note.
- Final `GATES_CONFIG_MODE=writable PW_PORT=4320 tools/gates.sh --no-e2e`: **PASS**, exit 0. Config bundling, production build (including TypeScript), **1,827 unit tests in 183 files**, Python tests, strict content validation, attribution and repository-wide Prettier all passed. Aggregate log: `.cache/codex/1380-final-gates.log`; individual logs: `.cache/gates/`. Browser E2E was explicitly excluded after the failed browser/localhost probes above.

## Limits and browser follow-up

The fallback proves geometry placement, camera inclusion, capsule clearance and sonar drawing output. It cannot establish the fully shaded scene's perceived rubble appearance, fog/lighting or CSS/HUD occlusion at either viewport. Low Monterey intentionally omits rubble; its existing tier/count assertions remain in the validation set.

In an environment with a browser and localhost access, run the full E2E gates and capture both requested layouts, including Low Endurance:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4320 tools/gates.sh --full-e2e
# Start a separate preview on 4320 before the capture commands.
GOLDEN_SITES=monterey-canyon,endurance GOLDEN_LAYOUTS=desktop,landscape GOLDEN_TIER=high node tools/golden-shots.mjs http://localhost:4320/
GOLDEN_SITES=endurance GOLDEN_LAYOUTS=desktop,landscape GOLDEN_TIER=low node tools/golden-shots.mjs http://localhost:4320/
```
