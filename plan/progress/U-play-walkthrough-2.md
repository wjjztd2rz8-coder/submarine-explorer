# U-play-walkthrough-2 (2026-11-03, evidence only, no src/tests edits)

Build: HEAD 4f4565ef, `vite build --outDir dist-wt2`, served on port 4297, tier=low, fresh save, swiftshader.
Script: `.cache/walkthrough-2/run.mjs`. Screenshots: `.cache/walkthrough-2/` (`<layout>-<site>-NN-step.png`).
Covered: desktop 1280x720 Beebe + Blue Hole; phone 390x844 touch (DPR 2) Beebe. Blue Hole phone not captured.
Player was passive/minimal (a 1.5 s W hold on desktop, none on phone), so 60 s shows a hesitant first minute, not a skilled one.

## What was seen

- Home (desktop/phone): clear primary "Dive: Titanic dive", then Dive sites / Free dive / Daily dive / Game mode / Advanced / Journal, Your sub, Settings, Controls. Sub hero render is good. Desktop panel is taller than 720 px: the last row (Settings/Controls) is cut off at the bottom edge.
- Site list: desktop globe + list reads well ("Recommended first dive" on Titanic). Phone: bottom sheet covers all but a sliver of the globe, so the globe is not a picker at first sight.
- Briefing: objectives, depth, hull, mode, Begin dive. Both layouts fine. Mono-font title wraps on phone; sub not visible behind the card on phone.
- Dive 0/10/30/60 s desktop Beebe: sub, smoker cluster with plume and marker in view at once (good). Step card "STEP 1 OF 3 ... Hold W..." then "Hold Space to rise or Ctrl to sink" while Beebe is 4965 m on a flat slope (depth step pointless there), then SCAN TARGET at 112 m. Blue Hole: opening is a side view; bottom ~40% of the frame is near-black, gallery is small in the middle.
- Dive phone Beebe: sonar, Journal, pause, depth/speed, guidance card "Drag to follow the marker." and stick/buttons/slider. No overlaps. Guidance did not change from 10 s to 60 s with no input (expected, but nothing hints at distance or what to expect).
- Journal from Home: all 13 sites at 0/N with "Scan something on a dive to add it here." Desktop: nav column duplicates the card grid. Phone: clean single list.
- Pause: phone menu has 9 buttons; "Surface and debrief" sits alone in a half row above Quit.
- Debrief (end at 0 scans): "Dive summary", 0 stars, "The site is waiting for your first scan.", "Next: Face a target and hold Scan.", Keep exploring, Dive sites / Journal / More. Honest and short.
- No page errors in any run.

## Ranked issues

1. Desktop Home panel overflows 720 px: Settings/Controls row clipped. `desktop-beebe-vent-field-01-home.png`. Fix: drop the Advanced row's extra height or fold Advanced into the Game mode row so the panel fits 720.
2. Tutorial step 2 (rise/sink) shown on a flat seabed site; it asks for an action with no visible purpose. `desktop-beebe-vent-field-06-dive-30s.png`. Fix: skip the depth step when the first target is within ~15 m of the current depth.
3. Phone guidance stays "Drag to follow the marker." for the whole first minute with no distance or progress. `phone-beebe-vent-field-06-dive-60s.png`. Fix: after ~20 s idle, add the distance ("Marker 120 m ahead") through the same guidance slot.
4. Blue Hole opening: lower 40% black, gallery small, sub off to the right. `desktop-great-blue-hole-05-dive-00s.png` (already tracked as V-bluehole-opening-decision).
5. Phone site list: sheet hides the globe, so the globe is not discoverable as the picker. `phone-beebe-vent-field-03-site-list.png`. Fix: start the sheet at half height or show pins on the visible sliver.
6. Debrief "More" link and the pause menu's lone "Surface and debrief" half-row are unlabelled/odd. `phone-beebe-vent-field-08-debrief.png`, `phone-beebe-vent-field-07-pause.png`. Fix: rename "More" to what it opens; make Surface full width.

Dead ends: none found; every screen had a way forward.
