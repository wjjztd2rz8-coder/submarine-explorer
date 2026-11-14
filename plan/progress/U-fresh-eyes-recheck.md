# U-fresh-eyes-recheck (DIRECTOR item 36)

Evidence-only review of items 38-41 (Home, first-dive labels, Journal layout, debrief stars), which merged on smoke gates without screenshot review. No code edited, gates not run.

Capture: fresh build of this worktree (`vite build --outDir dist-u`, served on port 5342), Low tier, `?tutorial=0`, real time. Flow per viewport: Home -> briefing (Titanic) -> Begin dive -> 5 s -> 60 s with no input -> pause -> Journal -> close -> Surface -> debrief. Viewports: phone portrait 390x844 (touch), phone landscape 844x390 (touch), desktop 1280x720. No console or page errors in any run.

Screenshots: `.cache/codex/shots/U-fresh-eyes-recheck/` (gitignored), named `{viewport}-{n}-{screen}.png`, where viewport is `portrait`, `landscape` or `desk720`, and n-screen is `1-home`, `2-briefing`, `3-dive-5s`, `4-dive-60s`, `5-pause`, `6-journal`, `7-debrief`.

## Findings

1. **Landscape debrief overlaps the sonar and crowds the HUD.** View: `landscape-7-debrief.png`. The "Dive summary" card starts over the SONAR minimap and its right edge sits within a few pixels of the JOURNAL HUD button. Severity: medium. Suggested fix: when the debrief is open on a short viewport, dock it to the centre-right with a max-width that clears the minimap and HUD, or hide the minimap while the debrief is up.

2. **Landscape Home clips its bottom row.** View: `landscape-1-home.png`. At 844x390 the Settings and Controls buttons are cut off at the bottom edge with no scroll cue. Severity: medium. Suggested fix: compact the Home panel for short heights, for example by hiding the tagline and the sub caption, or by tightening the Dive and Daily card padding, so the full menu fits without scrolling.

3. **Debrief is text-heavy and repeats its numbers.** View: `portrait-7-debrief.png`, `desk720-7-debrief.png`. "☆☆☆ 0 scans 0 of 2 primary objectives" is followed by a star legend ("Stars: 1 for the primary objectives, 2 for all, 3 with a photo or species scan."), then the "waiting for your first scan" line, then "Next: ...". The count appears twice and the legend is a paragraph of rules a casual player will not read. Severity: medium, and it conflicts with the phone-test direction to cut text. Suggested fix: show the star rule once, behind a "How stars work" disclosure or a tooltip, and drop the duplicate "0 scans" wording when the line already shows the stars.

4. **Journal repeats the site title.** View: `portrait-6-journal.png`, `desk720-6-journal.png`. The header breadcrumb "RMS Titanic" and the body heading "RMS Titanic" are the same text on one screen. The header back and close buttons are large boxes, which makes the header heavier than the content. Severity: low. Suggested fix: keep the title in the header only, or make the body open with the summary line.

5. **Journal attribution footer wraps badly and is tiny.** View: `portrait-6-journal.png` (wrap), `desk720-6-journal.png` (size). On the phone, "Ryan et al. (2009) ·" ends a line with a dangling separator and "CC BY 4.0" sits alone on the next line. On desktop the "Seabed data" line is about 11 px grey text with low contrast. Severity: low. Suggested fix: keep each credit together (no-wrap per link) and drop the trailing separator, and raise the footer to 12 to 13 px with a contrast check against the panel.

6. **First-dive tutorial wraps awkwardly on desktop.** View: `desk720-3-dive-5s.png`, `desk720-4-dive-60s.png`. The step card reads "Follow the marker toward the bow. Hold W to move, then A or D to turn." and breaks as "...then A or / D to turn." Severity: low. Suggested fix: set a wider max-width on the step card or split the instruction into two short lines (move, then turn).

7. **Sub idle for the first 60 s reads as stuck.** View: `desk720-4-dive-60s.png`, `portrait-4-dive-60s.png`. With no input the sub holds 0.2 kn, the tutorial still reads "Step 1 of 3" and the portrait hint changes only to "Marker 140 m ahead". Nothing says the sub is waiting for input. Severity: low, and expected for an idle run. Suggested fix: after roughly 20 s without input, add a short nudge such as "Hold W to move" in the existing hint slot.

## Checked and fine

- Briefing (all three viewports): objectives, target depth, hull line, mode toggle and Begin dive all fit, with no truncation.
- Portrait Home: primary dive button, Daily card, Arcade/Realistic toggle and the 2x2 grid all fit at 390x844.
- Desktop Home at 1280x720: the panel, the caption and the daily card fit with no overlap.
- Dive HUD at 390x844 and 844x390: the hint bar, the Skip control, the sonar and the depth readout do not overlap.

## Top 5 for the director

1. Landscape debrief overlaps the sonar and crowds the HUD (finding 1).
2. Landscape Home clips Settings and Controls (finding 2).
3. Debrief repeats the scan count and carries a long star legend (finding 3).
4. Journal repeats the site title on one screen (finding 4).
5. Journal attribution wraps badly and is tiny on desktop (finding 5).
