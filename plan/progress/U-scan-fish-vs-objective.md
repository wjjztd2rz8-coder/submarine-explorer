# U-scan-fish-vs-objective

## What changed

- The scan lock already prefers an in-range, facing objective (Scanner.update). In the Blue Hole case the gallery was 125 m away and out of range, so the fish was the only legal target. No lock change was needed.
- `ScanView.lastCompleteSideFind` (Scanner.complete): true when an unscanned objective existed and the completed target was not it.
- `ScanOverlay.showComplete(..., sideFind)`: the same result card reads "Side find" (instead of "New Journal entry") and its detail line carries the objective direction cue ("TURN 98° PORT") on all devices. No new element; Discovery passes the flag from the scanner view.
- Tests: new capability test in `tests/unit/guidance.test.ts`; three existing `showComplete` call expectations gained the trailing `false`.
- CHANGELOG entry added.

## Gate

`PW_PORT=4871 tools/gates.sh`: all PASS (python, content, build, unit, e2e, e2e-base, attribution, prettier).

## Left

- No fresh screenshot taken: the change is card text only (kicker and detail). Worth a glance at the next Blue Hole walkthrough.
