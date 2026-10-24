# 3650 — S-bughunt: save migration audit

Audited checkout: `7351399422cdf6d8911459e2eeb0aac82722958e`.
Serves DIRECTOR Backlog 9, S-verify / S-bughunt (Codex, standing).

## Scope and ownership

Read DIRECTOR Backlog, simplicity rules and rubric; the newest dated comprehensive
review (2026-10-24 early) and the preceding targeted-review header in REVIEWS;
OVERNIGHT-LOG through run 109; repository conventions; launched briefs for
3480, 3600 and 3640–3660; and the available 3480/3580–3600 results/progress notes.
The 3480 last-message artifact is empty; its collected code, tests and progress
note supply the evidence instead.

Checked registered worktree HEADs, status, diff statistics and changed paths,
including committed branch differences and uncommitted work. Rechecked this
checkout and the concurrent 3640/3660 worktrees immediately before editing:
all three were clean at the pinned SHA. Their slices own Journal and mission
ordering; neither overlaps this note. Held 2980/3050 collision changes,
3310 journeys, 3320/3340 browser work and 3380 CI evidence remain untouched.
The brief's older description of 3580–3600 as uncollected is superseded by
OVERNIGHT-LOG run 106 and the registry: those worktrees are gone and their
results are already in this checkout. No patches were collected or imported.

## Round 1: existing capability guards

