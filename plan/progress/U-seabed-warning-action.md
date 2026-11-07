# U-seabed-warning-action

Covers both the action wording and the flicker (U-seabed-warning-flicker in the walkthrough-4 note).

- Text: "SEABED CLOSE · <cue>". The cue is built once in `src/app/systems/hud.ts`: touch "RISE · SLIDER UP" (no key names), keyboard "HOLD <key> TO RISE" from the remapped binding, gamepad "PRESS <pad button> TO RISE".
- Hysteresis: `SeabedWarningLatch` in `src/ui/HUD.ts` wraps `seabedWarning`. Once on, it clears only after `seabedHoldS` (3 s) with no trigger AND altitude at or above `seabedClearAltitudeM` (25 m). Both in `Config.submarine`.
- Scan priority: while the scanner phase is not idle, the latched warning yields to the scan card unless the approach trigger (time to contact) is firing, i.e. hull contact is imminent.
- Tests: latch hold/clear and scan-priority unit tests in `tests/unit/uiHud.test.ts`; renamed text in the e2e comment and `tools/walkthrough-4.mjs`.
- Known tradeoff: a ready (not yet scanning) contact at 15-25 m altitude after a trigger keeps the warning until the sub rises past 25 m. No rule bent; nothing cut, so no CHANGELOG line.
- Not run: walkthrough-4 re-run.
