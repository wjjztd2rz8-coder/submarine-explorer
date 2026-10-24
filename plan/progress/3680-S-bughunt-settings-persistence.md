# 3680 — S-bughunt: settings persistence audit

Serves DIRECTOR Backlog 9 (`S-verify / S-bughunt`, Codex standing).
Audited SHA: `54c6c9df62ed70b82c6d01223470a604c3d66173`.

## Scope and ownership

Read DIRECTOR Backlog, simplicity rules and rubric; REVIEWS' leading targeted
entry and newest dated comprehensive entry (2026-10-24 early); OVERNIGHT-LOG
through run 110; repository conventions; launched 3600/3650/3670–3690 briefs;
3580–3600 results and progress notes; and finished 3650's migration audit.
Checked registered worktree HEADs, committed changed paths, working diff
statistics and status, then rechecked ownership before editing. This checkout
started clean. No other registered worktree has a settings-spec diff.

The brief describes 3580–3600 as uncollected. Actual registry and OVERNIGHT-LOG
run 106 show those worktrees removed and their results already collected;
3600's commit `c85a5f045bbdf43f09190951af09656700f2bf48` is in this checkout.
No changes were imported from another worktree. Finished 3650 has only its
own uncollected progress note; its findings were consulted, not depended on.
Held collision, journeys, touch, CI and concurrent capability packages remain
untouched, including all four collision expected failures.

## Round 1: production guards and existing coverage

The closest capability spec is `tests/unit/settingsSave.test.ts`. Existing
coverage is adequate; no duplicate tests or production edits were added.

