# Phase D implementation briefs

Use these after orchestrator review of [PHASE-D-CONTRACTS.md](PHASE-D-CONTRACTS.md). Order follows [PHASE-D-PLAN.md](PHASE-D-PLAN.md) §3. Each block is a standalone brief for `tools/codex-task.sh`. Test and screenshot file ownership includes the named package's new specs; existing shared specs may be updated **only at the package's scheduled turn**. UI screenshots must be written by a Playwright spec that the gate executes, into `.cache/codex/shots/<package-name>/*.png`.

## D-MODES — game modes and tuning

**Goal:** Add Arcade, Realistic and Custom gameplay settings and apply speed, descent, light and sensor presets. Arcade is the default.

**OWNS:** `src/core/Config.ts` preset sections, `src/core/Save.ts`, Gameplay part of `src/ui/Settings.ts`, `src/render/Headlights.ts`, `src/sub/Submarine.ts`, `src/main.ts` `D-MODES` fences, `src/core/EventBus.ts` additive event wiring, `tests/unit/settingsSave.test.ts`, `tests/unit/subFeel.test.ts`, new `tests/e2e/d-modes.spec.ts`, relevant CSS under `D-MODES`. Do not edit content files.

**Contracts:** §1 presets/schema/migration and §5 ownership. D-CONTENT may run simultaneously; share no files.

**Checks:** v1 settings load as Arcade while preserving display choices; selecting a preset replaces all gameplay options; one edited option yields Custom without erasing the others; reset and corrupt/newer saves behave safely. Research forward ≈1 m/s, fast boost ≤20.6 m/s, separate descent caps and manageable yaw. Lights/sensors visibly differ; HUD reports m/s and kn; sim speed starts at 1× for Arcade. Verify no false Alvin speed claim.

**Tests:** Extend settings save/physics units for migration, math and profile switch; add e2e preset reload/custom switch and visual differences. Keep `tests/e2e/settings.spec.ts` passing after schema change. Screenshot `d-modes/arcade-settings.png`, `realistic-settings.png`, `enhanced-lights.png` from the e2e spec.

