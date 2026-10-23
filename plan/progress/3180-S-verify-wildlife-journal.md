# 3180 — S-verify: shipped wildlife to Journal

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**, the highest eligible nonvisual Codex entry. Audited SHA:
`a545afe00196649a2d6de4cf1c8039851aba9074` (checkout and main at intake).

The complete CPU linkage matrix is clean: **100 distinct site/species links,
13 indexed sites, 46 catalogue species**. All first wildlife scans unlock their
intended entry and site overview and survive a fresh DiscoveryStore load.
No shipped missing entry or supported behavioral failure was reproduced; no
content correction is proposed. This is separate from mission-POI linkage,
optional target namespaces, target lifetime, spawn or opening acceptance.

## Authority, prior evidence and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR rules/simplicity/rubric, the newest
2026-10-22 comprehensive review, OVERNIGHT-LOG tail through run 82, and
2320/S-bughunt-16, 2390/S-bughunt-17, 3040 and 3070 evidence. The standing
rubric is applied here to correct unlocks, retained discoveries, existing
provenance and understandable existing guidance. Visual readability, beauty,
composition and visual Phone-OK remain Claude/owner judgments.

2320 repaired wildlife-first site unlocking; its Journal regression records
one Monterey animal directly in the store. 2390 adds legacy-array-save UI
isolation on phone/desktop DOM fixtures. 3040 covers real Life target membership
loss; 3070 covers first primaries at eight non-hero sites. These guards are
preserved. Read the launched 3110 photo-handoff and 3120 identity briefs and
available last/round logs: their last reports are empty, no result/progress
notes were available in the checkout/main cache, and the round logs show
photo work and an eight-spec/138-test optional-identity pass respectively.
No missing completion report is treated as a failure or browser pass.

Read 3130–3150 result reports and live worktree progress notes and rechecked
queue/launched briefs/log through 3180 plus all registered worktree statuses,
diff file lists/statistics and commits ahead of main before editing. No queued
top-level Markdown brief was waiting. The finished 3130 terrain/camera/mission/
scarp probes, 3140 all-site spawn tests and 3150 CI workflow edits remain in
separate worktrees. 2980 owns scarp code/tests, 3050 owns Terrain/seam tests;
these repairs remain unmerged and unused. 3160 owns biomeFloorVariety tests,
3170 owns lowSweepReadability tests. No other registered worktree claimed
journalData.test.ts or this note; no ownership conflict was found. No package
was collected, copied, committed or used as an uncollected implementation
dependency. No excluded audit was repeated.

Only `tests/unit/journalData.test.ts` and this note are edited. All production,
authored data, schemas, ID policies, snapshots, workflows, tools and DIRECTOR
remain read-only. No parked Blue Hole, DONE/CUT visual item or owner-blocked
opening decision was reopened.

## Trace and fixture contract

- Membership comes from `parseMissionIndex(data/landmarks/index.json)`, with no
  manually maintained site subset or synthetic `_test` membership. Wildlife
  comes from `parseLifeDoc(data/life/life.json)` and final `SPECIES_BY_ID`
  definitions, including catalogue defaults/overrides.
- Life.updateTargets emits one live target per species with
  `LIFE_ID_PREFIX + speciesId`, the real site ID, catalogue common name and
  scanSeconds. Its radius may include body length and the resolved mode floor.
  The test imports the real prefix and uses catalogue scanRadius as a
  conservative admitted radius; it does not instantiate Life, simulate animals,
  construct meshes, render, or retest target selection/removal.
- The fixture uses the existing realContentFetch paths and real guide/POI/
  survey-species loaders plus real catalogue parsing. It **explicitly supplies
  the real parsed life document to buildJournalSite**. loadJournalSite
  intentionally supplies no life when fetchFn is present; an empty wildlife
  list from that custom-fetch path is not a shipped product defect.
