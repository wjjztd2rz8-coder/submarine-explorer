# 1391 First-dive flow

Implements owner phone feedback 2026-10-11 items 4–6. Three implementation/review rounds.

## Changes

- Mission near-site openings use a separate approach search, never the free-dive beauty frame or deep-opening reframe. It targets the first primary in mission order, faces it, checks the terrain corridor and prop collisions, reserves a clear chase arm, and stays above the fitted hull's rated depth. This applies to Arcade, Realistic/Custom near-site starts, and Daily near-site starts. Daily surface variation and all surface poses remain unchanged.
- Authored first-contact ranges: Titanic/Lost City/Beebe/Blue Hole 220 m; Challenger/Kamaʻehuakanaloa 200 m; Endurance/Axial 180 m; Monterey/Hudson/Bismarck 240 m; Hunga/Blake 260 m.
- Mission primary base scan radii are capped at `(approach - 60) / 2`, bounded by the authored radius. Extended sensors previously scanned Titanic from 400 m, incompatible with a 220 m approach. The cap lives in the existing shared radius map so settings/upgrades retain it; switching to surface restores original radii. Free dives and URL pose probes keep authored radii. Both sensor presets and all shipped scan-detail upgrade levels leave the first target outside scan range.
- Initial objective and waypoint hint read as navigation (Titanic: “Head to the bow, 220 m ahead.”), then restore the authored scan copy on arrival. Realistic retains the opening waypoint until arrival, then resumes its normal waypoint preference. The small waypoints-system change passes the current objective's hint instead of stale authored copy. No per-frame DOM write was added for this toggle.
- Tutorial still has five steps. Only `scan:complete` satisfies the scan step, including scans completed before that step appears. Started/progress/aborted events drive “Scanning…” and percentage text without advancing. Releasing returns to the scan instruction. The move instruction can name the opening waypoint.
- Touch hint labels contain button names; the unsupported touch ROV instruction remains suppressed and has no key label. No changes to TouchControls, touch CSS, events, Briefing/HUD/PhotoMode/PauseMenu.
- Updated mission framing/distance assertions deliberately; retained free-dive beauty frames, scan mechanics, hull safety, camera clearance, ambient-light and content assertions. Added all-site approach, mission glue, waypoint and tutorial regressions. README and mission docs describe the new openings.

## Review and validation

1. Separated approach placement from scenic framing and wired completion-only tutorial events. Identified the Extended-sensor conflict with authored POI radii.
2. Audited actual terrain and procedural scenery at all 13 sites in Low/Medium/High. Corrected a Monterey test that supplied POIs in content order instead of mission order. All 39 opening cases pass hull/terrain/corridor safety, scan exclusion, sonar range, target-facing yaw and target projection in desktop/portrait/landscape cameras. Blue Hole crosses open water; Challenger stays within its fitted hull rating.
3. Retained free-dive assertions while updating mission-specific golden assumptions. Physics-driven approach-and-scan checks pass for Titanic, Beebe, Lost City, Blue Hole and Monterey in all three tiers (15 cases), without teleporting to contacts. Mission mode/surface/reset fixtures and completion/abort/touch-copy tests pass after fixture updates.

- Production build / TypeScript: passed (`npm run build -- --outDir dist-1391`).
- Python: 156 tests passed.
- Full unit suite: all 1,898 tests in 187 files passed after the main merge (259.09 s; merge head `4becfbf`). The Beebe isolation snapshot changed only the spawn-source hash; biome, terrain, uniforms, shaders and prop evidence remain byte-identical.
- Playwright collection: 767 tests in 94 files collected successfully.
- Full E2E: attempted; preview server failed before any tests could run (`listen EPERM 127.0.0.1:4192`).
- Requested capture: attempted with `tools/firstminute-shots.mjs`, all four sites and all three layouts. Chromium failed before launching a page (`sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`). Preview also cannot bind port 4191. No screenshots were produced or visually reviewed. Target folder contains validation and launch logs, not screenshots. The in-app browser connection was also checked on resume; no connected browser is available. The referenced owner capture `.cache/phonefb/phone-titanic/04-t00.png` is absent in this worktree.

