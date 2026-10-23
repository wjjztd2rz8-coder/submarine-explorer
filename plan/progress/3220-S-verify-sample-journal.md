# 3220 — S-verify: shipped samples retained in the Journal

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**, the highest eligible nonvisual Codex entry. Pinned checkout:
`a545afe00196649a2d6de4cf1c8039851aba9074`.

Clean integration audit: **26 admitted samples across all 13 indexed sites**
resolve to their authored names and intended Journal entries, collect through
the real Scanner/Explore path and retain unlocks after content/store reload.
No supported product discrepancy was reproduced; no correction is proposed.
Production, content and ID policies are unchanged.

## Intake and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR rules/simplicity/rubric, the newest
2026-10-22 comprehensive review and OVERNIGHT-LOG tail through run 82. Read
3070 and 3080 launched scopes, round-log endings and progress notes. Their notes
leave gates pending; 3080's available round ending shows five Python failures
while units were still running, so neither is relabeled a complete gate pass.
3120 has an empty last report and no named progress note/result in the checkout
or registered worktree; its launched scope, collected gameExplore assertions
and round ending establish the identity audit and 8 files / 138 focused passes.
Read 3180 and 3210 launched scopes, result reports and complete live-worktree
progress evidence: clean wildlife/secret audits, with five Python failures and
actual e2e mode none despite wrapper PASS/smoke labels.

Before edits, read current queued/launched scopes/log through 3220/3230/3240,
completion reports for 3130–3210, and registered worktree statuses, changed-path
lists and diff summaries, including finished work awaiting collection. Rechecked
explicit HEAD diffs for both owned paths across all registered worktrees: none
was changed or claimed elsewhere. No top-level queued Markdown brief was waiting.
3230 owns Sonar/uiSonar keyboard routing; 3240 owns uiWaypoints. No conflict.

Only `tests/unit/modesExploration.test.ts` and this matching note are edited.
All other production, content, schema, settings, snapshots, shared helpers,
workflows, tools and DIRECTOR files remain read-only. No other package was
collected, copied, overwritten, committed or used as an implementation dependency.
Unmerged 2980 scarp and 3050 seam repairs, completed 3130–3210 slices, parked
Blue Hole work and owner-blocked opening work remain excluded.

## Admission and linkage table

Membership derives from `parseMissionIndex(data/landmarks/index.json)`, excluding
synthetic fixtures, and each optional `data/secrets/<site>.json` through
`parseSecrets`. Runtime execution separately calls `loadSecrets` and Explore's
own `loadSecrets` through the real local-content URL paths. All **13 optional
files exist**, all are version 1, and **26/26 raw sample rows are admitted**:
zero absent files, zero ignored malformed/duplicate sample rows. Each site has
two samples at this SHA. The same documents contain 39 admitted secrets; these
are read-only neighbors, with no secret scan/focus/prose audit repeated.
Optional absence and ignored rows are valid; the new test membership does not
require a document or a fixed sample count at every site.

All rows below pass scan, collection event, summary, Journal unlock, reload and
isolation. The persisted DiscoveryStore key is exactly
`<site>/<runtime target ID>` (for example
`great-blue-hole/sample:material-1`); the Journal entry key uses `/sample/`.

| Site                 | Raw sample ID | Runtime target ID | Journal key                            | Authored name        |
| -------------------- | ------------- | ----------------- | -------------------------------------- | -------------------- |
| great-blue-hole      | material-1    | sample:material-1 | great-blue-hole/sample/material-1      | Loose limestone chip |
| great-blue-hole      | material-2    | sample:material-2 | great-blue-hole/sample/material-2      | Fine sediment        |
| hunga-tonga-caldera  | material-1    | sample:material-1 | hunga-tonga-caldera/sample/material-1  | Loose basalt chip    |
| hunga-tonga-caldera  | material-2    | sample:material-2 | hunga-tonga-caldera/sample/material-2  | Fine sediment        |
| blake-plateau-corals | material-1    | sample:material-1 | blake-plateau-corals/sample/material-1 | Sediment core        |
| blake-plateau-corals | material-2    | sample:material-2 | blake-plateau-corals/sample/material-2 | Fine sediment        |
| lost-city            | material-1    | sample:material-1 | lost-city/sample/material-1            | Carbonate grain      |
| lost-city            | material-2    | sample:material-2 | lost-city/sample/material-2            | Fine sediment        |
| kamaehuakanaloa      | material-1    | sample:material-1 | kamaehuakanaloa/sample/material-1      | Vent mineral grain   |
| kamaehuakanaloa      | material-2    | sample:material-2 | kamaehuakanaloa/sample/material-2      | Fine sediment        |
| axial-seamount-ashes | material-1    | sample:material-1 | axial-seamount-ashes/sample/material-1 | Vent mineral grain   |
| axial-seamount-ashes | material-2    | sample:material-2 | axial-seamount-ashes/sample/material-2 | Fine sediment        |
| hudson-canyon        | material-1    | sample:material-1 | hudson-canyon/sample/material-1        | Sediment core        |
| hudson-canyon        | material-2    | sample:material-2 | hudson-canyon/sample/material-2        | Fine sediment        |
| monterey-canyon      | material-1    | sample:material-1 | monterey-canyon/sample/material-1      | Sediment core        |
| monterey-canyon      | material-2    | sample:material-2 | monterey-canyon/sample/material-2      | Fine sediment        |
| endurance            | material-1    | sample:material-1 | endurance/sample/material-1            | Sediment core        |
| endurance            | material-2    | sample:material-2 | endurance/sample/material-2            | Fine sediment        |
| titanic              | material-1    | sample:material-1 | titanic/sample/material-1              | Sediment core        |
| titanic              | material-2    | sample:material-2 | titanic/sample/material-2              | Fine sediment        |
| bismarck             | material-1    | sample:material-1 | bismarck/sample/material-1             | Sediment core        |
| bismarck             | material-2    | sample:material-2 | bismarck/sample/material-2             | Fine sediment        |
| beebe-vent-field     | material-1    | sample:material-1 | beebe-vent-field/sample/material-1     | Vent mineral grain   |
| beebe-vent-field     | material-2    | sample:material-2 | beebe-vent-field/sample/material-2     | Fine sediment        |
| challenger-deep      | material-1    | sample:material-1 | challenger-deep/sample/material-1      | Sediment core        |
| challenger-deep      | material-2    | sample:material-2 | challenger-deep/sample/material-2      | Fine sediment        |

