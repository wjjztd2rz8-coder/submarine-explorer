# 3210 — S-verify: shipped secrets retained in the Journal

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**, the highest eligible nonvisual Codex item. Pinned checkout:
`a545afe00196649a2d6de4cf1c8039851aba9074`.

Clean content integration audit: **39 admitted secrets across all 13 indexed
sites** retain their authored entry, site overview unlock and persisted identity
through Scanner completion and a fresh DiscoveryStore load. Every raw secret ID
used by Explore's focus callback resolves to the intended site's secret entry.
No supported product mismatch was reproduced; no correction is proposed.

## Authority, intake and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR direction/rules/rubric, the newest 2026-10-22
comprehensive review and OVERNIGHT-LOG tail through run 82. Read 3070's
eight-site primary Journal evidence and 3080's sample restart evidence. For
3120, the last report is empty and no named progress note is in the checkout;
the collected gameExplore assertions and round-log ending (8 files / 138 tests
passed) establish its namespace coverage. Read 3180's live worktree note and
result: 100 wildlife links, 248 focused and 3,619 full unit passes, but five
Python failures and actual e2e mode none. Wrapper PASS/smoke labels do not replace
agent command evidence.

Before editing, rechecked queue/launched briefs and launched.log through
3190/3200/3210, results for 3130–3180, progress evidence and all registered
worktree statuses, changed-path lists and diff summaries, with explicit diffs
for this package's owned paths. No top-level queued Markdown brief was waiting.
Finished uncollected changes remain in 3130–3180's separate worktrees. None
claims exploreRegressions or this note. 3190 owns currents.test.ts; 3200 owns
Captions.ts and captions.test.ts. No ownership conflict was found.

Only `tests/unit/exploreRegressions.test.ts` and this matching note are edited.
No other package was collected, copied, committed or used as an implementation
dependency. Unmerged 2980 scarp and 3050 seam repairs, completed 3130–3180
audits, parked Blue Hole work and owner-blocked opening work remain excluded.
All production, authored data, ID policies, schemas, snapshots, other tests,
workflows, tools and DIRECTOR are read-only.

## Admission, linkage table and actual trace

Membership comes from `parseMissionIndex(data/landmarks/index.json)`, excluding
the synthetic `_test` fixture. Each indexed site's `data/secrets/<site>.json`
is read through parseSecrets to derive test rows, then independently through
loadSecrets/local-content fetch during execution. At this SHA all 13 optional
documents exist at version 1, each has three admitted secrets and two admitted
samples: **39/39 secret rows admitted, zero ignored/malformed/duplicate secret
rows, zero absent files**. The 26 sample definitions are read-only controls.
Missing files and ignored rows remain valid optional outcomes: test membership
requires neither a file nor a fixed secret count at any site. No content or
placement requirement is manufactured.

The saved discovery key for each row is `<site>/<final scan ID>`. All rows below
passed scan, fresh-store/content reload, entry/overview unlock, neighboring
entry isolation and raw-ID focus. Range/time are the existing shared
placeSecrets values, **45 m / 3 s** for every admitted secret at this SHA.

