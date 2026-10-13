# S-render — nightly golden and performance scheduling

2026-10-13. Backlog item 18, `plan/DIRECTOR.md` §6. Branch: `codex/1560-S-render-nightly-perf`, based on `075c264`. **Partial implementation, not DONE:** the scheduling bullet is implemented; hosted execution and Claude review remain pending.

## Ownership and scope

Before editing, this worktree and main had no live changes. Inspected worktree/branch status and commits awaiting collection. The launched 1530 result, `plan/progress/1530-S-tests-ci-build-once.md` in its worktree, reports two production builds shared across consumers and canonical gate orchestration, with hosted validation still pending. Its live changes own `ci.yml`, `package.json`, gates, tooling tests, deploy docs and CHANGELOG. S-flow and V-beebe have committed work awaiting collection; V-beebe includes golden pose changes. S-rov has committed render/audio changes and live test/progress changes. None are integrated or edited here.

Only `.github/workflows/render-nightly.yml` and this note are changed. No PR/push trigger, required status, deployment dependency, package/gate change, tool change, budget tuning or visual adjustment is added. S-tests capture extraction and assertion consolidation remain with S-tests; this workflow does not remove captures from its gates. No push, merge or tag was performed.

## Schedule and matrix

The dedicated workflow runs daily at **08:23 UTC** (`23 8 * * *`; 03:23 Chicago during daylight time, 02:23 during standard time) and supports manual `workflow_dispatch`. Scheduled execution uses the default branch once this workflow lands there. Manual dispatch uses the selected ref's event SHA. Checkout explicitly selects `github.sha`; both tools use that checkout and the build produced by `golden.sh`, without downloading a CI/deploy build or rebuilding for the benchmark.

The job uses Ubuntu, Node 22, `npm ci`, the existing lock-keyed Playwright browser cache, and `bash tools/install-playwright-chromium.sh` (three bounded attempts, including OS dependencies on cache hits). A workflow-wide `render-nightly` concurrency group serializes scheduled and manual runs across refs, without interrupting an active run. There is one runner and one capture/benchmark process at a time. The job has a 90-minute deadline, each diagnostic step has 30 minutes, and uploads have three minutes each.

Explicit benchmark inputs come from `GRAPHICS_TIERS` in `src/core/config/quality.ts` and `HERO_SITES` in `src/game/Cosmetics.ts`, cross-checked against the catalog and current tool:

| Site identifier  | Tier identifiers         |
| ---------------- | ------------------------ |
| titanic          | low, medium, high, ultra |
| lost-city        | low, medium, high, ultra |
| great-blue-hole  | low, medium, high, ultra |
| beebe-vent-field | low, medium, high, ultra |
| monterey-canyon  | low, medium, high, ultra |

`PERF_SITES=titanic,lost-city,great-blue-hole,beebe-vent-field,monterey-canyon` and `PERF_TIERS=low,medium,high,ultra` request **20 measurements**. The benchmark's default tier list is only Low/High; the explicit list covers Medium/Ultra too. `auto` is a detection setting, not a benchmark tier. Challenger Deep and Endurance belong to the broader seven-site review set, not this five-site benchmark set.

**Deferred S-tiers integration:** after its reviewed Ultra→High merge and saved-setting migration, update this workflow's `PERF_TIERS` to the supported three tiers and verify 15 rows on that checkout. Do not anticipate that migration here or pass an unsupported tier after it lands.

## Existing tool contracts and lifecycle

