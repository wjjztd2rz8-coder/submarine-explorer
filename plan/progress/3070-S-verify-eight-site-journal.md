# 3070 — S-verify: eight-site first-primary Journal integration

Director Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Pinned checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`.

The eight-site CPU linkage matrix is clean. All first primaries resolve to
authored POIs and authored Journal entries; no generated fallback or proposed
content correction is needed. No failing reproduction is retained. This audit
does not complete Sonnet's V-eight-sites-lit or certify eight-site visual acceptance.

## Authority and ownership

Read DIRECTOR rules, simplicity requirements and rubric; CONTRIBUTING-AGENTS;
the newest 2026-10-21 evening review; OVERNIGHT-LOG through run 80; STATUS;
launched briefs/log, result reports and available progress notes; and registered
worktree status/diff summaries before editing. The review leaves eight-site
acceptance unfinished and keeps visual follow-ups with Claude. Historical wrapper
PASS summaries are not evidence that browser assertions ran here.

The live launched log ends with 3070/3080/3090; no top-level queued Markdown brief
was waiting. Finished/uncollected result reports exist for 2920–2970 and
3010–3060. Other registered worktrees retain changes, including 2930/2940,
2970–3060; none touches this package's owned files. The 2920 worktree was clean;
2900/2910 notes are already in this checkout. No other package was collected,
copied, committed or used as an implementation dependency. In particular,
3040's uncollected Scanner repair and 3010/3050's terrain changes are absent
from this checkout. 3080 owns explore/modesExploration; 3090 owns Input/subInput.
No ownership conflict was found.

Only `tests/unit/journalData.test.ts` and this note are edited. Production,
authored data, other tests/snapshots, tools and DIRECTOR remain read-only.
Excluded packages 2920–3060, parked Blue Hole work and owner-blocked openings
were not audited again.

## Content derivation and matrix

`parseMissionIndex(data/landmarks/index.json)` yields 13 shipped IDs. Subtracting
the actual five-member `HERO_SITES` in Cosmetics.ts yields these eight, in index
order. No manually maintained eight-site list determines test membership.
The synthetic `_test` tile is not indexed and is not counted.

Each row selects the first parsed primary objective, resolves its exact POI ID
in shipped pois.json and requires its guide_entry to resolve in guide.json.
Journal entries are loaded with `loadJournalSites([], realContentFetch)` using
the complete real index, catalogue and content paths, before and after scanning.
Every entry key below is `<site>/poi/<entry ID>`; every saved discovery key is
`<site>/<POI ID>`.

| Site ID              | Objective ID | POI ID                 | Entry ID         | Scan / reload / isolation |
| -------------------- | ------------ | ---------------------- | ---------------- | ------------------------- |
| hunga-tonga-caldera  | rim-wall     | hunga-tonga-rim-wall   | rim-wall         | PASS / PASS / PASS        |
| blake-plateau-corals | mound-field  | blake-mound-field-core | mound-field      | PASS / PASS / PASS        |
| kamaehuakanaloa      | hiolo-north  | kh-hiolo-north         | vents            | PASS / PASS / PASS        |
| axial-seamount-ashes | mushroom     | axial-ashes-mushroom   | mushroom-inferno | PASS / PASS / PASS        |
| hudson-canyon        | coral-ledge  | hc-coral-ledge         | canyon-wall      | PASS / PASS / PASS        |
| endurance            | find-hull    | endurance-hull         | wreck-hull       | PASS / PASS / PASS        |
| bismarck             | find-hull    | bismarck-hull          | wreck-hull       | PASS / PASS / PASS        |
| challenger-deep      | leggo-site   | cd-leggo-amphipod-site | hadal-life       | PASS / PASS / PASS        |

Grouped entries remain legitimate: `vents` groups `kh-hiolo-north` and
`kh-hiolo-south`; `mushroom-inferno` groups `axial-ashes-mushroom` and
`axial-ashes-inferno`; `canyon-wall` groups `hc-coral-ledge` and `hc-canyon-wall`.
The matrix checks independent POI entries stay locked without requiring exactly
one overall entry to unlock or creating another local unscanned POI.

## Scan admission, persistence and provenance

The existing Scanner/Map-storage fixtures are shared with the preserved four-hero
regressions. One isolated CPU target sits 10 m straight ahead at the sub's depth;
the real Scanner receives held scan input for the authored scan duration.
These depths are admitted fixture inputs, using authored POI depth or mission
briefing depth and respecting min_depth_m; seabed snapping is not exercised.
All selected POIs have no minimum-depth restriction.

| Site                 | Fixture depth m | Authored radius m | Held seconds | POI / guide reconstruction | Guide confidence | Entry tag  |
| -------------------- | --------------: | ----------------: | -----------: | -------------------------- | ---------------- | ---------- |
| hunga-tonga-caldera  |             469 |               250 |            3 | false / true               | medium           | Recreation |
| blake-plateau-corals |             750 |               250 |            4 | false / false              | high             | none       |
| kamaehuakanaloa      |            1300 |               120 |            5 | true / true                | medium           | Recreation |
| axial-seamount-ashes |            1536 |                60 |            6 | true / true                | high             | Recreation |
| hudson-canyon        |          1682.6 |               180 |            5 | true / true                | medium           | Recreation |
| endurance            |            2995 |                60 |            5 | true / true                | high             | Recreation |
| bismarck             |            4213 |               100 |            5 | true / true                | medium           | Recreation |
| challenger-deep      |           10931 |               120 |            6 | true / true                | high             | Recreation |

For every row the Scanner reports first completion, saves exactly the expected
site/POI key, and opens the current page and intended entry. A fresh store and
fresh full content load retain timestamp `2026-10-17T00:00:00.000Z`, count 1,
the same key and identical mapped entry. Every other indexed site and all its
entries remain locked, including actual shared entry IDs (`wreck-hull` between
Endurance/Bismarck, `vents` with Beebe, `canyon-wall` with Monterey).

There are no repeated POI IDs across the shipped sites. To test a true same-ID
collision for every row, a separate CPU control builds that row's exact authored
POIs/guide under a different indexed site's namespace (great-blue-hole). Its
page and every entry stay locked both before/after store reload. This is a test
namespace control, not shipped content, an extra local target or a fourteenth
site in the matrix.

Loaded guide equality preserves reconstruction, confidence and parsed source
metadata; existing recreation flags and `journalEntryTag` remain intact. Hunga
specifically retains a guide-level Recreation tag despite its POI flag being
false. After scanning, full Journal content reload, unlock queries and progress
reads cause zero storage writes/removals and leave persisted bytes identical.
No scientific claims, prose quality or external references were evaluated.

## Existing versus added coverage and simplicity

Existing adequate coverage retained:

- journalData: four-hero shipped scan/reload/isolation; generic entry grouping,
  stand-ins, species linkage, rescan timestamps/counts, v1 reads without writes,
  index/extras loading, briefing retention, sample/secret and wildlife unlocks.
- heroMissionJournal: Blue Hole and Monterey first-primary linkage/summary.
- copyJournal: all 13 sites' objectives resolve to authored POIs/guide entries,
  with in-memory build/unlock readers and provenance checks. Its coverage already
  proves authored linkage, but does not run this complete-index Scanner/store path.
- gameDiscoveryStore and journalGroups: persistence, migration, newer-save
  protection and Journal read-only/discovery isolation capabilities.

Added only eight table-driven cases in the existing Journal capability spec:
complete-index loader → first-primary resolution → real Scanner → DiscoveryStore
→ content/store reload, with grouping, cross-site collision, provenance and
unchanged-byte checks. Existing hero assertions and fixture inputs are retained;
their four-ID substitute is explicitly scoped to `heroContentFetch`.

Simplicity: reuse fixtures, no production complexity or surface added, no setting,
guidance/layout change, shared-code site branch, config mutation, dependency,
schema, package-named spec, budget/tolerance/count change, retry or skip. All 13
identities, five heroes, GMRT, scan/Journal/life/input/accessibility and Arcade
default are protected by leaving their production/content behavior untouched.

## Validation

- Focused: `npx vitest run tests/unit/journalData.test.ts tests/unit/heroMissionJournal.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/journalGroups.test.ts tests/unit/gameScanner.test.ts tests/unit/copyJournal.test.ts --configLoader runner --cache=false`
  — **PASS, 6 files / 130 tests**, including all eight new rows and preserved heroes.
- Required gates: pending `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
- Formatting is restricted to the two owned files; `git diff --check` passed.

Actual e2e mode: **none**. No browser, game rendering, screenshots or GPU checks.
The injected fetch reads landmark JSON, not live HTTP; optional life loading is
disabled by the existing test-fetch contract, and secrets paths are outside this
fixture. Storage is a Map, not native browser localStorage. This proves CPU data
linkage and existing tags, not navigation, meshes, approachability, unaided play,
guidance readability, beauty/composition, visual Phone-OK, real-phone performance
or resource-limit acceptance. Those remain with Claude/owner.