| Site                 | Raw secret ID | Final scan ID | Journal key                        | Authored name             |
| -------------------- | ------------- | ------------- | ---------------------------------- | ------------------------- |
| great-blue-hole      | find-1        | secret:find-1 | great-blue-hole/secret/find-1      | Limestone side recess     |
| great-blue-hole      | find-2        | secret:find-2 | great-blue-hole/secret/find-2      | Fallen stalactite block   |
| great-blue-hole      | find-3        | secret:find-3 | great-blue-hole/secret/find-3      | Buried shell layer        |
| hunga-tonga-caldera  | find-1        | secret:find-1 | hunga-tonga-caldera/secret/find-1  | Loose ash bank            |
| hunga-tonga-caldera  | find-2        | secret:find-2 | hunga-tonga-caldera/secret/find-2  | Basalt dike fragment      |
| hunga-tonga-caldera  | find-3        | secret:find-3 | hunga-tonga-caldera/secret/find-3  | Collapse alcove           |
| blake-plateau-corals | find-1        | secret:find-1 | blake-plateau-corals/secret/find-1 | Coral-rubble arch         |
| blake-plateau-corals | find-2        | secret:find-2 | blake-plateau-corals/secret/find-2 | Isolated hardground       |
| blake-plateau-corals | find-3        | secret:find-3 | blake-plateau-corals/secret/find-3 | Sheltered microbial patch |
| lost-city            | find-1        | secret:find-1 | lost-city/secret/find-1            | Carbonate arch            |
| lost-city            | find-2        | secret:find-2 | lost-city/secret/find-2            | Old carbonate stump       |
| lost-city            | find-3        | secret:find-3 | lost-city/secret/find-3            | Quiet seep                |
| kamaehuakanaloa      | find-1        | secret:find-1 | kamaehuakanaloa/secret/find-1      | Collapsed lava pocket     |
| kamaehuakanaloa      | find-2        | secret:find-2 | kamaehuakanaloa/secret/find-2      | Iron-oxide terrace        |
| kamaehuakanaloa      | find-3        | secret:find-3 | kamaehuakanaloa/secret/find-3      | Veiled fissure            |
| axial-seamount-ashes | find-1        | secret:find-1 | axial-seamount-ashes/secret/find-1 | Fallen sulfide chimney    |
| axial-seamount-ashes | find-2        | secret:find-2 | axial-seamount-ashes/secret/find-2 | Lava pocket               |
| axial-seamount-ashes | find-3        | secret:find-3 | axial-seamount-ashes/secret/find-3 | Bacterial-mat pocket      |
| hudson-canyon        | find-1        | secret:find-1 | hudson-canyon/secret/find-1        | Snagged fishing chain     |
| hudson-canyon        | find-2        | secret:find-2 | hudson-canyon/secret/find-2        | Mudslide scar             |
| hudson-canyon        | find-3        | secret:find-3 | hudson-canyon/secret/find-3        | Whale vertebrae           |
| monterey-canyon      | find-1        | secret:find-1 | monterey-canyon/secret/find-1      | Lost instrument frame     |
| monterey-canyon      | find-2        | secret:find-2 | monterey-canyon/secret/find-2      | Whale bones               |
| monterey-canyon      | find-3        | secret:find-3 | monterey-canyon/secret/find-3      | Ledge shelter             |
| endurance            | find-1        | secret:find-1 | endurance/secret/find-1            | Dropstone cluster         |
| endurance            | find-2        | secret:find-2 | endurance/secret/find-2            | Detached rigging bundle   |
| endurance            | find-3        | secret:find-3 | endurance/secret/find-3            | Marine-snow drift         |
| titanic              | find-1        | secret:find-1 | titanic/secret/find-1              | Buried steel frame        |
| titanic              | find-2        | secret:find-2 | titanic/secret/find-2              | Cargo scatter             |
| titanic              | find-3        | secret:find-3 | titanic/secret/find-3              | Collapsed hull pocket     |
| bismarck             | find-1        | secret:find-1 | bismarck/secret/find-1             | Detached boat frame       |
| bismarck             | find-2        | secret:find-2 | bismarck/secret/find-2             | Impact-scar slump         |
| bismarck             | find-3        | secret:find-3 | bismarck/secret/find-3             | Dropped chain             |
| beebe-vent-field     | find-1        | secret:find-1 | beebe-vent-field/secret/find-1     | Spent smoker stump        |
| beebe-vent-field     | find-2        | secret:find-2 | beebe-vent-field/secret/find-2     | Basalt gully              |
| beebe-vent-field     | find-3        | secret:find-3 | beebe-vent-field/secret/find-3     | Cool fissure              |
| challenger-deep      | find-1        | secret:find-1 | challenger-deep/secret/find-1      | Trench woodfall           |
| challenger-deep      | find-2        | secret:find-2 | challenger-deep/secret/find-2      | Sediment slump            |
| challenger-deep      | find-3        | secret:find-3 | challenger-deep/secret/find-3      | Microbial patch           |

