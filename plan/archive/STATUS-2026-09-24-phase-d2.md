# Status — 2026-09-24, Phase D2 complete

This is the current handoff. The [previous Phase D status](archive/STATUS-before-2026-09-24-phase-d2.md) is archived; its playtest #3 checklist and pending work are historical. Phase D2 answers that playtest and is merged locally. See [the D2 plan](PHASE-D2-PLAN.md) for the findings and package ownership.

## Phase D2 changes

| Package       | Shipped change                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation    | Separate Visual waypoints and Sonar markers settings; Hull warning display choice (vignette, gauge, both).                                                                                                                  |
| D2-CAMERA     | Removed scan-target auto-framing and hull shake; wider chase framing, world-fixed free look and reset (`X`, HUD button, double-click); `R`/`F` pitch and hold `G` scan; pointer look exits cleanly. Bindings migrate to v3. |
| D2-HAZARD     | Rated-depth hull gauge and optional vignette; separate crush threshold; full-ocean-depth Class C for Challenger Deep; Realistic near-site reserves account for the skipped descent; marine snow follows currents.           |
| D2-PREDIVE    | Mode selector on Home, briefing and Settings; briefing Dive settings (mode, start and more options) preview the actual spawn; UI-scale control no longer clips.                                                             |
| D2-SONARPHOTO | Sonar zoom buttons and range label; wheel zooms expanded sonar; independent sonar-marker toggle; photo capture button and individual JPEG / all-photos ZIP downloads.                                                       |

## Owner decisions and open question

- Objectives stay fixed across dives. Each dive starts fresh; Journal discoveries persist.
- Arcade remains the default, with realism options available through Realistic or Custom. ROV differentiation is deferred until tight spaces or otherwise unreachable details exist. Visual detail is deferred to a later art pass.
- GPT-6 Astra handles planning and orchestration; GPT-6 Sol handles implementation, QA and docs. The D2 package assignment used three Sol packages and one Claude subagent package under the budget rule.
- Budget floors: Claude ≥20% and Codex ≥5% in the 5-hour window; both ≥5% in the weekly window. Check the private `ai-limits` gate before further agent work (`~/.local/bin/ai-limits --gate 20 5`).
- **Owner question — current strength:** Realistic currently uses the archived HYCOM field at full sampled strength, Gentle uses 35%, and physics caps the applied current at 0.8 m/s. Across the 13 site grids, nonmasked samples span about 0.001–0.624 m/s; Challenger Deep is 0.001–0.032 m/s, Titanic 0.004–0.172 m/s, and Blake Plateau 0.127–0.624 m/s. Should a separate, clearly labelled **Exaggerated currents** option amplify the sampled field for playability? No multiplier or default change has been chosen.

## Owner playtest #4

- [ ] At dive start, inspect the wider chase framing. Drag to look freely; turn and pitch the sub and confirm the camera keeps its world direction. Reset with `X`, the HUD button and a double-click.
- [ ] Pilot with `R`/`F` pitch and hold `G` to scan; check `Space`, `Ctrl`/`C` and `Shift` still behave as expected.
- [ ] Enable pointer look from Settings → Controls; confirm it resumes the dive, menus release the pointer, and losing lock during a dive pauses it.
- [ ] Find the game mode on Home, in the briefing and in Settings. Change a briefing Dive setting, including start position, and confirm the preview and actual dive start agree without a teleport.
- [ ] Adjust UI scale through and above 100%; confirm its value remains readable and controls work.
- [ ] Observe the hull gauge and selected vignette style near the rated depth, then test Challenger Deep without premature hull warnings. Confirm the separate crush threshold still triggers emergency ascent.
- [ ] In Realistic near-site starts, confirm battery and oxygen begin below full according to the skipped descent; compare a surface start.
- [ ] Try Realistic and Gentle currents at several sites; watch sub motion, HUD readout and marine-snow drift. Note whether they are perceptible and whether stronger game currents would help.
- [ ] Expand sonar, use its zoom buttons and range label, then wheel anywhere while it is expanded; confirm the camera does not zoom. Turn Sonar markers off and confirm terrain remains while POI/objective icons disappear; compare Visual waypoints separately.
- [ ] In photo mode, use the visible Capture button, then download one JPEG and all photos as a ZIP from the Journal.

## Next step

Run owner playtest #4 and record findings. **No push, GitHub repository creation or Pages activation without the owner's explicit confirmation after playtest #4.** The site remains unpublished; local CI/deployment preparation is not publication.

Known carried limits: target-device 1080p/60 fps remains unmeasured, gamepad bindings are fixed, and the existing large-JS-chunk and duplicate Draco build warnings are nonblocking. Source and bathymetry limits are documented in the site guides and tile inventory.

## Phase D3 — playtest #4 fixes (2026-09-24)

- **D3-FEEL:**
  - Free look orbits centred on the sub, blending in over 0.2 s.
  - Pointer look is a lasting preference: menus release the lock and closing them restores it. After Esc, a "Click to resume mouse look" hint appears.
  - Sonar range changes ease over 250 ms, one step per wheel flick.
- **D3-POIS:** bare-coordinate scan targets were replaced with documented features or removed. The per-site table is in `progress/D3-POIS-audit.md`. Hudson Canyon, Hunga Tonga and the Great Blue Hole now have 2 objectives each.

Playtest #5 quick checks:

- [ ] Drag the camera: the sub stays centred. X resets.
- [ ] With pointer look on: open and close menus with the mouse, and the lock returns. After Esc, the resume hint appears.
- [ ] Sonar zoom (buttons, wheel, expanded map) animates smoothly.
- [ ] Every objective at a site or two leads to something visible and informative.
- [ ] Currents: Blake Plateau in Realistic mode (about 0.3 m/s under the Gulf Stream).
