# R-ci-watch-f-bughunt-960

2026-10-20; reviewed checkout `02d75ca39dc36f0a914c58d88b04d90545664afa`.
Follow-up to `R-ci-green-f` and `R-ci-green-g`. No product, spec, assertion, or timeout changes.

## Requested local reruns

Built an isolated production bundle, then attempted both complete requested matrices:

```sh
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/ci-watch-f-build bash tools/gates.sh --phase build
GATES_CONFIG_MODE=writable PW_PORT=4191 PW_OUTDIR=.cache/ci-watch-f-build ./node_modules/.bin/playwright test tests/e2e/f-bughunt-960.spec.ts --grep great-blue-hole --max-failures=1 --output=.cache/ci-watch-f-bughunt-results
GATES_CONFIG_MODE=writable PW_PORT=4192 PW_OUTDIR=.cache/ci-watch-f-build ./node_modules/.bin/playwright test tests/e2e/f-fidelity-rollout.spec.ts --grep lost-city --max-failures=1 --output=.cache/ci-watch-f-fidelity-results
```

Vite bundled successfully, but the build phase failed in the subsequent provenance manifest step with `spawnSync git EPERM`. Both Playwright invocations failed before executing a test: `Process from config.webServer was not able to start. Exit code: 1`. A diagnostic repeat with `DEBUG=pw:webserver` showed `connect EPERM ::1:4191` and `connect EPERM 127.0.0.1:4191`. This sandbox blocks local browser testing at preview startup; these are unexecuted tests, not observed assertion failures or passes.

Playwright `--list` succeeded: **12 Blue Hole bughunt cases** (three layouts, both gameplay modes, Low/High) and **10 Lost City Medium fidelity cases** (seven desktop, three portrait). The runtime review below is by reading because the browser setup is blocked.

## Source review and retained guards

- `MissionSelect.missionUrl` deliberately carries only mission, tier, and touch. The bughunt spec waits for the mission destination, copies that URL, explicitly sets `life=0`, and navigates again before waiting for readiness. `src/app/systems/life.ts` exits on `life=0`, preventing wildlife from competing for this assisted POI scan.
- The first Blue Hole POI has `min_depth_m: 10`. The assisted pose searches toward that POI for terrain where `Submarine.floorFor` permits hovering at least two metres below its minimum depth. This addresses the rim ledge lifting the hull above scan depth. `Scanner` still requires both scan radius and minimum depth; neither rule is bypassed.
- The real held keyboard/touch control still drives `completeScan(page, target.id)`. The helper refreshes candidate geometry and throws on an unexpected candidate or completion. Touch scan-edge/objective visibility, Journal unlock, exactly one discovery, save/reload equality, tutorial persistence, and absence of page errors remain asserted. No regression assertion was loosened.
- Lost City fidelity still requests Medium with dynamic resolution off, waits for props/discovery/textures, requires a collision-free authored approach, and freezes only vehicle stepping. Both layouts retain opening and both Poseidon poses, all drifts (-2/0/+2 m), and all 16 real rendered frames per drift. Every drift asserts Medium, positive draw calls, positive triangles, fewer than 900,000 triangles, and no page errors. Desktop Poseidon drifts are already separate tests; desktop opening and portrait cases retain three drifts each.

## Fidelity timeout assessment and proposal only

The historical 240 s timeout is **not independently established as pure render cost** here: neither local execution nor a current hosted trace is available. Source review shows a real `requestAnimationFrame` sampling loop that can be slow under software WebGL, but readiness, asset loading, and approach construction also consume the same deadline. A timeout alone does not distinguish them.

**Conditional proposal, not applied:** if the hosted trace confirms the affected Lost City case reaches frame sampling and continues producing valid frames until the 240 s deadline, trial a CI-only, Lost City-only test budget of **360 s** for that affected case. Keep all poses, drifts, 16 frames, Medium/positive-output checks, the strict 900k limit, and the page-error assertion unchanged. Keep other specs' budgets unchanged. If the trace instead shows stalled readiness, missing assets, invalid geometry, or assertion failures, repair that cause. Check the shard's existing global/job deadlines before accepting the trial; do not raise them automatically or update shard weights from sandbox timings.

## Latest main CI

Both required `gh run list -L 5` and the explicit main query `gh run list -L 5 --branch main` exited 1 with:

```text
error connecting to api.github.com
check your internet connection or https://githubstatus.com
```

**Latest five runs, current main status, and current failing-spec list: unavailable due to network restrictions.** No run IDs or fresh failures were retrieved. The backlog's historical failures are `f-bughunt-960.spec.ts` (Blue Hole arcade High across three layouts) and one Lost City Medium timeout in `f-fidelity-rollout.spec.ts`; these are context, not verified latest-main results.

## Gates

Ran `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`; browser reruns were attempted separately above. Logs: `.cache/runs/20261020-164535-2-Y5oArA/`.

- Content and production build/typecheck passed.
- Python: 167 tests, five failures. Four manifest tests fail on `spawnSync git EPERM`; the golden tooling test fails parsing an empty child-process report (`Unexpected end of JSON input`). These do not execute either requested browser spec.
- Unit: Vitest emitted only its startup banner and no test results for about 90 s; interrupted the stalled gate (exit 130). Unit results are unverified. No specific cause for this stall was established.
- Attribution and repository-wide Prettier checks passed when run separately after interruption; `git diff --check` also passed. The complete gate did not pass because of the failures and interruption above.

The separate build-phase manifest failure is logged in `.cache/runs/20261020-164521-2-lg18ZZ/build.log`. A sandbox-capable rerun and GitHub connectivity are still required to verify runtime behavior and latest-main CI.
