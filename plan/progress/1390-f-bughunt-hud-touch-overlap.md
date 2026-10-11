# 1390 — HUD/touch overlap bug hunt

Status: two chip visibility defects fixed; browser sweep blocked by the execution sandbox. No new screenshots or measured overlap results are claimed.

## Findings and fixes

- **Confirmed and fixed:** `ScanOverlay.setSuppressed(true)` hid the scan card and reticle but left an already-visible objective chip up until the next `update()`. Suppression now hides the chip synchronously.
- **Confirmed and fixed:** `ScanOverlay.showComplete()` could display the completion card alongside an already-visible objective chip until the next `update()`. Completion now hides the chip synchronously.
- Both defects were reproduced by two new unit tests before the fix (20 existing tests passed, 2 new tests failed). After the fix, all 22 tests in `touchControlsAudit.test.ts` pass. Existing assertions are unchanged. The added coverage also verifies contact entry/exit, completion-banner expiry, absent objectives and keyboard mode.
- **Needs browser confirmation:** portrait reward placement still uses `bottom: 232px`, while the tutorial docks above the actual controls. At 390×844 and default scale, the CSS control envelope gives a 194px tutorial offset; its minimum 56px card reaches 18px above the reward's bottom edge. Their horizontal spans coincide. This suggests an overlap during an early scan reward, but cannot be reported as a measured visual result here. No speculative CSS adjustment was made.
- The in-range chip path and tutorial persistence have intact implementations: `updateCard()` shows the panel when a contact is in range, then `updateChip()` hides the chip; onboarding saves `tutorialDone: true` when finishing/skipping and reads it on initialization. Their unit regressions pass; browser reload verification remains pending.

## Sweep coverage added

`tests/e2e/f-bughunt-hud-touch-overlap-1390.spec.ts` derives its site list from `data/landmarks/index.json`: 13 sites × 4 layouts = **52 discovered cases**. Layouts are touch at 844×390, 390×844 and 1280×720, plus keyboard at 1280×720.

Each case checks visible boxes for offscreen placement and pairwise overlaps between sonar, objectives, depth/oxygen readouts, attribution, scan card, objective chip, tutorial, contextual hint, reward notice, virtual stick, slider, buttons, Pause and desktop controls. The paused clock preserves transient rewards while measuring. The test uses real scan input (CDP touch on touch layouts), the actual mission target, scanner, discovery recorder and reward subscribers. It exercises:

1. Fresh opening and an in-range contact.
2. A completed scan during the movement step, followed by movement/depth/lights tutorial skips; the remembered scan leads straight to Journal.
3. Reward notice with the final tutorial step, and the final tutorial strip with an out-of-range chip.
4. Finished tutorial with chip/hint/reward; chip hides when returning to a scanned contact.
5. Reload without a tutorial override or re-seeding the onboarding record; the tutorial must remain hidden.

Screenshots are configured under `.cache/codex/shots/1390-f-bughunt-hud-touch-overlap/` for reward, Journal/chip and finished/chip states. They have **not** been generated in this run.

| Site                 | 844×390 touch | 390×844 touch | 1280×720 touch / keyboard |
| -------------------- | ------------- | ------------- | ------------------------- |
| Titanic              | Blocked       | Blocked       | Blocked                   |
| Challenger Deep      | Blocked       | Blocked       | Blocked                   |
| Lost City            | Blocked       | Blocked       | Blocked                   |
| Monterey Canyon      | Blocked       | Blocked       | Blocked                   |
| Endurance            | Blocked       | Blocked       | Blocked                   |
| Axial Seamount ASHES | Blocked       | Blocked       | Blocked                   |
| Hudson Canyon        | Blocked       | Blocked       | Blocked                   |
| Kamaʻehuakanaloa     | Blocked       | Blocked       | Blocked                   |
| Beebe Vent Field     | Blocked       | Blocked       | Blocked                   |
| Great Blue Hole      | Blocked       | Blocked       | Blocked                   |
| Bismarck             | Blocked       | Blocked       | Blocked                   |
| Hunga Tonga Caldera  | Blocked       | Blocked       | Blocked                   |
| Blake Plateau corals | Blocked       | Blocked       | Blocked                   |

## Validation

- Production build / strict TypeScript: passed, isolated `dist-1390` build with a writable bundled Vite config.
- Focused unit run: **7 files, 95 tests passed** (`touchControlsAudit`, `f3Onboard`, `gameScanner`, `tutorialCardDevice`, `onboardCompletion`, `progressScan`, `progressSystem`). Vitest used `--configLoader runner --cache=false --pool=threads --maxWorkers=1` to avoid writing to the shared dependency tree and restricted fork workers.
- Python: **156 tests passed**.
- Content: all 13 sites passed strict validation; attribution passed.
- Changed-file Prettier and `git diff --check`: passed.
- Playwright `--list`: **52 cases discovered**; spec compiles with strict TypeScript.
- Full unit suite: not verified (60-second attempts and an extended 180-second attempt timed out without reporting results). The focused seven-file run completed successfully. Full browser suite and package matrix: blocked.

The Browser skill's runtime returned `No browser is available`, and browser discovery returned an empty list. Playwright's preview server failed before any test could run: `listen EPERM: operation not permitted 127.0.0.1:4790`. A separate Chromium launch also failed with `sandbox_host_linux.cc:41 ... shutdown: Operation not permitted`. Approval policy is `never`, so this session cannot run the required browser checks outside the sandbox.

## Remaining acceptance

Run the matrix and existing assertions together in an environment that permits the local preview server and Chromium; inspect the new screenshots, resolve any measured portrait reward overlap, and rerun full gates. Example after building `dist-1390`:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4790 PW_OUTDIR=dist-1390 npx playwright test \
  tests/e2e/f-bughunt-hud-touch-overlap-1390.spec.ts \
  tests/e2e/f-touch-stack.spec.ts tests/e2e/f-hud-layout.spec.ts \
  tests/e2e/f-bughunt-15.spec.ts tests/e2e/f3-onboard.spec.ts
```

The existing `f-touch-stack` spec retains the 932×430 short-landscape coverage for the >900px tutorial collapse. The 1280×720 matrix adds taller touch and keyboard coverage without changing that assertion.