- `bash tools/golden.sh` builds via `npm run build`, serves `dist` on `127.0.0.1` with `GOLDEN_PORT` (default 4298) and `--strictPort`, polls root for up to 30 iterations, calls `golden-shots.mjs --base-url URL`, and kills its own preview through its EXIT trap. It owns the build and preview logs at `.cache/golden-build.log` and `.cache/golden-preview.log`. Its readiness poll does not explicitly fail on exhaustion; the capture tool's request/navigation checks still fail the run. The workflow leaves this existing behavior intact.
- `golden-shots.mjs` accepts one positional URL or `--base-url URL`, normalizes its path, and can resolve Vite's project-base warning link. It starts no server and performs no build. `GOLDEN_TIER`, `GOLDEN_LAYOUTS`, `GOLDEN_SITES`, `GOLDEN_MODE` and the development-only `GOLDEN_CLOSE` are existing inputs; none are overridden here. Existing defaults are High, desktop 1600×900, free dive, fresh Arcade profiles, life seed 42 and dynamic resolution off. Its default table contains seven sites plus the east Blue Hole gallery: currently 23 PNGs when complete. It writes `.cache/golden/<UTC YYYY-MM-DD-HHMMSS>/`, including `index.html`, `poses.json`, PNGs and partial failure records. Later reviewed pose changes will be captured from their own run SHA.
- `perf-budget.mjs` accepts **positional** base URL and output directory, plus comma-separated `PERF_TIERS` and `PERF_SITES`; it starts no preview and does not resolve a project base warning. The workflow explicitly sets `VITE_BASE=/` for both build and previews. The benchmark uses fresh Arcade contexts, 1280×720/DPR 1, seed 42, dynamic resolution off, frozen opening spawn/chase pose, 30 warmup and 60 sampled frames. Existing checks reject incomplete scenes, console/page errors and mismatched quality settings. No timing threshold is added.
- Each preview port is obtained by binding an ephemeral socket on `127.0.0.1` and closing it; strict-port startup fails any allocation race rather than silently selecting another port. After golden exits, the numeric step launches a separate Vite preview of the same `dist` using `setsid node node_modules/vite/bin/vite.js preview`. It polls the explicit `http://127.0.0.1:<port>/` with bounded, HTTP-success-required curl calls and checks server liveness. EXIT/INT/TERM traps terminate the owned preview process group and reap its process, including benchmark failure and cancellation paths. No server is started locally during validation.
- Bash steps use Actions' explicit `bash` shell (`-e -o pipefail`), preserving failures through `tee`. No `continue-on-error` or swallowed benchmark exit is used. After a golden failure, numeric diagnostics still run if Chromium installed and the golden step ran, unless cancelled; missing `dist/index.html` fails immediately. On this fresh checkout there is no fallback build. A cancelled run starts no new benchmark.
- Numeric `results.json` and `results.md` are updated after each successful site/tier, accompanied by `<site>-<tier>.png`. The unmodified benchmark stops at the first failing pair. Earlier completed results and logs remain; failure before the first success can leave no JSON/Markdown, so missing files are ignored by uploads without making the diagnostic step successful.

## Artifacts

All three uploads use `always()`, include hidden paths and retain artifacts for **14 days**. Names contain run ID, attempt and full SHA, keeping reruns and different checkouts separate. Runner-side numeric/log output uses `D=.cache/render-nightly/<run_id>-<run_attempt>-<sha>`; golden keeps its tool-owned timestamp path on the fresh runner.

| Artifact name suffix / prefix       | Uploaded paths                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `golden-<run>-<attempt>-<sha>`      | `.cache/golden/` (contact sheets, poses, PNGs and any partial outputs)         |
| `perf-<run>-<attempt>-<sha>`        | `D/perf/` (`results.json`, `results.md`, benchmark PNGs)                       |
| `render-logs-<run>-<attempt>-<sha>` | `D/*.log`, `D/run.txt`, `.cache/golden-build.log`, `.cache/golden-preview.log` |

Logs include dependency/Chromium install, golden capture, benchmark, numeric preview and readiness errors when available. Provenance records checkout SHA, lockfile SHA-256, Node/npm versions, matrix, base URL and numeric preview PID. GitHub retains job console output as well. Upload attempts on failure/cancellation remain subject to hosted runner termination and service availability; a hard job deadline cannot guarantee complete artifacts.

## Static validation

No game, browser, golden capture or benchmark was run locally; no screenshots were opened or judged.