- Each isolated CPU target is straight ahead at the midpoint of the actual
  common/rare rule's intersection with the catalogue depth band, at distance
  min(5 m, catalogue radius / 2). Scanner receives the existing extra-target
  pool and held scan input for the actual catalogue duration. The observed
  completion carries `poiId: "life:<species>"`, `landmarkId: <site>` and
  `firstTime: true`; Scanner records before emitting that completion. The app
  life system passes contentLandmark as the site identity, installs life.targets
  through setExtraTargets and refreshes the Journal through onLifeScan for
  known catalogue animals.
- DiscoveryStore persists `<site>/life:<species>` in the unchanged
  `subexplorer.discoveries.v1` document. JournalData builds
  `<site>/life/<species>` and unlocks it with lifeDiscoveryId; any such scan
  opens that site's page and site-level guide entries. POI-backed guide entries
  and **survey species.json records** keep their independent POI/text-linkage
  contract. A wildlife scan neither invents a POI link nor identifies a survey
  record, even when its scientific/common name resembles the scanned animal.

## Index-derived common/rare linkage table

C = common spawn row; R = rare-only row; C+R = both, deliberately one Journal
entry with `rare: false` (common entry wins). Parsed tables contain **89 common
rows + 13 rare rules**, with two overlaps: Beebe vent shrimp and Challenger
hadal amphipods. Thus there are **100 entries**, including **11 rare-only
entries**, rather than 102. The table lists every final scan ID and entry key;
its order follows the shipped index then common rows and any new rare species.
Range/hold values are the final catalogue numbers (metres/seconds), not a
spawn-frequency, body-size, encounter-availability or approachability claim.
Every row's first-scan/reload/isolation/counter result is **PASS**.

