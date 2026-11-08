# U-retest-walkthrough-5 (2026-11-07, evidence only, no src/tests edits)

Item 2 on plan/DIRECTOR.md. Question: on the current build, what does a first-time player see on Titanic and on the Great Blue Hole, on the real clock, with no teleported poses and no state injection? Method as walkthrough-4, plus a site argument.

## Provenance

- Build SHA: `a912b753c65fb4cbc98bab4e3aa6854681aeb14f` (worktree HEAD at build time, branch `claude/U-retest-walkthrough-5`, clean). Build: `npx vite build --outDir dist-wt5`.
- Served index `<meta name="golden-sha">` = `a912b753c65fb4cbc98bab4e3aa6854681aeb14f`, `golden-dirty=false`, `golden-build-mode=production`. Checked on every run's first page load (every `served` event in the run logs).
- Serve: `npx vite preview --outDir dist-wt5 --port 4731 --strictPort`. Stopped after the last run.
- Later commits on this branch touch only `tools/walkthrough-5.mjs` and this note, not `src/`, so the served build is still `a912b753`.
- Browser: Playwright Chromium (swiftshader), fresh context per run (empty localStorage), `serviceWorkers: 'block'`. Viewports: desktop 1280x720 (keyboard and mouse, DPR 1), phone 390x844 (touch, DPR 2), landscape 844x390 (touch, DPR 2).
- Script: `tools/walkthrough-5.mjs`. Run as `node tools/walkthrough-5.mjs <desktop|phone|landscape> <titanic|bluehole>`. Same player rules as walkthrough 4, v1 (no RISE answer to the seabed warning, which is the case being tested). The `WT_SEABED_RISE=1` option exists but was not used.
- Site selection, read from the visible DOM only: Titanic is the Home primary ("Dive: Titanic dive"). Blue Hole is "Dive sites", then the visible `.mission-item.is-mission[data-mission="great-blue-hole"]` row (on the phone, the sheet grab is tapped first when it is shown; in landscape there is no grab and the row is already in the list). The selection navigates to `?mission=`, as the normal flow does. The timer starts when Home is first visible.
- New in this script: `reticle-no-prompt` (reticle visible and on the marker, no HOLD/SCANNING/INTERRUPTED text in the guidance slot, with the slot text), `idle-20s` (the card wording has not changed for 20 s; distance ticks reset it, so this under-reports on objective cards), and a Journal step after the debrief (the debrief's own "Journal" button, then the `.field-guide.journal` text).
- Limits of the metric: `reticle-no-prompt` uses the script's reticle box (|dx| < 0.25, |dy| < 0.3 of the screen), so it undercounts when the marker sits low in frame. The sub's altitude is not shown anywhere in the HUD (depth only), and the script may not read window state, so "15-25 m altitude" is inferred from the warning and the seabed, not measured. The run-level `gap` counts are poll counts (about 150 ms each plus overhead).
- No `window.__game` reads, no teleport, no test hooks.

Screenshots (gitignored): `.cache/codex/shots/walkthrough-5/<site>-<layout>/NN-label.png`, with `events.json` and the console log `<site>-<layout>-run.txt` beside them. Earlier attempts are kept on disk and not counted (see the end).

## Answers

1. **Scan recovery at 15-25 m: yes, the seabed latch hides a ready-to-scan prompt.** On touch, the scan prompt ("Hold SCAN") is replaced by "WARNING SEABED CLOSE · RISE · SLIDER UP" for long stretches while the reticle sits on the marker (the scan button is lit, no HOLD text):
   - Titanic phone: from 61 s to the 541 s cap, about 1230 polls with the warning and the reticle up, no HOLD prompt, no bow scan (23 idle-20s events). Frame: `titanic-phone/119-idle-429.png` (depth 3796 m, warning in the slot, reticle on the bow, no prompt).
   - Titanic landscape: from 51 s to the cap, about 920 polls, no bow scan. Frame: `titanic-landscape/16-idle-074.png` (depth 3788 m, warning in the slot, scan button live, no prompt; the reticle sits near the sub, not on the bow, so this frame is the weakest of the three).
   - Blue Hole phone: 125-195 s, about 200 polls, the warning holds through the scan-recovery stretch (`bluehole-phone` idle-20s at 147, 168, 188 s).
   - Blue Hole desktop: a smaller case, the warning on and off 7 times on the approach to the eastern gallery (60-133 s, "WARNING SEABED CLOSE · HOLD Space TO RISE"). `bluehole-desktop/16-guide-060.png`.
   - Mechanism (code reading, not run-verified): the warning is offered as `urgent` guidance and takes the slot over the scan card. The static trigger is suppressed only while `scanner.view.nearestInRange` is true (`src/app/systems/hud.ts`, `src/ui/HUD.ts`). The latch, once on below 15 m, clears only at 25 m and after 3 s, so a sub that dropped below 15 m and then works 15-25 m keeps the slot. The scan card does not replace it while the scan is not live.
   - Intermittent: the first Titanic phone attempt (`attempt1-capped-shots/titanic-phone`, events complete) scanned the bow at 96 s with no warning. The final phone run stalled. So the stall is a risk, not a certainty. The rule player never answers the RISE warning (its depth rule ignores a marker near the centre), so every stall here is the v1 player; walkthrough-4 v2 showed that a RISE answer clears it in under a minute. The RISE answer was not re-tested here (the brief fixed six runs).
2. **Blue Hole closer opening.** The gallery is visible in the opening on all three layouts (`bluehole-desktop/05-dive-018s.png`, `bluehole-phone/05-dive-018s.png`, `bluehole-landscape/05-dive-020s.png`): a stalactite cliff about 18% of frame width, with the marker on it. The first objective is clear on desktop without help ("STEP 1 OF 3 Follow the marker toward the stalactite gallery. Hold W..."). On touch the first card says only "Drag to follow the marker." and the gallery is named by the marker/sonar and the briefing, not the card. The first named scan target arrives at 42 s (phone) and 60 s (landscape). The landscape run then locked onto a fish school (below).
3. **Journal and debrief.** Reachable and understandable. The HUD JOURNAL chip is visible in the dive on all layouts. The debrief's "Journal" button opened the Journal with the right site entry on desktop (`titanic-desktop/53-journal.png`: "RMS Titanic", bow entry, 1/7 points of interest) and on Blue Hole desktop and phone. The debrief reads "Dive summary" (1 scan, 1 of 2 primaries) or "Primaries complete" (5 scans, 2 of 2) with honest counts. Its "Next" line says "Keep exploring to finish the primary objectives" and does not name the missing one. Not reached on Titanic phone and landscape or Blue Hole landscape (no debrief in the cap), so the Journal was not checked there.
4. **Confusing text, clipped UI, dead time.** No clipped UI seen in the screenshots reviewed (the landscape warning, the phone card, the Blue Hole sites list, the debrief and Journal). Confusions and dead time are listed as U-items below. Dead time over 20 s (idle-20s events, which under-report): Titanic phone 61-541 s (23 events), Titanic landscape 51-540 s (23), Blue Hole phone 125-195 s (3), Blue Hole landscape 140-473 s (objective card "OBJECTIVE Stalactite gallery TURN n°", 330 s, no distance and no Get closer line) and 473-540 s (warning). Desktop had no idle-20s events on either site.

## Timeline per viewport (seconds from Home visible; final runs)

### Desktop 1280x720, Titanic (`titanic-desktop/`)

| Time      | Event                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1.9       | Home; "Dive: Titanic dive" tapped                                                                                                      |
| 6.6       | Briefing; Begin at 6.7                                                                                                                 |
| 22.5      | STEP 1 card: "Follow the marker toward the bow. Hold W..."                                                                             |
| 28.8      | STEP 2 card: "Hold Space to rise or Ctrl to sink." (on the approach)                                                                   |
| 45.9      | "92 m SCAN TARGET Bow section HOLD G TO SCAN"                                                                                          |
| 63-69     | Scan on Debris field (side target), then "SCAN INTERRUPTED Golden coral BEAM OFF TARGET" at 69.4; the card goes back to STEP 3 at 72.4 |
| 75.8-91.0 | Bow in range again; "2% SCANNING Bow section"                                                                                          |
| **99.9**  | **First scan: "OK New Journal entry Bow section PRESS J"**                                                                             |
| 105       | Stern objective "713 m OBJECTIVE Stern section TURN 65° PORT"                                                                          |
| 195.6     | Surface and debrief (90 s after the first scan)                                                                                        |
| **201.4** | **Debrief: "Dive summary", 1 scan, 1 of 2 primaries**                                                                                  |
| 205.7-210 | Journal from the debrief; the Titanic bow entry                                                                                        |

### Phone 390x844, Titanic (`titanic-phone/`)

| Time   | Event                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------- |
| 1.2    | Home; primary tapped                                                                            |
| 6.5    | Briefing; Begin at 6.9                                                                          |
| 20.8   | "Drag to follow the marker."                                                                    |
| 25.0   | "Right slider: up to rise, down to sink." (on the approach, before any scan target is in range) |
| 43.1   | "100 m SCAN TARGET Bow section Hold SCAN"                                                       |
| 49.8   | "SCAN INTERRUPTED 53% BEAM OFF TARGET"; the card goes back to "Right slider" at 52.1            |
| 61.1   | **"WARNING SEABED CLOSE · RISE · SLIDER UP" takes the slot**                                    |
| 61-541 | Warning holds the slot to the cap. No bow scan. Reticle on the bow in frames, no HOLD prompt    |
| 541.5  | Cap. No debrief. 0 scans                                                                        |

### Landscape 844x390, Titanic (`titanic-landscape/`)

| Time     | Event                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| 1.5      | Home; primary tapped                                                            |
| 8.0      | Briefing; Begin at 8.0                                                          |
| 25.3     | "Drag to follow the marker."                                                    |
| 31.4     | "Right slider: up to rise, down to sink."                                       |
| 46.4     | "Get closer to scan · 120 m"                                                    |
| **51.3** | **"WARNING SEABED CLOSE · RISE · SLIDER UP" takes the slot**                    |
| 51-540   | Warning holds to the cap. No scan. 23 idle-20s events. Cap at 540 s; no debrief |

### Desktop 1280x720, Blue Hole (`bluehole-desktop/`)

| Time        | Event                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| 1.8         | Home; "Dive sites" tapped; the list opens with the Blue Hole row visible at 3.9 s                              |
| 12.7        | Briefing: "Scan the stalactite gallery", "Scan the eastern stalactite gallery" (primaries); Begin at 12.8      |
| 24.4        | "STEP 1 OF 3 Follow the marker toward the stalactite gallery. Hold W..." (gallery visible: `05-dive-018s.png`) |
| 27.1        | STEP 2: "Hold Space to rise or Ctrl to sink."                                                                  |
| 41.6        | "STEP 3 OF 3 Get closer to scan · 147 m"                                                                       |
| 60.4        | First "WARNING SEABED CLOSE · HOLD Space TO RISE"                                                              |
| 85.2        | "74 m SCAN TARGET Stalactite gallery HOLD G TO SCAN"                                                           |
| **95.0**    | **First scan: "OK New Journal entry Stalactite gallery PRESS J"**                                              |
| 101.4       | "253 m OBJECTIVE Eastern stalactite gallery TURN 113° PORT"                                                    |
| 105.6-132.6 | Seabed warning on and off 7 times on the approach (the warning flips)                                          |
| 191.7       | Surface and debrief (96 s after the first scan)                                                                |
| **197.9**   | **Debrief: "Dive summary", 1 scan, 1 of 2; "Keep exploring to finish the primary objectives."**                |
| 202-206     | Journal from the debrief: the Lighthouse Reef entry (1/4 points of interest)                                   |

### Phone 390x844, Blue Hole (`bluehole-phone/`)

| Time      | Event                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1.2       | Home; "Dive sites" tapped; the sheet was collapsed, the grab tapped at 3.3; the row visible at 4.0                        |
| 11.3      | Briefing; Begin at 11.5                                                                                                   |
| 27.3      | "Drag to follow the marker." (the card does not name the gallery)                                                         |
| 32.2      | "Right slider: up to rise, down to sink."                                                                                 |
| 38.6      | "Hold SCAN on a glowing target."                                                                                          |
| 42.0      | "87 m SCAN TARGET Stalactite gallery Hold SCAN"                                                                           |
| 44-70     | Scans on a brain coral, a French grunt and a reef shark; "OK Side find ..." at 58.6 and 70.2 (side finds, not objectives) |
| **102.9** | **First primary scan: "OK New Journal entry Eastern stalactite gallery"**                                                 |
| 147-189   | "WARNING SEABED CLOSE · RISE · SLIDER UP" holds the slot (idle-20s x3)                                                    |
| 195.1     | Surface and debrief (92 s after the first scan)                                                                           |
| **199.2** | **Debrief: "Primaries complete", 5 scans, 2 of 2 primaries, "Scanned Eastern stalactite gallery."**                       |
| 204.5     | Journal opened from the debrief: "Eastern stalactite gallery", RECREATION entry                                           |

### Landscape 844x390, Blue Hole (`bluehole-landscape/`)

| Time      | Event                                                                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.5       | Home; "Dive sites" tapped. No sheet grab in landscape; the list is open and the row is at y=156 of 390                                                                                                                           |
| 12.1      | Briefing; Begin at 12.3                                                                                                                                                                                                          |
| 30.5      | "Drag to follow the marker."                                                                                                                                                                                                     |
| 36.0      | "Right slider: up to rise, down to sink."                                                                                                                                                                                        |
| 45.1-59.6 | "Get closer to scan · 139 m" falling to 100 m                                                                                                                                                                                    |
| 59.8      | "98 m SCAN TARGET Stalactite gallery Hold SCAN" (reticle on the gallery: `15-guide-060.png`)                                                                                                                                     |
| 62.4-95.6 | **The reticle locks onto a French grunt school in front of the gallery.** "SCANNING French grunt", then "SCAN INTERRUPTED French grunt" about 25 times (`HOLD SCAN TO RESUME`), and "Hold SCAN on a glowing target" between them |
| 116-132   | "OK Side find French grunt", "OK Side find Caribbean reef shark" (side finds)                                                                                                                                                    |
| 140.3-473 | "OBJECTIVE Stalactite gallery TURN 59° STARBOARD" (then 66°), no distance and no Get closer line, for about 330 s. The rule player did not reach the gallery                                                                     |
| **473.4** | **"WARNING SEABED CLOSE · RISE · SLIDER UP" takes the slot**                                                                                                                                                                     |
| 496-536   | Idle on the warning (`119-idle-496.png`: depth 11 m, the scan button lit, no HOLD prompt)                                                                                                                                        |
| 540.1     | Cap. No debrief. 0 scans                                                                                                                                                                                                         |

## Findings (ranked)

1. **The seabed warning hides the scan prompt** (Q1). Three of the final touch runs held the warning in the guidance slot while the reticle sat on the target, and none of them completed the first objective scan in the cap on Titanic (phone and landscape). This is the most important finding in this run.
2. **The reticle picks the fish, not the gallery** (landscape Blue Hole). The gallery card says "SCAN TARGET Stalactite gallery Hold SCAN", and the scan then runs on a French grunt school in front of it for about 60 s with about 25 interruptions. Side finds (fish) then steal the scan from the objective. A first-timer cannot tell which target counts.
3. **The first touch card does not name the objective** (Blue Hole phone and landscape). Desktop: "Follow the marker toward the stalactite gallery." Touch: "Drag to follow the marker."
4. **The debrief's Next line does not name the missing primary** (all runs with a debrief). "Keep exploring to finish the primary objectives" leaves the player to find the eastern gallery.
5. **The landscape objective card loses its distance for about 330 s** (Blue Hole landscape, 140-473 s, "OBJECTIVE ... TURN 59°"). The rule player was not steering well here, so this is partly a script artifact. The card still gives no progress signal (no distance, no "Get closer").
6. **Scan drop still regresses to the step card** (desktop Titanic, 69.4 s "SCAN INTERRUPTED Golden coral BEAM OFF TARGET", card back to STEP 3 at 72.4 s). The reason is shown now, so walkthrough-4's silent drop is partly fixed.
7. **The level-approach depth card is still on touch** (walkthrough-4 #1 reproduced): "Right slider: up to rise, down to sink." at 25-32 s while the sub is still on the approach, before any target is in range.
8. **The warning copy names the action now** ("RISE · SLIDER UP" on touch, "HOLD Space TO RISE" on desktop). walkthrough-4's U-seabed-warning-action is addressed in copy. The stall (finding 1) is not.

## Proposed U-* items (one line each)

- **U-seabed-latch-hides-scan [P1, new]:** the seabed warning holds the guidance slot while the reticle is on the target, so no "Hold SCAN" shows; Titanic phone 61-541 s, landscape 51-540 s, Blue Hole phone 125-195 s (`titanic-phone/119-idle-429.png`, `titanic-landscape/16-idle-074.png`). Fix: a live reticle target with a scan prompt outranks the static seabed warning, or the latch clears at 15 m, not 25 m.
- **U-scan-fish-lock-landscape [new, reopens U-scan-fish-vs-objective]:** on landscape Blue Hole the reticle tracks a French grunt school in front of the gallery for about 60 s and about 25 interruptions (`bluehole-landscape/15-guide-060.png`, the run log at 62-96 s). Fix: prefer the marked objective inside the reticle over a passing fish.
- **U-opening-card-touch-name [new]:** the first touch card reads "Drag to follow the marker." and does not name the stalactite gallery; desktop reads "Follow the marker toward the stalactite gallery" (`bluehole-phone/05-dive-018s.png` vs `bluehole-desktop/05-dive-018s.png`). Fix: name the target on touch as on desktop.
- **U-debrief-next-names-primary [new]:** "Next: Keep exploring to finish the primary objectives." does not say which primary is left (Blue Hole desktop: "Scan the eastern stalactite gallery", `bluehole-desktop/52-debrief.png`). Fix: name the remaining primary.
- **U-objective-distance-hidden [new, verify before fixing]:** "OBJECTIVE Stalactite gallery TURN 59° STARBOARD" shows no distance for about 330 s (Blue Hole landscape, 140-473 s); a player cannot tell if they are closing. Check whether the distance is hidden by design beyond some range, and whether the rule player's steering explains it.
- **U-seabed-flicker-desktop [overlaps walkthrough-4 #3]:** desktop Blue Hole warning on and off 7 times in 105-133 s on the approach (the guidance slot flips). Add hysteresis as in the latch, or keep the slot while the warning is still true.
- **U-depth-card-level-approach [reproduced on touch; extends U-depth-step-skip, walkthrough-4 #1]:** "Right slider: up to rise, down to sink." appears at 25-32 s on touch while the sub is still on the approach, before any target is in range (`titanic-phone` 25.0 s, `titanic-landscape` 31.4 s, `bluehole-phone` 32.2 s).
- **U-scan-interrupt-cue [partly fixed, walkthrough-4 #4]:** the desktop drop now gives a reason ("BEAM OFF TARGET"), but the card still goes back to STEP 3 (desktop Titanic 69-72 s).
- **U-warning-action [addressed in copy, close after U-seabed-latch-hides-scan]:** the warning now names the action ("RISE · SLIDER UP", "HOLD Space TO RISE").

Not filed: the Journal and the debrief are reachable and clear (answer 3), and the sites list in landscape is readable without the grab.

## Runs not counted

Kept on disk for transparency; none of these is evidence for the findings above.

- `attempt1-capped-shots/` (first full set, same script before the shot-cap fix): the 40-shot cap ran out in the first 90-170 s, so the debrief and Journal shots were lost. Events are complete for Titanic desktop (first scan 176 s, debrief 267 s) and Titanic phone (first scan 96 s, no warning; the only attempt where the phone bow scan completed without a stall). Titanic landscape was killed mid-run and has no events, so it is not counted. The Blue Hole attempt in that folder failed (`attempt1-bluehole-row-bug/`): the row selector picked a hidden free-dive copy, so the click timed out.
- `attempt2-bluehole-sheet-bug/`: the landscape Blue Hole run failed because the sheet grab is hidden in landscape; the three Blue Hole runs were rerun with the final script (`bluehole-*`). The Titanic runs in the final set were not affected by the Blue Hole selection change.

## Script changes made during the run (all in `tools/walkthrough-5.mjs`, committed as wip)

- Screenshot cap 40 to 200, and a guidance shot only when the card's wording changes (digits ignored).
- Journal step taps the debrief's exact "Journal" button; the HUD chip is not used.
- Blue Hole row: the first visible copy of the mission row; the grab is tapped only when it is shown; the sites list is shot before any scroll.
