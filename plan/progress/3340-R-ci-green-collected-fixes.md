# 3340 — R-ci-green: collected integration audit

Item: **R-ci-green**, DIRECTOR Backlog 10. Audit: 2026-10-23, approximately
09:32 UTC. **Local integration confirmed; hosted verification unavailable because
GitHub access is blocked. R-ci-green remains open.**

## Pin, ownership and sources

Pinned HEAD: `133013e7d25a9eb5787e5d64ee396a3cc0de4ffd`, branch
`codex/3340-R-ci-green-collected-fixes`. Local `main` and `origin/main` match;
these are local refs, not a fresh remote confirmation. The worktree was clean
at entry and again before writing. `git worktree list` confirms separate
3310/3320/3330 worktrees and the retained 2980/3050 worktrees. This package owns
only this note; other packages' files and worktrees remain untouched.

Read DIRECTOR's Backlog, simplicity rules and rubric; the newest REVIEWS entry
(2026-10-22 night joint review); OVERNIGHT-LOG through runs 85–87; the launched
3250/3260/3270/3340 briefs; merged progress notes for 3250/3260/3270 and historical
3150/2940 reports. Available result files under the main checkout's
`.cache/codex/` were read for 3250/3260/3150/2940. The 3270 result file is absent
and its `-last.md` is empty; its merged progress note supplies its final limits.
No uncollected implementation is used as a dependency.

The 2940 result wrapper says smoke/project-base, but its final report and merged
note explicitly say local e2e **none**. The 3270 note reports aggregate **FAIL**
with environment blocks, not browser assertion passes. Prior local validations
are historical evidence only and were not rerun here.

## Integration ancestry