## Capture still required outside this sandbox

```bash
npm run build -- --outDir dist-1391
npx vite preview --port 4191 --strictPort --outDir dist-1391
# In another terminal:
FM_SITES=titanic,beebe-vent-field,lost-city,great-blue-hole \
FM_LAYOUTS=phone,phoneland,desktop \
FM_OUT=.cache/codex/shots/1391-f-first-dive-flow \
node tools/firstminute-shots.mjs http://localhost:4191/
PW_PORT=4192 PW_OUTDIR=dist-1391 npm run test:e2e
```

Inspect each layout/site's `t00`, `t10`, `t20` and `t30` images. Numeric camera and safety tests do not certify silhouette visibility, HUD composition or rendered phone readability.

## Full-gate follow-up

The orchestrator's outside-sandbox full run passed build, unit, Python, content, attribution, Prettier and project-base E2E; full E2E had 27 failures (691 passed, 49 skipped). Read all failure details and the relevant error contexts in `.cache/gates/e2e.log` and `test-results-gates-4370-2683361/`.

Root causes and repairs:

- Mission goldens still pinned old scan-ready ranges, scan-first titles and Lost City's free-dive 66 m arm. Replaced those mission expectations with exact authored first-primary 3D ranges, scan exclusion, target-facing yaw and the global camera reset. Kept hull/terrain clearance, lighting, camera projection, every wheel/photo/reset check and the free-dive framing checks. Lost City's free-dive eye now pins the already-authored -8/+30 offsets rather than stale -20/+8 values.
- Navigation text bypassed the compact phone presentation and produced three lines. The phone move step now says “Left stick: follow the marker.”; the full instruction still names the destination. Scan instructions use compact copy, while held progress remains visible. The narrow landscape coach reserves the centre lane rather than extending over right-side telemetry. Existing two-line, clipping, projected-sub, 44 px and non-overlap assertions are retained.
- The phone HUD helper treated every scan panel as an active prompt. Dim navigation panels must retain the waypoint. It now asserts a visible, nonempty edge readout for those panels and retains suppression for active scan prompts, objective-list/hint suppression and all layout checks.
- Touch Controls is now the “How to play” picture guide; desktop selecting the Touch tab also renames the dialog. Specs use the current names and assert the ten diagrams, layout content and tab visibility. Journal's close button is “Close Journal” and spoilers have switch semantics. Its touch audit follows site cards, entry rows and Back navigation; dimensions and centre hit-tests remain strict. Awaiting the real Journal load prevents async body replacement from invalidating the initial reachability measurement; diagnostics now include the hit element and rectangle.
- The first repair incorrectly interpreted the hidden live-tip node as a removed feature. The second follow-up below restores the actual brief desktop-tip contract and its preference/remapping checks, alongside the Controls guide checks. Its mission/telemetry/speed/order assertions remain.

Validation after repairs: focused unit tests passed (52); all 111 cases in the ten affected E2E files collect. The final build passed; all 1,898 unit tests in 187 files passed (262.89 s), and the expanded caption regression passed on a focused rerun. Python (156), strict content, attribution and formatting checks passed. All 767 E2E cases collect. Chromium/Vite execution still requires the orchestrator; no tests were skipped and no unrelated safety, layout, lighting, input or hit-target assertions were weakened. Inspected the supplied landscape guidance capture at `.cache/codex/shots/620/after/checks/landscape-after-move.png`; it is prior-gate evidence, not a post-fix rendering.

Suggested outside-sandbox rerun of affected specs first:

```bash
npm run build -- --outDir dist-1391-gatefix
PW_PORT=4370 PW_OUTDIR=dist-1391-gatefix npx playwright test \
  tests/e2e/d-polish.spec.ts tests/e2e/d-start.spec.ts \
  tests/e2e/f-arcade-access.spec.ts tests/e2e/f-bughunt-18.spec.ts \
  tests/e2e/f-bughunt-960.spec.ts tests/e2e/f-first-minute-620.spec.ts \
  tests/e2e/f-flow-audit-510.spec.ts tests/e2e/f-lostcity-readable.spec.ts \
  tests/e2e/f-touch-audit.spec.ts tests/e2e/f3-onboard.spec.ts
```

Then run `tools/gates.sh --full-e2e` and the requested first-minute captures.

## Second full-gate follow-up

The next outside-sandbox gate passed build, unit, Python, content, attribution, Prettier and project-base E2E; full E2E reported 703 passed, 49 skipped and 15 failures. Inspected all 15 errors in `.cache/gates/e2e.log` and `test-results-gates-4370-2761518/`. The previous Controls, Journal, tutorial-layout and mission-distance failures no longer appear.

- Twelve failures shared a helper error: `window.__game.settings` is the Settings screen, not settings data. The phone guidance check now reads `save.get().gameplay.visualHints`, matching production. Visible/nonempty navigation for dim approach cards and hidden duplicate guidance for active prompts remain required.
- The HUD polish failure came from the prior repair's incorrect zero-node assertion. Desktop tips still appear briefly. Restored their original visibility, preference-off suppression and remapped `I/S` checks, and retained the additional Controls guide checks. Suppression also requires empty content. No HUD production files were edited.
- Lost City Medium/High mission openings passed hull safety but opened about 207 m above a deep valley. The nearby-floor proxy fell below the existing 2.5 threshold (reproduced headlessly at 2.43). Mission bearing scoring now accounts for local seabed altitude at Lost City, selecting the adjacent terrace approach. Its exact 220 m contact range, scan exclusion, global camera arm, tower projection, hull rating, clear transit and ambient fill of 16 remain unchanged. Free-dive placement and other sites' scoring are unchanged.
- Expanded the real-terrain readability regression to High and imposed the exact browser floor threshold (`> 2.5`) on Lost City. Added matching global-camera and tower-axis checks for its mission approach. Before the fix the new regression failed in both Medium/High; after it all three tiers pass. The 39-site/tier approach audit, 15 physics-driven approach-and-scan checks and 15 readability checks passed (69 total). The Beebe isolation snapshot changes only the shared spawn-source hash; terrain, biome, prop and rendering evidence remain unchanged.

Inspected the latest gate's Lost City Medium free-dive opening screenshot (`test-results-gates-4370-2761518/f-bughunt-880-lost-city-me-84047-e-and-read-authored-Journal-chromium/opening.png`), which confirms the retained scenic frame and desktop live-tip strip. This is pre-fix rendering evidence. The changed mission bearing still needs the orchestrator's browser rerun and requested first-minute captures; this sandbox cannot run Vite/Chromium.

Final validation: build/TypeScript passed; all 1,903 unit tests in 187 files passed (263.35 s); Python (156), strict content, attribution and Prettier passed; all 767 E2E cases collect. The initial full unit attempt passed 1,902 tests and found only the spawn-source hash snapshot captured before formatting finished; the corrected fixture and clean full rerun pass. No browser tests were executed in this sandbox. Logs are saved as `gatefix2-*` in `.cache/codex/shots/1391-f-first-dive-flow/`.

Rerun the four remaining affected files first, then the full gate:

```bash
npm run build -- --outDir dist-1391-gatefix
PW_PORT=4370 PW_OUTDIR=dist-1391-gatefix npx playwright test \
  tests/e2e/d-polish.spec.ts tests/e2e/f-bughunt-960.spec.ts \
  tests/e2e/f-flow-audit-510.spec.ts tests/e2e/f-lostcity-readable.spec.ts
tools/gates.sh --full-e2e
```
