# U-retest-walkthrough-4 (2026-11-07, evidence only, no src/tests edits)

Item 7 on plan/DIRECTOR.md. Question: what does a first-time player see in the first five minutes, on the real clock, with no teleported poses and no state injection?

## Provenance

- Build SHA: `cbafe783e696fd17522e146143a63b07dfc31617` (worktree HEAD at build time, branch `claude/U-retest-walkthrough-4`).
- Served index `<meta name="golden-sha">` = `cbafe783e696fd17522e146143a63b07dfc31617`, `golden-dirty=false`, `golden-build-mode=production`. Checked on every run's first page load.
- Build: `npx vite build --outDir dist-wt4` in the worktree. Served with `npx vite preview --outDir dist-wt4 --port 4721 --strictPort` (no other server on 4721 during the runs).
- This note's commit is the only change after the build, and it touches no src, so the served SHA stays `cbafe783`.
- Browser: Playwright Chromium (swiftshader), fresh context per run (empty localStorage, so a fresh player with no tutorial or journal state), `serviceWorkers: 'block'`.
- Viewports: desktop 1280x720 (keyboard and mouse, DPR 1), phone 390x844 (touch, DPR 2), landscape 844x390 (touch, DPR 2).
- Script: `tools/walkthrough-4.mjs` (new, committed). Run as `node tools/walkthrough-4.mjs desktop|phone|landscape`. The opt-in flag `WT_SEABED_RISE=1` and `WT_TAG` are used only for the supplementary landscape pass.
- Real clock throughout. The timer starts when Home is first visible. No `window.__game` reads, no teleport, no test hooks. The player reads only visible DOM: the guidance card text, the current-objective marker position, the edge arrow angle, the scan reticle, and the debrief text.
- Player rules (v1, used for the three primary runs): hold W unless the card says SCANNING or INTERRUPTED; turn A/D toward the marker or edge arrow; hold G (desktop) or SCAN (touch) when the card says HOLD G / HOLD SCAN and the reticle is near the marker; follow the depth key the card names, toward the marker's side. Surface through the pause menu 90 s after the first scan, or at 540 s.
- Limits: this is a rule-based player, not a skilled human. It steers poorly once it has a first scan (the stern runs drifted hundreds of metres away). Treat the scan timings as real and the late-dive steering as a script artifact. The script did not capture every reward card because its poll is about 150 ms, so some scan times are bounded, not exact.
- Served provenance was also written into each `events.json`. The `tier` field in those files was hardcoded as `low (?tier=low)` by the script, but the runs used the bare URL with no tier parameter. It has been corrected in the four `events.json` files, and the script is fixed for future runs. The game chose its own tier.

Screenshots (gitignored, on disk): `.cache/codex/shots/walkthrough-4/<layout>/NN-label.png`, with `events.json` and the console log `<layout>-run.txt` next to them. Supplementary landscape: `landscape-v2-seabed-rise/`.

## Timeline per viewport (seconds from Home visible)

### Desktop 1280x720 (final run; `desktop/`)

| Time | Event |
|---|---|
| 0 | Home visible. Primary button "Dive: Titanic dive" |
| 3.7 | Tapped primary. Briefing shows at 18.5, Begin dive at 18.6 |
| 30.5 | Step 1 card: "Follow the marker toward the bow. Hold W to move, then A or D to turn." |
| 33.6 | Step 2 card: "Hold Space to rise or Ctrl to sink." Sub is already at about 3770 m, level with the bow |
| 37.0 | Reticle appears; 42.0 card "SCAN TARGET ... HOLD G TO SCAN" at 91 m |
| 45.0 | 1% SCANNING, then at 48.2 the card silently returns to STEP 2 (scan dropped with no reason shown) |
| 51.8 | STEP 3 card: "Hold G on a glowing target." Ctrl tip appears on the first Ctrl press (about 52 s) |
| 83-148 | Objective cards "TURN 130° PORT", "TURN 85° STARBOARD" ... |
| 159.8-169.5 | Card switches to "Get closer to scan · 162 m" and the distance rises to 237 m in about 10 s (script steering) |
| **210.9** | **First scan: Bow section ("OK New Journal entry", PRESS J)**. Scan run 197.8-204.7 |
| 285.8-298.1 | Stern scan, "New Journal entry" |
| 301.7 | Surface and debrief (pause menu) |
| **301.7** | **Debrief reached**: "Primaries complete", 3 scans, 2 of 2 primary objectives, "Scanned Stern section." |

