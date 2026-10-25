# 4180 — S-bughunt: save migration coverage check

DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**, 2026-10-25.
Audited HEAD: **`c4c6d2a97ad6e768211aa76c524b6648913ee02a`**, pinned before
inspection; initial worktree clean.

**Stopped at task 1's explicit duplicate-coverage condition.** Existing tests
and collected notes cover this exact settings/gameplay-mode, hull-access,
Journal-discovery and dive-rating migration/reload slice. The relevant source,
tests and shipped data are unchanged since the latest applicable audit.
No new defect or correction is proposed. This is a coverage review, with no
fresh runtime diagnostic or test-pass claim.

Read CONTRIBUTING-AGENTS.md, DIRECTOR (Backlog, seven simplicity rules and
rubric), the last 160 lines of OVERNIGHT-LOG through run 146, and every available
4000–4140 progress note. There is no 4100 progress file; run 143 explicitly
records that task finishing without a note. No applicable AGENTS.md was found
in the checked workspace and parent locations. Also read the earlier
3480, 3790 and 3870 save reports and inspected the current capability assertions.

## Existing evidence and why it covers this slice

| Requested boundary                                                    | Existing evidence inspected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Older settings shapes, sanitising, defaults and gameplay modes        | [3870](3870-S-bughunt-save-migration.md) maps fallback/version/field-repair and storage-protection policies. [settingsSave](../../tests/unit/settingsSave.test.ts) covers defaults, malformed siblings, migration, future versions, unavailable storage and independent reset. [saveSoak](../../tests/unit/saveSoak.test.ts) checks settings versions unversioned/0/1/2/3 and, at line 445, every retired gameplay-field combination through 30 edits/reloads and reset, retaining unknown data and original legacy bytes.                                                                                                                                                        |
| Fresh reconstruction after live mode transitions                      | [4120](4120-S-bughunt-difficulty-modes.md) records 16 scenarios, 128 transitions and 128 save reloads, including Custom inheritance and reset, with equality against fresh resolution. Its probe uses real Save and mode consumers; [f2-modes](../../tests/unit/f2-modes.test.ts) supplies the existing capability guards.                                                                                                                                                                                                                                                                                                                                                        |
| Historical hull unlocks/access, earned selections and legacy progress | [3790](3790-S-bughunt-save-roundtrip.md) maps archived-runtime fixtures, balances, upgrades, entitlements and repeated startup reloads. Current saveSoak imports all three archived fixtures and calls production `loadSavedProgress`. [4090](4090-S-bughunt-hull-unlock-progress.md) records 189 hull checks across three save shapes, reloads, modes and depth boundaries. Current [Progress](../../src/game/Progress.ts) lines 89–94 make access unconditional and fit hulls by depth; an old purchase threshold is retired policy, not missing migration. [cosmetics](../../tests/unit/cosmetics.test.ts) guards earned selections and per-slot repair.                       |
| Journal discoveries across older shapes and subsequent writes         | [3480](3480-S-bughunt-save-migration.md) records the already-fixed partial-current/legacy-union loss. [gameDiscoveryStore](../../tests/unit/gameDiscoveryStore.test.ts) lines 202–253 assert array/map migration, field repair, current metadata precedence and legacy recovery. saveSoak lines 57–89 and 183–197 check namespace/count/timestamp retention through write/reload; [journalData](../../tests/unit/journalData.test.ts) checks actual content linkage, repeat scans and read-without-rewrite.                                                                                                                                                                       |
| Dive ratings, migration retries and reload consistency                | [4040](4040-S-bughunt-debrief-save.md) covers quit/debrief, completed-primary reload, settings isolation and legacy startup; its resolved-objective correction is present in current [progress](../../tests/unit/progress.test.ts) lines 253–302. [4090](4090-S-bughunt-hull-unlock-progress.md) covers improvement, abort, partial legacy evidence and reloaded bests, and fixes live-banner stars without changing the save format. [progressMigration](../../tests/unit/progressMigration.test.ts) reads shipped mission JSON and checks historical route credit and repeated migration/reload equality, including failed-content retries without importing later discoveries. |

Historical completed results, **as recorded by those notes**, include 3790's
8 files / 372 tests, 3870's 6 / 190, 4040's final focused 10 / 413 and final
full unit 4,237 passed plus 4 expected failures, 4090's focused 8 / 284, and
4120's 7 / 147 and full unit 4,239 passed plus 4 expected failures. These are
existing evidence, not runs repeated or independently reproduced by 4180.
4090 still labels its full final unit run pending; no pass is inferred for it.

