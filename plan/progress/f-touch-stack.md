# f-touch-stack

Touch landscape HUD stack: less covering the subject, plus a "where next" cue.

## Changes

- `src/ui/ScanOverlay.ts`: new `.scan-objective-chip` (appended after the scan panel). On touch, when no scan card is showing and a mission objective exists, it reads `▸ <name> · <distance> m`. Uses the same objective fields as the scan card's OBJECTIVE guidance.
- `src/styles/hud-layout.css` (F-TOUCH-STACK block): chip styling (one line, small pill, in the scan stack column so it clears controls); hidden while a non-final tutorial step is showing. At landscape widths over 900 px the tutorial collapses to one line at its last step ("journal", after the first scan) and the scan stack moves up to 116 px. Phones up to 900 px wide already use the one-line bottom card, so they are unchanged.
- Tutorial text, steps and desktop behaviour are unchanged.
- `tests/e2e/f-touch-stack.spec.ts`: covers collapse (844x390, 667x375, 932x430) and the chip (no overlap with controls, at most 28 px tall).

## Screenshots (.cache/codex/shots/f-touch-stack/)

- 844x390 objective chip: single pill under Pause, clear of sonar, readouts and controls.
- 932x430 tutorial last step: one row, scan card below; the middle of the screen stays open.
- 844x390 tutorial last step: already a one-line card above the controls.

## Gates

`PW_PORT=4711 tools/gates.sh`: all green (build, unit, python, content, attribution, prettier, e2e smoke, e2e-base). A first run failed 3 unit tests that index the scan stack's children; the chip now follows the panel so those tests are unchanged.
