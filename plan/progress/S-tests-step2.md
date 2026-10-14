# S-tests step 2 — brief 1710

Backlog item: **S-tests step 2 [Codex]** in [DIRECTOR.md](../DIRECTOR.md). Based on [S-tests-map.md](S-tests-map.md), applied to the current guidance/rewards code at checkout HEAD. This is a non-visual test refactor; game source and `plan/DIRECTOR.md` are untouched.

## Changes and retained coverage

Retire the map's 29 entry specs into `tests/e2e/hud-touch.spec.ts`, `opening-framing.spec.ts` and `journal-debrief.spec.ts`. Contract families own tables of site, layout, touch/mobile/DPR, scale, tier, route and mode. Fresh-player families use the ordinary Playwright fixture; experienced-pilot families retain `helpers/unlocked.ts`. Family scopes isolate fixture options, hooks and state-specific probes.

- Hero HUD: opening → in-range tutorial → contextual hint now shares one boot per site/layout/scale (30 tests → 10 sequences). Every phase still measures its original selectors and keeps all original matchers, including strict selector uniqueness and retired-hint history.
- Summary/Journal: union the overlapping desktop/portrait contracts (25 tests → 15 sequences including landscape). Default desktop/portrait repetition stays **three rounds**; landscape stays **two**. Keep locked entries, front honesty, Recreation tags, mobile body/back focus, desktop disclosure keyboard/focus, Game addition tags, axe, resume and site-picker/menu exit. The disclosure-specific assertions stay on their original desktop/portrait layouts. Existing `ROUNDS` override remains optional; it does not change the shipped default.
- Preserve all **78** catalog tutorial/contact/reward/reload rows and all **99** opening-framing rows. Preserve live three-second openings, real ten-second vent observations, frozen settled-frame samples, route-specific mission/free-dive poses, Realistic checks, terrain/mesh agreement, actual solid-tip/hull geometry, rendered pixel brightness, photo capture and two-round focus, surface mode and native full journeys.
- Split the mixed surface/provenance source: six Blue Hole surface rows go to HUD; two all-catalog Journal rows go to Journal. Keep the large-UI Home Journal reachability journey in HUD alongside its menu/control hit-testing helper.
- Every test declaration has a regression-guard comment. Where the map cannot establish a specific past defect, comments retain that uncertainty. No new skips; the existing hosted two-boot skip keeps exactly its original scope. Keep all opt-in baseline/observation environment controls.
- Use `homeReady` for every initial/reloaded Home load in these capabilities. Share the identical dive navigation/readiness setup in `helpers/dive.ts`, retaining the original 45-second shell and 20-second discovery waits. Other frame policies and readiness predicates remain separate.
- Migrate timing keys for every moved row. Unchanged rows retain the previous exact/fallback estimate; combined rows sum their constituent weights conservatively. Remove timing keys/fallbacks belonging to retired files, including their stale titles. `tools/e2e-timings.json` labels migration as estimates, not measured post-refactor durations.

No player capability or regression guard was cut. CHANGELOG records the test consolidation. No appearance changes, merges, pushes or tags.

## Inventory and assertion audit

| Inventory                                         | Before | After |
| ------------------------------------------------- | -----: | ----: |
| Repository entry specs                            |     94 |    68 |
| Local discovered cases                            |    824 |   794 |
| Target entry specs                                |     29 |     3 |
| Target expanded cases                             |    316 |   286 |
| HUD cases, including six surface rows             |    167 |   147 |
| Opening-framing cases                             |     99 |    99 |
| Journal/debrief cases, excluding six surface rows |     50 |    40 |

Counts come from Playwright JSON discovery, not the older map's 95/806 inventory. Discovery of just the three new capabilities returns 286 cases. Hosted-default discovery returns 777 cases after its existing `@render` exclusion; listing does not measure body-time skips.

A temporary AST audit compared all **686 original matcher expressions** against the new specs. All but two match verbatim after ignoring formatting/comments. The two reviewed equivalents are the shared panel horizontal-overflow predicate (parameter names only), and `String(round === 1 ? 0 : 1)` → `round === 1 ? '0' : '1'`. All seven explicit throw expressions are retained; existing shared helper contracts still execute. The map's known obsolete five-step tutorial/HUD selectors were already replaced before this task; this refactor preserves the current three-step guidance contracts instead of restoring retired UI.

A direct call to the existing shard collector/balancer verified all 794 discovered cases belong to exactly one of 30 shard regexes. The migration maps 316 original selections onto all 286 capability survivors; 172 source selections have exact historical timing matches. Other cases retain their former fallback/default, rather than borrowing a similarly named stale timing.

## Timing evidence and limits

No before/after browser wall-time or per-spec runtime measurement is available in this sandbox. Initial load average was 0.64/0.79/1.26, but process visibility is sandbox-limited, so a quiet CPU cannot be certified. Before-run Playwright failed **before test execution**: the preview cannot bind `127.0.0.1:4271` (`listen EPERM`). The same preview failure blocks after-run browser execution. Its sub-second startup failure is not an e2e timing or speedup. No browser assertion is claimed to have passed here.

For review and subsequent CI balancing, these are the **pre-existing historical per-spec weights**, including exact matches plus explicit former fallbacks/defaults. They include retries/timeouts and are not clean serial wall times. Post-refactor weights are conservatively migrated, not newly measured.