| Supported contract                                                                                        | Production guard                                                                                                                                                               | Existing executable evidence                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing, empty, invalid JSON, null, array and scalar payloads use defaults and accept fresh work          | [Save.ts:100](../../src/core/Save.ts#L100), [Save.ts:176](../../src/core/Save.ts#L176), [Save.ts:250](../../src/core/Save.ts#L250)                                             | [saveSoak.test.ts:53](../../tests/unit/saveSoak.test.ts#L53), [saveSoak.test.ts:334](../../tests/unit/saveSoak.test.ts#L334), [settingsSave.test.ts:346](../../tests/unit/settingsSave.test.ts#L346)                                                                                                                                                                   |
| Repair damaged fields independently; retain valid siblings and extension data                             | [Save.ts:122](../../src/core/Save.ts#L122), [Save.ts:154](../../src/core/Save.ts#L154), [Save.ts:181](../../src/core/Save.ts#L181)                                             | [settingsSave.test.ts:137](../../tests/unit/settingsSave.test.ts#L137), [settingsSave.test.ts:225](../../tests/unit/settingsSave.test.ts#L225), [settingsSave.test.ts:268](../../tests/unit/settingsSave.test.ts#L268), [settingsSave.test.ts:567](../../tests/unit/settingsSave.test.ts#L567)                                                                         |
| Unversioned and v0–v3 migration preserves supported choices across reload; Arcade remains default         | [Save.ts:176](../../src/core/Save.ts#L176), [Save.ts:277](../../src/core/Save.ts#L277)                                                                                         | [saveSoak.test.ts:91](../../tests/unit/saveSoak.test.ts#L91), [settingsSave.test.ts:82](../../tests/unit/settingsSave.test.ts#L82), [settingsSave.test.ts:460](../../tests/unit/settingsSave.test.ts#L460)                                                                                                                                                             |
| Corrupt current/intermediate keys recover readable older settings without deleting legacy bytes           | [Save.ts:286](../../src/core/Save.ts#L286)                                                                                                                                     | [settingsSave.test.ts:46](../../tests/unit/settingsSave.test.ts#L46), [settingsSave.test.ts:71](../../tests/unit/settingsSave.test.ts#L71), [saveSoak.test.ts:378](../../tests/unit/saveSoak.test.ts#L378)                                                                                                                                                             |
| Denied storage access/reads and future versions cannot erase unread saves; session edits remain usable    | [Save.ts:222](../../src/core/Save.ts#L222), [Save.ts:252](../../src/core/Save.ts#L252), [Save.ts:269](../../src/core/Save.ts#L269), [Save.ts:401](../../src/core/Save.ts#L401) | [settingsSave.test.ts:195](../../tests/unit/settingsSave.test.ts#L195), [settingsSave.test.ts:336](../../tests/unit/settingsSave.test.ts#L336), [settingsSave.test.ts:360](../../tests/unit/settingsSave.test.ts#L360), [settingsSave.test.ts:380](../../tests/unit/settingsSave.test.ts#L380), [settingsSave.test.ts:412](../../tests/unit/settingsSave.test.ts#L412) |
| Migration/reset isolate independent collections; partial research/discovery records retain valid evidence | [Save.ts:438](../../src/core/Save.ts#L438), [Save.ts:578](../../src/core/Save.ts#L578)                                                                                         | [settingsSave.test.ts:171](../../tests/unit/settingsSave.test.ts#L171), [saveSoak.test.ts:300](../../tests/unit/saveSoak.test.ts#L300), [saveSoak.test.ts:407](../../tests/unit/saveSoak.test.ts#L407), [progress.test.ts:62](../../tests/unit/progress.test.ts#L62)                                                                                                   |
| Repeated migration/edit/reset cycles retain unknown fields and historical earned data                     | [Save.ts:175](../../src/core/Save.ts#L175), [Save.ts:438](../../src/core/Save.ts#L438)                                                                                         | [saveSoak.test.ts:445](../../tests/unit/saveSoak.test.ts#L445), [saveSoak.test.ts:516](../../tests/unit/saveSoak.test.ts#L516), [progress.test.ts:318](../../tests/unit/progress.test.ts#L318)                                                                                                                                                                         |

## Round 2: findings and simplicity

Rechecked raw JSON candidate selection, fallback order (v3, v2, v1), per-field
sanitization, named/Custom preset policy, preservation of extensions, failed-read
write protection, future-version protection and persisted reset behavior against
the existing assertions. A valid partial current record is authoritative;
missing fields receive defaults rather than importing stale legacy preferences.
Named presets deliberately replace known gameplay options; retired controls are
deliberately dropped. These policies are not treated as data-loss defects.

The earlier discovery-union defect is already fixed and guarded in collected
commit `12097e5093abfde46a221835eb994f2e7d0dc914`; see
[3480's reproduction](3480-S-bughunt-save-migration.md). No dependency on an
uncollected patch, new demonstrated defect or materially missing supported
contract was found. No new failing-before/passing-after claim. Production and
all test files remain unchanged; only this evidence note is added.

Simplicity: no duplicate tests, new abstractions, settings, schema, UI, site
branches or runtime Config mutation. Existing recovery protects exploration,
Journal and earned data; factual content and reward policy are untouched.
Visual readability/beauty, touch layout and phone performance remain unassessed.

## Validation

- `npm test -- --configLoader runner --cache=false tests/unit/settingsSave.test.ts tests/unit/saveSoak.test.ts tests/unit/progress.test.ts tests/unit/progressMigration.test.ts`
  exited **0**: **4 files / 168 tests passed**, 484 ms. Log: `/tmp/3650-focused.log`.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` exited **1**:
  **FAIL gates (e2e=none)**. Config preparation, strict content validation,
  production build (including TypeScript), full unit suite, attribution and
  repository-wide Prettier all **passed**. Unit result: **192 files / 4,132
  passed / 4 existing expected failures** (4,136 total), **609.61 s**. The four
  collision expected-failure cases remain untouched.
- Python tooling: **167 tests / 5 failures**, **9.054 s**. All four
  `test_ci_build_manifest.TestCiBuildManifest` cases fail with `spawnSync git
EPERM`; `test_golden.TestGolden.test_golden_tooling` fails with `Unexpected
end of JSON input` in comparison child output. These match the already
  recorded 3590/3600 failure signatures. They are tooling/environment limits,
  not passing checks; no workaround, retry or tooling change was made.
- Gate summary: `/tmp/3650-gates.log`. Individual retained logs:
  `.cache/runs/20261024-041708-3-sMOAz3/{config,python,content,build,unit,attribution,prettier}.log`.
- Final owned-note formatting and `git diff --check` passed. HEAD remained
  the audited SHA; final status contains only this new progress note.

No browser launch, game rendering, WebGL context, screenshots, hosted workflow,
GPU acceptance, unaided journey or real-phone validation. No merge, push or tag.