Trace of the existing runtime contract:

1. parseSecrets admits safe IDs, supported kinds, finite coordinates and nonempty
   name/text, ignoring invalid/duplicate rows. loadSecrets uses the optional
   content fetch path. placeSecrets emits `secret:<raw ID>`, the actual site,
   unidentified contact name and authored discoveryName, at lat/lon converted
   through the mission tile metadata and ground + 2 m.
2. Explore registers these contacts in Scanner's supplemental pool. Scanner
   completes the held scan, records `(landmarkId, final ID)` in DiscoveryStore,
   then emits scan:complete. Store persistence is `<site>/secret:<raw ID>`.
3. loadJournalSites → loadJournalSite → buildJournalSite admits the same secrets
   and creates `<site>/secret/<raw ID>`, preserving raw ID, authored name and
   text and linking poiIds to the final scan ID. Secret unlock readers open that
   entry and its site page. Site-level guide overview entries legitimately open
   with the site. Existing POI grouping is preserved.
4. Explore's scan listener finds the secret by final scan ID, reveals its
   authored name and calls `journal.focus(secret.def.id)`. Journal.open and
   fixEntryKey search guide-capable entries only within currentSiteId, so raw
   `find-1` at Titanic resolves to `titanic/secret/find-1`, even while the full
   Journal contains another 12 sites' `find-1` entries. The headless navigation
   fixture exercises focus/open/fixEntryKey, including the settled load callback.

## Scan, reload, controls and provenance evidence

Each of the 39 cases uses fresh Map-backed storage, a real EventBus, Scanner and
DiscoveryStore. Full Journal data loads through the existing runtime URL paths
using a local-content fetch stub. Unlike JournalData's injected-fetch fixture,
the default loader path also reads the real life document, retaining wildlife
entries as controls. The life loader's existing immutable document cache is
retained; guide/POI/species/mission/secrets are loaded anew after scanning.

placeSecrets uses the site's actual mission tile metadata and deterministic
flat ground at -100 m. Only the selected admitted contact is passed to the CPU
scanner. The stationary sub is 10 m south at the contact's -98 m depth, facing
north. No target ID, radius, duration, coordinate or definition is rewritten.
Two held 1.5 s updates leave the store empty at halfway and complete exactly
once at 3 s. This fixture establishes scan admission, not a physical route or
terrain/mesh placement.

The emitted payload is exactly `{landmarkId: <site>, poiId: secret:<raw ID>,
firstTime: true}`; the only saved key is `<site>/secret:<raw ID>`, timestamp
`2026-10-17T00:00:00.000Z`, count 1. Persisted JSON equals the live snapshot.
Both live and fresh stores unlock exactly the intended secret and legitimate
current-site overview entries. The other two local secrets, ordinary POI groups,
samples, survey species, sightings and wildlife remain locked. Every other
site and all its entries stay locked, including its actual reused raw ID.
No synthetic cross-site content is needed.

secretProgress is 1 / admitted local secret count (1/3 here). siteProgress retains
its existing totals and species counters; its only new logged credit is the
number of legitimate site-level guide entries. The secret itself receives no
ordinary primary-POI completion credit. No mission/reward policy is retested.

The loaded intended entry matches the authored name/text and existing
`journalEntryTag(entry) === 'Game addition'`; after full content reload it equals
the original entry. Source inspection confirms Journal.renderEntry uses the
single existing tag helper. Existing copyJournal and journalGroups guards cover
the provenance surface; no new DOM test or provenance/scientific policy is
introduced. No scientific claims or sources were evaluated or edited.

The existing Journal prototype fixture receives all reloaded sites, the current
site and fresh store; focus receives the raw ID, open resolves the exact secret
key and selectedId retains the raw ID. Store construction, Journal reads,
counters and focus navigation leave saved bytes unchanged, with exactly one
storage write in total and no removal. The new cases do not instantiate Explore,
generate secret meshes, run a renderer or simulate routes.