Repository from `git remote -v`:
[wjjztd2rz8-coder/submarine-explorer](https://github.com/wjjztd2rz8-coder/submarine-explorer).

| Fix                                     | Collected implementation commit            | First main integration commit              |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| 3260: shared Chromium installer         | `7d5e91fa4a256e1d399877616c1d235968cfd87c` | `c2e9ec8e93152da11347dc0104591da0763f62e3` |
| 3250: three static shards and aggregate | `5a757ab8b6c2d63458f59c4c79f92bdda07e4fe3` | `2d3875278ac0556cafc576f1dc7d44d029923312` |
| 3270: whole-pixel pin/cluster placement | `830f848c76dcdd56ae6b4267e369ce0c5d242c3d` | `e1092e5b67004f8ab56ba0466566b83be21271e1` |

**Earliest main SHA containing all three:
`e1092e5b67004f8ab56ba0466566b83be21271e1`.** An exhaustive chronological
first-parent walk of local main, using `git merge-base --is-ancestor` for all
three implementation commits, finds this merge first. Its first parent,
`1545a5c6a8ff3bbeddcc5ccd83673236f509697c`, contains 3250/3260 but not 3270.
All three implementations are ancestors of pinned HEAD. Their branch commits
share base `6707aec9b1a1cdc2441514553fce924dc400a358`; 3270's branch commit alone
therefore does not establish combined integration.

The first-parent chain after the integration merge is `5e5e43f` → `48e197d` →
`c4863cc` → pinned `133013e`. The CI/nightly workflows, Chromium action,
package.json, Globe implementation and both relevant capability specs have no
diff between the integration merge and pinned HEAD.

## Read-only wiring findings

- CI has static shards `1/3`, `2/3`, `3/3`, each with the original **15-minute**
  job budget and `fail-fast: false`. `VITEST_SHARD` reaches the existing npm
  unit command; unset still means the full local roster. Each shard runs the
  canonical checks phase; Vitest retains two workers.
- Required-status job `checks` keeps name **build and static checks**,
  `needs: check-shards`, `if: always()`, a one-minute budget and
  `test "$RESULT" = success`. Failure, cancellation, skip or an empty result
  cannot satisfy that shell comparison. Actual branch-protection settings and
  hosted aggregate execution could not be inspected.
- CI's 38 e2e jobs and project-base job use Ubuntu 24.04 and the shared local
  action, retaining eight-minute install bounds. Both nightly callers also use
  it. The action caches by image/architecture/lockfile and runs
  `npx playwright install chromium` even on cache hits, piping to its existing
  log. It invokes no apt; availability of hosted runtime libraries is unverified.
- CI e2e retains its 30-minute job budget, 25-minute suite budget and zero
  retries. Builds have separate statuses; two successful builds alone cannot
  establish green CI. Main concurrency permits running jobs to finish but can
  replace a pending run; PR runs can cancel in progress. No current
  cancellation or supersession can be inferred from that policy alone.
- `journal-debrief.spec.ts:1747–1748` retains the exact width/height guards:
  `expect(target.rect.width, ...).toBeGreaterThanOrEqual(44)` and the equivalent
  height assertion. The entire journey file is unchanged by collection.
  `globe-pins.spec.ts:169` now measures rendered playable-pin/visible-cluster
  DOMRects and requires both dimensions `>=44` at lines 189–190. No hosted
  execution or assertion pass is established by reading these guards.

## Hosted selection and observed status

Read-only `gh` 2.45.0 commands attempted:

```bash
gh run list --repo wjjztd2rz8-coder/submarine-explorer --branch main --limit 40 --json databaseId,workflowName,headSha,status,conclusion,createdAt,updatedAt,url
gh run view 39513009283 --repo wjjztd2rz8-coder/submarine-explorer --json headSha,status,conclusion,url,jobs
```

Both return **error connecting to api.github.com**; the view exits 1.
No run payload, current job log or artifact was retrieved. **Selected qualifying
hosted SHA/run URL/attempt/status: unavailable.** This is an access block, not
evidence that no qualifying run exists. Hosted inspection stops here without
dispatch, rerun, push or waiting.

| Run state / check                                                        | Observation                                                                                      | Duration / conclusion                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Qualifying completed run                                                 | Cannot identify one after access failure                                                         | Unknown; no hosted pass or failure claim                                               |
| Qualifying failed / cancelled / superseded runs                          | Current list unavailable; none classified from assumptions                                       | Unknown                                                                                |
| Pending evidence                                                         | OVERNIGHT runs 85–87 say collection CI was in progress/pending; this is a historical observation | Run 85 was 26+ minutes in progress at run 86; current status unknown                   |
| Static shards 1/3, 2/3, 3/3 and required aggregate                       | Local wiring present; execution, skips and cancellations unavailable                             | Cannot verify any shard finishes within 15 minutes                                     |
| Chromium setup and browser launch                                        | Shared installer present; current hosted logs unavailable                                        | Cannot exclude missing runtime libraries or install failure                            |
| Titanic / Blue Hole 390×844 strict 44 px guards and globe-pin capability | Assertions retained; current hosted results unavailable                                          | Missing evidence, not passed and not an install failure reclassified as a test failure |

## Historical classification and retained blockers

These links and timings come from the merged reports, **not fresh hosted reads**.

| Historical evidence                                                                                                                                                                                                                    | Classification and exact limit                                                                                                                                                                                                                                                                                                    | Smallest retained action / existing owner                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [39802535646 static job](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39802535646/job/119906874181), [39889492252](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39889492252)             | Infrastructure/budget: units ran 14m44.9s / 14m41.7s before the 15-minute deadline. First run cancelled overall; cancellation is not success and 3150 explicitly found no superseding push.                                                                                                                                       | R-ci-green: verify the already-integrated three shards and aggregate; no further timeout increase proposed.              |
| [39889492252 project-base](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39889492252/job/120205664964)                                                                                                           | Infrastructure/install: apt starts 02:26:16 UTC, first attempt times out 02:28:15; retries hit the surviving apt process's dpkg lock. Thirteen browser jobs failed setup; those jobs supply no spec assertion outcome.                                                                                                            | R-ci-green: verify the integrated shared browser-only installer and hosted runtime libraries; no extra retries proposed. |
| [39563595521 Blue Hole](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39563595521/job/119101082427), [Titanic](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39563595521/job/119101082488) | Deterministic rendered-measurement failure at `pick-mission: .globe-pin.is-mission`: width `43.99998474121094`, expected `>=44`; durations not recorded in the reports. Earlier reports called this stale/overprecise measurement, not a flake.                                                                                   | R-ci-green: verify whole-pixel placement against unchanged guards; no relaxed tolerance or new test policy.              |
| [3150 historical shard classifications](3150-S-ci-watch-latest.md), [2940](2940-S-ci-watch-newest.md)                                                                                                                                  | Node manifest mismatch and stale Your sub menu fixtures were already corrected. Shell `waitForFrames` timeout later passed the exact test in 3.8 minutes on [shard 38](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39802535646/job/119907347825). No fresh supported product failure is established here. | Do not reopen completed fixes or infer another correction without current failure evidence.                              |

**Newest fully green main now: unknown.** Last documented green in both
historical reports is `55220c89f02b61aefbe08877035b97ff0baec918`,
[CI 39513009283](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/39513009283),
2026-10-20 23:08:29–23:39:55 UTC (**31m26s**, all 42 jobs successful).
Local ancestry confirms it precedes pinned HEAD and contains **none** of the
three fix commits. It cannot validate their integration or justify closing
R-ci-green. R-release retains any eventual tag decision. Journey/reward
second-objective work stays with 3310; collision and owner-dependent visual work
stay with their existing lanes.

## Simplicity and validation limits

Report-only: no new UI, guidance surface, setting, site branch, runtime config
mutation, dependency, test or Backlog item. Existing assertions, budgets and
snapshots are preserved. The audit finds existing capability coverage adequate
for this verification; missing hosted evidence warrants no manufactured test
or implementation change. Behavioral correctness, discovery retention and
honest-content acceptance receive no new execution claim; visual readability,
beauty, composition, touch layout and real-phone performance remain Claude/owner
acceptance.

- Local e2e mode: **none**. No build, full suite, browser launch, game rendering,
  screenshot/capture inspection or duplicated journey investigation.
- Hosted mode: **read-only audit attempted**; status **blocked/unavailable**.
  No current full-CI, static-shard, installer or 44 px assertion success claimed.
- Owned-note Prettier check and `git diff --check`: **PASS** after formatting.
  Final ownership check: only this new progress note differs; HEAD stays pinned.
- No merge, commit, push, dispatch, rerun, tag, deploy, visual or phone acceptance.
