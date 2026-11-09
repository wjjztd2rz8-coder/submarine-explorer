# S-verify-side-find-guidance

2026-11-09 — verification over merged U-scan-fish-vs-objective.

## Findings

No confirmed scanner defect in either review round; no runtime fix was needed.

- Round 1 traced the frame order: `scan.discovery` installs a live mission resolver before `Discovery.update()` calls the scanner. `Scanner.update()` resolves the objective before candidate selection and lock retention. Completion refreshes it again after synchronous mission listeners, so the next objective is available for the same frame's guidance.
- Round 2 exercised changing the resolver between frames and during a hold. Fixed POIs keep an eligible active scan; wildlife and curiosity targets yield immediately to the newly eligible objective. After release, the next hold selects the new objective with fresh progress. Cleared, unknown, and already-scanned objectives resolve to null before retention and do not misclassify a wildlife completion as a side find.
- Existing tests also cover objective range/facing failures, interrupted progress/decay, and completion listeners advancing to the next objective. The added cases assert candidate, hint, active target, progress, recorded discovery, and side-find classification together.

## Changes and simplicity

Extended `tests/unit/gameScanner.test.ts` within its scanner capability group. Added a first-hold resolver timing test, shared held-scan coverage across fixed/wildlife/curiosity pools, and cleared/missing/logged resolver cases. Converted the existing fixed-lock/release test to a live resolver.

Cut the separate wildlife takeover test, whose behavior is included in the shared pool test with stronger progress and completion assertions. Logged that consolidation in CHANGELOG.md. Runtime code and state are unchanged: the merged removal of the cached objective identity remains intact. No new guidance surface, settings, site branches, package numbers in code, or production machinery.

## Validation

- `npx vitest run tests/unit/gameScanner.test.ts tests/unit/guidance.test.ts --configLoader runner --cache=false` — **210 passed**, two files.
- Searched `tests/e2e` for objective, scan lock, wildlife, and side-find coverage. Attempted both matching capability runs against the isolated build:
  - `GATES_CONFIG_MODE=writable PW_PORT=4880 PW_OUTDIR=.cache/verify-side-find-dist npx playwright test tests/e2e/d-scan.spec.ts -g 'side finds keep objective guidance|completion advances navigation' --output=.cache/verify-side-find-e2e`
  - `GATES_CONFIG_MODE=writable PW_PORT=4880 PW_OUTDIR=.cache/verify-side-find-dist npx playwright test tests/e2e/f2-life.spec.ts -g 'an animal can be scanned: banner, Journal wildlife entry, persistence' --output=.cache/verify-side-find-life-e2e`
- Both Playwright runs exit before tests execute because the configured preview cannot start. Direct preview confirms `listen EPERM: operation not permitted 127.0.0.1:4880`. Browser acceptance and screenshots remain unverified.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4879 PW_OUTDIR=.cache/verify-side-find-dist tools/gates.sh`. Interrupted the first run during the full unit suite without a summary. Restarted with an exported `npm` function applying `timeout 180s` and `--reporter=verbose` only to `npm test`; other gates run normally, with no repository gate or test configuration changes.
- Gate result: **FAIL**. Config, content, root build/typecheck, project-base build/typecheck, attribution, and repository-wide formatting passed. Python has five failures: four build-manifest tests report `spawnSync git EPERM`, and the golden-manifest comparison receives empty JSON. Root and project-base Playwright gates cannot start the preview. The unit gate reached the 180-second wrapper limit without an assertion failure logged; it did not produce a complete result.
- Re-ran the complete unit suite with a longer limit: `timeout 900s npm test -- --configLoader runner --cache=false --reporter=verbose` — **195 files, 4,669 tests passed**, exit 0 in 865.29 seconds. The earlier unit gate cutoff was too short for the suite, not an assertion failure. Log: `.cache/verify-side-find-full-unit.log`.
- Latest gate logs: `.cache/runs/20261109-084811-2-pS8vKR/`. Browser acceptance is still blocked; passing units do not replace it. Removed the isolated temporary browser build after verification.
