# U-scan-fish-vs-objective

## Evidence and remaining gap (2026-11-09)

Walkthrough evidence: `plan/progress/U-play-walkthrough-3.md`, desktop Blue Hole reward screenshot `desktop-great-blue-hole-09-reward.png`. At the time the gallery was 125 m away, outside scan range, so scanning the fish was legal and did not advance the two primary objectives.

Earlier work already added `ScanView.lastCompleteSideFind`, passed it through Discovery to the existing reward card, and let an eligible objective take the beam from an incidental scan mid-hold. This pass found a remaining gap: once the objective became the ready candidate during a side-find reward, the direction cue disappeared and the card reverted to Journal instructions. The new unit regression failed on both desktop and touch before the fix.

## What changed

- The side-find reward retains its objective detail when the objective becomes ready: `<objective> · HOLD G TO SCAN` on desktop, `<objective> · Hold SCAN` on touch. Approach directions still update, and starting a scan takes the slot immediately.
- Scanner selection and lock retention now use the resolved `view.objectiveId`. Removed the duplicate cached objective ID and replaced the nested ranking conditional with a direct objective-first comparison. Existing fixed-POI locks and incidental fallback behavior are preserved.
- Extended the existing guidance unit test and `tests/e2e/d-scan.spec.ts`. The browser scenario covers fish completion with zero primary progress, the side-find label and objective detail, objective readiness during that result, mid-hold handoff with both targets eligible, and primary progress after completing the objective. It runs at desktop, phone portrait and phone landscape sizes. Existing completion tests share the same real keyboard/touch hold helper.
- Simplicity: runtime source is net three lines shorter, with one fewer mutable field. The same guidance card carries results and the next action. No layout edits, site branches, settings changes or package numbers in code. The cut is recorded in CHANGELOG.md.

## Validation

- Focused unit tests: `npx vitest run tests/unit/gameScanner.test.ts tests/unit/guidance.test.ts --configLoader runner --cache=false` — **204 passed**.
- Searched `tests/e2e` for scan, wildlife, objective, lock and reward coverage. Attempted:
  - `GATES_CONFIG_MODE=writable PW_PORT=4872 PW_OUTDIR=.cache/scan-objective-dist npx playwright test tests/e2e/d-scan.spec.ts -g 'side finds keep objective guidance|opening guidance and phone directions|completion advances navigation'` (12 selected tests across three layouts).
  - `GATES_CONFIG_MODE=writable PW_PORT=4872 PW_OUTDIR=.cache/scan-objective-dist npx playwright test tests/e2e/f2-life.spec.ts -g 'an animal can be scanned: banner, Journal wildlife entry, persistence'`.
  - Both stop before executing tests because the preview server cannot bind localhost in this sandbox. Direct preview startup reports `listen EPERM: operation not permitted 127.0.0.1:4872`. Browser acceptance remains unverified.
- Gate command: `GATES_CONFIG_MODE=writable PW_PORT=4871 PW_OUTDIR=.cache/scan-objective-dist tools/gates.sh`. The first run was interrupted during the full unit suite after several minutes without a summary. A second run used an exported `npm` wrapper that applied `timeout 90s` and `--reporter=verbose` only to `npm test`, so later gates could finish. No test assertions or repository gate configuration were changed.
- Gate result: **FAIL**. Config, content, root build/typecheck, project-base build/typecheck, attribution and full-repository formatting passed. Python tooling has five failures: four build-manifest tests report `spawnSync git EPERM`, and the golden-manifest comparison test gets an empty JSON result. The full unit suite reached the 90-second limit with 998 passing cases logged and no test failures logged, but no final summary. Root and project-base browser checks fail at preview startup. These match the environment limits recorded in `plan/progress/S-dead-code-audit.md`; they are separate from the focused unit result above.
- Gate logs: `.cache/runs/20261109-075207-2-Da3nfD/`.

Earlier progress recorded an all-pass gate before this pass; the current results above supersede that acceptance claim for these edits.