## Existing versus added guards; simplicity and rubric

- gameExplore already covers optional row rejection, synthetic secret unlock,
  local scan range/interruption, and 3120's coexisting identity/reload namespace
  controls. Those assertions remain unchanged; the namespace inventory is not
  repeated.
- modesExploration already covers synthetic sample/secret scans, mode/input
  wiring and 3080's same-instance restart/reward retention matrix. No duplicate
  restart/reward matrix is added.
- exploreRegressions already covers three synthetic late-load/newer-navigation
  focus races and two animal preview cases. All five remain unchanged.
- journalData, journalGroups, gameDiscoveryStore, gameScanner and copyJournal
  supply read-only grouping, counter, provenance, save/migration, target lifetime
  and discovery controls. 3070 first-primary and 3180 wildlife linkage remain
  separate work; automatic photos are not retested.
- Added only **39 table-driven shipped-secret cases** to the existing capability
  spec for the missing complete content → placement → Scanner persistence →
  content/store reload → raw-ID Journal focus contract.

Net simpler: no runtime machinery, UI, setting, dependency, save schema, guidance
surface, layout patch, shared-code site branch or config mutation. No new
on-screen element needs to replace an existing one. No assertion, tolerance,
budget, instance count or snapshot is relaxed; no retry, skip, inflated timeout,
package-named spec or package history in code. All 13 site identities, five
heroes, real GMRT, scanning, Journal, marine life, keyboard/pad/touch,
accessibility and Arcade-default behavior remain unchanged.

The rubric is applied to correct behavior, retained discoveries, honest existing
tags and unchanged understandable guidance/resource limits. This adds no phone
runtime cost. Readability, beauty, composition, visual Phone-OK and real-phone
acceptance remain with Claude/owner.

## Validation

- Focused: `npx vitest run tests/unit/exploreRegressions.test.ts tests/unit/gameExplore.test.ts tests/unit/modesExploration.test.ts tests/unit/journalData.test.ts tests/unit/journalGroups.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/gameScanner.test.ts tests/unit/copyJournal.test.ts --configLoader runner --cache=false`
  — **PASS, 8 files / 218 tests**, exit 0, 1.38 s; `/tmp/3210-focused.log`.
  Includes all 39 new rows and all existing assertions in those files.
- `npm run typecheck` — **PASS**, exit 0; `/tmp/3210-typecheck.log`.
- Owned test Prettier and `git diff --check` — **PASS**.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` —
  **completed, exit 1, FAIL gates (e2e=none)**. Aggregate log:
  `/tmp/3210-gates.log`; detailed logs: `.cache/runs/20261022-172138-27-RbdqKW/`.
- **PASS:** writable config preparation, strict content validation, TypeScript /
  production build, full unit suite (**192 files / 3,558 tests**, 546.32 s),
  attribution and repository-wide Prettier. No unit assertion failures, expected
  failures or skips. The production build retains its existing chunk-size warning.
- **FAIL:** Python tooling, **162 passed / 5 failed / 167 outer tests**, 9.926 s.
  Four `test_ci_build_manifest` cases fail with `spawnSync git EPERM`:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
  `test_golden_tooling` fails with `Unexpected end of JSON input` at
  `golden-manifest.test.mjs:151`. These match the previously documented failures;
  the golden JSON error's underlying cause is not established here. No unrelated
  tooling or assertion was repaired, bypassed or relaxed. No secret behavioral
  failure was reproduced.
- Final owned-file Prettier and `git diff --check` pass. Final status contains
  only the owned test and this note; HEAD remains the pinned SHA. No production,
  content, snapshot, workflow, tool or other test diff is included.

Actual e2e mode: **none**. No browser, game render, screenshot, WebGL/GPU check
or real phone test. Fetch reads shipped local JSON, not HTTP; storage is a Map,
not native browser localStorage. Headless evidence does not establish physical
approachability, secret visibility, unaided discovery/play, guidance readability,
beauty/composition, visual acceptance or real-phone performance/acceptance.
No merge, push, tag or other package's commit was made.