First confusion: 33.6 s (depth card on a level approach). Scan result: a first-scan attempt was lost at 48 s with no message. No page errors.

### Phone 390x844 (touch; `phone/`, rerun after a script fix)

| Time | Event |
|---|---|
| 0 | Home visible. Primary "Dive: Titanic dive" tapped at 1.9 s |
| 17.8 | Briefing (Begin dive at 18.9) |
| 31.2 | Guidance "Drag to follow the marker." |
| 36.3 | "Right slider: up to rise, down to sink." while the sub is level with the bow |
| 42.2 | "SCAN TARGET ... HOLD SCAN TO SCAN" at 42 s |
| 46.2 | "SCAN INTERRUPTED ... BEAM OFF TARGET" at 30%. The card goes back to "Right slider" at 48.6 |
| 67.8 | Second interruption at 38% |
| 82-145 | "WARNING SEABED PROXIMITY" flickers in and out of the guidance slot (about nine flips in that minute), replacing the scan prompt |
| 92.8 | "OK Side find Debris field (mid-site)": an off-objective scan completes |
| 137.8 | "OK Side find White sea anemone" |
| **145.7** | **First objective scan: Bow section ("OK New Journal entry")** |
| 236.9 | Surface and debrief (90 s after the first scan) |
| **237.2** | **Debrief reached**: "Dive summary", 5 scans, 1 of 2 primary objectives, "Scanned Bow section." |

First confusion: 36.3 s (right-slider depth card on a level approach). No page errors.

### Landscape 844x390, v1 (touch; `landscape/`; primary result, same rules as the other runs)

| Time | Event |
|---|---|
| 0 | Home visible; primary tapped at 1.7 s |
| 7.8 | Briefing (Begin dive at 8.3) |
| 28.2 | "Drag to follow the marker." |
| 35.8 | "Right slider: up to rise, down to sink." |
| 44.4 | "Hold SCAN on a glowing target." |
| **47.8** | **"WARNING SEABED PROXIMITY" takes the guidance slot and stays there until the debrief at 541.5 s** |
| 47.8-541.5 | Sub sits on the seabed at about 0.2 kn, 3780-3790 m. The v1 player never answers the warning with the RISE slider, so this stall is partly the script. The scan reticle sits on the Bow in the screenshots, but no scan progress is shown while the warning holds the slot |
| **Never observed** | The script saw no first-scan text. The debrief counts 4 scans, which must have happened while the warning hid the slot |
| 541.5 | Debrief reached at the cap: "Dive summary", 4 scans, 0 of 2 primary objectives, "Scanned Dumbo octopus." |

Landscape v1 never got an objective scan, so the debrief shows 0 primaries. This matches the baseline "no scan in 7 min" for landscape.

### Landscape 844x390, v2 supplementary (`landscape-v2-seabed-rise/`; same rules plus RISE on the seabed warning)

| Time | Event |
|---|---|
| 0 | Home visible |
| 28.0-44.3 | Same first 45 s as v1: Drag, Right slider, Hold SCAN |
| 47.9 | SEABED PROXIMITY warning, then the rise slider is held |
| 53.9 | "SCANNING Bow section" at 72%, so the rise cleared the seabed warning in time |
| about 54-58 | **First scan: Bow section** (bounded by the poll; screenshot at 58 s shows the bow checkmark) |
| 57.9 | "SCAN INTERRUPTED White sea anemone" at 11% (the reticle moved off the bow). Later scans interrupted on a debris field and a crown jelly |
| 541.3 | Debrief reached at the cap: 1 scan, 1 of 2 primary objectives, "Scanned Bow section." |

