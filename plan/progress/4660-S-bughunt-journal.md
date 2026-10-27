# S-bughunt: Journal, photo gallery and discovery list

Serves DIRECTOR's standing **S-bughunt [Codex]** item. Read
`plan/DIRECTOR.md` and `CONTRIBUTING-AGENTS.md`. Audited HEAD:
`6a0443db10de6ebe3f5f20aa29d053f7e97a077c`; initial worktree was clean.

## Confirmed bugs and minimal fixes

1. **Legacy photo dates become ZIP paths.** PhotoStore accepts parseable dates
   such as `09/24/2026`. `photoFilename` copied their first ten characters,
   producing `titanic-bow-section-09/24/2026.jpg`: a nested archive path rather
   than a flat JPEG filename. Written month names also produced truncated dates.
   Normalize the parsed instant to an ISO UTC date before naming either an
   individual download or a ZIP member. Runtime captures already use UTC ISO
   timestamps. Saved records and on-screen localized dates are unchanged.
2. **Failed delete retries accumulate messages.** Every rejected deletion
   appended another identical paragraph to the viewer. Repeated attempts grew
   the article, particularly troublesome on a phone. Reuse one error paragraph
   per viewer. The existing delete/refresh callback still owns successful
   deletion and count updates; failed writes preserve the collection.

Production changes are confined to `src/ui/PhotoGallery.ts`. No schema,
dependencies, settings, guidance, site branches or CSS changes. The existing
error surface is reused; no new visible element is introduced.

## Capability regressions

Extended **existing** specs only:

- `tests/unit/zip.test.ts`: accepted legacy date forms produce portable names;
  the existing 24-photo extraction test now includes a legacy timestamp alongside
  same-day ISO timestamps, checking unique names, ZIP headers, CRCs and exact
  extracted JPEG bytes using Python's zipfile. Export leaves both stores intact.
- The same capability drives a real PhotoStore through two failed viewer deletes
  and a successful retry. It checks one error, unchanged storage on failure,
  preserved ordering and persistence after recovery, then deletes the remaining
  collection through viewer controls and checks the empty state and absent
  Download all action. Discovery state remains intact.
- `tests/e2e/d-photo.spec.ts`: added a 390 × 844 viewport case with 24 photos.
  It checks all thirteen site rows, gallery order, scrolling to the last photo,
  horizontal containment, individual and ZIP downloads, and failed delete
  retries followed by recovery. This browser case could not execute locally;
  see validation limits below.

Before the production fixes, the ZIP capability reported **3 failures / 5
passes**: two legacy filename cases and duplicate delete errors. After fixing
the source it passed **8/8**. Later test-only refinements exercise deletion to
empty and give legacy date inputs explicit GMT offsets for timezone independence.
No existing assertion was loosened.

## Audit results

| Requested boundary          | Evidence and result                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entries after partial saves | Existing `journalData`, `gameDiscoveryStore` and `saveSoak` cases pass. Mixed legacy/current discovery fields retain valid unlocks, reject damaged records, preserve unrelated sites and reload without rewriting merely read data. Quota, silently dropped and interrupted reward writes are repaired on startup without inventing mission completion.          |
| Duplicate awards            | Existing `progress`, `progressMigration`, `saveSoak` and `photoMode` cases pass. Tokens deduplicate scans, global wildlife species and repeated photos; repeat startup repair preserves exact awards and ratings. No additional defect confirmed.                                                                                                                |
| Discovery ordering          | DiscoveryStore sorts by parsed first-discovery instant, including mixed offsets and fractional seconds; rescans preserve the original time. Journal content rows follow their authored groups, and its site ordering puts the current site first during a dive and catalogue order first from Home. Existing data/DOM tests pass; no ordering correction needed. |
| Photo ordering and deletion | PhotoStore retains newest insertions first, enforces 24 photos, and evicts oldest only for quota failures. Failed deletes preserve bytes; recovered deletion retains survivor order. New viewer regression also covers deletion to empty.                                                                                                                        |
| Empty states                | Existing Journal DOM cases cover no captures, an empty collection, unmatched subjects/sites and untagged captures. Locked site pages suppress entry rows until a scan or spoilers. The gallery's final deletion removes export controls and shows its existing empty guidance.                                                                                   |
| Long phone lists            | Source review confirms a separately scrolling article, constrained phone grid, hidden desktop tree and wrapping entry rows. Existing phone-sheet DOM checks pass. Added native viewport assertions for the full photo collection, but phone geometry, touch interaction and visual acceptance remain unverified because preview cannot listen in this sandbox.   |
| Photo export                | Confirmed legacy-date bug fixed. The existing full-collection extraction oracle verifies exact bytes, collision suffixes and export URL cleanup. Corrupt base64 is filtered by PhotoStore before export.                                                                                                                                                         |

## Validation

- Focused capabilities: **8 files / 292 tests passed**, exit 0:

  ```sh
  ./node_modules/.bin/vitest run --configLoader runner --cache=false \
    tests/unit/zip.test.ts tests/unit/journalGroups.test.ts \
    tests/unit/journalData.test.ts tests/unit/gameDiscoveryStore.test.ts \
    tests/unit/progress.test.ts tests/unit/progressMigration.test.ts \
    tests/unit/photoStore.test.ts tests/unit/photoMode.test.ts
  ```

  Log: `/tmp/journal-audit-focused.log`. Additional existing partial-save
  capability: `saveSoak.test.ts`, **67/67 passed**, exit 0;
  `/tmp/journal-audit-partial-saves.log`. Total: **359 passing focused tests**.
  The final expanded ZIP capability was also rerun separately: **8/8 passed**,
  `/tmp/journal-audit-zip-final.log`.

- `npm run typecheck`: passed after the browser addition.
- `python3 tools/check_attribution.py`: passed, 14 assets attributed.
- Repository-wide Prettier and `git diff --check`: passed;
  `/tmp/journal-audit-format.log`.
- Broad gate requested with
  `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-journal-audit PW_PORT=4260 bash tools/gates.sh --full-e2e`.
  Aggregate log: `/tmp/journal-audit-gates.log`; detailed logs:
  `.cache/runs/20261027-044759-3-UOGnw2/`.
  Config preparation, strict content validation and production build passed.
  Python ran 167 tests: **162 passed / 5 failed**. Four build-manifest cases
  report `spawnSync git EPERM`; `test_golden_tooling` fails parsing empty child
  output with `Unexpected end of JSON input`. These match the earlier recorded
  failures in `4590-S-bughunt-save-state.md`; tooling was not changed.
  The full unit stage printed only its RUN header for over twelve minutes.
  Interrupted the broad attempt with Ctrl-C, exit **130**. No full-unit result
  was produced, and the gate did not reach its browser/attribution/formatting
  stages. The latter two checks passed separately as recorded above. Removed
  the generated `dist-journal-audit` build after validation.
- Targeted Playwright attempt:
  `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-journal-audit PW_PORT=4261 ./node_modules/.bin/playwright test tests/e2e/d-photo.spec.ts`.
  Exit 1 before any test body: preview could not start.
  `/tmp/journal-audit-browser.log`; direct preview diagnostic:
  `/tmp/journal-audit-preview.log`, `listen EPERM: operation not permitted
127.0.0.1:4261`. No native browser, screenshot, touch, WebGL or real-phone
  acceptance is claimed.

Aggregate gates are incomplete; no green full-suite claim. No commit, merge,
push or tag was requested or performed.
