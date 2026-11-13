# U-play-flow-recheck (DIRECTOR item 35)

Read-only review of the newest e2e capture set. Gates not run, no code edited, not committed.

Evidence set: `.cache/codex/shots/journeys/round-1/great-blue-hole-390x844/` (captured 2026-11-13T15:11Z, sha 5eb56129, clean build, phone portrait, Low tier, touch). Landscape `great-blue-hole-844x390/` and desktop `great-blue-hole-1280x720/` checked for the same screens. Paths below are relative to the `shots/` folder above.

## Confusions a casual phone player would hit

1. **Home is dense with mode jargon.** Eight buttons plus an Arcade/Realistic/Advanced toggle, with "Free dive", "Dive sites", "Your sub" and "Advanced" all competing. The hero says "Titanic dive · Next dive" before the player has chosen anything. `390x844/...-01-home.png`
2. **Pre-filled dive is a 3,800 m site.** The primary CTA reads "Dive: Titanic dive" with no depth context for a first-time player. `390x844/...-01-home.png`
3. **Site list gives unexplained numbers.** Each row shows "3,800 m · Rated to 6,500 m" and "Recommended first dive" with no meaning for "Rated". The list is also cut off mid-row at the bottom with no scroll cue. `390x844/...-03-pick-mission.png`
4. **Briefing uses hull-rating jargon.** "HULL Rated to 1,000 m" and "PRIMARY / OPTIONAL" tags with no explanation. The sub sits partly behind the card. `390x844/...-04-briefing.png`
5. **Mode helper text is abstract.** "Fast travel and waypoints. No battery limit or currents." does not say what Realistic changes for the player. `390x844/...-04-briefing.png`
6. **Two different back labels.** The pick screen says "Back to menu" and the briefing says "Back to home". `390x844/...-03-pick-mission.png`, `...-04-briefing.png`
7. **Dive start has unlabeled controls.** The joystick, RISE/SINK slider, SONAR and LIGHTS buttons, and the SCAN button give no first-time hint about what each does. The sonar tile is tiny and unlabelled. `390x844/...-05-dive-start.png`
8. **Scan prompt is a small tooltip.** "SCAN TARGET / Hold SCAN" sits in a thin strip with a tiny "43 m" ring that is hard to read. `390x844/...-06-scan-ready.png`
9. **Toast reads like an instruction it does not explain.** "New Journal entry ... · TURN 111° STARBOARD" uses compass degrees and an "OK" circle with no meaning. It covers the top of the HUD. `390x844/...-07-first-scan.png`, `...-08-first-scan-next-frame.png`, and "Eastern atoll drop-off · TURN 91° PORT" at `844x390/...-` and `390x844/...-11-second-scan.png`
10. **Unlabelled edge arrow and checkmark.** A cyan arrow at the right edge and a floating tick over the rock have no legend. `390x844/...-08-first-scan-next-frame.png`
11. **Journal entries are text walls.** The entry is a title, a "RECREATION" tag, a long paragraph, a data table ("Anoxic layer", "Formed during", "SOURCES") and a long citation list, all on one phone screen. `390x844/...-09-journal.png`, `...-13-second-journal.png`
12. **Stray translucent box on journal art.** A pale blue rectangle sits over the lower-right of the photo and over body text ("limestone"). This looks like a render or overlay artifact. `390x844/...-09-journal.png`, `...-13-second-journal.png`
13. **Debrief star rating is unexplained.** "★☆☆ 2 scans 2 of 2 primary objectives" never says what stars mean. "Finish the optional objectives for 2 stars; some are a long transit away" is the only guidance. `390x844/...-14-debrief.png`
14. **Debrief CTA mismatch.** The debrief has a primary "Dive sites" button, while the player has just finished a dive. The "Keep exploring / Journal / More options" row is small and low-contrast. `390x844/...-14-debrief.png`, `1280x720/...-14-debrief.png`
15. **Site name changes between screens.** The debrief header says "GREAT BLUE HOLE: LIGHTHOUSE REEF" while the journal header says "Lighthouse Reef / Great Blue Hole". `390x844/...-09-journal.png`, `...-14-debrief.png`
16. **Settings panel bleeds into Home.** Background text ("Explore the real deep", the mode tags) shows through the panel. Labels such as "Sonar relief", "Hull warning: Both" and "UI scale 105%" need context, and the Master volume row is clipped at the bottom. `390x844/...-02-settings-aa.png`

## Summary for item 28

Highest-value fixes for a casual player are items 3, 4, 7, 8, 11, 13 and 16. Item 12 looks like a bug, not a copy problem.