| Site                 | Species ID           | Pool | Final scan ID               | Journal entry key                            | Range m / hold s |
| -------------------- | -------------------- | ---- | --------------------------- | -------------------------------------------- | ---------------- |
| great-blue-hole      | blue-tang            | C    | `life:blue-tang`            | `great-blue-hole/life/blue-tang`             | 26 / 2.2         |
| great-blue-hole      | french-grunt         | C    | `life:french-grunt`         | `great-blue-hole/life/french-grunt`          | 26 / 2.2         |
| great-blue-hole      | stoplight-parrotfish | C    | `life:stoplight-parrotfish` | `great-blue-hole/life/stoplight-parrotfish`  | 26 / 2.2         |
| great-blue-hole      | nassau-grouper       | C    | `life:nassau-grouper`       | `great-blue-hole/life/nassau-grouper`        | 29 / 2.4         |
| great-blue-hole      | reef-shark           | C    | `life:reef-shark`           | `great-blue-hole/life/reef-shark`            | 42 / 3.2         |
| great-blue-hole      | brain-coral          | C    | `life:brain-coral`          | `great-blue-hole/life/brain-coral`           | 19 / 2           |
| great-blue-hole      | comb-jelly           | C    | `life:comb-jelly`           | `great-blue-hole/life/comb-jelly`            | 19 / 2           |
| great-blue-hole      | whale-shark          | R    | `life:whale-shark`          | `great-blue-hole/life/whale-shark`           | 64 / 3.4         |
| hunga-tonga-caldera  | blackfin-chromis     | C    | `life:blackfin-chromis`     | `hunga-tonga-caldera/life/blackfin-chromis`  | 26 / 2.2         |
| hunga-tonga-caldera  | rainbow-wrasse       | C    | `life:rainbow-wrasse`       | `hunga-tonga-caldera/life/rainbow-wrasse`    | 26 / 2.2         |
| hunga-tonga-caldera  | comb-jelly           | C    | `life:comb-jelly`           | `hunga-tonga-caldera/life/comb-jelly`        | 19 / 2           |
| hunga-tonga-caldera  | atolla               | C    | `life:atolla`               | `hunga-tonga-caldera/life/atolla`            | 22 / 2           |
| hunga-tonga-caldera  | humpback-whale       | R    | `life:humpback-whale`       | `hunga-tonga-caldera/life/humpback-whale`    | 67 / 3.6         |
| blake-plateau-corals | cold-water-coral     | C    | `life:cold-water-coral`     | `blake-plateau-corals/life/cold-water-coral` | 21 / 2           |
| blake-plateau-corals | anemone              | C    | `life:anemone`              | `blake-plateau-corals/life/anemone`          | 14 / 2           |
| blake-plateau-corals | sea-lily             | C    | `life:sea-lily`             | `blake-plateau-corals/life/sea-lily`         | 16 / 2           |
| blake-plateau-corals | wreckfish            | C    | `life:wreckfish`            | `blake-plateau-corals/life/wreckfish`        | 29 / 2.4         |
| blake-plateau-corals | rattail              | C    | `life:rattail`              | `blake-plateau-corals/life/rattail`          | 32 / 2.4         |
| blake-plateau-corals | blue-shark           | C    | `life:blue-shark`           | `blake-plateau-corals/life/blue-shark`       | 45 / 3.2         |
| blake-plateau-corals | comb-jelly           | C    | `life:comb-jelly`           | `blake-plateau-corals/life/comb-jelly`       | 19 / 2           |
| blake-plateau-corals | atolla               | C    | `life:atolla`               | `blake-plateau-corals/life/atolla`           | 22 / 2           |
| blake-plateau-corals | sixgill-shark        | R    | `life:sixgill-shark`        | `blake-plateau-corals/life/sixgill-shark`    | 48 / 3.2         |
| lost-city            | wreckfish            | C    | `life:wreckfish`            | `lost-city/life/wreckfish`                   | 29 / 2.4         |
| lost-city            | cold-water-coral     | C    | `life:cold-water-coral`     | `lost-city/life/cold-water-coral`            | 21 / 2           |
| lost-city            | anemone              | C    | `life:anemone`              | `lost-city/life/anemone`                     | 14 / 2           |
| lost-city            | rattail              | C    | `life:rattail`              | `lost-city/life/rattail`                     | 32 / 2.4         |
| lost-city            | comb-jelly           | C    | `life:comb-jelly`           | `lost-city/life/comb-jelly`                  | 19 / 2           |
| lost-city            | atolla               | C    | `life:atolla`               | `lost-city/life/atolla`                      | 22 / 2           |
| lost-city            | blue-shark           | C    | `life:blue-shark`           | `lost-city/life/blue-shark`                  | 45 / 3.2         |
| lost-city            | sixgill-shark        | R    | `life:sixgill-shark`        | `lost-city/life/sixgill-shark`               | 48 / 3.2         |
| kamaehuakanaloa      | hawaii-shrimp        | C    | `life:hawaii-shrimp`        | `kamaehuakanaloa/life/hawaii-shrimp`         | 14 / 2           |
| kamaehuakanaloa      | cutthroat-eel        | C    | `life:cutthroat-eel`        | `kamaehuakanaloa/life/cutthroat-eel`         | 29 / 2.4         |
| kamaehuakanaloa      | golden-coral         | C    | `life:golden-coral`         | `kamaehuakanaloa/life/golden-coral`          | 19 / 2           |
| kamaehuakanaloa      | rattail              | C    | `life:rattail`              | `kamaehuakanaloa/life/rattail`               | 32 / 2.4         |
| kamaehuakanaloa      | comb-jelly           | C    | `life:comb-jelly`           | `kamaehuakanaloa/life/comb-jelly`            | 19 / 2           |
| kamaehuakanaloa      | atolla               | C    | `life:atolla`               | `kamaehuakanaloa/life/atolla`                | 22 / 2           |
| kamaehuakanaloa      | blue-shark           | C    | `life:blue-shark`           | `kamaehuakanaloa/life/blue-shark`            | 45 / 3.2         |
| kamaehuakanaloa      | sperm-whale          | R    | `life:sperm-whale`          | `kamaehuakanaloa/life/sperm-whale`           | 67 / 3.6         |
| axial-seamount-ashes | tubeworm             | C    | `life:tubeworm`             | `axial-seamount-ashes/life/tubeworm`         | 18 / 2           |
| axial-seamount-ashes | blob-sculpin         | C    | `life:blob-sculpin`         | `axial-seamount-ashes/life/blob-sculpin`     | 29 / 2.4         |
| axial-seamount-ashes | rattail              | C    | `life:rattail`              | `axial-seamount-ashes/life/rattail`          | 32 / 2.4         |
| axial-seamount-ashes | anemone              | C    | `life:anemone`              | `axial-seamount-ashes/life/anemone`          | 14 / 2           |
| axial-seamount-ashes | comb-jelly           | C    | `life:comb-jelly`           | `axial-seamount-ashes/life/comb-jelly`       | 19 / 2           |
| axial-seamount-ashes | atolla               | C    | `life:atolla`               | `axial-seamount-ashes/life/atolla`           | 22 / 2           |
| axial-seamount-ashes | blue-shark           | C    | `life:blue-shark`           | `axial-seamount-ashes/life/blue-shark`       | 45 / 3.2         |
| axial-seamount-ashes | giant-squid          | R    | `life:giant-squid`          | `axial-seamount-ashes/life/giant-squid`      | 61 / 3.4         |
| hudson-canyon        | silver-hake          | C    | `life:silver-hake`          | `hudson-canyon/life/silver-hake`             | 26 / 2.2         |
| hudson-canyon        | blue-shark           | C    | `life:blue-shark`           | `hudson-canyon/life/blue-shark`              | 45 / 3.2         |
| hudson-canyon        | deep-coral           | C    | `life:deep-coral`           | `hudson-canyon/life/deep-coral`              | 19 / 2           |
| hudson-canyon        | deepwater-octopus    | C    | `life:deepwater-octopus`    | `hudson-canyon/life/deepwater-octopus`       | 26 / 2.6         |
| hudson-canyon        | comb-jelly           | C    | `life:comb-jelly`           | `hudson-canyon/life/comb-jelly`              | 19 / 2           |
| hudson-canyon        | atolla               | C    | `life:atolla`               | `hudson-canyon/life/atolla`                  | 22 / 2           |
| hudson-canyon        | rattail              | C    | `life:rattail`              | `hudson-canyon/life/rattail`                 | 32 / 2.4         |
| hudson-canyon        | sperm-whale          | R    | `life:sperm-whale`          | `hudson-canyon/life/sperm-whale`             | 67 / 3.6         |
| monterey-canyon      | pacific-hake         | C    | `life:pacific-hake`         | `monterey-canyon/life/pacific-hake`          | 26 / 2.2         |
| monterey-canyon      | sablefish            | C    | `life:sablefish`            | `monterey-canyon/life/sablefish`             | 29 / 2.4         |
| monterey-canyon      | nanomia              | C    | `life:nanomia`              | `monterey-canyon/life/nanomia`               | 22 / 2           |
| monterey-canyon      | sea-pen              | C    | `life:sea-pen`              | `monterey-canyon/life/sea-pen`               | 19 / 2           |
| monterey-canyon      | sun-star             | C    | `life:sun-star`             | `monterey-canyon/life/sun-star`              | 16 / 2           |
| monterey-canyon      | sea-lion             | C    | `life:sea-lion`             | `monterey-canyon/life/sea-lion`              | 38 / 2.6         |
| monterey-canyon      | vampire-squid        | C    | `life:vampire-squid`        | `monterey-canyon/life/vampire-squid`         | 22 / 2.6         |
| monterey-canyon      | comb-jelly           | C    | `life:comb-jelly`           | `monterey-canyon/life/comb-jelly`            | 19 / 2           |
| monterey-canyon      | atolla               | C    | `life:atolla`               | `monterey-canyon/life/atolla`                | 22 / 2           |
| monterey-canyon      | rattail              | C    | `life:rattail`              | `monterey-canyon/life/rattail`               | 32 / 2.4         |
| monterey-canyon      | humpback-whale       | R    | `life:humpback-whale`       | `monterey-canyon/life/humpback-whale`        | 67 / 3.6         |
| endurance            | anemone              | C    | `life:anemone`              | `endurance/life/anemone`                     | 14 / 2           |
| endurance            | sea-lily             | C    | `life:sea-lily`             | `endurance/life/sea-lily`                    | 16 / 2           |
| endurance            | glass-sponge         | C    | `life:glass-sponge`         | `endurance/life/glass-sponge`                | 16 / 2           |
| endurance            | squat-lobster        | C    | `life:squat-lobster`        | `endurance/life/squat-lobster`               | 14 / 2           |
| endurance            | rattail              | C    | `life:rattail`              | `endurance/life/rattail`                     | 32 / 2.4         |
| endurance            | atolla               | C    | `life:atolla`               | `endurance/life/atolla`                      | 22 / 2           |
| endurance            | comb-jelly           | C    | `life:comb-jelly`           | `endurance/life/comb-jelly`                  | 19 / 2           |
| endurance            | weddell-seal         | R    | `life:weddell-seal`         | `endurance/life/weddell-seal`                | 42 / 2.8         |
| titanic              | golden-coral         | C    | `life:golden-coral`         | `titanic/life/golden-coral`                  | 19 / 2           |
| titanic              | brittle-star         | C    | `life:brittle-star`         | `titanic/life/brittle-star`                  | 14 / 2           |
| titanic              | rattail              | C    | `life:rattail`              | `titanic/life/rattail`                       | 32 / 2.4         |
| titanic              | anemone              | C    | `life:anemone`              | `titanic/life/anemone`                       | 14 / 2           |
| titanic              | atolla               | C    | `life:atolla`               | `titanic/life/atolla`                        | 22 / 2           |
| titanic              | comb-jelly           | C    | `life:comb-jelly`           | `titanic/life/comb-jelly`                    | 19 / 2           |
| titanic              | blue-shark           | C    | `life:blue-shark`           | `titanic/life/blue-shark`                    | 45 / 3.2         |
| titanic              | dumbo-octopus        | R    | `life:dumbo-octopus`        | `titanic/life/dumbo-octopus`                 | 26 / 2.6         |
| bismarck             | long-tailed-cucumber | C    | `life:long-tailed-cucumber` | `bismarck/life/long-tailed-cucumber`         | 16 / 2           |
| bismarck             | amperima             | C    | `life:amperima`             | `bismarck/life/amperima`                     | 14 / 2           |
| bismarck             | brittle-star         | C    | `life:brittle-star`         | `bismarck/life/brittle-star`                 | 14 / 2           |
| bismarck             | rattail              | C    | `life:rattail`              | `bismarck/life/rattail`                      | 32 / 2.4         |
| bismarck             | atolla               | C    | `life:atolla`               | `bismarck/life/atolla`                       | 22 / 2           |
| bismarck             | comb-jelly           | C    | `life:comb-jelly`           | `bismarck/life/comb-jelly`                   | 19 / 2           |
| bismarck             | blue-shark           | C    | `life:blue-shark`           | `bismarck/life/blue-shark`                   | 45 / 3.2         |
| bismarck             | dumbo-octopus        | R    | `life:dumbo-octopus`        | `bismarck/life/dumbo-octopus`                | 26 / 2.6         |
| beebe-vent-field     | beebe-shrimp         | C+R  | `life:beebe-shrimp`         | `beebe-vent-field/life/beebe-shrimp`         | 14 / 2           |
| beebe-vent-field     | anemone              | C    | `life:anemone`              | `beebe-vent-field/life/anemone`              | 14 / 2           |
| beebe-vent-field     | squat-lobster        | C    | `life:squat-lobster`        | `beebe-vent-field/life/squat-lobster`        | 14 / 2           |
| beebe-vent-field     | comb-jelly           | C    | `life:comb-jelly`           | `beebe-vent-field/life/comb-jelly`           | 19 / 2           |
| beebe-vent-field     | atolla               | C    | `life:atolla`               | `beebe-vent-field/life/atolla`               | 22 / 2           |
| beebe-vent-field     | blue-shark           | C    | `life:blue-shark`           | `beebe-vent-field/life/blue-shark`           | 45 / 3.2         |
| challenger-deep      | hadal-amphipod       | C+R  | `life:hadal-amphipod`       | `challenger-deep/life/hadal-amphipod`        | 14 / 2           |
| challenger-deep      | mariana-snailfish    | C    | `life:mariana-snailfish`    | `challenger-deep/life/mariana-snailfish`     | 29 / 2.4         |
| challenger-deep      | comb-jelly           | C    | `life:comb-jelly`           | `challenger-deep/life/comb-jelly`            | 19 / 2           |
| challenger-deep      | atolla               | C    | `life:atolla`               | `challenger-deep/life/atolla`                | 22 / 2           |
| challenger-deep      | blue-shark           | C    | `life:blue-shark`           | `challenger-deep/life/blue-shark`            | 45 / 3.2         |

