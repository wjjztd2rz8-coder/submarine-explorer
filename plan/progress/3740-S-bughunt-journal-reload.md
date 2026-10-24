# 3740 — S-bughunt: Journal persistence across reload

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited SHA: `e518b3cfa5aadf58cea5ae2d19dea3f23d7f8250`.

Clean audit: the exact slice already has collected capability guards. No
supported defect or materially missing contract was found. Only this note
changes; production and tests remain unchanged. No new failing-before /
passing-after evidence or product fix is claimed.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, simplicity rules and rubric;
the topmost targeted review and newest dated comprehensive review (2026-10-24
midday); OVERNIGHT-LOG through run 114; launched 3730–3750 and 3640 briefs;
3640/3650 result artifacts; and relevant 3480, 3640, 3650, 3690 and 3290
progress evidence. The older result wrappers say smoke PASS while their
embedded final reports record failed no-e2e gates. Those wrappers are not
evidence that the failed commands passed.

Inventoried every registered worktree's HEAD, status, working diff paths/statistics
and committed branch differences against main. Rechecked ownership and the
pinned HEAD immediately before writing. No registered working or branch diff
claims the Journal/store capability files, depth/hull `uiHud.test.ts`, or this
note. Held 2980/3050 collision changes, committed 3310 journey/scanner changes,
3320/3340/3380 evidence/browser work, and V-lostcity-foot-2 source/snapshot
changes remain untouched. Adjacent 3730/3750 were clean at the same SHA during
the pre-edit recheck. No uncollected patch is used as evidence or imported.

The brief names a depth/hull spec despite its Journal scope. No test edit is
needed, so this mismatch does not require choosing or widening test ownership.

## Round 1: production trace and existing guards

Line citations refer to this pinned checkout.

