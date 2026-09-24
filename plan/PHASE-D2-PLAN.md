# Phase D2 — playtest #3 fixes (2026-09-24)

Source: the owner's playtest #3 of the Phase D build (commit `2a2f424`). The
playability-first direction and Arcade defaults from `PHASE-D-PLAN.md` still
apply. Contracts from `PHASE-D-CONTRACTS.md` still bind, except where this
file changes them.

## 1. Owner findings → package

| Finding (paraphrased)                                                                  | Package                                 |
| -------------------------------------------------------------------------------------- | --------------------------------------- |
| Auto-framing toward scan targets fights the player and snaps oddly → remove it         | D2-CAMERA                               |
| Reset-camera button + hotkey; free look stops following sub yaw/pitch; no pitch follow | D2-CAMERA                               |
| Camera too close (focus on the propeller); ocean and site should be the focus          | D2-CAMERA                               |
| Camera controls visible from the start                                                 | D2-CAMERA                               |
| Revert keys: R/F pitch, G scan (keep Space/Ctrl rise/sink, Shift boost)                | D2-CAMERA                               |
| Pointer look traps the mouse in Settings; Esc (Chromium) drops the lock                | D2-CAMERA                               |
| Screen shake as the hull-limit signal is bad; use a vignette and/or gauge (options)    | D2-HAZARD (+ CAMERA removes shake)      |
| Challenger Deep unplayable because of hull warnings                                    | D2-HAZARD                               |
| Realistic: starting at the seabed with full battery/oxygen is illogical → per mission  | D2-HAZARD                               |
| Currents not noticeable — intended/realistic?                                          | D2-HAZARD                               |
| Game mode toggle impossible to find → Home, pre-dive and Settings                      | D2-PREDIVE                              |
| Pre-dive mission settings (mode, start position) so options aren't hunted for later    | D2-PREDIVE                              |
| Separate toggles for visual waypoints and sonar markers                                | foundation + D2-PREDIVE + D2-SONARPHOTO |
| UI-scale value clipped by the stepper controls at 100+                                 | D2-PREDIVE                              |
| Briefing shows the old start point, then teleports closer                              | D2-PREDIVE                              |
| Sonar zoom not discoverable                                                            | D2-SONARPHOTO                           |
| Wheel with the sonar expanded should zoom the sonar, never the camera                  | D2-SONARPHOTO                           |
| Photo capture hotkey unclear; download each photo or all at once                       | D2-SONARPHOTO                           |

Recorded without action this round:

- **ROV:** has no distinguishing role yet. Revisit when there are tight spaces
  or details only it can reach.
- **Objectives:** they do not change between dives. Progress resets each dive
  and the Journal keeps long-term discoveries. The owner agrees they should stay
  fixed.
- **Visual detail:** deeply lacking. It is deliberately deferred to an art pass
  after playability.
- **Positives to preserve:** mission objectives are clearer and better placed;
  Space/Ctrl rise and sink and Shift boost; UI scale; the sim-speed badge; the
  contextual prompts; the D-SHELL home and pause flow; the much more useful
  waypoints and sonar; the start options.

## 2. Foundation (orchestrator, before the packages)

- `GameplayOptions.sonarMarkers: boolean` (true in both presets; options
  `[false, true]`), labelled "Sonar markers". `visualHints` is relabelled
  "Visual waypoints".
- Display setting `hullWarningStyle: 'vignette' | 'gauge' | 'both'` (default
  `both`), sanitised in `migrate`. There is no storage-version bump: missing
  fields fall back to defaults.

## 3. Packages and ownership

All four run in parallel, each in its own worktree
(`../subexp-wt/d2-<pkg>`). main.ts edits go in `// --- D2-<PKG> begin/end ---`
fences; CSS goes in `/* --- D2-<PKG> --- */` blocks.

| Package       | Builder              | Owns                                                                                                                                                                |
| ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D2-CAMERA     | GPT-6 Sol (Codex)    | CameraRig.ts, Config camera, Input.ts (defaults, bindings migration, pointer look), HUD control tips, Settings bindings list, README controls; removes camera shake |
| D2-HAZARD     | GPT-6 Sol (Codex)    | Hull warning UI (new HullGauge/vignette + minimal HUD.ts), Submarine.ts rating/crush, Power.ts start levels, Currents.ts, MarineSnow.ts, Config hull/power/currents |
| D2-PREDIVE    | Claude Opus subagent | Briefing.ts, Home.ts, Settings.ts (not bindings), MissionSelect.ts, briefing spawn preview wiring                                                                   |
| D2-SONARPHOTO | GPT-6 Sol (Codex)    | Sonar.ts, PhotoMode.ts, PhotoGallery.ts, PhotoStore.ts, new zip util                                                                                                |

Known overlap points, resolved at merge by the orchestrator:

- main.ts (separate fences)
- styles.css (separate blocks)
- Config.ts (separate sections)
- HUD.ts (CAMERA: tips; HAZARD: warnings)

The briefs are in `.cache/codex/brief-d2-*.md`.

## 4. After the packages

1. Merge each at green, review the screenshots, and run full gates on main.
2. Docs: README controls, `docs/settings.md`, STATUS playtest #4 checklist.
3. Owner playtest #4, then (with explicit confirmation) the GitHub repo and
   Pages.

## 5. Budget rule (owner, 2026-09-24)

Floors: on the 5-hour window, Claude keeps at least 20% and Codex at least 5%; on the weekly window, both keep at least 5%. Check with
the private `ai-limits` tool (`~/.local/bin/ai-limits --gate 20 5`; it is not
part of this repo). Codex's weekly window is the tighter one this week (34%
left on 2026-09-24, resetting Mon 2026-09-28), so three packages go to Codex and
one to a Claude subagent this round.
