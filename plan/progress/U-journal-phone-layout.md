# U-journal-phone-layout (item 40; findings 11, 12, 15, 16)

## Changes

- **12, stray translucent box (cause found, no patch).** A DOM probe at the box's rect found no Journal element there. The box was the pause menu's hidden "Journal" button (`200,362`, 155x52): the Journal hid the menu it was opened from with `visibility: hidden`, but the menu stayed laid out under a `backdrop-filter` parent and still painted its button background over the art and text. Same position on Titanic and Great Blue Hole. `menus.css` now takes the covered Home and pause menus out of layout (`display: none`). Both Home and pause use one rule.
- **11, text wall.** A guide entry shows its lead paragraph, then one `Details and sources` disclosure holding the remaining paragraphs, the facts table and the sources. It is collapsed on a phone and open on desktop (two-pane reader has room). Life and species entries use the same disclosure (species keeps its three-row table visible). `renderAbout` (site page) now shares the same `disclosure()` helper, and the facts table is built by one `factsTable()` instead of three copies. The one `Recreation` tag is unchanged.
- **15, one site name.** The debrief kicker used the mission title ("Great Blue Hole: Lighthouse Reef", "Titanic dive"); the Journal used the guide/catalogue name. `Discovery.siteName` (guide title, else catalogue name, else id) is now what both show, and `MissionRouter` reads it instead of `route.def.title`. Debrief kicker is now "RMS TITANIC" / "LIGHTHOUSE REEF / GREAT BLUE HOLE"; the `mission.spec` kicker assertion was updated.
- **16, settings bleed.** `--b1-panel-solid` was `rgba(6,14,18,0.9)` despite its name, so Home text showed through every panel that uses it (Settings, globe panels, phone Journal). It is now opaque `#060e12`. The Settings panel's top padding moved into the sticky header so scrolled rows no longer peek above the title.

Net: Journal.ts is shorter (shared `disclosure()` and `factsTable()`), no new element, no new CSS rule, one CSS hack comment replaced by a cause.

## Screenshots reviewed (390x844 and 844x390, Great Blue Hole journey, Low tier, touch)

- `09-journal` 390x844: image, one lead paragraph, a collapsed "Details and sources" row. No box. Reads in one screen.
- `09-journal` 844x390: lead paragraph and summary row fit the short screen; the image is wide but acceptable.
- `14-debrief` 390x844: kicker matches the Journal header.
- `02-settings-aa` 390x844: no Home text through the panel; header no longer shows rows above it.
- Not re-reviewed: 844x390 settings, and a Titanic entry with a long multi-paragraph body expanded.

## Honest rating

Journal entry and box fix: 4.5 (cause removed, text wall gone; the summary row is plain and the empty space under it on a tall phone is plain). Settings: 4 (opaque, but the "Sonar relief / Hull warning / UI scale" labels still lack context and Master volume sits at the scroll edge; out of scope here). Site name: 4.5.

## Gates

`tools/gates.sh` (PW_PORT=4392) green: python, content, build, unit, e2e smoke, e2e-base, attribution. Relevant specs (journal-debrief, mission, settings, d-shell): 86 passed, 31 failed. None is caused by this change. Re-ran on the commit before this one: `journey 390x844 great-blue-hole` and `summary and Journal 390x844 great-blue-hole` fail there too. The failures are the item 41 debrief assertions (`.debrief-next` count 2 from the new stars line, primary is `dive-again`) and a pause-button tap that does not open the pause menu in the opening-to-debrief journey (a "Get closer to scan" card with Skip is on screen). `d-shell` Back and Forward failed once under load and passed alone. Left for the owners of those items so their fixes do not conflict.
