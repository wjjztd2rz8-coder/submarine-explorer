# F-BUGHUNT-16 — free dive, Daily dive and mode switching

## Round 1 — routing and UTC completion

- Audited boot's saved-mode snapshot, Daily candidate filtering and seed capture,
  mission/free-dive navigation, dated ratings and streak persistence.
- Found: `tileUrl` retained `daily`, allowing boot to override a free-dive tile
  with today's Daily mission. It now removes the seed alongside `mission`.
  The navigation regression retains project-base, touch and tier assertions.
- Found: completing an already loaded Daily after UTC midnight earned stars but
  skipped its streak. Completion now credits the run's seeded date when it is
  no later than today. The existing streak reducer prevents duplicate and older
  completions from advancing the record. Boot still accepts only today's seed.
- Added completion regressions at midnight in UTC, UTC−5 and UTC+14, including
  persisted ratings/streaks, saved Arcade/Realistic choices and aborted runs.

## Round 2 — hull access and live state

- Audited progress gates/loadouts, hull fitting and safe starts, selector/globe
  access, settings migration/listeners, supply toggles, ROVs, Daily overrides and
  discovery/reward persistence. Arcade remains the default; Realistic research
  gates and next-dive hull fitting remain as implemented.
- Found: the power system checked depleted reserves even while Arcade disabled
  supplies, triggering an emergency ascent after a live mode switch. The ascent
  check now requires enabled supplies. Regressions cover both empty battery and
  empty oxygen, preserving reserves while disabled and restoring depletion on
  return to Realistic without duplicate emergency starts.
- Expanded actual-content hull tests from five hero sites to every catalogued
  mission (13): a fresh Arcade hull reaches every placed objective contact.
  Added all 14 downloaded tiles, including the synthetic tile, to free-dive
  hull checks: each fits a rating covering its deepest cell without research.
- Existing integration regressions cover safe deferred refits, briefing copy,
  deployed ROVs, live Daily light/current overrides, UTC card rollover, and
  discovery/sample/reward saves across both mode-switch directions. No further
  issue was found in those paths. Continue starts a new mission; pose and active
  mission state are not persisted by the existing application.

## Validation

- Before fixes, new tests failed on retained Daily URLs, post-midnight streaks
  and Arcade emergency ascent. After fixes, 71 targeted tests across nine files
  passed; expanded hull suite passes all 60 tests; TypeScript passes.
- `GATES_CONFIG_MODE=writable tools/gates.sh`: config, build, all 1,183 unit
  tests across 109 files, Python, content, attribution and Prettier PASS.
  Both browser gates stop before tests because their preview server cannot
  start. A `DEBUG=pw:webserver` diagnostic confirms this sandbox rejects
  localhost connections with `EPERM` on IPv4 and IPv6; browser gates remain
  unverified. The project-base build itself passes. Logs: `.cache/gates/`.
- Final completion regressions also check full preset restoration, future/older
  streak protection and incomplete dives; targeted rerun and formatting pass.
- Changes and reasons logged in `CHANGELOG.md`. No features or options removed.
