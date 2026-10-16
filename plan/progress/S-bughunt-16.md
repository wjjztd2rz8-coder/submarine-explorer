# S-bughunt-16

Scope: DIRECTOR.md item 10. Reviewed `git log --since="24 hours ago"`
at HEAD `4ac96b6` on 2026-10-16, excluding log/progress-only changes.
Read `plan/DIRECTOR.md` and `CONTRIBUTING-AGENTS.md`.

## Review and small fixes

- **Journal access after a wildlife-first scan:** an animal entry unlocked but
  its site stayed locked, hiding the site's rows on phones and claiming no scans
  were logged. Include authored wildlife entries in the existing site unlock
  check. `journalData.test.ts` now checks the first scan, overview access,
  persistence/reload, and isolation from another site's scan.
- **Gradual sonar pinch:** every pointer move reset the pinch baseline before
  checking the zoom threshold. A sequence of one-pixel moves could never zoom.
  Keep the baseline until a sonar zoom step occurs, using the existing gesture
  reset behavior. `touchControlsAudit.test.ts` checks gradual expansion,
  reversal, a new finger pair, and no camera look/zoom leaking from sonar mode.
- Both added regressions failed before the source fixes: 2 failed / 44 passed
  (`/tmp/S-bughunt-16-before.log`). After fixes, 7 focused suites / 184 tests pass
  (`/tmp/S-bughunt-16-focused.log`).
- Audited settings legacy fallback and malformed/future versions, tier selection
  precedence and reload persistence, bounded frame samples/resume gaps, touch
  interruptions, Journal grouping, and legacy reward retries against the existing
  capability suites. The two small defects predate this day's patches but sit in
  the recently touched implementations; no newly introduced regression is claimed.

Simplicity: existing Journal and sonar surfaces only; no new setting, UI element,
site branch, dependency, save key, schema or tuning value. Extended capability
specs; no package-named spec or historical code comment.

## Larger finding — left unfixed

**Legacy retry does not freeze discovery evidence within a pending site.**
`src/game/ProgressMigration.ts` persists only site IDs in `legacyPending`.
On retry it derives objective completion and animal/photo bonuses from the latest
stores, so modern scans at that same site can be mistaken for an old completed
route and earn stars even after an aborted dive. Existing retry coverage protects
new site IDs, but does not protect new evidence inside an already pending site.

Reproduced with a temporary capability test, preserved at
`/tmp/S-bughunt-16-legacyCreditBoundary.test.ts`; failing output:
`/tmp/S-bughunt-16-legacy-repro.log` (expected 0 stars, received 2).
To rerun, copy that file into `tests/unit/legacyCreditBoundary.test.ts` and run
Vitest with `--configLoader runner --cache=false --pool=threads` for that file.
The temporary failing spec was removed from the normal suite.

Reproduction:

1. Persist an old discovery `old/a`; the old mission requires scans `a` and `b`.
2. Run legacy credit while mission content is offline; `old` remains pending.
3. Record `old/b` on a later dive, then abort with primaries incomplete.
4. Reload both discovery and progress stores; retry legacy credit online.
5. The retry awards 2 stars from combined discoveries instead of retaining 0.

A complete fix needs an immutable legacy evidence boundary (including photos and
wildlife) across reloads, migration of existing pending records, and a decision
for records whose original evidence is already lost. Leave this for a separate
Director backlog decision. Acceptance: retries cannot use post-boundary records
at the same site, while genuine old completions and cosmetics remain credited.

## Validation

- Ran `GATES_CONFIG_MODE=writable PW_PORT=4320 bash tools/gates.sh --full-e2e`.
  Logs: `/tmp/S-bughunt-16-gates.log` and
  `.cache/runs/20261016-101513-3-w0XdgS/`.
- PASS: strict content validation and production build (including TypeScript).
- PASS: repository-wide Prettier, attribution and `git diff --check`.
  Logs: `/tmp/S-bughunt-16-prettier.log`, `/tmp/S-bughunt-16-attribution.log`.
- Python: 161/166 pass. Four unchanged build-manifest cases fail at
  `spawnSync git EPERM`. The fifth failure is the unchanged golden comparison
  CLI test (`tools/tests/golden-manifest.test.mjs:151`): parsing empty report
  stdout raises `Unexpected end of JSON input`. An isolated rerun reproduces
  that fifth failure; its cause remains unresolved. No assertions were weakened.
  Logs: the gate run's `python.log` and
  `/tmp/S-bughunt-16-golden-isolation.log`.
- Full Playwright attempted on the isolated production output (port 4321),
  including a retry using writable config loading. Its owned preview fails to
  start, before any browser assertions. A direct preview with the gate's native
  config reproduces `listen EPERM: operation not permitted 127.0.0.1:4321`.
  Logs: `/tmp/S-bughunt-16-e2e-full-writable.log` and
  `/tmp/S-bughunt-16-preview-native.log`. No browser/device pass is claimed.
- PASS: full unit gate, **192 files / 2,695 tests**, 532.99 seconds. Log:
  `.cache/runs/20261016-101513-3-w0XdgS/unit.log`.
- The gates completed with exit 1: Python and both browser gates failed; all
  other gates passed. The project-base build also passed before its preview
  server failed to start. These failures remain outstanding.
- PASS: independent thread-pool full unit run, **192 files / 2,695 tests**,
  520.12 seconds. Log: `/tmp/S-bughunt-16-unit-threads.log`.

Implementation and review are complete. Changes are uncommitted. The larger
migration finding is intentionally unfixed; unrestricted gate confirmation and
investigation of the golden CLI test failure remain necessary.