The v2 pass shows that the v1 stall was a script gap, not a game dead end: a player who rises clears the warning and gets a real scan in under a minute. The game still gives no hint to rise.

## Confusions as candidate U-* items

One line each. The first four are the most important for the first five minutes. Items that overlap an existing backlog item say so.

1. **U-depth-card-level-approach:** the rise/sink card ("Hold Space to rise or Ctrl to sink", "Right slider: up to rise...") shows on the Titanic approach while the sub is already at the bow's depth, desktop from 33 s and phone and landscape from 36 s; extends the existing U-depth-step-skip item to touch and to the card's return after a dropped scan.
2. **U-seabed-warning-action:** "WARNING SEABED PROXIMITY" names no action and takes the guidance slot, so a landscape player sat on the seabed for about 8 min (v1); the RISE slider clears it in under a minute (v2). Name the fix ("Rise: slider up") in the warning.
3. **U-seabed-warning-flicker:** the seabed warning flickers in and out of the guidance slot about nine times in 60 s on the phone (82-145 s), hiding the scan prompt and progress; add hysteresis so the scan prompt wins while a scan is live.
4. **U-scan-interrupt-cue:** a dropped scan gives no reason and no recovery on desktop ("SCANNING 1%" then the step card silently returns to STEP 2 at 48 s); say what stopped it (beam off target, target changed) and keep the step card from regressing.
5. **U-side-find-clarity:** scans lock off-objective targets (debris field, golden coral, anemone, crown jelly) while the marker says Bow; the reward reads "OK Side find ..." and the next card jumps to TURN n°, so a first-timer cannot tell that the objective did not count. Overlaps U-scan-fish-vs-objective (fish case, done 2026-11-06); this is the phone and landscape variant.
6. **U-ctrl-tip-timing:** the first Ctrl press in a dive shows "Ctrl+W may close this tab. Use C or fullscreen." across the lower centre, right when the card asks for Ctrl to sink (desktop about 52 s, and over the debrief); show it on the first Ctrl+W or once per session, not on a gameplay key.
7. **U-objective-two-cues:** the objective line carries two instructions at once ("Get closer to scan · 695 m · TURN 29° STARBOARD", landscape v2), and the distance can grow while the sub is moving; give one action per line.
8. **U-scan-prompt-copy:** touch prompt "HOLD SCAN TO SCAN" repeats the verb; desktop reads "HOLD G TO SCAN". Use "Hold SCAN" once.

## Dead ends and what worked

- Dead ends: landscape v1 (seabed warning, no action, no scan of the objective); phone scans that never finished the bow until about 146 s (they landed on side targets first).
- Worked: Home to briefing to dive is clear on all three layouts. The primary button leads straight into the Titanic dive. Desktop completed the bow and stern scan, then the debrief at 302 s with "Primaries complete". Phone and landscape v2 reached a debrief with a real objective scan. No page errors in any final run.
- Debrief copy is honest on every run ("Dive summary", "0 of 2", "Next: Keep exploring..."). It was not the problem.

## Runs not counted

Two earlier attempts were aborted because the script's scan gate was wrong, not because of the game. They are kept on disk for transparency.

- `aborted-1/desktop`: scan gate required the marker near screen centre, so the player never held G. Stopped at 324 s.
- `aborted-2/phone`: touch scan gate matched "HOLD G" only, so the player never held SCAN on touch. Ran to the cap; debrief at 541 s with 0 scans. Not valid evidence.

The desktop and phone runs in this note used the fixed gates (`HOLD (G|SCAN)|SCANNING`). The landscape v1 run used the same gates. The v2 pass changes only the seabed rule, and its folder is named to say so.
