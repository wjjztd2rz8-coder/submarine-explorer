# 3870 — S-bughunt: save loading and settings migration

Audited SHA: `f587b1650e345451211a2751b146f126fe2e26c0`.
Serves DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**
(the constraints retain its older Backlog 9 numbering).

Clean audit: no new demonstrated defect or materially missing supported
contract. Existing collected assertions cover this slice. Only this note
changes; production and tests remain unchanged. No new failing-before /
passing-after claim.

## Plan and intake

1. Pin the checkout, inspect ownership and map existing guards.
2. Recheck migration policies and overlap; add a test only for a material gap.
3. Run focused headless capabilities, then the required no-e2e gates, and
   record actual results.

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, simplicity rules and rubric;
REVIEWS' leading targeted header and newest dated comprehensive review
(2026-10-24 afternoon); OVERNIGHT-LOG through run 127; launched
3650/3680/3790/3870–3890 briefs; available 3650/3680 results and the earlier
3870 scatter-cost / 3880 CI results; and collected
[3480](3480-S-bughunt-save-migration.md),
[3650](3650-S-bughunt-save-migration.md),
[3680](3680-S-bughunt-settings-persistence.md) and
[3790](3790-S-bughunt-save-roundtrip.md) progress evidence.
Older wrapper PASS summaries do not establish that the embedded reports'
failed local commands passed. The earlier collected 3870 is a different
scatter verification slice, not this save migration task.

Inspected registered worktree HEADs, working status/diff statistics, unique
committed differences against the pinned checkout, and save/settings-specific
diffs. Rechecked ownership immediately before writing: this checkout and the
concurrent 3880/3890 bug-hunt checkouts were clean at the pinned SHA, with no
save/settings overlap. Finished held 2980/3050 collision work, 3310 journey
branch changes, 3320/3380 evidence and 3340 touch work remain untouched.
No other registered worktree has a save/settings spec diff or owns this note;
no uncollected patch was imported or relied on.

## Round 1: existing capability guards

Line citations refer to the audited SHA. The owned capability, if an addition
were needed, is `tests/unit/settingsSave.test.ts`.

