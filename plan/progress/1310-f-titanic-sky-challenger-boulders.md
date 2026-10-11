# 1310 — Titanic sky and Challenger boulders

Visual changes and the camera fixes below are implemented; updated browser visual acceptance and full E2E need an orchestrator rerun outside this sandbox.

## Plan

1. Preserve the baseline and capture Titanic and Challenger openings/approaches.
2. Use the existing dome, instanced rocks and terrain vertex colour, keeping Low budgets.
3. Review twice, retain every existing assertion, run the full gates, log the changes.

## Changes and two review rounds

- Titanic (`src/core/config/atmosphere.ts`): crown `0x1b2b35` → `0x182630`; haze peak elevation `0.5` → `0.4`. Existing haze colour, fog lift, fog-matched horizon ring, dome geometry and depth fade remain intact. Endurance retains its explicit per-site palette and peak. No additional rendering work.
- Challenger (`src/world/TerrainBiome.ts`): existing boulders use size multiplier `2.6` instead of `1.1`, approximately 1.3–6.8 m before per-instance variation. Density remains `1.6`; all other scatter kinds retain their exact buffers and placements. The rocks remain half buried through the existing embedding rule.
- Challenger (`src/world/ChallengerRelief.ts`, tuning in `src/core/config/deepOpenings.ts`): a smooth, neutral 12% shadow across the lower measured rise (starts at −10926 m, full at −10920 m, fades between −10885 and −10815 m). Near lander-floor and upper-wall tint stay unchanged. No invented terrain geometry or additional materials.
- Round 1: an initially brighter Titanic band failed the **existing fixed luminance ceiling of 0.025**. Retained that assertion and achieved contrast by darkening the crown instead. Updated only the two intentional Challenger hashes in Beebe isolation/scatter snapshots; every other site's evidence and all instance/draw counts remain unchanged.
- Round 2: added a minimum band/crown contrast check, tier-by-tier scatter budget comparisons, actual GMRT opening sightline checks including rocks, and slope continuity/exposure checks. Reduced the shadow from 18% to 12% to satisfy the new fixed silt readability floor. No pre-existing assertion was weakened or removed. These are numerical review rounds, not visual screenshot reviews.

## Validation

- Baseline build: PASS, `dist-1310-before/`, `.cache/codex/1310-build-before.log`.
- After build: PASS with TypeScript checking; `.cache/codex/1310-build-after.log`.
- Targeted dome/scatter tests: PASS, including the unchanged brightness ceiling, fixed geometry counts, four scatter draws at every tier, unchanged instances/triangles and larger rocks.
- Actual GMRT opening checks: PASS, 9 tests. Desktop 1600×900, 1280×720 and portrait 390×844 include rock occlusion in the existing wildlife checks at all tiers; the lander's centre sightline clears scatter. Log: `.cache/codex/1310-sightlines-round2.log`.
- Shadow checks: PASS, 3 tests; unchanged near-floor/upper-wall exposure, neutral shoulder dimming, bounded continuous tint. Log: `.cache/codex/1310-shadow-final.log`.
- Python: PASS, 156 tests; strict content and attribution checks: PASS.
- Full unit suite: PASS, **178 files / 1,775 tests** in 229.78 s. Command: `npm test -- --configLoader runner --cache=false --pool=threads --reporter=verbose`; log: `.cache/codex/1310-unit-final.log`. The thread pool avoids blocked fork IPC in this sandbox; assertions and timeouts stay unchanged.
- Final native-config build and full-repository Prettier check: PASS. Logs: `.cache/codex/1310-build-after.log`, `.cache/codex/1310-format.log`. Focused tests after moving shadow tuning into config: PASS, 21 tests (`.cache/codex/1310-focused-final.log`).
- Opening sightline evidence: all **24 Low amphipods**, and all **45** on Medium/High/Ultra, clear props and scatter at all three tested viewports. This is geometry evidence, not a rendered readability verdict.
- Local full E2E (`FULL_E2E=1`): attempted, **blocked before any browser tests ran**. Preview/connect operations fail with `EPERM`. Log: `.cache/codex/1310-e2e-full.log`. The orchestrator subsequently ran E2E outside the sandbox; see the follow-up below.

## Screenshots and remaining verification

Requested location: `.cache/codex/shots/1310-f-titanic-sky-challenger-boulders/`.
The original `shots` symlink pointed outside the writable workspace; replaced only the local symlink with a local directory, leaving its shared target untouched.

No before/after screenshots were captured. Chromium exits with `sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`; preview cannot listen on `127.0.0.1:4310`. The golden tool's failed capture log is saved in the requested shot directory. No screenshots or visual verdict are fabricated. The preserved baseline and after builds allow matching captures without reverting source files.

