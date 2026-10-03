# Phase D — playability (post-playtest plan)

Written 2026-09-23 by the orchestrator (Claude Fable) from the owner's first
full playtest. This replaces the pre-playtest `plan/archive/PHASE-D-BRIEFS-pre-playtest.md`.
**Playability comes before art.** Visual and artistic polish waits until after this phase.

**Status (2026-09-24): all packages below are implemented and merged to
`main`** — D-MODES, D-CONTENT, D-INPUT+HUD, D-SHELL, D-SCAN, D-START, D-FLOW,
D-SONAR, D-POWER, D-CURRENTS, D-ROV and D-PHOTO. The owner's second playtest
findings were delivered as the D-POLISH package (top-right objectives list
and telemetry, control tips, the 350–600 m near-site start range, a snappier
camera) between the QA/playtest-#2 gate in §3 step 8 and the D-POWER/
D-CURRENTS/D-ROV/D-PHOTO run in step 9. See `plan/STATUS.md` for the
package-by-package summary, owner decisions, known nits and what's left
(playtest #3, then the owner's go-ahead to publish).

## 0. Direction

- **Arcade by default, realism by choice.** Follow War Thunder's model: preset
  modes (Arcade, the default; Realistic; Custom) plus per-option overrides. Any
  change to a single option switches the mode label to Custom. A player can mix,
  for example arcade speed with a realistic battery.
- **Get to the interesting part fast.** Dives start near the site by default.
  Starting from the surface is an option, not the default. The player should
  never spend minutes in the dark with only the depth counter moving.
- **Never leave the player guessing.** Every control shown should do something
  visible. Every objective should say what to find and roughly where. Anything
  already scanned should look scanned.
- The honesty rules from Phases B–C still hold, covering real terrain,
  reconstruction flags and sources. Waypoints and hints are UI; they do not
  alter data.

## 1. Owner playtest findings → packages

| #   | Finding (owner's words, condensed)                                                                                                                                                                                | Package           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | Launch drops you straight into a dive; wants a start menu with the globe, keybindings, mission choice                                                                                                             | D-SHELL           |
| 2   | The right-hand missions panel is useless while exploring; it belongs in an Esc menu as "mission select". Its scroll wheel scrolls sideways                                                                        | D-SHELL           |
| 3   | Control hints are tiny and not intuitive; move them into the Esc menu                                                                                                                                             | D-SHELL           |
| 4   | Shift = boost, Ctrl = sink (one-handed), F = scan                                                                                                                                                                 | D-INPUT           |
| 5   | Mouse should drive the camera. A scan key shown with nothing to scan is confusing. Photo mode purpose unclear. Ping does nothing. O → Esc menu. Sim speed has no on-screen indicator                              | D-INPUT           |
| 6   | You can re-scan a scanned target for nothing, and nothing marks a target as scanned                                                                                                                               | D-SCAN            |
| 7   | Sonar only gives a heading. Wants POIs/objectives on it, zoom, and better depth reading in the default palette                                                                                                    | D-SONAR           |
| 8   | "Mission complete" appears with objectives unfinished. Wants "just a little more". "Dive again" shows objectives already complete; each dive should start fresh, with a Civilopedia-style Journal for discoveries | D-FLOW            |
| 9   | The debrief's "Dive sites" button starts a dive instead of going to dive sites                                                                                                                                    | D-FLOW            |
| 10  | Long pitch-black descents (e.g. Challenger Deep) are not engaging; most dives should start near the site, with surface start optional                                                                             | D-START           |
| 11  | Screen space poorly used: mostly darkness, tiny UI. Wants a closer camera and a larger UI that scales with the display                                                                                            | D-HUD             |
| 12  | The sub is very slow. Offer speeds up to the fastest real submarines, plus a slow realistic research-sub option                                                                                                   | D-MODES           |
| 13  | Lights are realistic but most players want arcade; offer stronger lights and sensors by default                                                                                                                   | D-MODES           |
| 14  | Often unclear what or where objects are. Objectives need what/where hints. A "Visual hints" waypoint option, on by default                                                                                        | D-SCAN, D-CONTENT |
| 15  | Battery/oxygen as part of a realistic mode, with granular player control                                                                                                                                          | D-POWER           |

## 2. Packages

Each package's brief is derived from this section plus `plan/PHASE-D-CONTRACTS.md`,
which pins schemas, settings keys, events and file ownership.

### D-MODES: game modes and tuning (foundation)

- Settings gains a Gameplay section with a mode of `arcade` (default),
  `realistic` or `custom`, and per-option values the mode presets fill in:
  - **Speed profile.** `research` models a real crewed research sub (Alvin-like,
    about 1 m/s cruise). `standard` is a moderate speed. `fast` reaches about
    the fastest submerged military subs (about 40 kn ≈ 20 m/s at boost).
    Arcade uses `fast`; Realistic uses `research`. Handling (turn rate, drag)
    must stay controllable at the top speed.
  - **Lights.** `realistic` is today's look. `enhanced` gives brighter, wider
    floods plus an extra fill light. Arcade uses `enhanced`.
  - **Sensor range.** `realistic` versus `extended` for sonar and scanner range.
  - **Visual hints.** Waypoints are on in Arcade and off in Realistic.
  - **Start position.** `near-site` versus `surface` (see D-START).
  - **Battery/oxygen** (D-POWER) is off in Arcade and on in Realistic.
  - **Currents** (D-CURRENTS) are off or gentle in Arcade and on in Realistic.
  - **Descent speed and sim speed defaults.** Arcade descends fast.
- Mode presets and the option table live in `Config`. Settings persist in the
  versioned settings key and must migrate v1 saves (existing players get Arcade).
- The HUD shows the mode's effects honestly, for example the speed in knots and m/s.

### D-INPUT: controls and camera

- New defaults:
  - **Movement.** W/S throttle and A/D yaw stay as they are.
  - **Vertical.** Shift = boost. Ctrl = descend, with C bound as well.
    Space = ascend.
  - **Scanning.** F = scan (hold).
  - **Menu.** Esc = pause menu.
  - **Mouse.** Mouse drag or pointer lock orbits the camera. The wheel zooms
    the chase distance.
  - Remaining keys are re-bound sensibly, and saved custom bindings migrate.
- **Browser caveat.** Ctrl+W (descend while moving forward) closes the tab in a
  normal browser window and pages cannot block it. Mitigations:
  - Bind C as a second descend key.
  - In fullscreen, use the Keyboard Lock API (`navigator.keyboard.lock`) so
    Ctrl combinations reach the game.
  - Show a one-time tip suggesting fullscreen, or C, for Ctrl users.
- **Ping** is removed as a player action. Sonar sweeps passively. Its keys are
  reclaimed.
- **Photo mode** is hidden from hints until D-PHOTO gives it a clear purpose.
- **Sim speed.** A visible HUD indicator whenever the speed is not 1×.
- **Contextual prompts.** "F Scan" appears only when a scannable target is in
  range and not yet scanned. Otherwise nothing is shown, or "Already logged".
- **Camera.** Closer default chase distance so the sub and its lit area fill
  more of the frame. Respects reduce-motion.

### D-HUD: readability and scale

- The UI scales with viewport size (clamped) and has a UI-scale setting of
  80–150%. Minimum body text is about 14 px at 1080p.
- Fewer, larger HUD elements:
  - depth, speed, heading and hull status
  - a compact objective tracker (see D-FLOW)
  - the contextual prompt
  - the sim-speed badge
- The dive HUD no longer carries the right-hand missions panel or the
  bottom-of-screen key list.

### D-SHELL: home screen and Esc menu

- **Home screen at launch.** It shows the globe from C1 with the dive sites and
  these entries:
  - Continue (last site)
  - Dive sites (mission select)
  - Free dive
  - Journal
  - Settings
  - Controls
- **Pause menu (Esc).** It freezes the sim and offers:
  - Resume
  - Objectives (full list with hints)
  - Mission select
  - Journal
  - Settings
  - Controls (reference plus rebinding)
  - Quit to home
- **Mission select** is a list or grid synced with the globe. Scroll-wheel
  scrolls vertically; the current horizontal-scroll bug must be fixed.
- **Test entry points.** URL params (`?mission=`, `?tile=`, `?skipBriefing=1`)
  still boot straight into a dive so tests and deep links work.

### D-SCAN: scan state and visual hints

- A scanned target is visibly marked in the world marker, the sonar and the
  objective tracker. Holding scan on it does not re-run the scan; the prompt
  reads "Already logged — see Journal".
- **Visual hints** (a toggle, on by default in Arcade):
  - a world-space waypoint for the current objective
  - an off-screen edge arrow with distance and depth difference
  - an "in range" cue
- Each objective shows a what/where hint, for example "The bow: north end of
  the wreck, ~3,800 m". The content lives in mission.json (see D-CONTENT).

### D-SONAR: a useful sonar

- The sonar shows POIs and objectives with distinct icons for unscanned,
  scanned and current-objective targets, and for the sub.
- Zoom levels, for example 250 m, 500 m, 1 km and 2 km, with keys and the
  mouse wheel while the sonar has focus.
- The default palette shows depth relief clearly, with contours or hillshade.
  The colour-blind and high-contrast palettes are kept.

### D-FLOW: dive flow and the Journal (replaces old D3)

- **Every dive starts with objectives fresh**; "Dive again" starts fresh too.
  Discoveries still persist, but in the Journal, not as pre-completed
  objectives.
- **When the primary objectives are done,** a banner reads "Primary objectives
  complete" with two choices:
  - Keep exploring (default): the dive continues, secondaries remain.
  - Surface and debrief.
    "Mission complete" or the debrief appears only when the player ends the dive
    or everything is done. The debrief shows X of Y objectives.
- **Debrief buttons do what they say:**
  - Keep exploring
  - Dive again (fresh)
  - Dive sites (opens mission select or the globe, not a dive)
  - Home
- **Journal** (Civilopedia-style), reachable from home, the Esc menu and the
  debrief:
  - entries per site, per POI and per species
  - an entry unlocks when scanned
  - a "show undiscovered entries (spoilers)" toggle lets players read up
    before diving
  - it absorbs the field guide (J)

### D-START: dive start and pacing

- **Default start is near the site.** The sub starts within roughly 100–200 m
  of the first primary objective, a safe height above the seabed, facing it,
  with lights on. Hull-class rules still apply.
- **Surface start** is an option in the briefing and in settings.
- No mission should need more than about 60 s of transit to its first
  objective in Arcade.

### D-CONTENT: objective hints (content only, parallel lane)

- Add a `hint` to every objective in all 13 `mission.json` files, following the
  schema pinned in contracts. It says what the target is and roughly where
  (bearing, feature or depth), grounded in the existing pois/guide data.
- Update the validator and its tests so missing hints are an error.

### D-POWER: battery and oxygen (old D2, realism option)

- It is a realism toggle, off in Arcade and on in Realistic.
- Battery drains with thrust, lights and sensors. Oxygen drains with time.
- Low levels warn clearly. Running out forces a safe emergency ascent, not a
  punishment screen.
- Values are grounded in real submersible endurance, with sources in docs.

### D-CURRENTS: offline currents field (old D5, realism option)

- An offline current field per site, as a precomputed small grid from a
  documented open dataset. No live API calls.
- It is a toggle: off or gentle in Arcade, on in Realistic.

### D-ROV: deployable ROV (old D6)

- A tethered ROV the player can launch to reach tight spots and scan them.
  Scope is pinned in contracts after the core playability packages land.

### D-PHOTO: photo mode (old D1, last)

- Give it a clear purpose: photos save to a Journal gallery tied to the site or
  POI in frame. Free camera, hidden HUD.

### Moved and removed

- **Old D4 (marine life encounters)** moves to **Phase E (future expansions)**:
  not a priority and potentially expensive.
- **Old D7 (surface day/night)** is removed.

## 3. Order (at most two Codex tasks in parallel, with disjoint files)

1. **D-CONTRACTS.** Codex writes `plan/PHASE-D-CONTRACTS.md` against the real
   code. It pins the settings schema/migration, the mission.json `hint`, the
   events, the scan state, journal storage, file ownership and main.ts
   integration points. The orchestrator reviews it.
2. **D-MODES** alongside **D-CONTENT**.
3. **D-INPUT** with D-HUD in one package, as both touch the HUD and input.
4. **D-SHELL.**
5. **D-SCAN** alongside **D-START**.
6. **D-FLOW**, which includes the Journal.
7. **D-SONAR.**
8. **QA playtest pass**, as a scripted Playwright tour with screenshots
   reviewed by the orchestrator, then **owner playtest #2**.
9. **D-POWER**, **D-CURRENTS**, then **D-ROV**, then **D-PHOTO**.
10. **Docs reconciliation.** Then, with the owner's go-ahead, **create the
    GitHub repo and enable GitHub Pages** (the owner approved this to-do on
    2026-09-23 for after this phase).

## 4. Process

- **How each package runs.** The orchestrator launches each package with
  `tools/codex-task.sh <brief> <name>` as a background job, so its completion
  re-invokes the orchestrator in the owner's thread. The script:
  - runs `tools/gates.sh` (static, smoke e2e and project-base) outside Codex's
    sandbox; launch with `FULL_E2E=1 tools/codex-task.sh <brief> <name>` for
    full e2e and package screenshots
  - feeds failures and screenshots back into the same Codex session, for up
    to 3 rounds
  - sleeps through Codex usage limits
- **Reviewing results.** The orchestrator reviews the diff, fixes small issues
  or sends a follow-up brief, commits at green, and launches the next package.
- **Screenshots.** Packages that change UI write PNGs to
  `.cache/codex/shots/<name>/` from a Playwright spec. Use `FULL_E2E=1` so the
  feedback gate executes that spec and generates fresh evidence. The script
  attaches them so Codex sees its own UI, and the orchestrator looks at them before
  committing.
- **Not without the owner:** no pushes, no repo creation.
