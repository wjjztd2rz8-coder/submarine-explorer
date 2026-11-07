# U-copy-fixes

Source: unaided walkthrough findings in `plan/progress/U-retest-walkthrough-4.md`, items 6, 7, 8.

## Changes

1. **U-ctrl-tip-timing.** The "Ctrl+W may close this tab" tip now shows only on Ctrl+W
   (`ctrlKey` plus `key` w), not on a plain Ctrl press. It keeps its one-time behaviour and
   the `subexplorer.tips.v1` storage flag. Code: `src/app/systems/pointer.ts`.
2. **U-scan-prompt-copy.** Touch scan prompt reads `Hold SCAN` (was `HOLD SCAN TO SCAN`).
   Desktop keeps `HOLD G TO SCAN`. Code: `src/ui/ScanOverlay.ts`; comment in `src/game/Guidance.ts`.
3. **U-objective-two-cues.** The objective line carries one action. A turn cue (10 degrees or
   more) replaces the distance; the distance shows only when no turn cue is needed. This now
   applies on desktop as well as touch, matching the nearest-contact branch. Dropped the touch-only
   `distance · turn` join. Still the existing guidance slot; no new HUD element.
   Code: `src/ui/ScanOverlay.ts`.

## Tests updated (expected strings only, no assertions loosened)

- `tests/unit/guidance.test.ts`, `tests/unit/touchControlsAudit.test.ts`: touch scan copy,
  turn-only objective lines.
- `tests/e2e/d-input-hud.spec.ts`: plain Ctrl shows no tip; Ctrl+W shows it.
- `tests/e2e/d-scan.spec.ts`: objective hint mirrors the turn-or-distance rule.
- `tests/e2e/phone-accept.spec.ts`, `tests/e2e/f-lowtier-followups.spec.ts`, `tests/e2e/hud-touch.spec.ts`:
  touch prompt is `Hold SCAN`.

## Gates (`PW_PORT=5861 tools/gates.sh`)

- PASS: python, content, build, unit, e2e (smoke), e2e-base, attribution.
- FAIL: prettier. The only flagged file is `plan/progress/V-monterey-wall-face.md`, which is on
  main and not touched by this branch. Left alone, out of scope.
- No vite preview left running by this item.

## Not done

- No new unit test for the Ctrl+W-only tip; coverage is the e2e spec in `d-input-hud.spec.ts`.
- No CHANGELOG entry: no feature was cut.
