# QA notes — Phase C (2026-09-23)

Phase C QA agent, run after C1/C3/C4a–d/C5/C6 integration. Report only; nothing
was fixed. Browser checks used a throwaway Playwright spec (deleted before
commit); one prior run was done by a subagent whose findings are folded in
below (attributed where independently confirmed).

**Gates:** `npm run build` clean (one "chunks >500kB" advisory, not an error).
`npm test` **375/375** passed (36 files). `npm run test:py` **107/107**
passed. `npm run test:e2e` **42 passed, 1 skipped** (2.8 min).
`tools/check_attribution.py`: OK, 3 assets attributed. `tools/validate_landmark.py --all --strict`:
**10 clean, 3 with warnings only (no errors)** — challenger-deep (1),
lost-city (3), titanic (2); see finding 5.

**Environment:** this box has no GPU/Vulkan passthrough — Chromium falls
back to SwiftShader software rendering even with the Vulkan launch args in
`playwright.config.ts` (unlike QA-B's box, which had a real AMD GPU). A
13-mission loop with 3 s settle time per mission did not finish inside a
300 s Playwright test budget on this hardware; missions were split into two
runs to get full coverage. This is a hardware-availability fact, not a
product regression — flag to the orchestrator if CI/QA needs guaranteed
GPU access.

## Findings, by severity

1. **Challenger Deep spawns players into an immediate "ASCEND" crush warning
   at the required scan target** (medium).
   - Repro: `/?mission=challenger-deep&skipBriefing=1&poi=cd-eastern-pool-deepest`.
   - Evidence: `tests/e2e/screenshots/qa-c/post-challenger-deep.png`.
   - At the eastern-pool-deepest POI (10,901–10,931 m) hull C's crush-warning
     band (11,000 m rating) is already active: HUD status "pressure high",
     and a red "HULL PRESSURE 99% — ASCEND" banner sits directly under the
     objectives panel, over the scan-range readout, right when the player
     needs to read it. The strict validator flags the same thing: "deepest
     POI (10,931 m) is inside the crush-warning band of hull C (11,000 m)".
   - This may be intentional (full-ocean-depth tension), but the banner
     placement collides with the objectives panel exactly as QA-B #14 did.
   - Suspect: `data/landmarks/challenger-deep/{mission,pois}.json` depth vs
     hull C's crush margin (A3 config); banner layout is pre-existing HUD
     code. Owner: content lane for challenger-deep, A3/HUD for the collision.

2. **Long mission titles wrap and push the sim-speed badge to a second
   line** (low).
   - Repro: `/?mission=beebe-vent-field&skipBriefing=1&poi=bvf-main-vents`
     or `kamaehuakanaloa`.
   - Evidence: `post-beebe-vent-field.png`, `post-kamaehuakanaloa.png`.
   - "BEEBE VENT FIELD: THE DEEPEST BLACK …" and "KAMA'EHUAKANALOA: THE NEXT
     HAWAIIAN …" both wrap, dropping "SIM 3×" onto its own line.
   - Owner: `src/ui/ObjectivesPanel.ts` (pre-existing layout) needs either a
     title-length budget or truncation; content packs could also shorten
     titles.

3. **`?debugTerrain=1` has no on-screen fps/draws readout, console only**
   (low/informational).
   - `src/main.ts` (~line 555) logs `[terrain] ...fps...draws...` to
     `console.info` on a 1 s cadence; there is no HUD overlay. Confirmed
     working via console capture: vent preset 57–58 draws/60 fps (32/81
     chunks), reef preset 52 draws/60 fps (32/81 chunks). Fine for
     automated QA (which reads console), but worth confirming this matches
     what `docs/presets.md`'s perf brief expects if a visible overlay was
     intended.

4. **Vent preset's plume isn't in frame in a forced fixture shot** (low).
   - `preset-vent.png` (`/?tile=titanic&landmark=_test&preset=vent&at=41.730662,-49.949157&depth=3790`)
     shows the free-dive mission list, not a visible vent plume — camera
     framing in the test fixture, not confirmed as a product bug. The other
     7 presets (brine, canyon, reef, trench, wreck, seamount, default) are
     each visually distinct in their screenshots (e.g. brine shows a dense
     blue-white marine-snow haze field). Re-shoot with the camera turned
     toward a vent POI to confirm vent's own look.

5. **Validator warnings (non-fatal)** (low): lost-city guide.json entries
   "poseidon", "beehive", "imax-tower" each cite only 1 source (validator
   wants ≥2 per PHASE-C-CONTRACTS §5's "every fact needs a source"
   spirit); titanic has no `species.json` (12/13 landmarks have one) and no
   `mission.json.environment` (falls back to the wreck type-default preset,
   which is correct but undocumented in the file). Owners: lost-city and
   titanic content lanes.

## Not regressions / verified clean

- **All 13 missions** load (`?mission=<id>` briefing, then
  `&skipBriefing=1&poi=<primary-objective-poi>`): no console errors on any
  of the 13, HUD fields sane (no NaN, hull-class-vs-depth consistent, e.g.
  bismarck shows "hull C 11,000 m" at 4,198 m), scan target overlay visible
  and on-screen (not off in the distance) in every case. Briefings for
  titanic, challenger-deep and lost-city screenshotted and correct.
  Evidence: `tests/e2e/screenshots/qa-c/post-*.png`, `briefing-*.png`,
  `mission-report-remaining.json`.
- **Presets**: all 8 reachable via `?preset=<name>` and visually distinct
  (see finding 4 for the one caveat).
- **Globe** (`?globe=1`): 68 total pins, **13 mission-state pins** (filled
  cyan), matching all 13 catalogued landmarks exactly. Tab-to-pin then Enter
  on Titanic correctly navigates to `?mission=titanic` with the briefing
  visible, no console errors. Evidence: `globe.png`, `globe-after-enter.png`,
  `globe-report.json`.
- **Settings**: O opens/freezes as documented; reduce-motion and the
  colour-blind (`deuteranopia`) sonar palette both persisted in
  `subexplorer.settings.v1` across a reload and reopened dialog. Sonar-ping
  captions render on screen ("Sonar ping" / "Sonar echo, range …").
  Evidence: `settings-report.json` (localStorage dump), `caption.png`.
- **Mission timing** (corrected): the mission-timing check initially used
  the wrong objective field (`required`, which doesn't exist) and produced
  false "exceeds 10 min" flags for challenger-deep/monterey-canyon/
  hudson-canyon. The real field is `primary`; recomputed at 3× sim speed
  (18 m/s forward, 16.2 m/s vertical) over spawn→POI straight-line distance,
  **every mission's slowest primary objective is under 10 minutes** —
  hudson-canyon is the longest at 8.3 min (`hc-coral-ledge`), everything
  else is under 5 min. Monterey Canyon's 33.8 km MARS-node leg (flagged in
  `plan/STATUS.md`) is already marked `primary: false` ("optional, long
  transit") in the shipped mission.json, so it does not block completion.
- **Content spot-check**: lost-city (serpentinization, Dec 2000 discovery,
  pH>9), beebe-vent-field (2010 Nereus/RRS James Cook discovery, Connelly
  et al. 2012), hunga-tonga-caldera (15 Jan 2022 eruption, ~58 km plume,
  pre-eruption survey caveat stated), blake-plateau-corals (NOAA Jan 2024,
  Sowers et al. 2024, 83,908 mounds, ~6.4M acres) — all four checked
  against known reporting on these events; no discrepancies found.

Commit: (see final message).