| Supported contract                                                                                                                        | Production guard                                                                                                     | Existing executable evidence                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Missing/empty, corrupt/truncated JSON, null, array and scalar payloads use defaults; subsequent valid work survives reload                | [Save.ts:176](../../src/core/Save.ts#L176), [:250](../../src/core/Save.ts#L250)                                      | [saveSoak.test.ts:53](../../tests/unit/saveSoak.test.ts#L53), [:334](../../tests/unit/saveSoak.test.ts#L334); [settingsSave.test.ts:346](../../tests/unit/settingsSave.test.ts#L346)                                                                                                                                                       |
| Unversioned and v0–v3 settings preserve supported display choices, migrate to v3 and leave legacy bytes intact                            | [Save.ts:277](../../src/core/Save.ts#L277), [:306](../../src/core/Save.ts#L306)                                      | [saveSoak.test.ts:91](../../tests/unit/saveSoak.test.ts#L91); [settingsSave.test.ts:119](../../tests/unit/settingsSave.test.ts#L119), [:460](../../tests/unit/settingsSave.test.ts#L460)                                                                                                                                                   |
| Damaged current/intermediate versions recover readable older preferences                                                                  | [Save.ts:277](../../src/core/Save.ts#L277), [:286](../../src/core/Save.ts#L286)                                      | [settingsSave.test.ts:46](../../tests/unit/settingsSave.test.ts#L46), [:71](../../tests/unit/settingsSave.test.ts#L71); [saveSoak.test.ts:378](../../tests/unit/saveSoak.test.ts#L378)                                                                                                                                                     |
| Repair individual invalid types/enums without losing valid siblings or extension fields                                                   | [Save.ts:122](../../src/core/Save.ts#L122), [:154](../../src/core/Save.ts#L154), [:181](../../src/core/Save.ts#L181) | [settingsSave.test.ts:137](../../tests/unit/settingsSave.test.ts#L137), [:225](../../tests/unit/settingsSave.test.ts#L225), [:268](../../tests/unit/settingsSave.test.ts#L268), [:567](../../tests/unit/settingsSave.test.ts#L567)                                                                                                         |
| Missing fields use defaults; valid false/zero and Custom options survive; finite numbers clamp to supported bounds                        | [Save.ts:100](../../src/core/Save.ts#L100), [:133](../../src/core/Save.ts#L133), [:204](../../src/core/Save.ts#L204) | [f3Audio.test.ts:78](../../tests/unit/f3Audio.test.ts#L78), [:90](../../tests/unit/f3Audio.test.ts#L90); [f2-modes.test.ts:175](../../tests/unit/f2-modes.test.ts#L175); [settingsSave.test.ts:268](../../tests/unit/settingsSave.test.ts#L268)                                                                                            |
| Arcade defaults, deliberate named presets, legacy Custom inheritance and retired-key migration remain consistent through repeated reloads | [Save.ts:100](../../src/core/Save.ts#L100), [:193](../../src/core/Save.ts#L193), [:325](../../src/core/Save.ts#L325) | [settingsSave.test.ts:82](../../tests/unit/settingsSave.test.ts#L82), [:498](../../tests/unit/settingsSave.test.ts#L498); [saveSoak.test.ts:445](../../tests/unit/saveSoak.test.ts#L445)                                                                                                                                                   |
| Future current/legacy versions use session defaults and preserve original bytes through edits/reset                                       | [Save.ts:269](../../src/core/Save.ts#L269), [:300](../../src/core/Save.ts#L300), [:401](../../src/core/Save.ts#L401) | [settingsSave.test.ts:160](../../tests/unit/settingsSave.test.ts#L160), [:360](../../tests/unit/settingsSave.test.ts#L360), [:545](../../tests/unit/settingsSave.test.ts#L545); [saveSoak.test.ts:313](../../tests/unit/saveSoak.test.ts#L313)                                                                                             |
| Denied storage accessor, read failures, quota and silently dropped writes retain usable session settings and protect unread data          | [Save.ts:222](../../src/core/Save.ts#L222), [:252](../../src/core/Save.ts#L252), [:401](../../src/core/Save.ts#L401) | [settingsSave.test.ts:195](../../tests/unit/settingsSave.test.ts#L195), [:301](../../tests/unit/settingsSave.test.ts#L301), [:336](../../tests/unit/settingsSave.test.ts#L336), [:380](../../tests/unit/settingsSave.test.ts#L380), [:412](../../tests/unit/settingsSave.test.ts#L412), [:434](../../tests/unit/settingsSave.test.ts#L434) |
| Settings recovery/reset does not erase Journal or research; defaults persist without resurrecting legacy settings                         | [Save.ts:364](../../src/core/Save.ts#L364), [:416](../../src/core/Save.ts#L416)                                      | [settingsSave.test.ts:171](../../tests/unit/settingsSave.test.ts#L171), [:225](../../tests/unit/settingsSave.test.ts#L225), [:460](../../tests/unit/settingsSave.test.ts#L460); [saveSoak.test.ts:300](../../tests/unit/saveSoak.test.ts#L300)                                                                                             |

## Round 2: overlap, policies and simplicity

Rechecked candidate selection, v3/v2/v1 fallback, per-field repair, future/read
protection, serialization and reset against actual assertions and
[documented storage policy](../../docs/settings.md#storage). The boot consumer
loads sanitized settings before resolving effective settings
([boot.ts:57](../../src/app/boot.ts#L57), [:89](../../src/app/boot.ts#L89)).
This is a headless code trace, not a rendered game-boot validation.

`git diff 7351399422cdf6d8911459e2eeb0aac82722958e HEAD --` for Save,
DiscoveryStore and the six focused specs is empty. The exact migration slice
was already audited by collected 3650/3680, then 3790. The earlier discovery
union defect is fixed in collected ancestor
`12097e5093abfde46a221835eb994f2e7d0dc914`; its failing-before evidence is
retained in 3480, not claimed as new work here.

Preserving valid fields follows established normalization policies: a valid
partial current record takes precedence over stale legacy settings; missing
fields receive defaults. Named presets resolve their known switches; Custom
retains valid choices. Finite numeric values clamp (UI scale also rounds),
Ultra maps to High, and retired controls disappear. Future versions use
defaults while protecting bytes rather than interpreting unknown schemas.
None of these policies is redefined as data loss. No ambiguous behavior is
promoted to a new requirement.

Simplicity: evidence only, avoiding duplicate tests. No new abstractions,
settings, schema, dependencies, UI, site branches or runtime Config mutation;
no assertion, tolerance, snapshot, budget, retry, skip or timeout changes.
Recovery preserves deliberate choices and earned discoveries, supporting
correct, simple, rewarding and honest behavior. Real GMRT terrain, all 13
site identities/five heroes, scanning, Journal, marine life, input,
accessibility and Arcade default remain untouched. Visual rubric criteria,
touch layout and phone performance remain with Claude/owner.

## Validation

- Focused command: `npm test -- --configLoader runner --cache=false tests/unit/settingsSave.test.ts tests/unit/saveSoak.test.ts tests/unit/progress.test.ts tests/unit/progressMigration.test.ts tests/unit/f3Audio.test.ts tests/unit/f2-modes.test.ts`.
  Exited **0**: **6 files / 190 tests passed**, **590 ms**. Log:
  `/tmp/3870-save-migration-focused.log`.
- Required command: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Exited **1**, **FAIL gates (e2e=none)**. Config preparation, strict content
  validation, production build (including TypeScript), full unit suite,
  attribution and repository-wide Prettier **passed**. Units: **192 files /
  4,220 passed / 4 existing expected failures** (4,224 total), **645.16 s**.
  The four collision expected failures remain untouched.
  Summary log: `/tmp/3870-save-migration-gates.log`. Individual logs:
  `.cache/runs/20261024-194652-31-lJBLcX/{config,python,content,build,unit,attribution,prettier}.log`.

Python gate: **167 tests / 5 failures**, **10.258 s** (162 passed).
Four `test_ci_build_manifest.TestCiBuildManifest` cases fail with
`spawnSync git EPERM`: `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail` and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden.TestGolden.test_golden_tooling` fails with
`Unexpected end of JSON input` at `tools/tests/golden-manifest.test.mjs:151`
when parsing comparison-child output. These match previously recorded failure
signatures. The EPERM reports establish a subprocess environment block; the
empty golden output's cause is not established by this audit. They remain
failed checks. The smallest follow-up is to run these unchanged checks on a
permitted runner and retain the golden child's status/stdout/stderr before
proposing any tooling correction. No tooling edit, retry or bypass was made.

Final owned-note formatting and `git diff --check` passed. HEAD remains the
audited SHA, with only this new progress note in status; production, tests,
shared fixtures, authored data, snapshots and tools have no diff.

Actual local e2e mode is **none**. No browser launch, rendering, WebGL context,
screenshots, hosted CI/workflow dispatch, GPU, unaided journey or real-phone
validation. No merge, push or tag.