On a machine that permits local browser execution:

```bash
# Serve the baseline; stop it before serving the after build on the same port.
npm run preview -- --port 4310 --strictPort --outDir dist-1310-before \
  --config .cache/codex/1310-vite.config.mjs --configLoader native
GOLDEN_SITES=titanic,challenger-deep GOLDEN_TIER=low \
  GOLDEN_LAYOUTS=desktop,portrait,landscape \
  node tools/golden-shots.mjs http://localhost:4310/

# Repeat with dist-1310-after, and copy each generated golden directory to
# the requested shot directory as before-low/ and after-low/ respectively.
# Also compare GOLDEN_TIER=high GOLDEN_LAYOUTS=desktop.

GATES_CONFIG_MODE=writable PW_PORT=4310 PW_OUTDIR=dist-1310-after \
  npm run test:e2e -- --output=test-results-1310
```

Remaining: visually judge the faint sky depth and boulder read at the 45 m approach, verify the lamp-lit lander/amphipods on Low and High and phone layouts, save matching before/after screenshots, and finish full E2E. The numerical sightline checks cover authored openings; they do not replace visual acceptance or cover every later approach pose.

## Orchestrator full-E2E follow-up

The outside-sandbox gate run passed build, unit, Python, content, attribution, formatting and project-base E2E. The main browser suite had **641 passed / 49 skipped / 11 failed**. Its failures share two camera causes:

1. Lost City's Arcade config installed a **66 m** chase/reset arm, conflicting with the browser's fixed **50 m** expectation. The six readability cases measured 106–107 m to the tower, above the unchanged **95 m** bound. Restored `src/core/config/camera.ts` to a 50 m arm; the same config flows through free dive, mission preview/Begin, wheel reset and photo return. The subsequent full unit run caught a four-pixel portrait HUD overlap at the shorter arm. Removed the extra **+8 m vertical camera bias** (now 0), lifting the hull clear of that existing HUD envelope. Hero range and lateral offset remain 38 m and −20 m; full tower fit, hull separation, terrain clearance and Realistic/Custom/surface/Daily reset checks stay intact.
2. Challenger's portrait eye was offset laterally, but its aim remained on the sub's forward heading. This projected the hull origin at **NDC x = 0.3242**, failing exact centring. `src/sub/CameraRig.ts` now aligns horizontal aim along the lateral portrait arm through the sub. The lateral eye and its visibility of the lander remain; desktop/landscape and other portrait cameras keep their existing aim. The existing lander separation, wildlife, collision and viewport bounds still pass.

No E2E spec, assertion, skip or timeout was changed. Unit expectations that pinned the conflicting 66 m arm now require exactly 50 m. Lost City unit range is tightened from 112 m to 95 m, the fixtures now apply the actual authored vertical offset, and Challenger's existing portrait test additionally requires hull-origin `x = 0` at six decimal places. Other bounds and checks remain intact. No meshes, instances, materials or draw calls were added.

Focused verification: **90 tests passed** across `lostCityCamera`, `lostCityReadability`, `arcadeLoadout`, `challengerPortrait` and `deepOpening`; log `.cache/codex/1310-camera-fix-focused.log`. Updated build, Python (156 tests), strict content and attribution pass.

After removing the vertical bias, all **15** tests in `portraitOpening`, `lostCityCamera` and `lostCityReadability` pass (`.cache/codex/1310-camera-fix-portrait.log`). The failed interim full run is preserved as `.cache/codex/1310-camera-fix-unit.log`; its sole failure was the HUD overlap. No HUD rectangle or framing bound was relaxed.

Final follow-up verification: **178 files / 1,775 unit tests PASS** in 238.30 s (`.cache/codex/1310-camera-fix-unit-final.log`), native-config TypeScript/build PASS (`.cache/codex/1310-camera-fix-build.log`), full-repository formatting PASS (`.cache/codex/1310-camera-fix-format.log`), Python **156 PASS**, strict content PASS and attribution PASS (corresponding `.cache/codex/1310-camera-fix-*.log` files). The Low budgets and all remaining site regressions pass. Updated E2E results and screenshots have not been claimed; they require the external rerun.

The sandbox restriction is unchanged. The corrected browser suite still requires the orchestrator's outside-sandbox rerun, starting with these unchanged specs:

```bash
PW_PORT=4372 PW_OUTDIR=dist-1310-after npx playwright test \
  tests/e2e/f-bughunt-18.spec.ts tests/e2e/f-lostcity-readable.spec.ts \
  tests/e2e/f-challenger-opening.spec.ts
# Then tools/gates.sh --full-e2e in the environment that permits Vite/Chromium.
```
