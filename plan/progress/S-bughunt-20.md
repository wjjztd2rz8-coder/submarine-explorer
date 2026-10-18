# S-bughunt-20 — objectives, Journal captures and legacy retry saves

Backlog 8 (`S-bughunt`), 2026-10-17, audited from `1830fc7`. Reviewed
`CONTRIBUTING-AGENTS.md`, the Director rubric/simplicity rules, the
`J-desktop-repetition`, `J-journal-preview`, `S-bughunt-19` and
`S-bughunt-legacy-retry` notes, and the changes in `bbdb995`, `b439152`
(`0beaee7`/`2749b6f`) and `d5d3934`. Contact-choice guidance (2490) and the
previously completed hunts are outside this slice.

## Demonstrated bug and fix

**A corrupt pending record suppressed intact legacy evidence for the same site.**
Reproduction: load a v2 progress save with
`legacyPending: [{site: 'old', keys: null, bonus: false}, {site: 'old', keys: ['old/a'], bonus: false}]`.
The reader marked `old` as seen before validating the first record, then discarded
the intact second record as a duplicate. It returned `legacyPending: []`, so the
next migration permanently retired that site's retry and lost its provable old
completion credit. Missing keys and a nonboolean bonus reproduced the same loss.

`Save.migrateProgress` now validates the evidence shape before claiming its site
for deduplication. The first **valid** record still wins: retries never merge a
later snapshot or import another site's keys. The site-only retirement policy,
existing ratings, cosmetic grants, storage key and schema remain unchanged.

Before the source fix, the three new `progress.test.ts` reproductions failed
(3 failed / 17 passed; `/tmp/S-bughunt-20-before.log`). Afterward they pass across
three save/load cycles. The migration integration case also proves that intact
evidence survives two offline retries/reloads, retires a neighboring old
site-only record without fetching it, then credits exactly one star without
using later optional discoveries or photos. A final reload performs no fetch
or additional award.

Simplicity: one validation-order correction in the existing reader; no new
module, setting, UI surface, site branch, CSS, art, layout or tooling change.

## Other deterministic capability coverage

Extended existing specs only, adding 25 cases:

- `progress.test.ts`: corrupt records, mixed old string/new object forms,
  foreign/nonstring/duplicate keys, invalid site IDs, repeated loads, existing
  ratings/grants and isolated save snapshots.
- `progressMigration.test.ts`: the end-to-end retry reproduction above, using
  injected storage and fetch responses.
- `photoStore.test.ts`: capture sizing at 8192×1, 1×8192, 390×844 and 844×390
  yields 640×1, 1×8192, 390×844 and 640×296 respectively. Missing 2D context,
  failed JPEG encoding and a zero-width canvas return no capture.
- `journalGroups.test.ts`: no gallery, empty gallery, wrong site, wrong subject,
  untagged photo and a matching capture; deletion/refresh removes the old hero,
  and entries remain readable without a picture. A static numeric CSS contract
  retains `max-height: min(300px, 32vh)`, `max-width: 100%` and `contain`.
  This does **not** evaluate native CSS layout.
- `overlayFocus.test.ts`: none done, partly done, primaries done, all done,
  optional-only and empty lists; stable primary/authored ordering, progress
  counts, completed-row filtering/restoration, `aria-current` handoff and hints.
  A long-list fixture checks wraparound and the remaining-count calculation
  after completed rows are removed.

Existing `guidance`, `touchControlsAudit`, `discoveryReward1240`, `gameScanner`,
`missionRouter`, `firstMove`, `saveSoak` and `copyJournal` capability checks also
ran. They retain the desktop far/in-range objective-card behavior, touch
handoff, interrupted/completed scan behavior and prior save guards. No further
behavioral defect was established; those production paths are unchanged.

## Deferred / limits

- Native Journal sizing, very narrow portrait image legibility, phone appearance
  and screenshot acceptance remain Claude's visual review. Codex did not render
  the game. Unit fixtures cover capture dimensions, DOM selection and the numeric
  cap declaration, not the browser's computed image boxes.
- The already documented debris-field capture showing the bow needs scan-time
  camera aiming (`J-journal-preview`); no framing change here.
- Optional-only missions still cannot earn primary completion/stars, matching
  `Mission`/`diveStars`' existing nonempty-primary requirement. This hunt verifies
  their list behavior and does not redesign rating eligibility or contact choice.

## Validation

- PASS: 447 tests across 13 focused/related existing capability specs
  (`/tmp/S-bughunt-20-focused.log`, `/tmp/S-bughunt-20-related.log`).
- PASS: final-source TypeScript check and production build
  (`/tmp/S-bughunt-20-build.log`), using the gate's native bundled Vite config
  for this read-only dependency tree.
- PASS: targeted formatting and `git diff --check`.
- PASS: complete final-source unit rerun,
  `npm test -- --configLoader runner --cache=false`: **192 files / 3,170 tests**,
  515.82 seconds, exit 0 (`/tmp/S-bughunt-20-final-unit.log`). Source/tests were
  held fixed throughout this run.

The initial gate unit run overlapped edits and retained the pre-fix reader in
its module cache. It finished with 190 files passing / 2 failing, 3,153 tests
passing / 4 failing (499.94 seconds). All four failures are the new save-loss
reproductions: the three reader cases and the mixed retry integration case,
each observing `[]` instead of intact evidence. The final-source focused runs
and complete rerun above pass all four. The overlapping initial run also loaded
some capability files before their added fixtures; its test total therefore
differs from the final fixed-source run.

Requested gate command:
`GATES_CONFIG_MODE=writable PW_PORT=4330 bash tools/gates.sh`.
Log: `/tmp/S-bughunt-20-gates.log`; per-gate logs:
`.cache/runs/20261017-211552-3-cS0CNN/`.
The gate exits **1**. PASS: config bundling, strict content, root and
project-base production builds, attribution and repository-wide Prettier.
The initial unit failure is recorded above; Python and both browser gates fail
for the environment reasons below.

Environment failures, separate from application regressions:

- Python: 161/166 pass; four unchanged build-manifest tests fail with
  `spawnSync git EPERM`, and the unchanged golden CLI test fails parsing empty
  stdout (`Unexpected end of JSON input`). These match the previous hunt's
  environment failures. No tooling or assertion was changed.
- Relevant Playwright suites (`mission.spec.ts`, `journal-debrief.spec.ts`,
  `f2-progress.spec.ts`) exit 1 before assertions because their owned preview
  cannot start (`/tmp/S-bughunt-20-browser.log`). Direct preview reproduces
  `listen EPERM: operation not permitted 127.0.0.1:4331`
  (`/tmp/S-bughunt-20-preview.log`). No browser or screenshot pass is claimed.

No merge, push or tag was performed; `tools/` and `plan/DIRECTOR.md` are untouched.
