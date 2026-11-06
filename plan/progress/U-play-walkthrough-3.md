# U-play-walkthrough-3 (2026-11-06, evidence only, no src/tests edits)

Build: HEAD 08cfd9de (`golden-sha` meta in served index = 08cfd9de8cee9f06613bfe947fe82d0fc590dadf, `golden-dirty=false`). Built with `vite build --outDir dist-wt3`; served with `vite preview --outDir dist-wt3 --port 4313`. Served index, JS and CSS md5 match `dist-wt3` byte for byte.
Script: `.cache/walkthrough-3/run.mjs` (copied and adapted from walkthrough-2). Logs: `.cache/walkthrough-3/<layout>-<site>-log.txt`. Screenshots: `.cache/walkthrough-3/<layout>-<site>-NN-step.png`, 77 files on disk.
Layouts: `desktop` 1280x720 keyboard+mouse; `phone` 390x844 touch DPR 2; `landscape` 844x390 touch DPR 2. Sites: `titanic`, `great-blue-hole`. All six journeys reached a debrief and captured 12 or 13 screenshots.
Method: real clock, `?tier=low`, swiftshader. No teleport and no test hooks: the script reads only the on-screen marker position, the edge arrow angle and visible text, and steers with W/A/D/G on desktop and with CDP touch on the stick and SCAN button on touch. The script never reads `window.__game`.
Limits: the steering is a simple loop (hold W, turn toward the marker, hold scan when the marker is centred). It is not a skilled player. Titanic on landscape never completed a scan, which is partly the script (see issue 3).

## What was seen

- Home (all layouts): one clear primary "Dive: Titanic dive", then Dive sites / Free dive / Daily dive / Game mode (Arcade | Realistic | Advanced) / Journal / Your sub / Settings / Controls. Sub hero render is clean.
- Site list and briefing: objectives with PRIMARY/OPTIONAL tags, depth, hull, mode, Begin dive. Clear on all layouts.
- Dive start: the first step card reads "STEP 1 OF 3 ... Hold W to move, then A or D to turn" on desktop and "Drag to follow the marker." on touch. Both are short. Touch gives no key names (correct for casual players).
- Approach: the marker and the on-screen sonar show the target, and the edge arrow works when the target is off screen.
- Scan (Titanic bow): desktop scanned at about 236 s, phone at about 146 s (the first scan was the bow in both). Scan progress shows "SCANNING 43% / 89% ... HOLD G · KEEP ON TARGET" on desktop and "SCAN TARGET ... 91 m" on phone. Reward card: "OK | New Journal entry | Bow section" plus the next objective ("Stern section · TURN 98° PORT" on phone; "Scan the stern" in the desktop mission panel).
- Blue Hole: first scan at 43 s desktop, 169 s phone, 202 s landscape. The scan on desktop and phone hit a French grunt (a fish), not the stalactite gallery the marker pointed to (issue 1).
- Journal (phone and desktop): opens to "All dive sites" showing "Loading the Journal..." (issue 4). The landscape journal did load the Titanic page.
- Debrief: "Dive summary", stars, "N scans", "N of 2 primary objectives", "Scanned <target>", "Next: Keep exploring...", then Dive sites / Keep exploring / Journal / More options. Zero-scan debrief reads "The site is waiting for your first scan. Next: Face a target and hold Scan." Honest and short.
- No page errors in any of the six runs.

## Ranked issues

1. **Scan picks a fish, not the objective (Blue Hole, desktop and phone).** Marker points at the stalactite gallery, but the scanner locked a nearby French grunt. The reward card says "New Journal entry French grunt" and the objective stays "0 of 2 primary". A casual player would think the scan counted. Evidence: `desktop-great-blue-hole-09-reward.png`, `phone-great-blue-hole-09-reward.png` (guidance reads "Marker 125 m ahead" with no note that the fish was the wrong target). Fix: when a non-objective contact is locked while a primary objective is on screen, say "Not the marker: fish, scan the stalactite gallery (125 m)" in the scan line, and do not let the reward card read as an objective result.
2. **Depth tutorial stuck on a flat approach.** "Right slider: up to rise, down to sink." (touch) and "STEP 2 OF 3 Hold Space to rise or Ctrl to sink" (desktop) persisted for 3 to 7 minutes on Titanic while the sub was 0 to 100 m from the target at about the same depth. Evidence: `landscape-titanic-09-no-scan.png` (the card covers the top-left while the wreck is the target), `desktop-titanic-07-approach-3.png`. This is the same issue as walkthrough-2 issue 2. Fix: skip the depth step when the marker depth is within about 15 m of the sub, or time it out after about 20 s of no vertical input.
3. **Scan interruption is silent until it happens.** Landscape Titanic reached 74% then showed "SCAN INTERRUPTED | HOLD SCAN TO RESUME" with the marker drifting off centre. The progress decays but the reason is not shown. The script caused part of this (it released scan when the marker moved more than 12% off centre), so treat it as partly a steering artifact. Fix: keep the bar and add "Keep the reticle on the wreck" to the interrupted line, and show the marker's direction while interrupted.
4. **Journal opens to "Loading the Journal..." on the site list.** `phone-titanic-11-journal.png`, `desktop-titanic-10-journal.png`. The default page is "All dive sites", not the current dive's site. Fix: open to the current site's page with the cached entry, and show a spinner only if the list is slow.
5. **Reward ring label is tiny.** "OK" inside the reward ring is about 9 px on phone (`phone-titanic-09-reward.png`). The text around it is clear. Fix: drop the ring text or make it "✓" at a readable size.
6. **Touch Pause: not confirmed as a game issue.** The touch Pause button was reported hidden in all four touch runs. The cause in these runs is probably the script: I closed the journal with an Escape key press, and TouchControls hides touch controls after any key press (per its own header comment). Treat as an artifact until a run closes the journal by tapping its own × and then taps Pause. Not counted as a finding yet.

Dead ends: none in the game. Every screen had a way forward. Landscape Titanic ended with no scan within the 7-minute cap, so its debrief reads "0 scans", which is a steering failure first (issues 2 and 3), not a missing path.

Runs: desktop-titanic, phone-titanic, landscape-titanic, desktop-great-blue-hole, phone-great-blue-hole, landscape-great-blue-hole. Each journey logs `TAP FAILED` for the touch Pause button and falls back to Escape (see issue 6).
