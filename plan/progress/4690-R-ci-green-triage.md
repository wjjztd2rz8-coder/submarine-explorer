# R-ci-green: hosted main CI triage

Date: 2026-10-27. Serves `plan/DIRECTOR.md` Backlog 8, **R-ci-green**.
Read DIRECTOR and CONTRIBUTING-AGENTS. Starting worktree was clean at
`c9fca0faefdd8f88b2b8c5c61c3c69dab1039eef`.

## Hosted evidence

Initial `gh run list -L 6` returned these main runs. Deploy skips are downstream
of failed CI, not additional spec failures.

| Run                                                                                            | Workflow    | SHA                                        | Result at inspection               |
| ---------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------ | ---------------------------------- |
| [40513776399](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40513776399) | CI, run 184 | `5f143ddd8fe54c85a874c92fec0212a18c7e9cfe` | Failed: shards 4, 7, 19, 20 and 28 |
| [40512483049](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40512483049) | Pages       | `66abbb4dd6c046c2e587ca9059d740f9d845a55e` | Skipped                            |
| [40507904685](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40507904685) | Pages       | `66abbb4dd6c046c2e587ca9059d740f9d845a55e` | Skipped                            |
| [40504622054](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40504622054) | CI, run 183 | `66abbb4dd6c046c2e587ca9059d740f9d845a55e` | Failed: shards 4, 7, 19, 20 and 28 |
| [40503779826](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40503779826) | Pages       | `f96924f10708e3e959b7f0b5b5af480eb8e32c26` | Skipped                            |
| [40501330558](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40501330558) | CI, run 182 | `f96924f10708e3e959b7f0b5b5af480eb8e32c26` | Failed: shards 4, 7, 19, 20 and 28 |

`gh run view --log-failed` and `--job ... --log` returned empty output despite
the failed jobs. Retrieved complete job logs through
`gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<id>/logs` instead.
Local evidence is `/tmp/4690-api-182-*.log`, `/tmp/4690-api-183-*.log`,
`/tmp/4690-api-job-7.log` (run 183 shard 7) and `/tmp/4690-api-184-*.log`.

## Classification and fixes

Runs 182 and 183 have the same five failures, one per failed shard.
All five retrieved failures from run 184 repeat the same diagnoses. Run 184
was marked completed/failure by the final check (`updatedAt` 14:09:57 UTC);
all five failed jobs were inspected.
These are deterministic spec regressions, not timing flakes or confirmed
application regressions. Neither failure warrants a runtime rollback.

| Spec / shard                                           | Log finding                                                                   | Fix in existing capability spec                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `journal-debrief.spec.ts:74`, legacy secret/sample / 4 | Expected archived awards omit `species:shark` restored from Journal evidence. | Compare the exact deduplicated union of archived awards and the four known discovery tokens.               |
| Same spec, legacy hero stars / 7                       | Expected awards omit restored secret, sample and shark tokens.                | Same correction; preserve all archived awards and exact balances, upgrades, ratings, cosmetics and streak. |
| Same spec, legacy spent kit / 20                       | Same three restored tokens missing from expectation.                          | Same correction.                                                                                           |
| `f3-audio.spec.ts:107`, touch / 19                     | Expected gain `0.29`, actual `0.28999999165534973`.                           | Require exact `Math.fround(savedVolume)` gains and exact unrounded settings volumes.                       |
| Same spec, desktop / 28                                | Expected gain `0.01`, actual `0.009999999776482582`.                          | Same Float32 correction.                                                                                   |

The legacy repair is intentional in `creditPreviousDives`: Journal and rewards
save independently, so boot repairs missing tokens even after legacy migration
is complete. Commit `a16db2d9` already updated the production-startup unit cases
in `saveSoak.test.ts` to the exact migrated record plus these explicit tokens;
the browser cases had retained their stale expectation. The new browser
expectation mirrors that contract without deriving expected tokens from the
production mapping. It still rejects missing, duplicate or unexpected awards,
economic drift, lost purchases/ratings/cosmetics, changed discovery/daily
records and changes after cosmetic edit/reload.

Web Audio gain diagnostics read `AudioParam.value`, whose gains use Float32
precision. Exact JS decimal equality rejected correct values. The revised test
still requires exact equality, using Float32 expected gains; it additionally
requires exact unrounded diagnostic volumes and whole saved-settings equality
after reload and Dive again. The mute flag, zero master gain, suspended clock,
running state and applied medium tier guards remain intact. No tolerance,
timeout, retry, skip, expected failure or past-bug protection was loosened.

Changes cover two existing e2e capability specs, this evidence note and the
formatting-only follow-up below. No new spec, dependency, workflow, production
code, setting or guidance surface.

## Validation

- Production TypeScript/Vite build: **passed**, using a temporary native config
  bundle under `.cache/4690-vite.config.mjs` and isolated `dist-ci-triage`.
  Log: `/tmp/4690-build-native.log`. An initial `--configLoader runner` build
  hit the documented Vite/PWA closeBundle runner issue; the repository's
  writable-config bundling approach resolved it without source changes.
- Python: **167 tests passed**, `/tmp/4690-python.log`.
- Affected Playwright test discovery: **five tests in two files**,
  `/tmp/4690-e2e-list.log`.
- Affected browser executions: **5/5 passed**, retries disabled, 1.2 minutes.
  Command: `CI=1 PW_PORT=4372 PW_OUTDIR=dist-ci-triage GATES_CONFIG_MODE=writable
npm run test:e2e -- tests/e2e/journal-debrief.spec.ts tests/e2e/f3-audio.spec.ts
--grep 'survives migration|tier and mix survive' --retries=0`.
  Log: `/tmp/4690-e2e.log`. This executes native desktop/touch controls, tier
  reload, Dive again and all three archived save scenarios against the build
  from the starting SHA. No visual acceptance is inferred from these tests.
- Full units: **192 files / 4,336 tests passed**, exit 0, 683.85 seconds.
  Command: `npm test -- --configLoader runner --cache=false`.
  Log: `/tmp/4690-unit.log`. The reporter buffered its summary until completion.
- Focused save/audio units: **5 files / 182 tests passed**, exit 0, 2.80 seconds.
  Started while the full run was silent to check the affected capabilities;
  both runs then completed successfully. Command: `npm test -- --configLoader
runner --cache=false tests/unit/saveSoak.test.ts
tests/unit/progressMigration.test.ts tests/unit/audioLifecycle.test.ts
tests/unit/audioTouchUnlock.test.ts tests/unit/f3Audio.test.ts`.
  Log: `/tmp/4690-unit-focused.log`.
- Owned-spec formatting and `git diff --check`: **passed**.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside the sandbox with smoke and
project-base e2e enabled. It reported **PASS** for Python, content, build,
unit, e2e, e2e-base and attribution, and **FAIL** only for Prettier.
Evidence: `.cache/runs/20261027-091414-3315615-ONCsga/prettier.log`.

The root cause was a missing blank line before the list in
`plan/progress/P2-globe-bright.md`, already present in the starting checkout.
Ran Prettier on that file only; its sole change inserts the blank line.
No assertions, source behavior or gate configuration changed. Repository-wide
`npm run format:check` and `git diff --check` both **passed**, exit 0, after
this correction. Formatting log: `/tmp/4690-format-followup.log`. Runtime
checks are covered by the orchestrator's supplied results above.

No merge, push, tag, deployment or hosted rerun performed. The unmerged local
fix does not establish a green hosted SHA; R-ci-green remains pending hosted
verification.