| Original spec                              | Cases | Exact historical matches | Historical/fallback total (s) |
| ------------------------------------------ | ----: | -----------------------: | ----------------------------: |
| `d-flow.spec.ts`                           |     3 |                        3 |                         240.0 |
| `discovery.spec.ts`                        |     2 |                        2 |                          97.4 |
| `f-beebe-framing-680.spec.ts`              |     3 |                        3 |                         181.6 |
| `f-bughunt-15.spec.ts`                     |    30 |                       30 |                         219.9 |
| `f-bughunt-4.spec.ts`                      |     5 |                        5 |                         169.9 |
| `f-bughunt-hud-touch-overlap-1390.spec.ts` |    78 |                        0 |                        3510.0 |
| `f-challenger-opening.spec.ts`             |     4 |                        0 |                         180.0 |
| `f-debrief-720.spec.ts`                    |    15 |                       15 |                         252.8 |
| `f-debrief-zero-1160.spec.ts`              |     6 |                        6 |                         150.8 |
| `f-flow-audit-510.spec.ts`                 |     9 |                        9 |                         585.9 |
| `f-horizon-1190.spec.ts`                   |     8 |                        8 |                          88.8 |
| `f-hud-layout.spec.ts`                     |     6 |                        6 |                         276.4 |
| `f-journal-debrief-1060.spec.ts`           |    10 |                       10 |                         326.3 |
| `f-journal-photo-1370.spec.ts`             |     3 |                        0 |                         135.0 |
| `f-lostcity-readable.spec.ts`              |     7 |                        1 |                         277.1 |
| `f-mission-940.spec.ts`                    |    15 |                        0 |                         675.0 |
| `f-monterey-portrait-hud.spec.ts`          |     2 |                        0 |                          90.0 |
| `f-toast-placement.spec.ts`                |     8 |                        0 |                         360.0 |
| `f-touch-audit.spec.ts`                    |    16 |                       16 |                        1138.4 |
| `f-touch-controls-1392.spec.ts`            |     7 |                        0 |                         315.0 |
| `f-touch-stack.spec.ts`                    |     9 |                        0 |                         405.0 |
| `f-verify-520.spec.ts`                     |     2 |                        2 |                          49.6 |
| `f-verify-530.spec.ts`                     |     6 |                        6 |                         202.8 |
| `f-verify-610.spec.ts`                     |     5 |                        5 |                          69.4 |
| `f-verify-650.spec.ts`                     |    18 |                       18 |                         432.0 |
| `f-verify-740.spec.ts`                     |     8 |                        8 |                         132.5 |
| `f-verify-920.spec.ts`                     |     6 |                        6 |                         421.9 |
| `f-verify-hull-lostcity-1290.spec.ts`      |    12 |                        0 |                         540.0 |
| `f-visual-fixes.spec.ts`                   |    13 |                       13 |                         714.1 |

| Capability survivor       | Cases | Migrated estimate (s; no measured speedup) |
| ------------------------- | ----: | -----------------------------------------: |
| `journal-debrief.spec.ts` |    40 |                                     1816.5 |
| `opening-framing.spec.ts` |    99 |                                     3832.3 |
| `hud-touch.spec.ts`       |   147 |                                     6588.8 |

## Verification

- **PASS:** `npm run typecheck` and `npm run build` through the writable-config gate path; final build outputs are isolated under `.cache/s-tests-step2/`.
- **PASS:** `npx prettier --check .`; content validation; attribution (14 assets); Playwright local/hosted discovery; assertion retention audit; unique/exhaustive 30-shard selection.
- **BLOCKED:** baseline and final browser execution, including smoke/project-base, by localhost `listen EPERM` before a test can start.
- **BLOCKED:** `npm test -- --configLoader runner --cache=false` stalls before collection. A separate thread-pool, single-worker, no-file-parallelism run also stalls before collection. These are not passing unit runs.
- **FAIL (environment):** Python gate: 161/165 pass, four build-manifest tests fail with `spawnSync git EPERM`; the same failures occur before the refactor. Their fixture child processes produce git output but Node reports EPERM.
- **tools/gates.sh:** run with `GATES_CONFIG_MODE=writable`, isolated build output and port 4271. Initial and subsequent ordinary runs reached successful content/build gates and then stalled in unit collection; interrupted rather than claim success. A final run bounds only the stuck `npm test` command so every remaining gate can report. Completed gate summary appears below.

Final completed `tools/gates.sh` run: `.cache/runs/20261014-054055-7-idLNwT/`. Exit status **1**. Config, content, root build, project-base build, attribution and prettier passed. Python failed in the same four subprocess fixtures; unit stalled and timed out; smoke and project-base e2e failed before execution. The temporary exported `npm` wrapper ran the real unit command under `timeout --kill-after=5s 45s /home/vijay/.local/node/bin/npm`; every other gate command ran normally. The separate single-thread unit attempt timed out after 90 seconds without collecting tests. No repository gate or assertion was weakened to obtain these results.

Final `git diff --check` passed. All 65 untouched spec inventories are identical before/after. No modifications under `src/` or to `plan/DIRECTOR.md`.

## Remaining

Run the three capabilities and the full unit/gate suite in an environment that permits preview sockets and test-worker subprocesses. Capture before/after timings there using the same built application, default round counts and one worker on a quiet CPU; replace conservative migrated weights with actual hosted JSON. Browser validation of the combined Journal sequence remains necessary. No game defect was established by an executable spec here, so no game source or unit regression was added.
