# U-briefing-jargon

Replaced: hull "Class X - coastal / deep ocean" wording is gone from player text.

- Briefing HULL row now reads "Rated to 6,500 m" (src/game/MissionRouter.ts).
- Pick-site meta row reads "<depth> m · Rated to N m" (src/ui/MissionSelect.ts). Removed the
  doc.hull_class fallback ("Class B hull" / "Hull class unknown"); such rows now show only the depth.
- Removed `HullClass.name` from config (its only reader was the briefing). Vehicle `label`s in
  src/vehicles/hulls.ts are internal mesh labels, untouched.
- PRIMARY/OPTIONAL tag 9px -> 11px (mission.css). Mode caption and Advanced toggle were already 12px.
- Advanced already is a closed disclosure (button + hidden panel, aria-expanded) shared with Home;
  not re-implemented to avoid a briefing-only branch.
- Out of scope: HUD tile 'hull A 1000 m'.

Tests updated: overlayFocus.test.ts, arcadeLoadout.test.ts, e2e/d-shell.spec.ts.
Gates and screenshots: see end of file.

Gates: python/content/build/unit/e2e smoke/e2e-base/attribution all PASS; prettier passes after formatting this note.
Screenshots: not captured (no briefing journey run); layout change is one font-size and text only.