4090 also checked all 13 shipped sites, 52 placed POIs and 49 objectives on
real heightmaps, with zero unresolved references. That is prior numeric
evidence. This review does not repeat its terrain or content diagnostic.

## New inspection evidence and exact checks

All commands ran locally from this worktree. Intake used `git rev-parse HEAD`,
`git status --short`, `cat CONTRIBUTING-AGENTS.md`, `cat plan/DIRECTOR.md`,
`tail -160 plan/OVERNIGHT-LOG.md`, and `cat`/`sed` reads of the progress and
capability files cited above. The available-note inventory was:

```bash
wc -l plan/progress/40[0-9][0-9]-*.md plan/progress/41[0-4][0-9]-*.md
rg --files plan/progress | rg '^plan/progress/4100-'
```

The inventory lists 14 progress files, 2,494 lines; the 4100 search exits **1**
with no match. The initial status is empty. Pin: the full SHA above.
The following three checks each exit **0**, with no output:

```bash
git merge-base --is-ancestor b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8 HEAD
git diff --quiet b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8 HEAD -- src tests data
git diff --quiet f587b1650e345451211a2751b146f126fe2e26c0 HEAD -- src/core/Save.ts src/game/DiscoveryStore.ts src/game/Cosmetics.ts src/game/JournalData.ts src/game/ProgressMigration.ts src/game/EffectiveSettings.ts src/app/systems/progress.ts tests/unit/settingsSave.test.ts tests/unit/saveSoak.test.ts tests/unit/progressMigration.test.ts tests/unit/cosmetics.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/journalData.test.ts
```

`b7f3ca59` is 4120's audited pin; `f587b165` is 3870's pin. Thus the latest
mode audit's source, tests and data match this checkout, and the older migration
implementation and named guards also remain unchanged. A broader diff from
3870 including `src/game/Progress.ts` and `tests/unit/progress.test.ts` reports
only **2 files / 56 insertions**: the already-collected resolved-objective
rating correction and its regression documented in 4040. That diff and the
current regression assertions were read; it is not an unexamined gap in the
older save audit.

No disposable probe, build, unit/Python suite or aggregate gate was run after
the duplicate-coverage finding, following task 1's instruction to cite and
stop. Tasks 2–3 therefore produce no new retained input/state/output witness
and no failing-before/passing-after claim.

## Policies, limitations and final validation

Existing normalization deliberately selects valid current settings over stale
legacy records, fills missing fields, enforces named presets, retains Custom's
base, clamps supported numbers and retires removed controls. Future versions
use protected session defaults. Mission objectives/session clocks start fresh;
earned discoveries and historical best ratings persist. These documented
policies are not redefined as data loss.

4090's post-scan `Mission.resolve` mutations remain synthetic API sequences
with no established player path; this review neither reproduces them nor
promotes them to save defects. No new supported-path discrepancy is established.
The smallest justified action is this citation-only report, with no fix.

The cited headless tests use storage/DOM doubles and controlled loading. They
do not establish actual browser storage/navigation timing, every possible
corrupt input or an exhaustive cross-product of all transitions. Earlier notes
record five Python failures and four existing collision expected failures;
this report makes no new green-gate claim. Local e2e mode is **none**. No
browser, renderer, screenshot, visual judgment, hosted CI, GPU or real-phone
validation was performed. Readability, beauty and Phone-OK remain unassessed.

Owned-note formatting and final checks:

```bash
node_modules/.bin/prettier --write plan/progress/4180-S-bughunt-save-migration.md
node_modules/.bin/prettier --check plan/progress/4180-S-bughunt-save-migration.md
git diff --check
git diff --no-index --check /dev/null plan/progress/4180-S-bughunt-save-migration.md
git rev-parse HEAD
git status --short
```

Prettier write/check and `git diff --check`: **exit 0**. The new-file no-index
check exits **1**, with no whitespace diagnostics (the added file differs from
`/dev/null`). Final HEAD remains pinned and status contains only this note.

Simplicity: no duplicate permanent tests, runtime machinery, setting, site
branch, Config mutation or package number in code. Assertions, tolerances and
policies remain intact. Only this note is written; no production, test, data,
snapshot, configuration, tools or DIRECTOR edit. 4150/4160/4170 and owner-blocked
S-collision items remain untouched. No commit, merge, push, tag or hosted
workflow action.