**Process/report:** Run through `tools/codex-task.sh`; its `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-CONTENT — objective hints

**Goal:** Give every objective in all 13 mission manifests a useful, source-grounded what/where hint.

**OWNS:** `data/landmarks/*/mission.json` `objectives[].hint` only; `tools/validate_landmark.py` hint rule; its Python tests. No `src/`, UI, or `main.ts` edits. D-MODES may run simultaneously.

**Contracts:** §3 required `hint: string`, mission version 1; §5 ownership; Phase B/C content honesty rules.

**Checks:** Every objective has a nonblank hint; it identifies target plus rough feature/bearing/depth, agrees with that site's `pois.json`, `guide.json` and tile; no exact placement or survey claim invented. Validator fails missing, blank and nonstring hints and passes all shipped packs. Do not add optional `start` unless owner content evidence supports it; D-START can compute starts.

**Tests:** Add Python validator tests for invalid hints; run the content gate through the loop. No screenshot (data-only package).

**Process/report:** Run through `tools/codex-task.sh`; its `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-INPUT+HUD — controls, camera and readable dive HUD

**Goal:** Ship new one-handed keys, drag camera, Ctrl+W mitigation, contextual scan prompt, compact scalable HUD and visible non-1× speed.

**OWNS:** `src/core/Input.ts`, `src/sub/CameraRig.ts`, `src/ui/HUD.ts`, `src/ui/ScanOverlay.ts`, Controls section of `src/ui/Settings.ts`, `src/main.ts` `D-INPUT-HUD` fences, `src/styles.css` `D-INPUT-HUD` CSS, `tests/unit/subInput.test.ts`, `tests/unit/uiHud.test.ts`, new `tests/e2e/d-input-hud.spec.ts`. Update old e2e specs with obsolete keys/help only where needed.

**Contracts:** §2 exact key map, bindings migration, drag/default chase, CSS scale; §5 fences; §6 tests. D-MODES must land first.

**Checks:** Shift boosts, Ctrl/C descend, Space ascends, F scans; Q is camera, ping action and hint gone; Escape opens pause when D-SHELL supplies it. Saved nondefault v1 key choices survive v2 migration and explicit unbound actions remain unbound. First Ctrl tip is once-only; fullscreen lock failure leaves C working. Drag/wheel work without pointer lock and do not steal UI input; optional lock releases on Escape. UI-scale 80–150% persists; 1080p body text ≥14px; compact HUD and scan prompt appear only in context; non-1× indicator visible; photo hidden from hints.

**Tests:** Update `mission.spec.ts`, `settings.spec.ts`, `discovery.spec.ts`, `sub-playtest.spec.ts` key expectations. Add unit migration/drag/scale tests and e2e controls/reload/C/fullscreen fallback. Screenshot `d-input-hud/dive.png`, `controls.png`, `scaled-150.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-SHELL — home and pause menu

**Goal:** Launch plain `/` into a home screen with globe and move mission list, controls and settings into the home/pause flow.

**OWNS:** new `src/ui/Home.ts`, `src/ui/PauseMenu.ts`, `src/ui/MissionSelect.ts`, `src/ui/Globe.ts`, `src/main.ts` `D-SHELL` fences, `src/core/EventBus.ts` additive app events, `src/styles.css` `D-SHELL` CSS, new `tests/e2e/d-shell.spec.ts`; update `tests/e2e/globe.spec.ts`, `settings.spec.ts`, `smoke.spec.ts` as required.

**Contracts:** §5 shell states, URL bypass and app events; §2 Escape/retired N/O; §6 screenshots. D-INPUT+HUD lands first.

**Checks:** Home has Continue, Dive sites, Free dive, Journal, Settings, Controls; Continue disabled without last mission. Globe pin and vertically scrolling mission grid select the same site. Esc during dive freezes and shows Resume, Objectives with hints, Mission select, Journal, Settings, Controls, Quit to home; top overlay receives Escape first. Home and pause freeze simulation. `?mission=`, `?tile=`, `?skipBriefing=1` and documented debug URL probes bypass home; `?globe=1` still opens globe. Quitting to home does not start a dive; URL navigation uses project base correctly.

**Tests:** e2e home→site→pause→resume→home, URL bypass, vertical scroll and focus trap; update globe/settings/smoke expectations. Screenshot `d-shell/home.png`, `pause.png`, `sites.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-SCAN — per-dive scan state and visual hints

**Goal:** Make scanned targets visibly done for this dive and guide players to the next objective.

**OWNS:** `src/game/Scanner.ts`, `src/game/Discovery.ts`, `src/ui/ScanOverlay.ts`, new `src/ui/Waypoints.ts`, `src/main.ts` `D-SCAN` fences, `src/styles.css` `D-SCAN` CSS, `tests/unit/gameScanner.test.ts`, `tests/e2e/discovery.spec.ts`, new `tests/e2e/d-scan.spec.ts`. Do not edit `Mission.ts` or `MissionRouter.ts`; D-START runs alongside.

**Contracts:** §4 scan-versus-Journal semantics and storage; §1 `visualHints`/sensor presets; §3 hints; §5 parallel fences.

**Checks:** A successful scan marks world/sonar/objective target; another held scan in the same dive never emits a second completion or increments persistent count. A new dive can scan the same POI again; Journal remains unlocked. F prompt only when in range and unscanned; scanned-this-dive says “Already logged — see Journal.” With Visual hints on, current objective has waypoint, edge arrow, distance and depth delta, and in-range cue; off disables guidance without hiding objective text. Respect colour-blind palettes/reduced motion. Publish scan state for D-SONAR/D-FLOW without reading private fields.

**Tests:** Unit scan suppression/reset and firstTime; e2e scanned/unscanned markers, no rescan, visual-hints toggle and reload. Screenshot `d-scan/waypoint.png`, `scanned.png`, `hints-off.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-START — near-site starts

**Goal:** Start missions near their first primary objective by default in Arcade, while allowing surface starts.

**OWNS:** `src/game/MissionRouter.ts` spawn/briefing portion, `src/game/Spawn.ts`, additive `start` parse/type in `src/game/Mission.ts`, `src/ui/Briefing.ts`, `src/main.ts` `D-START` fences, `tests/unit/missionRouter.test.ts`, `tests/unit/gameSpawn.test.ts`, new `tests/e2e/d-start.spec.ts`; validator optional-start rule if needed after D-CONTENT finishes. Do not edit Scanner/Discovery/ScanOverlay; D-SCAN runs alongside.

**Contracts:** §3 optional start and near-site safety; §1 `startPosition`; §5 parallel fences.

**Checks:** Default Arcade briefing says Near site and offers Surface; saved Realistic preference says Surface, with a per-briefing override. Computed/explicit near pose is 100–200 m horizontally from the first resolved primary, safe above seabed, within hull depth, facing it, lights on. Surface uses existing `spawn`. `?poi=`, `?at=`, `?depth=` remain deterministic test overrides. First Arcade objective is reachable in ≤60 s or exception is reported. No mission content is fabricated.

**Tests:** Unit pose, edge/tile/hull clamps and start override parser; e2e near versus surface at deep and shallow sites, override persistence semantics. Update `mission.spec.ts` surface-start expectation. Screenshot `d-start/briefing-choice.png`, `near-site.png`, `surface.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-FLOW — primary completion, debrief and Journal

**Goal:** Keep diving after primaries, make end-of-dive choices honest, and replace Field Guide with a persistent Journal.

**OWNS:** `src/game/Mission.ts`, `src/game/MissionRouter.ts`, `src/game/Objectives.ts`, `src/game/DiscoveryStore.ts` read APIs only, `src/ui/Debrief.ts`, `src/ui/FieldGuide.ts`/new `src/ui/Journal.ts`, `src/ui/ObjectivesPanel.ts`, `src/core/EventBus.ts` additive mission events, `src/main.ts` `D-FLOW` fences, `src/styles.css` `D-FLOW` CSS, mission/objective units and new `tests/e2e/d-flow.spec.ts`; update `tests/e2e/mission.spec.ts`, `content-missions.spec.ts`, `discovery.spec.ts`.

**Contracts:** §4 dive state/events/Journal schema/button targets; §5 shell handoff; §6 test obligations. D-SCAN and D-START must land first.

**Checks:** Objectives all start incomplete even when Journal has the POI. Last primary scan emits one `mission:primaryComplete`, offers Keep exploring and Surface and debrief, and does not auto-finish. Secondary scans still work. End action emits ordered `mission:complete` and `mission:ended` once and shows X/Y. Dive again resets per-dive scans, objectives and stats; Dive sites opens chooser, Home opens home, Keep exploring resumes same dive. Aborted route stays safe and shows no nonsensical Continue. Journal lists sites/POIs/species, respects unlocks and in-memory spoiler toggle; existing discovery v1 remains readable with no rewrite.

**Tests:** Unit event order/state/restart/storage; e2e primary banner, extra secondary, debrief targets, Journal reload and second dive. Screenshot `d-flow/primaries-complete.png`, `debrief.png`, `journal.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-SONAR — useful POI map

**Goal:** Put objective and scan status on sonar with zoom and readable depth relief.

**OWNS:** `src/ui/Sonar.ts`, `src/core/Config.ts` sonar palette/zoom section, `src/main.ts` `D-SONAR` fences, `src/styles.css` `D-SONAR` CSS, `tests/unit/uiSonar.test.ts`, `tests/unit/settingsPalette.test.ts`, new `tests/e2e/d-sonar.spec.ts`.

**Contracts:** §1 sensor range/palettes; §4 per-dive scan state; §5 ownership; §6 screenshots. D-FLOW lands first.

**Checks:** Sonar shows sub, POIs, current objective, scanned/unscanned distinction and orientation legend; 250/500/1000/2000 m zoom, wheel only when sonar focused/hovered, keyboard zoom controls shown in Controls. Default palette has depth ordering by luminance/contours; deuteranopia and high contrast remain distinct/readable. Sonar uses already placed POIs and passive sweep; no ping action or audio echo math change. Extended sensors show targets only within contracted range.

**Tests:** Unit projection/zoom/palette ordering and state icons; e2e zoom and objective/scanned icons. Screenshot `d-sonar/default.png`, `zoomed.png`, `high-contrast.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-POWER — optional battery and oxygen

**Goal:** Give Realistic mode readable endurance limits with a safe response to depletion.

**OWNS:** new `src/game/Power.ts`, `src/sub/Submarine.ts` power hook, `src/ui/HUD.ts` power readout, `src/core/Config.ts` power section, `src/main.ts` `D-POWER` fences, `src/styles.css` `D-POWER` CSS, source documentation in `docs/power.md`, new unit/e2e specs.

**Contracts:** §1 `batteryOxygen` presets; §4 dive/abort semantics; §5 fences. Begin only after QA playtest/owner playtest #2 in the plan.

**Checks:** Arcade off means no drain and no misleading meters. Realistic on drains battery by thrust/lights/sensors and oxygen by time with documented 6–10 h Alvin-like baseline, configurable in Config. Low states warn before empty. Empty supply starts safe emergency ascent and then an honest debrief; pause stops drains; Dive again restores supplies. Toggle changes live without discontinuous damage.

**Tests:** Unit conservation/rates/zero and pause; e2e warnings and safe ascent using deterministic debug/test injection. Screenshot `d-power/normal.png`, `low-warning.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-CURRENTS — offline field

**Goal:** Add optional site currents with deterministic, attributed offline grids.

**OWNS:** new `src/world/Currents.ts`, `data/currents/*`, offline fetch/validation tool and tests, `src/core/Config.ts` currents section, `src/main.ts` `D-CURRENTS` fences, source notes `docs/currents.md`, new e2e spec. Coordinate with any existing C3 current preset rather than stacking unexplained push.

**Contracts:** §1 `currents` enum; §5 ownership/events; Phase B/C data provenance. D-POWER lands first.

**Checks:** No live API call; every grid carries source/date/license and site mapping. Arcade off is zero, gentle is documented scaled field, realistic is full field. Field interpolates in X/Z and safe bounds; forces cannot clip the sub into terrain. HUD/sonar shows current direction/speed and responds to the existing `env:current` event. Missing grid degrades to zero with an honest label.

**Tests:** Unit interpolation/bounds/missing field; Python grid validation; e2e off/gentle/realistic difference. Screenshot `d-currents/off.png`, `realistic.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-ROV — tethered scanner

**Goal:** Deploy a small ROV to reach tight POIs and scan them without losing the mothership.

**OWNS:** new `src/rov/*`, `src/ui/RovHUD.ts`, additive ROV action in `src/core/Input.ts`, `src/core/Config.ts` rov section, `src/main.ts` `D-ROV` fences, `src/styles.css` `D-ROV` CSS, new unit/e2e specs. D-CURRENTS lands first.

**Contracts:** §4 same per-dive scan and Journal identity; §5 ownership. Before implementation, pin ROV tether length, battery, camera and retrieval behavior in an additive contract note reviewed by the orchestrator (Phase D plan leaves scope open).

**Checks:** Deploy/retrieve visibly works, dedicated camera and controls are shown, tether constraint is enforced, loss/abort safely returns control to sub. ROV scan calls the same Scanner/Discovery path, so objective and Journal count exactly once. Pause and debrief freeze it; currents affect it only if the reviewed ROV note says so.

**Tests:** Unit tether/return and duplicate-scan behavior; e2e deploy→scan→retrieve, pause safety. Screenshot `d-rov/deployed.png`, `scan.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.

## D-PHOTO — Journal gallery

**Goal:** Give photo mode a clear purpose: capture site/POI photos in a Journal gallery.

**OWNS:** `src/sub/CameraRig.ts` photo behavior, `src/core/Input.ts` photo action, new `src/ui/PhotoGallery.ts` and photo store, additive Gallery tab in `src/ui/Journal.ts`, `src/main.ts` `D-PHOTO` fences, `src/styles.css` `D-PHOTO` CSS, new unit/e2e specs. D-ROV lands first.

**Contracts:** §2 photo hint remains hidden until this package; §4 separate photo key and Journal unlocks; §5 ownership. Decide storage quota/format and capture attribution in an additive contract note before writing code.

**Checks:** Photo mode hides HUD, allows free camera, provides visible capture/save feedback, and restores prior camera/controls on exit. Saved image is tied to site and POI in frame when identifiable; otherwise site only. Gallery survives reload and quota failure is visible/nonfatal. Photography does not complete scans or change `subexplorer.discoveries.v1`.

**Tests:** Unit metadata/store/quota; e2e capture→Journal→reload, photo-freeze/restore. Screenshot `d-photo/camera.png`, `gallery.png` from gate-run spec.

**Process/report:** Run through `tools/codex-task.sh`; `tools/gates.sh` runs build, unit, Python, content, attribution, Prettier and full e2e outside your sandbox. You cannot run Vite or Playwright yourself; use gate feedback. Do not git commit. Report under 400 words: what changed; how to see it; checks run; deviations.