## Runtime trace and evidence

1. `Secrets.parseSecrets/loadSecrets` admits safe IDs, nonempty names and finite
   geographic coordinates, ignoring malformed/duplicate rows. Missing content
   resolves to an empty optional document.
2. `Samples.placeSamples` uses the actual mission tile metadata and lat/lon
   conversion, flat fixture ground plus 0.6 m, `sample:<raw ID>`, authored name,
   existing 22 m scan range and 2.5 s duration. No ID, coordinate, duration or
   radius is rewritten. Fixture ground is -100 m, giving target depth 99.4 m.
3. Explore loads the document, places samples and registers supplemental targets.
   The real Scanner records the site's runtime ID in DiscoveryStore before
   emitting `scan:complete`. Explore's real subscription selects that target,
   calls real `Samples.collect`, emits `discovery:sample` and exposes the collected
   authored name through the existing summary/debrief provider. Notification,
   Journal focus and reward consumers are doubles here; their separate contracts
   are already covered and are not audited again.
4. `loadJournalSites` loads the complete shipped index/catalogue, then
   `loadJournalSite` passes the **actual optional document's samples** to
   `buildJournalSite`. The local fetch accepts `/data/secrets/<site>.json` as well
   as landmark documents, avoiding the empty-fetch trap in the older Journal
   fixture. Each expected sample entry must exist before scanning. With injected
   fetch, Journal intentionally omits life; wildlife linkage belongs to 3180.
5. The builder retains the existing `kind: secret` grouping, `sample:<raw ID>`
   entry ID, authored title and generic paragraph `Logged during a dive.`. Sample
   entries unlock from their site/runtime ID; any such discovery opens the site
   page and its existing site-level entries. No secret prose or primary-objective
   completion credit is demanded, and no completion/reward policy is changed.

Each case reuses the existing Map-storage/EventBus/Scanner/Explore context pattern.
Explore's subscriptions, optional parsers, placement, Samples and persistence are
real. Scoped visual-constructor stubs return plain Object3D/resource doubles;
EventsVisual and secret visual helpers are also stubbed. A local Three module
facade enables those scoped replacements in ESM; historical cases retain real
constructors after `restoreAllMocks`. **The added fixture constructs no meshes,
geometry or materials**, renderer, terrain or travel simulation. Scene/Group and
Vector3 supply CPU object/position plumbing only.

After readiness, only the selected actual sample target participates in Scanner
beam selection. The stationary fixture position is 10 m south at the target's
own depth, facing north. Two 1.25 s held updates first yield progress 0.5 with
no record/event/summary name, then exactly one completion. This isolates scan
admission from route/mesh/physical approachability and other contacts' selection.

For every row the exact completion payload is
`{landmarkId: <site>, poiId: sample:<raw ID>, firstTime: true}` and the collection
payload is exactly `{landmarkId: <site>, sampleId: <raw ID>, name: <authored name>}`.
The Samples map contains only `[sample:<raw ID>, <authored name>]`, and both the
exposed summary and installed debrief summary provider report only that name.
EventBus's caught errors are asserted absent, preventing a swallowed collection
handler exception from masquerading as a passing scan.

The only saved record is `<site>/sample:<raw ID>`, timestamp
`2026-10-17T00:00:00.000Z`, count 1. Stored JSON equals the live snapshot.
A new DiscoveryStore and a fresh full Journal load retain the identical intended
entry and unlock state. Every entry is checked: the intended sample and legitimate
site-level entries open; the uncollected neighboring sample stays locked, as do
local secrets, ordinary POI groups, survey entries and event sightings. All other
site pages and entries stay locked, including their actual reused `material-1`
and `material-2` identities. Thus every row has both shipped local-neighbor and
cross-site sample isolation controls, without inventing content or auditing
namespace uniqueness again. Reload and Journal reads leave persisted bytes
unchanged, with exactly one write and no removal.