Kamaʻehuakanaloa's **Crown jelly** is catalogue ID `atolla`: final scan ID
`life:atolla`, persisted key `kamaehuakanaloa/life:atolla`, Journal key
`kamaehuakanaloa/life/atolla`, catalogue radius **22 m**, hold **2 s**. It is a
common-table entry; the mission POI is not required to unlock it. This audit
makes no claim that an opening frame necessarily contains this animal.

## Scan, reload, isolation and counters

Every one of the 100 cases starts with a separate empty Map-backed storage and
real DiscoveryStore/Scanner/EventBus. All sites and the selected site's entries
start locked; wildlife progress is 0 / that site's deduplicated entry count.
The first completion produces exactly one discovery key and **one storage
write** with timestamp `2026-10-17T00:00:00.000Z`, count 1 and stats.scans 1.
The asserted persisted JSON and fresh-store read agree.

Both the live and fresh store unlock exactly the selected wildlife entry and
all legitimate site-level overview entries. Other wildlife, ordinary POI,
sighting, and survey entries stay locked. Every other indexed site and every
one of its entries stay locked, including its same-species entry wherever one
exists; other sites' wildlife scanned counters remain 0. No synthetic species
is added at sites lacking that animal. The selected site's wildlife counter
is **1 / total** before and after reload; siteProgress counts only its
site-level entries as newly logged and keeps the survey counters unchanged.

