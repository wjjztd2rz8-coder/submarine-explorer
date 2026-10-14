# V-rewards-look: visual review of the S-rewards cosmetics

Shots: `.cache/codex/shots/V-rewards-look/before/` (as merged) and `after/` (this branch), phone portrait 390x844 touch and desktop 1600x900, high tier, Blake mission. Contents: Journal front page and picker (default, all choices selected), every paint, every decal (side view), photo mode and Journal photo grid/viewer for each frame; `*-paints-sheet.png` and `*-decals-sheet.png` are contact sheets.

## Findings (before)

- Picker: four native selects with no preview. Text sat at the top of its 44 px box (inherited `align-items: baseline` on a select), the intro paragraph was two lines of static text, and nothing showed progress toward the next unlock. Tap targets were already >= 44 px and nothing overflowed.
- Paints: all eight read as intended on Class A and B hulls. Gold was khaki/olive under water light (swatch and hull disagreed); silver is close to stock but the blue accent separates it. No muddy or garish colours otherwise.
- Decals: Explorer and Finder (and the stock name) are legible on the pontoon side at normal chase distance and in photo orbit; no change needed. Low tier omits them by design.
- Frames: the frame is baked correctly and gold/white both look fine in the viewer, but the Journal grid thumbnail used `object-fit: cover`, which cropped the frame to two bars (top/bottom on desktop, left/right on phone portrait photos).
- Phone photo viewer: "Download" wrapped to "Downloa/d" in a three-button row.
- Photo mode (phone, found while capturing): the top panel was shrunk to half the screen width (absolute `left: 50%`), wrapping the caption to four lines, and the "Saved to Journal" toast overlapped it.

## Fixes

- Picker rows: a round swatch beside each select shows the current choice (paint, lamp, frame colour; hollow ring for none/decal), updated on change. Select text vertically centred. The intro paragraph became one line, "N discoveries · next unlock at M · applies next dive" (less text, and shows progress). Reuses `jr-group`, `jr-nav-item`, `jr-empty`; two small new rules in journal.css.
- Gold paint is a richer #e2b23c (swatch matches). The gold photo frame stays #d4b46b (unit test guards it).
- Journal photo cards: `object-fit: contain` so frames are never cropped. Photo actions wrap and never break words.
- Photo mode: the top panel sizes to its content and holds the toast in normal flow, replacing the absolutely positioned toast (net simpler; no offsets).

Net simpler: the toast's absolute offset and nowrap/max-width rules are gone; one paragraph of picker copy replaced by one computed line.

## Verdict

Before: functional but flat, with a cropped frame, a broken button label and a phone photo-mode overlap. After: readable, phone-OK (controls >= 44 px, no overflow), the picker shows what you have and what is next. Paints and decals needed only the gold nudge. Locked choices are still explained inside the dropdown ("Red · 3 discoveries"); native dropdowns are not screenshottable, and stay because tests and accessibility rely on selects.

## Gates

`PW_PORT=4610 tools/gates.sh`: see the result appended below. No snapshots re-baselined and no assertions changed. Temporary capture spec was not kept (not a capability test).