| Contract                                                                                                                                           | Production guard                                                                                                                                                               | Existing executable evidence                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing/empty/corrupt JSON, scalar or array records boot with defaults and can persist subsequent edits                                            | [Save.ts:176](../../src/core/Save.ts#L176), [Save.ts:250](../../src/core/Save.ts#L250)                                                                                         | [saveSoak.test.ts:53](../../tests/unit/saveSoak.test.ts#L53), [saveSoak.test.ts:334](../../tests/unit/saveSoak.test.ts#L334), [settingsSave.test.ts:346](../../tests/unit/settingsSave.test.ts#L346)                                                                                                                                                                                                                                           |
| First-run/default and legacy display-only saves use Arcade; named presets replace contradictory switches, while Custom retains valid choices       | [Save.ts:100](../../src/core/Save.ts#L100), [Save.ts:176](../../src/core/Save.ts#L176), [EffectiveSettings.ts:8](../../src/game/EffectiveSettings.ts#L8)                       | [settingsSave.test.ts:82](../../tests/unit/settingsSave.test.ts#L82), [settingsSave.test.ts:460](../../tests/unit/settingsSave.test.ts#L460), [settingsSave.test.ts:498](../../tests/unit/settingsSave.test.ts#L498), [f2-modes.test.ts:121](../../tests/unit/f2-modes.test.ts#L121)                                                                                                                                                           |
| Unknown enum values and invalid field types fall back independently without discarding valid siblings                                              | [Save.ts:122](../../src/core/Save.ts#L122), [Save.ts:154](../../src/core/Save.ts#L154)                                                                                         | [settingsSave.test.ts:137](../../tests/unit/settingsSave.test.ts#L137), [settingsSave.test.ts:160](../../tests/unit/settingsSave.test.ts#L160), [settingsSave.test.ts:268](../../tests/unit/settingsSave.test.ts#L268), [settingsSave.test.ts:567](../../tests/unit/settingsSave.test.ts#L567)                                                                                                                                                 |
| Missing fields receive defaults; valid false/zero remain deliberate preferences                                                                    | [Save.ts:100](../../src/core/Save.ts#L100), [Save.ts:181](../../src/core/Save.ts#L181)                                                                                         | [f3Audio.test.ts:78](../../tests/unit/f3Audio.test.ts#L78), [f3Audio.test.ts:90](../../tests/unit/f3Audio.test.ts#L90), [f2-modes.test.ts:175](../../tests/unit/f2-modes.test.ts#L175)                                                                                                                                                                                                                                                         |
| Finite out-of-range numbers clamp to supported bounds; UI scale also rounds; invalid/non-finite numbers use defaults                               | [Save.ts:133](../../src/core/Save.ts#L133), [Save.ts:204](../../src/core/Save.ts#L204)                                                                                         | [settingsSave.test.ts:137](../../tests/unit/settingsSave.test.ts#L137), [settingsSave.test.ts:268](../../tests/unit/settingsSave.test.ts#L268), [f3Audio.test.ts:78](../../tests/unit/f3Audio.test.ts#L78)                                                                                                                                                                                                                                     |
| Valid current/legacy settings survive reload; malformed current/intermediate records recover older readable settings without deleting legacy bytes | [Save.ts:250](../../src/core/Save.ts#L250), [Save.ts:277](../../src/core/Save.ts#L277)                                                                                         | [settingsSave.test.ts:46](../../tests/unit/settingsSave.test.ts#L46), [settingsSave.test.ts:71](../../tests/unit/settingsSave.test.ts#L71), [saveSoak.test.ts:91](../../tests/unit/saveSoak.test.ts#L91), [saveSoak.test.ts:378](../../tests/unit/saveSoak.test.ts#L378)                                                                                                                                                                       |
| Storage access/read/write failures remain usable in session; unread/future saves stay protected; reset cannot resurrect stale settings             | [Save.ts:222](../../src/core/Save.ts#L222), [Save.ts:269](../../src/core/Save.ts#L269), [Save.ts:364](../../src/core/Save.ts#L364), [Save.ts:401](../../src/core/Save.ts#L401) | [settingsSave.test.ts:195](../../tests/unit/settingsSave.test.ts#L195), [settingsSave.test.ts:301](../../tests/unit/settingsSave.test.ts#L301), [settingsSave.test.ts:336](../../tests/unit/settingsSave.test.ts#L336), [settingsSave.test.ts:360](../../tests/unit/settingsSave.test.ts#L360), [settingsSave.test.ts:380](../../tests/unit/settingsSave.test.ts#L380), [settingsSave.test.ts:460](../../tests/unit/settingsSave.test.ts#L460) |
| Unknown extension fields survive migration/edits; retired controls are deliberately removed; settings reset leaves Journal/research independent    | [Save.ts:175](../../src/core/Save.ts#L175), [Save.ts:364](../../src/core/Save.ts#L364)                                                                                         | [settingsSave.test.ts:171](../../tests/unit/settingsSave.test.ts#L171), [settingsSave.test.ts:225](../../tests/unit/settingsSave.test.ts#L225), [saveSoak.test.ts:445](../../tests/unit/saveSoak.test.ts#L445)                                                                                                                                                                                                                                 |

## Round 2: findings and simplicity

Rechecked every stored setting category against migration and the boot consumer:
graphics/palette/hull enums, booleans, numeric ranges, mode/base selection and
Custom gameplay options. Boot reads `Save.get()` before calling the effective
resolver ([boot.ts:57](../../src/app/boot.ts#L57),
[boot.ts:89](../../src/app/boot.ts#L89)); it does not consume the raw blob.
Missing or unknown mode identity keeps Arcade and Arcade's known switches.
An explicit supported Realistic/Custom choice remains supported rather than
being reset just because another field is missing or damaged.

The brief's phrase "out-of-range ... fall back to defaults" differs from the
existing numeric policy: volumes clamp to 0–1, terrain detail to
0–`detailStrengthMax`, and UI scale to rounded 80–150. This is established
behavior with existing assertions, not a demonstrated regression. Invalid
types/non-finite inputs use defaults. Likewise, unknown extension fields are
preserved rather than discarded, and removed Ultra maps to High. No policy
change is proposed.

No new demonstrated defect or materially missing supported contract was found.
The collected [3600 consumer audit](3600-S-bughunt-settings-persistence.md) and
existing capability assertions already cover this slice; finished 3650 also
documents the broad recovery path. There is no new failing-before/passing-after
claim or proposed production fix. Only this progress note changes.

Simplicity: no extra tests, abstractions, settings, schema, dependencies, UI,
runtime Config mutation, or site branches. Existing fallback behavior protects
comfortable entry and preserves deliberate choices and earned discoveries.
Reward policy and factual site content are unchanged. Visual rubric criteria,
touch layout and real-phone performance remain with Claude/owner.

## Validation

- `npm test -- --configLoader runner --cache=false tests/unit/settingsSave.test.ts tests/unit/saveSoak.test.ts tests/unit/f3Audio.test.ts tests/unit/f2-modes.test.ts`
  exited **0**: **4 files / 137 tests passed**, **473 ms**. Log:
  `/tmp/3680-focused.log`.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` exited **1**:
  **FAIL gates (e2e=none)**. Config preparation, strict content validation,
  production build (including TypeScript), full unit suite, attribution and
  repository-wide Prettier all **passed**. Unit result: **192 files / 4,132
  passed / 4 existing expected failures** (4,136 total), **708.82 s**.
  The collision expected failures remain intact.
- Python: **167 tests / 5 failures**, **9.995 s**. All four
  `test_ci_build_manifest.TestCiBuildManifest` cases fail with
  `spawnSync git EPERM`; `test_golden.TestGolden.test_golden_tooling` fails
  with `Unexpected end of JSON input` at
  `tools/tests/golden-manifest.test.mjs:151`. These match the
  previously recorded 3590/3600/3650 signatures. They are actual failures,
  not passing checks; no tooling workaround, retry or assertion change was made.
- Gate summary: `/tmp/3680-gates.log`. Individual retained logs:
  `.cache/runs/20261024-044718-3-wQAtAw/{config,python,content,build,unit,attribution,prettier}.log`.
- Final owned-note formatting and `git diff --check` passed. HEAD remained
  the audited SHA, and final status contains only this new progress note.

No browser launch, game rendering, WebGL context, screenshots, hosted CI,
unaided journeys, GPU or real-phone validation. Local e2e mode is **none**.
No merge, push, tag, hosted workflow dispatch or tooling changes.
