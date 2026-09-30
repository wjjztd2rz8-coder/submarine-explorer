# CI-TIMEOUTS — hosted Playwright reliability

Date: 2026-09-30. Scope: `.github/workflows/ci.yml`, `playwright.config.ts`, and this report. No application code, test assertions, gate script, deploy workflow, or commits changed.

## Findings

Read `plan/PHASE-F-PLAN.md` first, then ran `gh run list -L 10` and `gh run view <id> --log-failed` for the latest and preceding failed CI runs. The latest `--log-failed` and per-job `--log` output was empty; the preceding request encountered one HTTP 502. Retried that request once, then used `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<job-id>/logs` to retrieve all four latest job logs. No repeated rate-limit polling.

The latest [CI run 36706173464](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464) failed **only at e2e**, on every shard. Python, content, build, and 576 unit tests passed on each runner. Attribution, formatting, and the project-base browser check were skipped after e2e failed. The [Pages deploy for the same push](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173612) succeeded.

| Old shard | E2e result                     | E2e duration | Evidence                                                                                                    |
| --------- | ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------- |
| 1/4       | 18 failed, 9 passed, 1 skipped | 23.7 min     | [Job log](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856835864) |
| 2/4       | 13 failed, 17 passed           | 29.4 min     | [Job log](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856835505) |
| 3/4       | 3 failed, 29 passed            | 14.6 min     | [Job log](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856836360) |
| 4/4       | 6 failed, 14 passed            | 15.1 min     | [Job log](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856835751) |

Concrete failure patterns:

- `d2-predive.spec.ts` exhausted the **90 s whole-test budget** while pressing Tab through the briefing and while asserting the UI scale readout. This is cumulative action cost, not just a slow initial load. [Shard 2](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856835505)
- Scanning in `d-rov.spec.ts` and `d-scan.spec.ts` exhausted explicit **15 s** waits. The all-mission pose helper exhausted its **600 ms** candidate waits even when the diagnostic read immediately afterward found the requested candidate. A larger global test/expect timeout alone cannot change those explicit waits. [Shard 2](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856835505), [shard 1](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856835864)
- `mission.spec.ts` also failed fixed-duration motion and clock assertions; `sub-playtest.spec.ts` advanced only about 2.09 m against its greater-than-10 m travel requirement. These require better frame throughput, not relaxed numeric thresholds. [Shard 3](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856836360), [shard 4](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/36706173464/job/109856835751)

Repository root cause supporting that interpretation: `src/core/Config.ts` still defaults to fixed **medium**. `resolveQuality()` in `src/core/Quality.ts` respects that setting ahead of software-renderer auto-detection, so detecting SwiftShader does **not** select low in fresh browser contexts. `src/core/Time.ts` caps each rendered frame at eight physics steps and a 0.25 s delta; very slow rendering loses simulated time. Increasing shards lowers job wall time, but does not make an individual browser render faster.

## Changes

- **CI-only limits:** test timeout 90 → 240 s; default expect timeout 20 → 60 s; retries 0 → 1. Local values remain identical. Explicit per-test and per-call timeouts remain untouched.
- **CI-only low graphics:** Playwright `storageState` seeds only `{ version: 2, graphicsTier: 'low' }` in `subexplorer.settings.v2` for the configured preview origin. `Save.migrate()` fills every other field from the existing defaults. This is an initial player preference, not a permanent override: URL `?tier=` still wins, and tests may reset, migrate, replace, and reload settings. Medium/high ocean cases and the tier-override test remain intact. URLs, viewport sizes, post-FX preferences, gameplay options, and numeric assertions are unchanged.
- **Eight independent hosted runners**, one browser worker each. The shard denominator uses `${{ strategy.job-total }}` so matrix expansion and CLI shard coverage stay in sync. `fullyParallel` remains false; tests within a file keep their existing scheduling.
- **Browser cache:** `~/.cache/ms-playwright`, keyed by runner OS, architecture, and the exact lockfile hash. `playwright install --with-deps chromium` still runs on hits, ensuring system dependencies and validating the requested browser install.
- **Failure evidence:** CI records traces on the first retry and uploads `.cache/codex/shots` alongside existing screenshots/reports. Hidden-file inclusion is enabled for that explicitly scoped artifact path.
- `tools/gates.sh` and deployment behavior are unchanged. No additional tests are skipped, no assertions are removed, and no fixed gameplay waits are extended.

## Verification

Verification is in progress; results will be filled in before handoff.

## Orchestrator follow-up

Merge/review and push through the normal workflow; this worktree deliberately makes no commit or hosted run. A passing local or forced-software run does not prove hosted-runner reliability. Confirm all eight hosted jobs and the shard-1 project-base check pass after merge, and inspect any retry traces before treating a flaky pass as resolved.

If failures remain, inspect the unchanged explicit 600 ms pose wait, 15 s scan waits, 120 s per-test overrides, and fixed-duration motion/clock assertions first. Keep their asserted outcomes; any later change should wait for observed state or reduce rendering cost rather than loosen the numeric checks. Eight jobs also multiply the currently duplicated build/unit/content work; consolidating that work into prerequisite jobs is outside this package.
