# R-debrief-frozen-red

## What changed

- `tests/e2e/journal-debrief.spec.ts` (frozen debrief and resume, resume step): the desktop checklist check no longer expects `.objectives-panel` visible after every resume. It now asserts the capability: hidden when no objective is complete (zero-scan pass), visible after the first scan (one-scan pass). Phones are still unchecked, as before (they name the objective in the guidance slot).
- Cause: U-dive-start-hud (commit 516dda8a) makes `MissionRouter.showPanel` show the panel only when `counts().completed > 0`. The zero-scan pass therefore resumes with the panel hidden, and the test's unconditional `toBeVisible` failed. Game code is correct; no game change.
- `plan/DIRECTOR.md`: prettier-only fix to the `4b.` line (3-space indent from d2e96b59) that made the prettier gate fail on this branch. Whitespace only.

## CI check (run 41412499549)

Shards 4 and 5 show no frozen-debrief failures. Other red specs, not fixed here:

- shard 4: `content-missions.spec.ts:124` bismarck briefing to primary scans to debrief; `hud-touch.spec.ts:2045` surface HUD arcade (Blue Hole surface HUD, scan card and hints).
- shard 5: `f-a11y.spec.ts:299` completion banner AA contrast over Blue Hole water; `f-first-minute-620.spec.ts:280` animal in range named by scan card.

## Gates

- `PW_PORT=5871 npx playwright test tests/e2e/journal-debrief.spec.ts -g 'frozen debrief'`: 6 passed (before the fix, the 3 desktop tests failed at line 1144).
- `PW_PORT=5871 tools/gates.sh`: run before the prettier fix: python, content, build, unit, e2e, e2e-base, attribution PASS; prettier FAIL on `plan/DIRECTOR.md` (fixed above). Re-run result recorded below.
