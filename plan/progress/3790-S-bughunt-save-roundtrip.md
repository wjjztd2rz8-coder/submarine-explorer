# 3790 — S-bughunt: save/load round trips

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited SHA: `37a88eade4cd77640dcb78b843d4efe34286d101`.

Clean audit: existing collected guards cover the requested supported contracts.
No new defect or material coverage gap was found. Only this progress note
changes; no production/test edit or failing-before/passing-after claim.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, simplicity rules and rubric;
REVIEWS' leading targeted entry and newest dated comprehensive entry
(2026-10-24 midday); OVERNIGHT-LOG through run 116; launched 3790–3810 briefs;
3650/3680/3740 result evidence; and relevant 3480, 3650, 3680, 3690 and 3740
progress notes. Older result wrappers say smoke PASS while their embedded
reports record failed no-e2e gates; those wrappers do not establish that the
failed commands passed.

Inventoried registered worktree HEADs, working status/diff statistics and
committed branch differences, then rechecked ownership immediately before
writing. This checkout and concurrent 3800/3810 were clean at the pinned SHA.
Finished 3760/3770/3780 remain registered but have no unique committed diff
against this checkout. Main's presets e2e edit, held 2980/3050 collision edits,
3310 journey branch, and 3320/3340/3380 browser/CI evidence remain untouched.
None claims this note or has a save capability/depth-hull spec edit. No patch
was imported or relied on from another worktree.