- `actionlint` and `shellcheck` are unavailable. PyYAML 6.0.1 parsed the workflow with `BaseLoader` (avoiding YAML 1.1's boolean interpretation of `on`). Reviewed schedule/dispatch-only triggers, valid Actions contexts, immutable checkout, serialization, sequential lifetimes, root base, conditional execution, failure propagation, upload paths and deadlines against current CI/deploy/tool source. Extracted every `run` block and passed it to `bash -n`; all five blocks pass. Compared both explicit environment lists to their source definitions and checked the catalog identifiers.
- `npm run typecheck`: **PASS**, exit 0.
- `npm run build -- --config .cache/s-render-validation/vite.config.mjs --configLoader native`: **PASS**, exit 0, including TypeScript. Generated the ignored config bundle with the same rolldown/native-loading pattern as the existing `GATES_CONFIG_MODE=writable` path because shared `node_modules` is read-only. Existing chunk-size warning remains; no source/budget change. Build log: `.cache/s-render-validation/build.log`.
- `npm test -- --configLoader runner --cache=false --pool=threads --maxWorkers=1 tests/unit/quality.test.ts tests/unit/cosmetics.test.ts tests/unit/arcadeLoadout.test.ts tests/unit/settingsSave.test.ts`: **PASS**, 145 tests in four capability files, exit 0. Uses the repository's writable-config convention and the established sandbox thread-pool workaround. Log: `.cache/s-render-validation/unit.log`. An initial invocation could not create its redirect log while the independent build setup was creating the directory; reran after directory creation, with no test failure or source edit.
- `node --test --experimental-test-isolation=none tools/tests/golden-options.test.mjs`: **PASS**, six tests, no skips, exit 0. Disabled process isolation so the sandbox reports individual cases; the initial default-isolation invocation reported only a passing file-level wrapper.
- `npm run test:py`: **PASS**, 156 existing Python tooling tests, exit 0. Log: `.cache/s-render-validation/python.log`.
- `npx prettier --check .github/workflows/render-nightly.yml plan/progress/S-render.md` and whole-repository `npm run format:check`: **PASS**, exit 0. Whole-repository log: `.cache/s-render-validation/format.log`. `git diff --check`: **PASS**. No tests/assertions/skips were added or changed.

Hosted-only checks remain pending: actual preview readiness/cleanup, Chromium captures, complete numerical matrix, failure artifacts, scheduling and concurrency. Local e2e/full browser gates are intentionally not run under the nonvisual constraint; this work makes no claim about their result or real-phone performance.

## First hosted run: required checks

1. Dispatch the workflow on the collected branch/SHA for initial evidence; after integration, confirm a scheduled default-branch run at 08:23 UTC. `run.txt` must match the workflow SHA, current lockfile hash and Node 22. Both commands must execute from the same checkout. Confirm there are no CI/deploy dependencies or changed required statuses.
2. Confirm dependency and three-attempt Chromium installation succeed, including OS dependencies on a cache hit. Golden must perform one successful root-base build and use its allocated loopback strict port. Confirm the capture log reports the root preview URL and golden's preview exits before the numeric preview begins.
3. Inspect the complete golden manifest: High, desktop, free dive, Arcade, seed 42 and dynamic resolution off; `complete: true`, no failures, current planned heroes and **23 PNGs** for this checkout (including two east Blue Hole shots). Download the contact sheet, manifest and PNGs. If the golden table changes before collection, derive the count from that SHA's table rather than weakening assertions or changing poses to fit a count. Claude judges readable in 10 seconds, beautiful and Phone-OK; capture success alone is not visual acceptance, and desktop-only goldens do not validate phone layouts.
4. Confirm a separate owned numeric preview starts on an available `127.0.0.1` port, becomes ready with HTTP success, and serves the golden build. JSON must have exactly **20 unique site/tier pairs**, equal to the five-site/four-tier cross product above, without Challenger or Endurance. Verify the reported tier, DPR 1, dynamic resolution off, scene completeness, viewport, 30 warmup/60 samples, renderer, mean/p50/p95, draw/triangle counts and pose data. Markdown must contain the same rows and metrics. Expect SwiftShader; measurements are host diagnostics, not GPU/real-phone predictions.
5. Confirm all three immutable artifact names include the matching run/attempt/SHA, contain the documented paths (including hidden `.cache` outputs), and have 14-day retention. Preview/build/capture/benchmark logs and provenance must be available even when a diagnostic fails. A golden failure must retain its failure status while allowing numeric diagnostics if its build exists; a benchmark failure must leave the job failed and retain completed rows. Record these failure paths when observed; do not change source, assertions or budgets to manufacture success.
6. Confirm numeric preview termination on success. In a separate controlled manual cancellation check, cancel during numeric work and verify the owned server/process group is terminated, no new benchmark starts after cancellation, and available artifacts are attempted. Also dispatch while one run is active: the second must queue in `render-nightly`, including across refs, with no concurrent diagnostics. Record hosted durations and any timeout/incomplete artifacts before adjusting scheduling bounds.

## Unfinished S-render work and contracts

**Scarp kind table-driving remains unfinished**, pending Claude's golden judgment. **Title-scene reuse of shared Headlights/MarineSnow remains unfinished**, also requiring Claude visual review. **Consolidation of the three hull-creak paths remains unfinished**, deferred under S-render until S-rov's overlapping audio/render changes are integrated. This note does not close S-render or advance S-tests/S-tiers beyond their owned work.

No player-facing elements, settings, guidance surfaces, layout patches, site branches, configuration mutation or helper copies are introduced. Source is unchanged: real GMRT terrain, all 13 identities, scan, Journal, marine life, keyboard/pad/touch, accessibility and default Arcade remain protected. Capability checks cover quality, the five-site identity definition, Arcade loadout and saves. Simple, Rewarding and Honest contracts are preserved by scope and source checks; Claude owns visual acceptance. No screenshots or software-GL numbers justify rendering changes, Phone-OK acceptance or new performance thresholds.
