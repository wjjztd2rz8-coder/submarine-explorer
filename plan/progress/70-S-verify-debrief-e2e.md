# S-verify — 2026-10-28

Audit: 4e084c5e, HEAD 146a7da5; `ROUNDS=2`.

## Ranked findings

1. **P2: incomplete gate evidence.** Orchestrator reports **PASS python/content/build**. Saved `20261028-080522-4003918-1ej7jj/unit.log` ends after 35 completed files, without failure/completion summary; no e2e log exists. No gate root cause is established. Earlier sandbox commands below exited before assertions (`listen EPERM`): **0 passed, 22 unexecuted**. Failure output requested.

   ```bash
   export CI=1 ROUNDS=2 GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-verify
   PW_PORT=4291 npx playwright test tests/e2e/mission.spec.ts tests/e2e/journal-debrief.spec.ts -g 'scan bow and stern|primaries complete -> keep exploring -> secondary|Home from the debrief|summary and Journal.*titanic:' --retries=0
   PW_PORT=4292 npx playwright test tests/e2e/content-missions.spec.ts tests/e2e/d-modes.spec.ts tests/e2e/mission.spec.ts tests/e2e/d-power.spec.ts -g 'briefing to primary scans to debrief|Arcade, Realistic and Custom apply live|crush depth|Arcade hides supplies' --retries=0
   ```

2. **P3: obsolete weights — fixed.** Removed four entries for deleted `hud-attribution.spec.ts`. Reproduce pre-fix: `git show HEAD:tools/e2e-timings.json` versus `rg --files tests/e2e`. Discovery confirms 853 cases; all 38 shard assignments/costs are unchanged, with each case selected exactly once. Remaining weight sources/fallbacks exist; no retired site found.

3. **P3: Realistic coverage gap.** Read `tests/e2e/d-modes.spec.ts`: mode switching covers a free dive, without asserting the debrief metric.

## Objective audit and validation

`showDebrief()` shares one `primaryCounts()` result between heading and metric. Combined counts serve banners/events. Abort subtitles remain consumed; no dead subtitle or stale debrief expectation found. Arcade/Realistic share this path statically.

All thirteen missions have optionals. Four router cases cover zero/one optional, unfinished/completed primary, two reopen rounds. Re-executed units: **219 passed across seven files**. Typecheck previously passed; formatting/diff checks passed. Only tests/report/shard weights changed; assertions preserved. No merge/push/tag or DIRECTOR edits.