The brief names a depth/hull capability spec despite its persistence scope.
Existing `uiHud.test.ts` is the depth/hull capability (3690's evidence), and
the focused run includes it. No test addition is needed, so no test ownership
is widened or unrelated persistence assertion added there.

## Round 1: production trace and existing guards

Line citations refer to the audited SHA. Journal state comes from discovery
records, while cosmetics live in the research-progress record; neither is
stored as part of settings.

| Supported contract                                                                                                                                       | Production guard                                                                                                                                                                                                                               | Existing executable evidence                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supported settings survive serialization/reload, including display/accessibility choices, Custom options and hull warning preferences                    | [Save.ts:176](../../src/core/Save.ts#L176), [:250](../../src/core/Save.ts#L250), [:378](../../src/core/Save.ts#L378), [:401](../../src/core/Save.ts#L401) normalize, clone, serialize and safely persist                                       | [settingsSave.test.ts:225](../../tests/unit/settingsSave.test.ts#L225), [:318](../../tests/unit/settingsSave.test.ts#L318), [:460](../../tests/unit/settingsSave.test.ts#L460); [saveSoak.test.ts:91](../../tests/unit/saveSoak.test.ts#L91), [:445](../../tests/unit/saveSoak.test.ts#L445) assert reload equality and retained extensions                                                                                      |
| Journal namespaces, first-discovery times, counts and legitimate rescans survive reload                                                                  | [DiscoveryStore.ts:82](../../src/game/DiscoveryStore.ts#L82), [:181](../../src/game/DiscoveryStore.ts#L181), [:242](../../src/game/DiscoveryStore.ts#L242); [JournalData.ts:372](../../src/game/JournalData.ts#L372) reads the discovery store | [saveSoak.test.ts:57](../../tests/unit/saveSoak.test.ts#L57), [:183](../../tests/unit/saveSoak.test.ts#L183); [gameDiscoveryStore.test.ts:59](../../tests/unit/gameDiscoveryStore.test.ts#L59); [journalData.test.ts:464](../../tests/unit/journalData.test.ts#L464), [:691](../../tests/unit/journalData.test.ts#L691), [:791](../../tests/unit/journalData.test.ts#L791) cover reloads, retired IDs and no write on read       |
| Research balances, rewards, upgrades, best ratings, pending migration evidence and earned entitlements survive supported migrations and repeated reloads | [Save.ts:438](../../src/core/Save.ts#L438), [:578](../../src/core/Save.ts#L578); [Progress.ts:59](../../src/game/Progress.ts#L59), [:172](../../src/game/Progress.ts#L172)                                                                     | [saveSoak.test.ts:199](../../tests/unit/saveSoak.test.ts#L199), [:516](../../tests/unit/saveSoak.test.ts#L516), [:573](../../tests/unit/saveSoak.test.ts#L573) use archived runtime fixtures and production startup; [progress.test.ts:38](../../tests/unit/progress.test.ts#L38), [:80](../../tests/unit/progress.test.ts#L80), [:183](../../tests/unit/progress.test.ts#L183) cover repeated reloads and supported content IDs |
| All four cosmetic selections survive reload; damaged/unearned choices repair independently without inventing unlocks                                     | [Save.ts:542](../../src/core/Save.ts#L542), [:575](../../src/core/Save.ts#L575); [Cosmetics.ts:143](../../src/game/Cosmetics.ts#L143), [:177](../../src/game/Cosmetics.ts#L177); [Progress.ts:104](../../src/game/Progress.ts#L104)            | [cosmetics.test.ts:145](../../tests/unit/cosmetics.test.ts#L145), [:180](../../tests/unit/cosmetics.test.ts#L180), [:202](../../tests/unit/cosmetics.test.ts#L202), [:254](../../tests/unit/cosmetics.test.ts#L254) check all slots, stale siblings, truncated evidence and snapshot isolation                                                                                                                                   |
| Missing, corrupt, truncated, scalar and array payloads boot safely and accept fresh work that survives reload                                            | [Save.ts:250](../../src/core/Save.ts#L250), [:286](../../src/core/Save.ts#L286), [:582](../../src/core/Save.ts#L582); [DiscoveryStore.ts:154](../../src/game/DiscoveryStore.ts#L154) catch storage/JSON failures and normalize input           | [saveSoak.test.ts:53](../../tests/unit/saveSoak.test.ts#L53), [:334](../../tests/unit/saveSoak.test.ts#L334), [:378](../../tests/unit/saveSoak.test.ts#L378), [:407](../../tests/unit/saveSoak.test.ts#L407); [settingsSave.test.ts:346](../../tests/unit/settingsSave.test.ts#L346); [gameDiscoveryStore.test.ts:179](../../tests/unit/gameDiscoveryStore.test.ts#L179)                                                         |
| Future versions use safe session defaults and preserve original bytes; failed reads cannot erase unread data                                             | [Save.ts:269](../../src/core/Save.ts#L269), [:401](../../src/core/Save.ts#L401), [:585](../../src/core/Save.ts#L585); [DiscoveryStore.ts:159](../../src/game/DiscoveryStore.ts#L159), [:242](../../src/game/DiscoveryStore.ts#L242)            | [saveSoak.test.ts:313](../../tests/unit/saveSoak.test.ts#L313), [:323](../../tests/unit/saveSoak.test.ts#L323) check every store; [progress.test.ts:141](../../tests/unit/progress.test.ts#L141); [cosmetics.test.ts:276](../../tests/unit/cosmetics.test.ts#L276); [gameDiscoveryStore.test.ts:185](../../tests/unit/gameDiscoveryStore.test.ts#L185)                                                                           |
| Recovery/reset stays within its collection and leaves earned Journal/research data intact                                                                | Separate storage keys and guarded writes in [Save.ts:364](../../src/core/Save.ts#L364), [:416](../../src/core/Save.ts#L416), [DiscoveryStore.ts:242](../../src/game/DiscoveryStore.ts#L242)                                                    | [saveSoak.test.ts:300](../../tests/unit/saveSoak.test.ts#L300), [:516](../../tests/unit/saveSoak.test.ts#L516); [settingsSave.test.ts:171](../../tests/unit/settingsSave.test.ts#L171), [:225](../../tests/unit/settingsSave.test.ts#L225) assert other collections' bytes unchanged                                                                                                                                             |

## Round 2: overlap, policies and simplicity

Rechecked the mapping against actual assertions and serializer/parser paths.
`git diff 7351399422cdf6d8911459e2eeb0aac82722958e HEAD --` for Save,
DiscoveryStore, Progress, Cosmetics, JournalData and the seven corresponding
persistence capability specs is empty. Existing guards and the collected
[3650 migration](3650-S-bughunt-save-migration.md),
[3680 settings](3680-S-bughunt-settings-persistence.md) and
[3740 Journal](3740-S-bughunt-journal-reload.md) audits already cover this slice.
The earlier partial-current/legacy discovery-union defect was fixed in
collected commit `12097e5093abfde46a221835eb994f2e7d0dc914`; its reproduction
is retained in [3480](3480-S-bughunt-save-migration.md).

"Unchanged" means supported semantic state after normalization. Legacy versions
upgrade; named presets resolve known options; numeric settings clamp; retired
controls disappear; malformed/unearned cosmetic selections fall back per slot.
Those established policies are already asserted and are not data-loss defects.
Future payloads deliberately use defaults while preserving their exact bytes;
fresh session edits do not claim to persist over them. No ambiguous policy is
turned into a new requirement or test.

Simplicity: evidence only, with no duplicate tests, abstractions, schema,
dependencies, settings, UI, site branches, Config mutation, retries, skips,
timeouts or historical assertion changes. Existing retention supports correct,
simple and rewarding behavior; factual content/provenance is unchanged.
Real GMRT terrain, all 13 sites/five heroes, scanning, Journal, marine life,
input/accessibility and Arcade default are preserved. Readability, beauty,
touch layout and real-phone performance remain with Claude/owner.

## Validation

- `npm test -- --configLoader runner --cache=false tests/unit/settingsSave.test.ts tests/unit/saveSoak.test.ts tests/unit/progress.test.ts tests/unit/progressMigration.test.ts tests/unit/cosmetics.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/journalData.test.ts tests/unit/uiHud.test.ts`
  exited **0**: **8 files / 372 tests passed**, **1.64 s**. Log:
  `/tmp/3790-focused.log`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`: pending.

Python ran **167 tests in 9.830 s: 162 passed / 5 failed**. Four
`test_ci_build_manifest.TestCiBuildManifest` cases report `spawnSync git EPERM`:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden.TestGolden.test_golden_tooling` reports `Unexpected end of JSON
input` at `tools/tests/golden-manifest.test.mjs:151` when parsing comparison
child output. These match prior audit signatures. The EPERM failures establish
a subprocess environment block; the cause of the empty golden report is not
established here. Smallest next step is to run these unchanged checks on a
permitted runner and retain the golden child's status/stdout/stderr before
proposing a tool correction. No tooling change, retry or bypass was made.

Actual local e2e mode is **none**. No browser launch, rendering, WebGL context,
screenshots, hosted CI, GPU, unaided journey or real-phone validation. No merge,
push, tag or hosted workflow dispatch.