Journal reads, counters and fresh-store construction leave saved bytes and
storage-write/removal history unchanged. Holding Scan again in the same dive
adds no completion, count or write. After Scanner.resetDive, a supported new-dive
scan emits firstTime:false; reload retains the original timestamp, count 2 and
stats.scans 2, while wildlife progress remains **1 / total**. The discovery is
per species per site, not per individual or per common/rare appearance. No
new per-animal behavior is imposed.

All 100 entries retain their catalogue definition/name and parsed Journal info
and use the existing `journalEntryTag(entry) === "Game addition"`. Common/rare
overlap does not duplicate an entry or tag. Read-only UI inspection confirms
Journal.renderEntry creates one provenance span via that helper before its
life branch; copyJournal checks tag/prose policy and journalGroups checks the
single-tag surface. This package adds no DOM/rendering test or provenance
policy, wording, source or scientific claim change.

## Existing versus added guards and simplicity

Existing coverage was sufficient for catalogue membership/text/depth/budget
sanity (lifeTables), generic unlocks and rescans (journalData), legacy-save UI
isolation (journalGroups), persistence/migration (gameDiscoveryStore), tag and
copy policy (copyJournal), and real Life/Scanner target lifetime
(gameScanner). These specs ran read-only as controls. 3070's hero/non-hero
primary regressions remain intact. 3120's combined namespaces and 3110's photo
scheduling are separate capabilities and were not reinvented here.

