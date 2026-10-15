# 2100 — S-bughunt, seventh pass

## Plan

Two rounds of save/progression auditing. Reproduce each bug with a failing unit
test, make the smallest fix, then verify reload behavior and the surrounding
capability suites. No visual changes or new settings.

## Round 1 — reset and photo storage

- Reproduced controls reset importing an old v1 remap on the next launch when
  removing the legacy key throws after v3 was already removed. Reset now saves
  v3 defaults if cleanup throws or silently leaves a supported key behind.
  Successful cleanup still removes all three keys; future saves stay protected.
- Reproduced photo capture/deletion reporting success when storage silently
  ignores a write. Both operations now verify the stored bytes before replacing
  the in-memory gallery. Failed verification does not evict photos. Existing
  quota errors still evict oldest photos only until a capture fits.
- Before fixes: two new regression tests failed, 57 existing tests passed.
  After fixes: all 59 tests in the photo/control suites passed. Added coverage
  for silent legacy-key removal failures afterward.

## Round 2 — migration and date boundaries

- Reproduced malformed settings version fields (`"3"`, `null`, `-1`) hiding
  valid v2 quality/mode choices, and a malformed intermediate v2 hiding v1.
  Recovery now skips unsupported malformed versions while still protecting
  numeric future versions. Legacy bytes remain unchanged.
- Before fix: four new cases failed, 31 existing settings tests passed.
  After fix: settings plus save-soak suites passed all 99 tests.
- Added UTC streak checks around spring/fall DST (23/25 hours between local
  times), leap day, month/year transitions, duplicate and older completions.
  Existing daily completion tests cover finishing after UTC midnight and reject
  future seeds and aborted/incomplete dives.
- Reviewed reward/cosmetic migration, Journal corruption/quota handling, fresh
  stores, and independent resets against the existing capability tests.

## Verification

- Build/typecheck passed using a locally bundled Vite configuration and the
  native loader (the repository's documented writable-config approach).
  `--configLoader runner` builds hit the existing PWA plugin's late-import
  `Vite module runner has been closed` error, so the native build was used.
- Focused regression coverage: **318 passed across 16 suites**, including
  settings/controls, photo quota/corruption, save soak, Daily boot/completion,
  streaks, reward/cosmetic migration, Journal storage, onboarding and resets.
- Python: **162 passed, 4 failed**. All four failures are build-manifest tests
  blocked by `spawnSync git EPERM` in this sandbox.
- Browser validation attempted for settings, progression, modes, photos,
  Journal/debrief and save soak. Preview cannot bind `127.0.0.1:4217`
  (`listen EPERM`), so no browser tests or screenshots could run.
- Full unit run: the quiet reporter emitted no test results for several minutes
  before interruption. A verbose retry confirmed progress through unrelated
  terrain/geometry audits: **850 passing tests, no failures reported**, before
  the 120-second retry limit (exit 124). This is not a full-suite pass.
- Content validation, attribution, Prettier on all changed files, and
  `git diff --check` passed. Temporary build/config artifacts were removed.
