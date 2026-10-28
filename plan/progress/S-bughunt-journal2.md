# S-bughunt: Journal and debrief after a second site

Item: **S-bughunt**. Audited HEAD: `8e74fda89c4b6d321b8f2960c8f925ed1bceb739`.
Initial worktree was clean. Read CONTRIBUTING-AGENTS and DIRECTOR's simplicity
rules; extended existing capability specs only.

## Confirmed bug and minimal fix

After visiting Titanic, enter Monterey, browse the saved Titanic bow in the
Journal, close it, then scan an animal. The banner announces the animal, but
opening the Journal retains the bow article. The same stale selection appears
when the Journal is opened from the debrief. This also occurs within one site;
it does not require corrupt storage.

Two missing handoffs caused this:

- `Discovery.onLifeScan` records the new entry and refreshes the Journal without
  setting its pending selection, unlike the POI completion path.
- Journal selection resolution handles guide IDs but cannot resolve the
  relative wildlife entry key already supplied to `onLifeScan`, e.g.
  `life/comb-jelly`.

The fix passes the existing entry key to `guide.focus` and lets the Journal
resolve a relative key within the current site, alongside existing guide IDs.
Reward writes, discovery persistence, mission completion and save schemas are
unchanged. Wildlife remains excluded from `selectedId`/guide objective credit.
No new UI, settings, dependency, site-specific branch or layout change.

## Regression evidence

- `journalGroups.test.ts`: desktop and phone reopen the newly scanned wildlife
  entry after browsing another site's article.
- `discoveryReward1240.test.ts`: existing real Scanner/Discovery cases require
  selection of the animal after both its first scan and a repeat scan following
  a restart.
- Before the fix, these two specs produced **4 failures / 38 passes**: both
  layouts constructed an invalid POI key for wildlife, and both scanner cases
  retained the preceding POI's focus. After fixing, **42/42 passed**.
- Extended the existing animal scan browser test in `f2-life.spec.ts`: scan the
  real Titanic bow, visit Monterey, browse the bow, scan a staged comb jelly,
  and require its article to open directly. It also checks the debrief's one
  local scan/highlight and Journal action, preservation of the first site's
  discovery, exactly one token for each discovery, and unchanged tokens with
  empty dive stats after reload. The first-site scan explicitly advances the
  real Scanner at its target; it does not claim a physical travel test.
  Browser assertions could not execute in this environment; see below.

## Other boundaries audited

| Boundary            | Finding and evidence                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State between sites | Shell site selection navigates to a new page. Discovery, SessionStats and Mission are reconstructed; Journal unlocks and rewards persist. Existing discovery reward cases retain an earlier site's save without including it in the current dive's scan list. The newly extended browser case checks the explicit two-site sequence, but remains unexecuted.                                                                              |
| Awarded tokens      | POIs, photos, secrets and samples include their site in their identities. Wildlife species deduplicate globally while Journal animal discoveries remain site-specific. Repeat awards still set this dive's photo/species bonus. Existing Progress, migration and save-soak checks pass; no new duplicate-award defect found.                                                                                                              |
| Save migration      | Boot awaits legacy credit before constructing the dive. Legacy evidence scopes bonuses to each site; subsequent boots repair missing discovery/photo tokens without inferring finished modern dives. Existing multi-site, interrupted-write, legacy fixture and repeated-reload unit cases pass.                                                                                                                                          |
| Reset               | The UI promises **Reset discoveries**, not deletion of every save. Source trace confirms the global discovery document is cleared and verified before reload, while reward history, photos, settings and bindings remain separate. Protected future versions and failed removals report failure. Existing Reset lifecycle unit checks pass; native storage/dialog/reload behavior remains a browser-validation gap. No Reset change made. |

## Validation

Focused final command, exit 0: **9 files / 494 tests passed**:

```sh
npx vitest run --configLoader runner --cache=false \
  tests/unit/progress.test.ts tests/unit/progressMigration.test.ts \
  tests/unit/journalGroups.test.ts tests/unit/journalData.test.ts \
  tests/unit/discoveryReward1240.test.ts tests/unit/debriefSummary.test.ts \
  tests/unit/debriefReopen.test.ts tests/unit/saveSoak.test.ts \
  tests/unit/overlayFocus.test.ts
```

`npm run typecheck`, changed-file Prettier, `git diff --check`, and
`python3 tools/check_attribution.py` passed.

Searched `tests/e2e` with `rg` for Journal/debrief, migration, reward and Reset
capabilities. Ran these matching commands with
`GATES_CONFIG_MODE=writable PW_PORT=4272 PW_OUTDIR=dist-journal2`:

```sh
npx playwright test tests/e2e/f2-life.spec.ts -g 'an animal can be scanned'
npx playwright test tests/e2e/journal-debrief.spec.ts -g 'survives migration|primaries complete -> keep exploring'
npx playwright test tests/e2e/settings.spec.ts -g 'reset discoveries confirms|reset reports protected'
```

Each exited 1 before any test body: preview could not start. Direct preview
diagnostic reports `listen EPERM: operation not permitted 127.0.0.1:4272`.
The animal command was rerun after the final test edits, with the same result.
No screenshots or native browser acceptance are claimed.

Broader checks:

- Initial `npm run build -- --outDir dist-journal2 --configLoader runner` passed
  TypeScript but hit Vite's existing `Module runner has been closed` PWA hook
  failure. Retried using the repository's writable-config build path:
  `GATES_CONFIG_MODE=writable PW_PORT=4272 PW_OUTDIR=dist-journal2 bash tools/gates.sh --phase build`.
  Application bundling, public-data copying and service-worker stamping passed;
  its following provenance-manifest step failed with `spawnSync git EPERM`.
  Gate log: `.cache/runs/20261028-014908-2-4YgHSc/build.log`.
  Removed the retained build after the browser attempts.
- Full Vitest attempt (`npx vitest run --configLoader runner --cache=false`)
  printed only its RUN header and stalled. Interrupted with Ctrl-C, exit 130;
  `/tmp/journal2-units.log`. Focused suites completed normally.
- `npm run test:py`: **167 tests, 5 failures** in unchanged tooling: four
  `test_ci_build_manifest` cases with `spawnSync git EPERM`, plus
  `test_golden_tooling` parsing empty child output (`Unexpected end of JSON input`).
  These match previously recorded sandbox failures. Log:
  `/tmp/journal2-python.log`.

Aggregate validation is incomplete; no full-suite or browser pass claimed.
