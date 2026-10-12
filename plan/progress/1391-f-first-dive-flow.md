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
- Full unit suite: final run pending; record result below when complete.
- Full E2E: attempted; preview server failed before any tests could run (`listen EPERM 127.0.0.1:4192`).
- Requested capture: attempted with `tools/firstminute-shots.mjs`, all four sites and all three layouts. Chromium failed before launching a page (`sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`). Preview also cannot bind port 4191. No screenshots were produced or visually reviewed. Target folder contains launch logs, not screenshots. The referenced owner capture `.cache/phonefb/phone-titanic/04-t00.png` is absent in this worktree.

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
