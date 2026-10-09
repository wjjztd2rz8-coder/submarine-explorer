# F-MONTEREY-PORTRAIT-HUD

Goal: uncluttered phone HUD at Monterey Canyon, no overlapping panels, sub readable.

## Findings (390x844, touch)

Reproduced with `GOLDEN_SITES=monterey GOLDEN_LAYOUTS=portrait node tools/golden-shots.mjs`
plus a bounding-box probe over free dive, mission, and mission with tutorial, each
with the Data credits closed and open.

- No panel overlaps. Stack: sonar (12,12 96x110), readouts (120,72/110 258x58),
  objectives (120,72 258x29, mission only), scan card (120,138/176 258x57), Data footer
  (12,140), pause (330,12), touch controls in the lower 170 px, tutorial card at y558.
- Open credits panel is placed by `layoutDataCredits` clear of every other panel.
- Sub is fully on screen (centre about 163,540), uncropped, and no panel covers its centre.
  The tutorial card (y558-614) touches the lowest edge of the hull but not the centre;
  existing `expectCompactPhoneHud` already guards the centre. The in-world scan reticle
  sits on the hull by design (aim point). No framing change made: sub is not clipped or hidden.
- The overlap noted in f-titanic-monterey.md no longer reproduces; earlier HUD work
  (f-hud-layout, phone compact HUD) already fixed it. No source change.

## Change

- New test `tests/e2e/f-monterey-portrait-hud.spec.ts`: asserts pairwise non-overlap,
  in-viewport bounds, and sub-not-covered for free dive and tutorial mission, credits closed
  and open. Existing assertions untouched.
- CHANGELOG entry.

## Screenshots

Before and after are identical (no source change):

- .cache/golden/2026-10-09-090115/monterey-canyon-portrait-{1,2,3}.png
- .cache/mph/before-free.png, before-mission.png, before-missionTut.png (probe, credits open)
