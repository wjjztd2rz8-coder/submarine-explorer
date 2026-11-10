# U-copy-fixes (backlog item 8, 2026-11-10)

Evidence: `plan/progress/U-retest-walkthrough-4.md`, items 1, 4, 5, 6, 7, 8. The walkthrough build was `cbafe783` (2026-11-07 00:34). Four fixes it lacked had already landed on this branch: `91f084ed` (Ctrl+W tip, one objective cue, touch and desktop scan prompt), `dd234849` (depth skip at 30 m; 15 m before, and the 22 m mission opening was never skipped), and `902f8e3c`. Items below say which were already done and which changed here.

## Per sub-item

1. **U-depth-card-level-approach: done (earlier, dd234849) plus a fix here.** The 30 m skip covers the 22 m mission opening. This branch also ends the depth step when a scan starts or drops on it (`Tutorial.notify`, `leaveDepth`), so the step card cannot come back after a dropped scan. `onboard.ts` now applies the advance that `scan:started` and `scan:aborted` return.
2. **U-scan-interrupt-cue: done here (partly).** The drop cue already exists ("BEAM OFF TARGET", "HOLD G TO RESUME", "SCAN INTERRUPTED"). The regression to STEP 2 is fixed by item 1. Skipped the "target changed" cue: when a scan switches target, the scanner emits an abort and starts the new target in the same frame, so no card would ever show it. Not a copy fix; left as is.
3. **U-side-find-clarity: done here.** The side-find result kicker reads "Side find - not the objective". Its detail names the objective still open ("Objective still open · <name>"), or the scan prompt when that objective is ready. It no longer shows the TURN cue on the result card. The objective line that follows, with its TURN cue, is unchanged.
4. **U-ctrl-tip-timing: done (earlier, 91f084ed).** The tip fires only on `ctrlKey && w`, once per browser.
5. **U-objective-two-cues: done (earlier, 91f084ed).** The objective line carries one cue (a turn, or a distance when the turn is small).
6. **U-scan-prompt-copy: done here.** Desktop reads "Hold G" and touch "Hold SCAN", with no "TO SCAN". Applied to the scan prompt and to the side-find objective prompt. The footer in `Discovery.ts` ("HOLD G NEAR A TARGET TO SCAN") and the "TO RESUME" lines are left alone; they are not in the walkthrough.

7. **Skipped, as the brief asked.** Result cards still carry the next objective on ordinary completions (existing tests pin this). Changing that would touch every result, so only side finds changed.

## Tests

- `tests/unit/f3Onboard.test.ts`: new case, a scan start or drop on the depth step ends the step and keeps the drop cue off the depth card.
- `tests/unit/guidance.test.ts`, `touchControlsAudit.test.ts`: copy and side-find expectations updated.
- `tests/e2e/` (d-input-hud, d-scan, f2-explore, journal-debrief, phone-accept): text expectations updated to the new copy.

## Gates

- `npx vitest run` (full unit suite), `npx prettier --write` on the changed files.
- `PW_PORT=5811 tools/gates.sh`: PASS on the final tree (python, content, build, unit, e2e smoke, e2e-base, attribution, prettier). The first run failed only on prettier for this note; fixed and rerun green.
- Unit suite: 196 files, 4,862 tests pass. Browser specs were run through the gate's smoke and project-base set only; the full e2e suite was not run here.

## Earlier pass (2026-11-07, 91f084ed and 39830258)

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