The materially missing guard was the complete shipped common/**rare-only**
life-table → catalogue scan payload → Scanner → persisted discovery →
Journal entry/overview/counter path, isolated across all 13 sites. Added **100
table-driven cases to the existing journalData capability spec** using its
content and storage fixtures. No package-named spec, production helper,
behavior change, entry addition, retry, skip, tolerance/budget/instance-count
change or snapshot update was needed. No historical assertion was weakened.

Net simpler: no runtime machinery, guidance surface, layout, setting,
shared-code site branch, config mutation, dependency or save schema added.
All 13 identities, five heroes, real GMRT, scanning/Journal/life,
keyboard/pad/touch/accessibility and Arcade-default behavior remain protected
without changing their implementation or authored content. Existing guidance
still says to face an animal and hold Scan, and survey guidance remains
separate. Resource-limit assertions are retained; this audit makes no new
runtime budget or device-performance measurement.

## Validation

- Focused headless command:
  `npx vitest run tests/unit/journalData.test.ts tests/unit/lifeTables.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/journalGroups.test.ts tests/unit/gameScanner.test.ts tests/unit/copyJournal.test.ts --configLoader runner --cache=false`:
  **PASS, 6 files / 248 tests**, including all 100 added rows and unchanged
  life/discovery/UI-model/Scanner/copy controls. Initial run 0.764 s; final
  confirmation 0.799 s, exit 0; `/tmp/3180-focused.log`.
- `npm run typecheck`: **PASS**, exit 0. `git diff --check`: **PASS**.
- Required command: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **completed, exit 1, FAIL gates (e2e=none)**. Aggregate log:
  `/tmp/3180-gates.log`; detailed logs:
  `.cache/runs/20261022-125723-8-Z8srOI/`.
- **PASS:** writable config preparation, strict content validation, TypeScript/
  production build, full units (**192 files / 3,619 tests**, 534.97 s),
  attribution and repository-wide Prettier. There were **no unit assertion
  failures, expected failures or skips**. No wildlife behavioral defect was
  reproduced. Production build retains its existing chunk-size warning.
- **FAIL:** Python tooling, **162 passed / 5 failed / 167 outer tests**, 9.959 s.
  Four test_ci_build_manifest cases fail with `spawnSync git EPERM`;
  test_golden_tooling fails with `Unexpected end of JSON input` in
  golden-manifest.test.mjs. These match earlier reported failures. The golden
  JSON error's underlying cause is not established by this audit. No unrelated
  tooling or assertion was repaired, bypassed or relaxed.
- The final progress-note update, owned-file Prettier check and `git diff --check`
  pass. Final status contains only the owned test and matching progress note;
  no production/data/snapshot/tool/workflow diff or commit/merge/push/tag.
  Historical wrapper PASS labels are not substituted for these actual results.

Actual e2e mode: **none**. No browser launch, game rendering, screenshots,
WebGL, pixel readback or real phone test occurred. Fake storage is a Map,
not browser localStorage; fetch fixtures read on-disk shipped JSON, not live
HTTP. The added matrix represents Life targets conservatively without
instantiating the simulation or renderer. Existing read-only Scanner controls
exercise real Life CPU fixtures, and the required full suite includes existing
geometry/simulation checks; no new mesh or rendering fixture was added.
No body-length range boundary, target lifetime/removal matrix, primary completion, rewards
migration, sample restart or photo capture/export matrix is repeated.

These results establish CPU content linkage, retained discoveries and existing
provenance/counter contracts. They do **not** establish wildlife spawn
frequency, encounter timing, approachability, image quality, scientific
accuracy, unaided play, GPU behavior, guidance readability, beauty/composition,
visual Phone-OK, real-phone performance or acceptance. Those remain outside
this nonvisual S-verify audit.