| Supported contract                                                                                                                                            | Production guard                                                                                                                                                                                                                                    | Existing executable evidence                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate legacy IDs become one persistent discovery; partial current data recovers legacy evidence without replacing valid metadata                          | [DiscoveryStore.ts:82](../../src/game/DiscoveryStore.ts#L82) adds keys/maps only when absent and reconciles counters after deduplication                                                                                                            | [gameDiscoveryStore.test.ts:80](../../tests/unit/gameDiscoveryStore.test.ts#L80), [:120](../../tests/unit/gameDiscoveryStore.test.ts#L120), [:232](../../tests/unit/gameDiscoveryStore.test.ts#L232): exact keys/counters, next scan, reload snapshot and current-record precedence                                                                 |
| Retired site/POI IDs survive storage but neither create Journal rows nor unlock unrelated entries                                                             | [JournalData.ts:372](../../src/game/JournalData.ts#L372) and [:383](../../src/game/JournalData.ts#L383) check known content links; [:407](../../src/game/JournalData.ts#L407) counts content entries, not saved keys                                | [journalData.test.ts:464](../../tests/unit/journalData.test.ts#L464): duplicate legacy list and mixed partial fields, removed POI, retired site, exact progress, no retired-site fetch, preserved metadata/bytes through scan and reload                                                                                                            |
| Discovery order uses timestamp instants, including different offsets and fractional seconds                                                                   | [DiscoveryStore.ts:120](../../src/game/DiscoveryStore.ts#L120) derives firstAt chronologically; [:209](../../src/game/DiscoveryStore.ts#L209) sorts numeric parsed times                                                                            | [gameDiscoveryStore.test.ts:26](../../tests/unit/gameDiscoveryStore.test.ts#L26): late-first input, exact chronological order and firstAt, repeat scan and reload; [:69](../../tests/unit/gameDiscoveryStore.test.ts#L69) checks site isolation                                                                                                     |
| Journal ordering follows authored content and unique index IDs, independently of saved-key insertion order                                                    | [JournalData.ts:249](../../src/game/JournalData.ts#L249) groups linked entries, [:353](../../src/game/JournalData.ts#L353) assembles categories; [:479](../../src/game/JournalData.ts#L479) uses parsed index order and ordered Promise.all results | [journalData.test.ts:744](../../tests/unit/journalData.test.ts#L744) asserts the exact entry sequence; [:464](../../tests/unit/journalData.test.ts#L464) asserts duplicate index rows produce exactly reef/neighbor before and after content reload                                                                                                 |
| Repeated Scan in one dive cannot double-count; a new-dive rescan legitimately increases completed scans while retaining one discovery and its first timestamp | [Scanner.ts:481](../../src/game/Scanner.ts#L481) checks per-dive membership before record/emit; [DiscoveryStore.ts:181](../../src/game/DiscoveryStore.ts#L181) updates the same key                                                                 | [journalData.test.ts:691](../../tests/unit/journalData.test.ts#L691) asserts unchanged same-dive record, new-dive firstTime=false/count=2, identical unlocked keys and reloaded snapshot                                                                                                                                                            |
| Loading does not rewrite storage; hostile/missing storage cannot throw; future versions remain protected                                                      | [DiscoveryStore.ts:154](../../src/game/DiscoveryStore.ts#L154) reads/migrates in memory and protects unread/future saves; [:242](../../src/game/DiscoveryStore.ts#L242) catches write failures                                                      | [journalData.test.ts:791](../../tests/unit/journalData.test.ts#L791) asserts no writes; [gameDiscoveryStore.test.ts:159](../../tests/unit/gameDiscoveryStore.test.ts#L159), [:179](../../tests/unit/gameDiscoveryStore.test.ts#L179), [:185](../../tests/unit/gameDiscoveryStore.test.ts#L185) cover hostile storage, corrupt JSON and future saves |
| Refresh keeps a single provenance tag and stable entry identity                                                                                               | [Discovery.ts:181](../../src/game/Discovery.ts#L181) compares sets of unlocked IDs; [Journal.ts:501](../../src/ui/Journal.ts#L501) clears the article before rebuilding                                                                             | [journalGroups.test.ts:380](../../tests/unit/journalGroups.test.ts#L380) checks exactly one front-page caveat and addition tag through repeated refreshes; [copyJournal.test.ts:20](../../tests/unit/copyJournal.test.ts#L20) checks all 13 sites' scan links and unique entry keys                                                                 |

## Round 2: overlap and policy review

Rechecked the mapping against the actual assertions and consumers. The earlier
partial-current-field migration defect is already fixed in collected commit
`12097e5093abfde46a221835eb994f2e7d0dc914`, with the reproduction documented
in [3480](3480-S-bughunt-save-migration.md). The subsequent
[3640 Journal audit](3640-S-bughunt-journal-discovery.md) and
[3650 migration audit](3650-S-bughunt-save-migration.md) are already in HEAD.
Their existing tests cover this slice; another duplicate/unknown-ID fixture
would repeat collected work.

`git diff 7351399422cdf6d8911459e2eeb0aac82722958e HEAD --` for the
DiscoveryStore, JournalData, Discovery, Scanner and Journal sources and the
store/data/groups capability specs is empty: those audited paths have not
changed since 3640's pinned checkout.

Persistent `stats.scans` counts completed scans, including legitimate rescans
on later dives and historical retired targets. It is not a count of visible
Journal rows. A site overview or linked species can unlock with a POI; that
is intentional content linkage rather than a second discovery. Equal-time
tie-breaking has no separate documented product policy, so no new secondary
sort or assertion is proposed. No unsupported input policy is invented.

Simplicity: evidence only, no duplicate tests or new runtime machinery. No UI,
settings, schema, dependencies, site branches, config mutation, retries, skips,
timeouts, budgets or historical assertions change. Retained discoveries support
correct, simple, rewarding behavior; authored facts and provenance stay intact.
All 13 sites, five heroes, real GMRT terrain, scanning/Journal/life, input,
accessibility and Arcade default are preserved. Visual readability/beauty,
touch layout and real-phone performance remain with Claude/owner.

## Validation

- `./node_modules/.bin/vitest run tests/unit/gameDiscoveryStore.test.ts tests/unit/journalData.test.ts tests/unit/gameScanner.test.ts tests/unit/copyJournal.test.ts tests/unit/journalGroups.test.ts tests/unit/heroMissionJournal.test.ts --configLoader runner --cache=false`
  — **PASS, exit 0; 6 files / 247 tests**, 817 ms. Log:
  `/tmp/3740-focused.log`.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`
  — **FAIL, exit 1; `FAIL gates (e2e=none)`**. Writable config preparation,
  strict content validation, TypeScript/production build, full unit suite,
  attribution and repository-wide Prettier all **passed**. Units:
  **192 files / 4,148 passed / 4 existing expected failures (4,152 total)**,
  **808.04 s**. Existing collision expected-failure cases remain untouched.
  The build emitted its existing chunk-size advisory. Aggregate log:
  `/tmp/3740-gates.log`; individual logs:
  `.cache/runs/20261024-093104-7-8NFBWL/`.

Python ran **167 tests in 9.942 s: 162 passed / 5 failed**. Four
`test_ci_build_manifest.TestCiBuildManifest` cases fail with `spawnSync git
EPERM`: `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden.TestGolden.test_golden_tooling` fails with `Unexpected end of JSON
input` at `tools/tests/golden-manifest.test.mjs:151` when parsing a comparison
child's empty report. These match previously recorded failure signatures;
the four EPERM failures establish a subprocess environment block, while the
empty-report cause is not established here. Smallest proposed next step:
run these unchanged checks on a permitted runner and capture the golden
child's status/stderr/stdout before proposing any tool correction. Tooling
and its assertions remain untouched; no retry or bypass was made.

Final `./node_modules/.bin/prettier --check plan/progress/3740-S-bughunt-journal-reload.md`
and `git diff --check` passed. Rechecked registered worktree status and working /
branch diffs for the candidate capability files and this note: no conflicting
ownership appeared. HEAD remains pinned; final status contains only this note.

Actual local e2e mode: **none**. Focused capabilities use CPU logic, local
content and storage/DOM doubles. No browser launch, game rendering, WebGL
context, screenshots, image/pixel acceptance, hosted CI, GPU, unaided journey,
native storage/device interaction or real-phone validation is claimed. No
merge, push, tag or hosted workflow dispatch.
