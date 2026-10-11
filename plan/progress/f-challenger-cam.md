# F-CHALLENGER-CAM: Challenger opening camera and touch briefing

Two fixes for the Challenger Deep opening, found in the 2026-10-11 captures.

## 1. Opening camera (Challenger only)

- Symptom: on portrait phones the chase camera put the hull directly over the
  Leggo lander, so the lander sat under the hull with almost no clearance.
- Change: `src/core/config/deepOpenings.ts`, `challenger-deep.opening.portraitChaseOffset`
  from `{ x: 0, y: -38 }` to `{ x: -28, y: -10 }`, the desktop lateral framing.
  The hull sits right of centre and the lander shows clear on its left.
  Endurance and the desktop/landscape framing are unchanged.
- Tests: `tests/unit/challengerPortrait.test.ts` asserted a centred, exactly level hull for
  every site. For `challenger-deep` only, the centring check is now "the lander's screen
  centre is in frame and clear of the hull's screen span", and the exact port/starboard level
  check is skipped (an off-axis view differs by about a pixel). Other sites keep both checks.
- Tried and dropped: a yaw offset of 20 deg. It cleared the lander but broke the
  "opening faces its hero" check (`tests/unit/deepOpening.test.ts`, dot > 0.98).
- Shots (under `.cache/codex/shots/f-challenger-cam/`, git-ignored):
  `base-mission-1.png` (before; portrait mission shot in `.cache/golden/2026-10-11-102417/`),
  `try1-portrait-mission-1.png` (after, portrait 390x844).

## 2. Touch briefing clipping (short landscape)

- Symptom: on 844x390 the sticky Dive settings/Begin footer covered objectives 3-5
  and the top of the facts column. Only the first two or three objectives were readable.
- Change: `src/styles/predive.css`, one scoped rule at the end of the file,
  `@media (max-height: 500px) and (orientation: landscape)`, sets
  `.briefing .briefing-actions { position: static; }`. The card scrolls as one, so
  the objectives list reads in full. Portrait is unchanged.
- Shots: `brief-before-landscape.png` and `brief-after-landscape.png`.
- Not changed: scan card, tutorial strip, touch HUD chip (owned by another agent).

## Checks

- Gates: `PW_PORT=4712 tools/gates.sh` (see final report).
- Golden shots: `tools/golden-shots.mjs` with `GOLDEN_SITES=challenger-deep`,
  `GOLDEN_MODE=mission`, `GOLDEN_LAYOUTS=portrait,landscape`, `GOLDEN_PORT` set.
