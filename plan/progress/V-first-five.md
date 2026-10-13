# V-first-five: unaided phone first five minutes

Date 2026-10-13. Branch `claude/V-first-five`, SHA 66da04a (worktree; no game source changed).
Build: `npm run build`, served with `vite preview --port 4731 --strictPort`. Fresh save (only
`graphicsTier: low` seeded, as in CI), Arcade defaults (Home shows Arcade selected), touch input
through CDP on the real stick, ballast slider and SCAN button. Titanic mission, "Dive sites" then
"Begin dive". No `?mission=`, no teleport, no test hooks that change state.

Capture tool: `tools/vfirstfive-capture.mjs` (throwaway; one layout per run).
Screenshots: `/home/vijay/submarine-explorer/.cache/np/v-first-five/<portrait|landscape>/NN-*.png`
with `manifest.json` (per-step probe: objectives, progress text, banner, stars, scan state, and every
visible guidance surface with its text and rect). Both layouts ran to the debrief with `pageerror`
count 0.

## Result in one line

Both layouts: unaided real scan of the bow (SCAN held, 5.1 s), next objective "Stern section" shown
about 2 s later, Journal opened and closed, then 4 more scans and the completion banner ("3 of 4
objectives", 1 of 3 stars), then the debrief. Steps 01-12 are unaided; from step 13 the steering was
aided (see Caveats).

## Per step (portrait; landscape notes after the slash)

Guidance surfaces counted: tutorial card (`onboard-card`), tutorial hint (`onboard-hint`), scan card
(`scan-panel`), objective chip/panel (`objectives-panel`), world waypoint (`d-scan-edge`), banner
(`obj-banner`), and the debrief. The "New discovery +10 RP" toast is not in the probe list; it is
counted separately below.

- **01 Home.** Dive / Dive sites / Free dive, Daily dive card, Game mode Arcade/Realistic, Journal and
  Settings. Surfaces 0. Next action is obvious (Dive is the highlighted primary). Landscape: fits;
  Advanced and Journal sit in the lower band without clipping.
- **02 Dive sites.** Globe with site markers plus list (Titanic 0/4 logged, 3 stars empty). Surfaces 0.
  Landscape: globe and list fit; the list scrolls.
- **03 Briefing.** Briefing card with objectives (bow and stern PRIMARY, boiler field and memorial
  OPTIONAL) and Begin dive. Surfaces 3 (briefing, scan chip, waypoint). Portrait: HUD shows behind the
  scrim and the objective chip ("CLOSE TO 160 M") is cut by the card's top edge. Landscape: the
  "Begin dive" button is **not in the 390 px frame**; the capture had to scroll it into view before
  tapping, so the first thing a landscape player sees does not show the start action.
- **04 Mission start.** Tutorial strip "Left stick: follow the marker. Skip". Objective card (the
  scan-panel slot, "OBJECTIVE Bow section, CLOSE TO 160 M"). World label "Bow section 220 m, down 22
  m". Surfaces 4 (tutorial, objective card, waypoint, objectives panel with only the mission title).
  Overlap: the bow name and distance appear twice (objective card and world label). The next action
  (move with the stick) is clear from the strip.
- **05 Move forward.** Tutorial moved on to "Right slider: up to rise, down to sink". Surfaces 4. The
  stick is the only control that matters here; the strip and the chip both update.
- **06 Rise.** Tutorial "Hold SCAN on a glowing target." Surfaces 4. Clean in both layouts; no text
  collision. The scan button is the largest control and is obvious.
- **07 Contact in range.** Scan card "SCAN TARGET, Bow section, HOLD SCAN TO SCAN" with a reticle. The
  tutorial and the objective chip both leave the screen. Surfaces 2. Next action is unambiguous.
- **08 After scan.** "NEW ENTRY Bow section, PAUSE -> JOURNAL" card plus "Nice work. How to play is
  always in the Pause menu. x" hint. Surfaces 3. The next objective is **not** shown yet; the card
  still names the bow. Landscape: same two cards stacked, fine.
- **09 Scan reward.** Same as 08 plus the "New discovery +10 RP" toast at bottom centre. Surfaces 3
  (+1 toast). Two guidance cards plus a toast at once.
- **10 Next objective.** Objective chip "Stern section, TURN 78 deg PORT" and waypoint "Stern section
  706 m, down 40 m". The hint strip is still up. Surfaces 4. The waypoint label sits over the sub's
  scan mark in portrait. Landscape: the waypoint sits at left above the stick, readable.
- **11 Journal.** Pause menu, then Journal. Journal opens on the article "The bow section" (not the
  index). Back and close are in the header, both clear. Surfaces 2 (pause menu, objective panel). Text
  reads fine at 390 px; the article scrolls.
- **12 Back in dive.** Objective card "Stern section TURN 78 deg PORT", waypoint "Stern section 705 m".
  Surfaces 3. The name "Stern section" appears in two places (objective card and waypoint). The journal
  closes correctly; an earlier capture showed the journal still open because of a screenshot lag, now
  fixed by a paint wait and a longer journal wait in the capture.
- **13 Scans and steering (aided, see Caveats).** Optional contacts were scanned along the way (debris
  field, golden coral, armed brittle star in landscape, memorial plaque site, then stern). Portrait
  13-nav-scan-3 shows a red "SEABED PROXIMITY" warning that **covers the top-left of the JOURNAL
  button**. This is an overlap; the warning does not block scanning. Surfaces 2 most of the time.
- **14 Completion banner.** "Primary objectives complete", "3 of 4 objectives. 1 optional target
  remains.", stars "1 of 3 stars" (shown as star glyphs), and buttons "Keep exploring" (primary) and
  "Surface and debrief". Portrait: about 200 px tall, covers the scan card and most of the mission
  strip. Landscape: a horizontal panel at top centre; both buttons fit, no clipping. Surfaces 2 to 3.
  The next action is obvious from the buttons.
- **15 Debrief.** "Mission complete", stars "1 of 3" (star glyphs), "120 research points" (portrait;
  landscape 135), "4 scans", "3 of 4 objectives", "Scanned Bow section. Next: Finish the remaining
  objectives for 2 stars.", and buttons "Dive sites" (primary), "Keep exploring", "Journal", "More".
  Surfaces 1 (the debrief itself). Clean in both layouts.

Toast count: at most one toast ("New discovery") at a time; it did not overlap the banner.

## Banner, stars, objective counts (the ALSO VERIFY item)

- The "0 of 4 objectives" the S-flow fixture showed is the **pre-scan** state; it is correct at
  step 03 to 07 of the real run ("0 of 4 objectives - 0 of 2 primary").
- The real run's banner reads **"3 of 4 objectives. 1 optional target remains."**, not "2 of 4".
  This is consistent with the objectives array at that moment (find-bow, find-stern and memorial
  complete; boilers not). The memorial was scanned en route during steering, so the count is 3, not
  the 2 of the d-flow expectation (which holds when only the two primaries are scanned).
- Stars **appear**: the banner shows "1 of 3 stars" and the debrief shows one filled star, both
  matching. The debrief "Next: Finish the remaining objectives for 2 stars" is consistent with 1 star
  at 3 of 4.
- Mismatch to check: the debrief says **"4 scans"** in both layouts while the scanner's completed
  counter read 5 (portrait) and 6 (landscape) at the same moment. The definition of "scans" on the
  debrief is not verified from the code in this pass.
- Mismatch to check: the debrief line names "Scanned Bow section." although the last mission scan was
  the stern. The line may name the first primary, not the latest scan.
- Wording to check: the debrief title "Mission complete" appears with 1 of 3 stars, one optional target
  remaining, and "Keep exploring" still offered on the banner. The title and the stars read as
  complete while the state is primaries-complete.

## Guidance load

Maximum guidance surfaces visible at once in the real run: 4 (steps 04, 05, 06, 10 portrait, and
similar in landscape), plus the toast on scan steps (09). At step 08 to 09 the player has the NEW ENTRY
card, the "Nice work" hint, and the objectives panel at once. There is no step where the next
objective and the NEW ENTRY card are both fully readable.

## Findings (ranked)

1. Medium: landscape briefing does not show "Begin dive" in the first frame (see 03). The tap works
   only after a scroll.
2. Medium: red "SEABED PROXIMITY" warning overlaps the JOURNAL button in portrait (13-nav-scan-3).
3. Medium: scan card names the nearest contact, not the mission target. In the first aided attempt
   (scan card "TURN" readout as steering) the sub drifted to a debris field and then about 4.5 km
   away. The same finding as `plan/progress/f-newplayer-recapture.md` item 3, now seen on a real run.
4. Low-medium: debrief "4 scans" versus scanner completed 5 or 6; "Scanned Bow section." when the
   last mission scan was the stern (see Banner section).
5. Low: the bow name appears twice on mission start (objective card and waypoint); the stern name
   appears twice at step 12 (objective card and waypoint).
6. Low: the objective chip still says "Bow section" for about 2 s after the bow scan (steps 08 and 09)
   before "Stern section" replaces it (step 10).
7. Low: the Journal opens on an article, not the index.

## Caveats

- Steps 01 to 12 are unaided: stick forward, ballast slider up, real SCAN hold on the bow, Journal via
  the pause menu.
- Steps 13 onward are **aided**: the capture steered with the real stick and slider, but the steering
  angle was read from `scanner.view.objectiveTurnDeg` and `objectiveVertDeg` (game state). The first
  attempt steered from the on-screen TURN readout and drifted away (finding 3). The real SCAN button was
  held for each scan. Therefore "finish" is an aided run, and the banner and debrief counts come from
  an aided run, not an unaided one.
- The capture is on SwiftShader (no GPU). Scan timing is game time and matched a real hold (5.1 s).
- The capture waits 500 ms plus two animation frames before each screenshot. Before this fix one
  journal screenshot showed the previous state (a lag of one step). Both final runs were checked
  against the manifest.
- The numbers in this note are from the final portrait and landscape runs (both reached the debrief).
