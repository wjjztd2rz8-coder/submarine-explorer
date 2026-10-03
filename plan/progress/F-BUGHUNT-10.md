# F-BUGHUNT-10 — save/progress and modes interaction audit

2026-10-03. Focused fixes only; no refactor or save-key/version change. Followed
`plan/DIRECTOR.md`: Arcade has no depth gate, Realistic uses lifetime research,
and a loaded dive keeps its hull while live options change. No commit made.

## Found and fixed

1. **Best stars disappeared for supported content IDs.** The progress sanitizer
   accepted only lowercase letters/digits/hyphens, although content IDs also
   support uppercase and underscores (including the existing `_test` fixture).
   Ratings with object-property names also read inherited values or failed to
   save. Ratings now use own entries and preserve every valid folder ID through
   saving, purchases, lower-rated return dives and reloads.
2. **Damaged rating summaries lost stars despite an intact reward ledger.**
   Existing migration recovered RP from reward tokens but ignored the same
   evidence for best stars. Valid `rating:<site>/<1–3>` tokens now restore the
   maximum proven rating, preserving higher saved ratings and dated Daily
   ratings. Replaying the dive does not pay those tokens again. Invalid site
   paths and out-of-range star tokens do not restore ratings.
3. **Legacy animal discoveries did not supply the three-star bonus.** Legacy
   migration counted subject photos but missed the species-scan alternative.
   Completed surveys now count animal scans at their own landmark. A different
   site's scan does not increase the rating. Species rewards retain their global
   identity, and migration clears dive-local bonus/earnings afterwards.

Each fix has a CHANGELOG entry. Regression tests failed before production edits:
six failures in the two progress suites, captured in
`/tmp/f-bughunt-10-red.log`. All 24 tests in those suites pass after the fixes.

## Audited and verified

- Old settings unversioned/v0/v1/v2, discoveries and progress versions retain
  their existing migration paths. Future schemas remain protected, and denied
  storage retains the existing session behavior. No new schema was introduced.
- Fresh Arcade pilots at Titanic, Lost City, Great Blue Hole, Beebe vents and
  Monterey Canyon receive hulls rated to reach every placed mission contact.
  Five added integration tests use the actual mission/POI files and terrain,
  initialize the real progress/submarine systems and assert zero lifetime RP.
- Realistic deep links still fall back to a pressure-safe free dive with the
  research-entitled hull. Spending RP does not change lifetime hull entitlement.
- Existing integration tests exercise both mode directions during deep dives,
  free dives, briefings, deployed ROV operation and secret/sample scans. Loaded
  hulls, active Daily definitions, discoveries and idempotent rewards survive;
  next-load fitting observes the newly selected mode/research.
- Ratings are shared across modes by the existing best-site policy. Primary,
  secondary, bonus, aborted/incomplete, repeat-subject and return-dive checks
  remain covered. Daily primary/star rewards use their dated identity.
- Daily date/seed selection uses UTC and freezes the boot date across asynchronous
  loading; card rollover does not mutate the active dive. Same date/access set
  remains deterministic regardless of catalogue order.

## Deferred

- **Cosmetic unlocks:** class-specific livery variants/unlockable paint are not
  implemented (`plan/progress/F1-VEHICLES.md`); no cosmetic selection or save
  schema exists. Adding that feature exceeds this bug-fix audit. Vehicle models
  continue to follow the fitted hull.
- **Browser acceptance:** both browser gates stop before executing tests because
  the sandbox denies localhost listening. No browser or visual pass is claimed.

## Validation

- `PW_PORT=4297 tools/gates.sh`: **PASS build, unit, Python, strict content,
  attribution and Prettier**. Full unit suite: **97 files / 1,011 tests passed**,
  including 11 added regressions/audit checks. Both e2e and e2e-base fail at
  web-server startup before test execution; the project-base build passes.
  A direct Vite startup confirms `listen EPERM: operation not permitted
127.0.0.1:4297`. Logs are under `.cache/gates/`.
- Daily unit/boot/system suites: **15 tests pass in each process timezone**
  (`TZ=UTC`, `TZ=America/Chicago`, `TZ=Pacific/Kiritimati`), including catalogue
  order, UTC-midnight loading, mode access and active-dive rollover checks.
- Strict TypeScript passes in the build gate; `git diff --check` passes.
- The supplied node_modules symlink points to a read-only dependency tree.
  Checks used a temporary copy in
  `/tmp/f-bughunt-10-validation/node_modules`; the original link was restored
  afterwards. No package or lockfile changes.
