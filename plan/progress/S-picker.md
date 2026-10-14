# S-picker: globe on every size, swipe-up site sheet on phones

## What changed

- Home "Dive sites" / "Free dive" on narrow screens (width < 960 px, except sideways phones): the globe fills the screen and the existing site list (`MissionSelect`, the one list component) is a bottom sheet over it. It starts collapsed (title and Back visible); a swipe up on the header or a tap on the grab bar opens it, a swipe down or a tap closes it. The grab bar is a real button with `aria-expanded`; the collapsed rows are `visibility: hidden` so Tab never lands on them.
- Desktop and sideways phones keep globe plus list side by side (unchanged).
- Removed: the "short or zoomed" rule that hid the globe below 360 px height (the side-by-side layout now holds there), and the old portrait stack (globe above list) in `home.css`. No new `@media` special cases: the sheet is the complement of the two existing layouts.
- Home.ts: +~35 lines (grab button, swipe handler). home.css net about -10 lines.
- Not removed: the in-dive overlay globe (`ctx.globe`, opened by the GLOBE button in the mission-select panel, `?globe=1`). It is a separate full-screen, frozen-game picker that the sheet does not cover, so it stays. There is only one list component; the overlay globe has no list of its own.

## Specs run (by capability, no new files)

- `f-title-layout` (home layout table across 7 viewports) gained: globe wrap at least 120 px, and where the grab bar shows, it opens the sheet and rows are inside the viewport.
- `globe-pins` touch test: rows hidden while collapsed, grab opens them; 44 px hit area assertion given 0.01 px layout tolerance (measured 43.999996).
- Run: f-title-layout, globe-pins, globe, d-shell (fails identically on main: menu button count), hud-touch (all but the "animal guidance" matrix, which fails on main).

## Screenshots reviewed (`.cache/codex/shots/picker/`)

`before-*` and `after-*`: portrait 390x844 (collapsed, open), landscape 844x390, tiny 640x320, desktop 1280x800. Nothing overlaps; text readable; the collapsed sheet peek leaves the globe centred above it.

## Open issues

- The globe card is still hidden on narrow screens (pin label and sheet row cover it); tapping a pin does not auto-open the sheet.
- Sideways phones do not use a sheet (side-by-side fits); revisit only if the owner wants one model everywhere.
- Device swipe feel verified with mouse-driven pointer events only, not a real phone.
