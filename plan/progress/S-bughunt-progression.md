# S-bughunt-progression

Scope: protect casual return visits across progression, Journal persistence,
mission completion and save migration. Keep production fixes generic and minimal;
extend tests by capability, with no new player-facing surfaces.

## Plan

1. Trace settings/progress/discovery saves, legacy backfill, Journal unlocks,
   scanner repeat handling and the mission/debrief lifecycle.
2. Round one: mutation-fuzz supported save versions with missing, malformed and
   extra fields; check preserved evidence, reload stability and future-save protection.
3. Round two: exercise mission and objective permutations, repeated scans and
   reloads during a partial scan. Fix only reproduced defects.
4. Search relevant browser specs, run focused Playwright checks, then run
   `tools/gates.sh` and record the results.

## Findings and validation

Two audit rounds completed. No production defect reproduced in the requested
scenarios, so no production code, schemas, settings or UI were changed. The
change extends three existing capability test files; there are no new package
specs, site branches or runtime abstractions.

Read `Save`/`ProgressSave`, `Progress`, `ProgressMigration`, `DiscoveryStore`,
`PhotoStore`, `Scanner`, `Discovery`, `Mission`, `MissionRouter`, `JournalData`,
`Journal` and the application systems wiring progression, missions and Journal.
Existing contracts deliberately restart the current mission on reload while
keeping completed discoveries in the Journal. Repeated scans remain available
on the fresh run; persistent discoveries do not auto-complete it.

### Round one: save mutation fuzzing

`tests/unit/saveSoak.test.ts` now exhaustively mutates one field at a time,
with omitted fields, nulls, wrong types, negative/fractional numbers and unknown
extension fields. Cases are deterministic and need no random seed:

- 320 progress mutations across unversioned, v0, v1 and v2 saves. Intact rewards,
  ratings, retired upgrades, cosmetic grants/selections, streaks and frozen
  migration evidence survive two successive write/reload cycles. Intact star
  tokens recover a damaged rating map. Unrelated storage remains untouched.
- 72 discovery metadata mutations across unversioned, v0 and v1 saves. Journal
  keys, first timestamps, aggregate counts and rescans survive repeated reloads.
  Existing soak tests also cover old array/map schemas, future-version byte
  protection, inaccessible storage and serialized legacy runtime fixtures.

All mutations passed; no sanitizer or migration change was justified.

### Round two: mission order, repeats and reload

- `tests/unit/progress.test.ts`: all six orders of three generic missions through
  the production progression event listeners. Complete runs, reduced return
  runs and fully scanned aborted replays preserve best ratings, isolated reward
  identities and zero duplicate earnings across reloads after every mission.
- `tests/unit/missionCore.test.ts`: all six objective orders, including optional
  objectives first, repeated scan events, early debriefs and resumes. Completion
  events fire once, scans during debrief do not count, and every order can finish.
- Expanded the existing scanner/mission reload test to all six orders: save one
  complete scan and half of another, reconstruct the mission/scanner/store,
  rescan the logged target, then finish the mission. Journal timestamps persist,
  the interrupted scan does not become a discovery, held scans do not duplicate
  records, and already logged targets cannot block the fresh run.

### Speculative observations, left unchanged

- `Mission` matches scan events by POI id. A foreign-site event with a reused id
  could affect it on an artificially shared bus. The application has one active
  mission per dive and disposes it when leaving; no normal-play reproduction was
  found. No speculative cross-site guard was added.
- Concurrent writes from separate tabs were not exercised. These tests cover
  sequential reloads and interrupted per-collection writes, not simultaneous
  multi-tab conflict resolution. No data-loss claim or storage redesign follows
  from this untested possibility.

### Executed checks

- Focused changed capabilities: **3 files / 142 tests passed**:
  `npx vitest run --configLoader runner --cache=false tests/unit/saveSoak.test.ts tests/unit/missionCore.test.ts tests/unit/progress.test.ts`.
- Related migration, discovery, Journal, router, scanner and settings coverage:
  **6 files / 327 tests passed** using the same runner options with
  `tests/unit/{progressMigration,gameDiscoveryStore,journalData,missionRouter,gameScanner,settingsSave}.test.ts`.
- TypeScript and production build: **passed**, using the gate's writable bundled
  Vite config and isolated `dist-progression` output. Default config loading first
  failed because shared `node_modules/.vite-temp` is read-only; the existing
  `GATES_CONFIG_MODE=writable` workflow handles this without repository changes.
  The first gate also found a wrong context type in the new test fixture; it was
  corrected and `npx tsc --noEmit` passed.
- Attribution and repository-wide Prettier checks: **passed**.
- Final `tools/gates.sh` result: **FAIL**, with these outcomes:

  | Check                                                                  | Result                                                                                                                                  |
  | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
  | Writable config, content, root build, attribution, repository Prettier | Pass                                                                                                                                    |
  | Full unit suite                                                        | Incomplete: reached the 120-second subprocess limit without a summary                                                                   |
  | Python                                                                 | 167 tests, five failures: four build-manifest tests report `spawnSync git EPERM`; golden tooling reports `Unexpected end of JSON input` |
  | Smoke e2e                                                              | Preview failed before tests executed                                                                                                    |
  | Project-base e2e                                                       | Base build passed; preview failed before tests executed                                                                                 |

The ordinary full gate was first allowed over nine minutes in its unit phase
without producing a summary, then interrupted. A separate verbose full-unit
attempt showed passing tests in the geometry-heavy suite, but was also stopped
without a final summary. No full-suite pass is claimed. To let the remaining
gate checks complete, the final invocation bounded only the unit subprocess:

```sh
npm() {
  if [[ "${1:-}" == test ]]; then timeout 120s env npm "$@"
  else command npm "$@"; fi
}
export -f npm
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-progression PW_PORT=4267 bash tools/gates.sh
```

Final logs: `.cache/runs/20261104-081418-2-kh8FL1/`. The Python failure signatures
also appear in the earlier save-migration audit note; no tooling changes were
made for this item. The standard npm entrypoint independently passed the same
142 focused tests. The isolated build was removed after validation.

Searched `tests/e2e` for migration, legacy saves, mission completion, repeated
scans, Journal and reload coverage, then executed these focused checks against
the isolated build (with `GATES_CONFIG_MODE=writable`, `PW_OUTDIR=dist-progression`
and separate `PW_PORT` values):

```sh
npx playwright test tests/e2e/mission.spec.ts -g 'scan bow and stern -> banner -> surface -> debrief'
npx playwright test tests/e2e/f2-progress.spec.ts -g 'discoveries unlock Your sub cosmetics; photo bonus and best stars survive reload|old discoveries are credited before fitting a deep-mission vehicle'
npx playwright test tests/e2e/journal-debrief.spec.ts -g 'scan the bow, persist across reload, open the Journal|survives migration, a cosmetic edit and reload'
npx playwright test tests/e2e/f-save-soak.spec.ts -g 'four dives, mode switches, restarts and reloads preserve saves without scene leaks or errors'
```

All four invocations failed before executing tests: Playwright's preview process
could not start. The soak attempt with `DEBUG=pw:webserver` showed localhost
connections denied with `connect EPERM` on both `::1` and `127.0.0.1`. The full
`npm run test:e2e` invocation failed at the same startup boundary. No browser pass
or screenshot review is claimed. Outputs are under `.cache/progression-*-e2e`.
