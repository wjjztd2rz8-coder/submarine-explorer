# 3320 — S-bughunt: optional-content failure and recovery

Item: **S-bughunt**, DIRECTOR Backlog item 9 (**S-verify / S-bughunt
[Codex, standing]**). Pinned checkout: `133013e7d25a9eb5787e5d64ee396a3cc0de4ffd`.

Clean behavioral result: no supported defect reproduced. Production code and
authored content are unchanged. Added only failure/recovery guards in
`tests/unit/gameContentPath.test.ts` and `tests/unit/journalData.test.ts`.

## Intake and ownership

Read DIRECTOR Backlog, simplicity rules and rubric; the newest REVIEWS entry
(2026-10-22 night, joint review); OVERNIGHT-LOG through run 87; and
CONTRIBUTING-AGENTS. Read relevant launched briefs and available results for
3070/3180/3210/3220/3290/3300, their collected progress, and the launched/queued
3310/3320/3330/3340 scopes. Historical result wrappers claim smoke/PASS while
their final reports record no e2e and Python failures; they are not current
validation evidence.

Initial checkout was clean. Rechecked HEAD, status, registered worktrees and
owned-path diffs in the active 3310/3330/R-ci-green-3 worktrees before editing:
no overlapping changes. This refill assigns ContentPath and the two edited
capability specs to 3320, gameGuide tests to 3330, and report-only work to 3340.
Only the two owned tests and this note are changed. No work was collected from
another checkout; 2980/3050 were left untouched. Completed linkage, debrief,
collision and other audits were not reopened; 3310 journeys remain separate.

## Existing implementation and caller trace

`fetchContentJson` wraps `fetchFn`, `response.text()` and `JSON.parse` in one
try/catch. Non-OK responses return null before reading the body. After leading
whitespace, only object/array prefixes reach JSON.parse; successful HTML SPA
fallbacks become null. All state is request-local.

`loadGuide` maps null to null, `loadPois` to [], `loadSpecies` to an empty
SpeciesDoc (with landmark identity and existing disclaimer), and `loadSecrets`
to `{ version: 1, secrets: [], samples: [] }`. Species first reads mission.json
for an optional file override, then requests the species document even when
that mission request produces null. Secrets uses `/data/secrets/<site>.json`,
not the landmark folder. Existing validators handle unusable document shapes.

Discovery.load awaits POIs and guide together, places the available POIs, then
uses buildGuideEntries/entryIdForPoi to retain scan targets and stand-ins.
The shell passes the resolved SpeciesDoc to Journal.setSpecies. Exploration
awaits secrets and discovery.ready before installing the available finds.
These consumers are read-only in this package.

`loadJournalSite` independently awaits guide, POIs, species, mission and secrets;
each optional request settles to its existing empty value on failure. It passes
the usable neighbors to buildJournalSite. Species and Journal each read
mission.json, so the fixture deliberately supplies two successful requests per
site load. The existing injected-fetch path omits life; no wildlife availability
claim is made here. `loadJournalSites` uses the real site loader for indexed and
extra safe IDs, and its aggregate Promise.all still awaits every site's loader;
the separate neighbor control does not establish progressive UI readiness.
The UI Journal.load caches its loading promise: restoring a guide
in this audit means a **fresh loadJournalSite call**, not automatic UI refresh,
retry or live mutation of an existing JournalSite.

## Failure-stage and recovery evidence

All requests use injected FetchJson, with no HTTP, DOM or rendering. Rejections
use deferred promises released after the relevant document request starts.

| Stage                                   | Shared helper result / existing guard                                                        | Public loader and recovery result                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Fetch rejects                           | catch → null; gamePois already guards network failure                                        | Guide null; POIs []; species empty doc; secrets empty doc; fresh valid request succeeds             |
| response.text rejects                   | catch → null; no previous direct body-rejection guard                                        | Same existing empty results; deferred body rejection does not poison fresh request                  |
| Non-OK (503 with a valid document body) | null; gameContentPath and gamePois already guard non-OK                                      | All four loaders return their empty values, then accept valid content                               |
| Successful SPA HTML                     | null after whitespace/prefix check; gameContentPath, gamePois and species already guard HTML | All four empty contracts, followed by successful valid requests                                     |
| Malformed JSON                          | catch → null; gameContentPath and species already guard malformed JSON                       | All four empty contracts, followed by successful valid requests                                     |
| Valid document                          | Existing helper parses object JSON; parser capabilities cover valid content                  | Authored guide paragraph, POI, species record and sample each return as expected after each failure |

Existing guards were retained unchanged: gameContentPath's combined parse/HTML/
malformed/non-OK case; gamePois's 404/network/HTML and URL-success cases;
gameGuide's missing-shape and missing-guide stand-ins; species's malformed/HTML,
default/override filename and unsafe-ID cases; Journal's entry ordering, grouping,
discovery isolation, read-only save reads and historical linkage assertions.

Added **20 table-driven consumer cases** to gameContentPath: four public loaders
across five failure stages, each followed by an independent valid request through
the same injected fetch. The missing contract is public empty-result/recovery
behavior, including asynchronous fetch/body rejection; existing raw-helper checks
were cited rather than copied into another helper-only matrix.

Added **one real-loader Journal case**, using existing Reef guide/POI/species
fixtures and storage helper, with two POIs sharing an authored entry:

- Only `/data/landmarks/reef/guide.json` fails, at response.text(). Valid POIs,
  species, mission/briefing, secrets and samples remain available. Catalogue name
  Reef, region Sea, depth 55 and site ID reef survive.
- While that body is pending, the intact neighbor finishes through the real
  loadJournalSite. It retains the authored paragraph and grouped POI IDs.
- Failed guide produces `reef/poi/reef-wreck`, `reef/poi/reef-mound` and
  `reef/poi/reef-rock` stand-ins. Wreck retains its name, Kind fact and Recreation
  provenance. Three survey records and both optional finds remain present.
- Empty discovery state leaves the site and every entry locked. An existing
  discovery `reef/reef-wreck`, re-read through a new DiscoveryStore, unlocks only
  its stand-in and the site. The neighbor with identical local POI IDs stays
  locked; its own discovery opens that neighbor without opening Reef.
- A fresh Reef load with the guide restored returns authored title/paragraphs,
  overview and `reef/poi/wreck` grouping both reef-wreck and reef-mound. The same
  stored discovery opens the overview, grouped article and its documented species
  link. Independent rock remains locked. Stand-in/authored entry keys are allowed
  to differ; persistent site/POI discovery identity remains unchanged.
- Content reload and unlock queries leave saved bytes and write count unchanged.
  The requested URL set confirms that every requested optional document other than
  the failed guide is supplied, including mission data. The assertion does not
  require duplicate mission fetches or prevent future request deduplication.

No failing-before/passing-after product correction exists: new assertions pass
against the pinned implementation. No consumer defect or proposed product fix
is retained. No cancellation, timeout, retry, new readiness requirement or
never-settling-request guarantee is inferred.

## Simplicity and rubric

Net simpler: retain the existing request-local implementation, empty contracts
and stand-in machinery. Tests extend two capability specs; no package-named spec,
runtime helper, UI, setting, guidance surface, layout patch, site branch, config
mutation, dependency or save schema is introduced. Historical assertions,
tolerances, budgets, instance counts and snapshots remain intact; no retries,
skips or timeout increases. The behavioral rewarding/honest/simple rubric is
checked through retained discoveries, site identity and existing provenance.
All 13 site identities, five heroes, real GMRT, scanning/Journal/life/input,
accessibility and Arcade default retain their existing implementation.

## Commands and validation limits

- Initial focused run after rejection/recovery guards:
  `./node_modules/.bin/vitest run tests/unit/gameContentPath.test.ts tests/unit/gameGuide.test.ts tests/unit/gamePois.test.ts tests/unit/species.test.ts tests/unit/journalData.test.ts tests/unit/journalGroups.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/gameExplore.test.ts --configLoader runner --cache=false`
  — **PASS, exit 0, 8 files / 239 tests**, 819 ms; `/tmp/3320-focused.log`.
- Final focused run of the same command after adding all public failure stages:
  **PASS, exit 0, 8 files / 251 tests**, 1.15 s; `/tmp/3320-focused-final.log`.
- `npm run typecheck` — **PASS, exit 0** after the initial additions.
- `./node_modules/.bin/prettier --write tests/unit/gameContentPath.test.ts tests/unit/journalData.test.ts`
  and `git diff --check` — **PASS**.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` — **FAIL,
  exit 1**, aggregate `FAIL gates (e2e=none)`. Config preparation, content,
  TypeScript/production build, full units, attribution and repository-wide
  Prettier all **PASS**. Units: **192 files passed; 3,823 passed / 4 existing
  expected failures (3,827 total)**, 643.18 s. No unexpected unit assertion
  failures or skips. Build retains the existing non-failing chunk-size warning.
  Aggregate output: `/tmp/3320-gates.log`; per-gate logs:
  `.cache/runs/20261023-035523-19-wKGjk3/`.

Required-gate failure evidence: Python **167 tests run / 5 failures**, 15.213 s, matching
previous reports. Four test_ci_build_manifest cases fail with `spawnSync git EPERM`:
test_both_bases_survive_copy_and_verify_all_provenance_fields,
test_every_manifest_mismatch_is_rejected,
test_missing_output_or_manifest_and_workflow_sha_mismatch_fail, and
test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected.
test_golden_tooling fails with `Unexpected end of JSON input` at
golden-manifest.test.mjs:151 while parsing subprocess stdout. The latter's
underlying cause is not established here. These are tooling/environment failures,
not content-loader assertion failures. Smallest next steps remain running the
unchanged manifest checks where child-process permissions work, and capturing the
golden-report child status/stderr/stdout before proposing a tooling fix. No
unowned tooling or assertions were changed, skipped or relaxed.

Final owned-file Prettier check and `git diff --check` pass. HEAD still equals
the pinned SHA; final status contains only the two owned capability specs and
this matching progress note. Historical regression assertions are unchanged.

Actual e2e mode: **none**. No browser, game rendering, screenshots or offline
rendering. Injected content and Map-backed discovery storage establish CPU
loader/model behavior, not live networking, native browser storage, automatic UI
recovery, unaided play, visual readability/beauty/composition, touch layout,
GPU/resource performance or real-phone acceptance. Those remain with Claude/owner.
No merge, push, tag, dispatch or hosted workflow action; tools and DIRECTOR are
unchanged.
