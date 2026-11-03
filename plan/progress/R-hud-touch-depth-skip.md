# R-hud-touch-depth-skip

Status 2026-11-03: done, on branch `claude/R-hud-touch-depth-skip`, not merged.

## Why

`U-tutorial-depth-skip` makes the tutorial skip the depth step (Space/Ctrl) when the next scan target is within `DEPTH_SKIP_M` (15 m) of the sub. Hosted CI failed `tests/e2e/hud-touch.spec.ts` where the specs still expected the depth step.

## Changed

- `tests/e2e/hud-touch.spec.ts`:
  - New helper `tutorialSteps(page)` returns the tutorial steps this pose will play. It drops `depth` when the next open objective's scan target is within `DEPTH_SKIP_M` of the sub's depth, using the same rule as `Tutorial.update()` (`src/game/Tutorial.ts`, `src/app/systems/onboard.ts`). It reuses the exported `DEPTH_SKIP_M` and `TUTORIAL_STEPS`.
  - The five loops that iterated `['move', 'depth', ...]` now iterate `tutorialSteps(page)`. Two of them filter out `scan` (the tutorial then ends on the remembered scan, as before).
  - No assertions removed or loosened: each step still checks `data-step`, and the depth step is still checked wherever the game shows it.
- The helper mirrors the one-line objective pick from `src/game/Mission.ts` rather than importing it: that module needs Vite's `import.meta.env`, and Playwright specs run in Node.

## Sites affected

Specs that failed on hosted CI before this change (reproduced locally):

- hero guidance sequence, `titanic 100%`, `lost-city 100%`, `monterey-canyon 100%` (opening, tutorial and hint keep contact and controls separate)
- catalog tutorial and reload, `lost-city` in all six viewports

## Commands

- `PW_PORT=4871 tools/gates.sh`: PASS (python, content, build, unit, e2e smoke, e2e-base, attribution, prettier), exit 0, run on the final code.
- `npx tsc --noEmit -p .`: PASS.
- `PW_PORT=4871 PW_OUTDIR=dist npx playwright test tests/e2e/hud-touch.spec.ts -g "(lost-city|titanic|monterey-canyon) 100%: opening, tutorial and hint keep contact"`: 3 passed.
- `... -g "catalog tutorial and reload.*(lost-city|titanic|monterey-canyon)"`: 18 passed.
- Before the change, the same catalog/hero filters showed 9 failures (lost-city catalog x6, hero titanic 360x640, lost-city 390x844, monterey-canyon 390x844), all at the depth-step expectation.

## Not run

- The full hud-touch spec file and `--full-e2e` were not run locally; hosted CI is the full-suite check.