There is no actual/expected entry mismatch, wrong raw event ID or persisted-key
discrepancy to retain. Smallest proposed correction: **none**.

## Existing versus added guards; simplicity and rubric

Read the existing modesExploration, gameExplore, journalData, journalGroups,
heroMissionJournal, gameDiscoveryStore, gameScanner and copyJournal capabilities
before editing. Existing sufficient coverage is preserved:

- modesExploration: 3080's same-instance full/partial/optional-load-pending sample
  restart and synthetic mode/input/reward retention cases (all nine unchanged).
- gameExplore: row rejection, synthetic sample collection/reset, curiosity range,
  and 3120's combined shipped identity/reload controls.
- journalData: generic sample/secret grouping, unlock and mission-counter rules;
  shipped hero/non-hero POI scan/reload mapping, generic grouping and read-only
  save behavior. Its existing custom fetch omits optional documents; that is a
  fixture boundary, not evidence of missing shipped entries.
- gameDiscoveryStore, gameScanner, journalGroups and copyJournal: persistence,
  migration, scan membership/range, grouping and existing provenance/copy rules.
  No full namespace, wildlife/secret linkage, scientific-content or photo audit
  is repeated.

Added only **26 table-driven shipped-sample cases** to the existing exploration
capability spec for the materially missing definition → real scan/collection
payload and summary → Journal content/store reload contract. No restart,
mode switch, reward migration, secret focus navigation, primary completion,
photo capture/export or visual sampling matrix is added.

Net simpler: no runtime machinery, new UI surface, guidance element, layout patch,
setting, dependency, save schema, shared-code site branch or config mutation.
All historical assertions, tolerances, budgets, instance counts and snapshots are
preserved. No retries, skips, inflated timeouts or package-named specs/comments.
All 13 identities, five hero set pieces, real GMRT terrain, scan/Journal/life,
keyboard/pad/touch/accessibility and Arcade default remain protected without
production/content changes or added phone runtime cost.

The rubric is applied to correct behavior, understandable existing guidance,
retained discoveries and established resource limits. Readability, beauty,
composition, visual Phone-OK and real-phone acceptance remain with Claude/owner.

## Validation

Initial fixture attempt: 26 new cases failed before scanning because native ESM
Three exports could not be spied on; all nine historical cases passed. Corrected
only the harness with a local module facade; the complete exploration spec then
passed **35/35**. This is no failing-before product regression.

- Focused: `npx vitest run tests/unit/modesExploration.test.ts tests/unit/gameExplore.test.ts tests/unit/journalData.test.ts tests/unit/journalGroups.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/gameScanner.test.ts tests/unit/debriefSummary.test.ts tests/unit/copyJournal.test.ts tests/unit/heroMissionJournal.test.ts --configLoader runner --cache=false`
  — **PASS, 9 files / 215 tests**, exit 0, 2.64 s; `/tmp/3220-focused.log`.
  Includes all 26 new sample rows and unchanged historical assertions.
- `npm run typecheck` — **PASS**, exit 0; `/tmp/3220-typecheck.log`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` —
  **completed, exit 1, FAIL gates (e2e=none)**. Aggregate log:
  `/tmp/3220-gates.log`; detailed logs:
  `.cache/runs/20261022-193933-7-pvgVFA/`.
- Aggregate **PASS**: writable config preparation, strict content validation,
  TypeScript / production build, full unit suite (**192 files / 3,545 tests**,
  563.09 s), attribution and repository-wide Prettier. No unit assertion failures,
  expected failures or skips; no sample product defect reproduced. The production
  build retains its existing non-failing chunk-size warning.
- Aggregate **FAIL**: Python tooling, **162 passed / 5 failed / 167 outer tests**,
  10.970 s. Four `test_ci_build_manifest` cases report `spawnSync git EPERM`:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
  These are environment subprocess blocks. `test_golden_tooling` reports
  `Unexpected end of JSON input` in `golden-manifest.test.mjs:151`; its underlying
  cause is not established here. These match the previously documented failures.
  No unrelated files were repaired and no assertion was bypassed or relaxed.
  Wrapper PASS/smoke labels are not substituted for this actual command result.
- Final owned-file Prettier and `git diff --check` — **PASS**. Historical
  exploration test bodies were also compared with HEAD and are byte-for-byte
  unchanged. Final status contains only the owned test and matching progress
  note; HEAD remains the pinned SHA. No production/content/tool/workflow/snapshot
  or other test diff is included.

Actual e2e mode: **none**. No browser, game render, screenshot, WebGL/GPU,
pixel readback, screen-reader session or real phone test. Fetch reads on-disk
shipped JSON rather than HTTP; storage is a Map rather than native localStorage.
Headless checks do not establish sample visibility, physical approachability,
unaided discovery/play, visual acceptance, screen-reader behavior or real-phone
performance/acceptance. No merge, push, tag or commit is made.
