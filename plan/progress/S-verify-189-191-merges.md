# S-verify-189-191-merges

2026-11-11 — DIRECTOR item 16n, brief 192; two audit rounds.

Read DIRECTOR first and re-read the changes already on main:
`819974fe` (phone acceptance), `542b6359` (mission clock), and `12f97d88`
(photo/gallery). Main and this branch began at `02a73116`.

## Round 1: merged behavior and missed teardown branch

The first-minute journey correctly preserves configured local, hosted and CLI
deadlines. Its final screenshot is bounded, but the other phone acceptance group
still had a separate, unbounded afterEach screenshot, including after timeouts.
Playwright gives teardown a fresh test-sized budget, so a stalled renderer in
those portrait/landscape tests could still delay the worker beyond the body limit.

Extended the existing configuration capability unit test to invoke the real
teardown callbacks. Before editing the spec, it failed: `phone.png` supplied no
`timeout` instead of the required `5_000`. All seven other configuration tests
passed. Replaced both group-specific hooks with one file-level hook: skip
`timedOut`, otherwise capture `last-state.png` with a five-second deadline.
The final regression models hook inheritance in every layout group, retains all
three journey deadline checks, and covers passed, failed, interrupted and timed-out
results. No journey assertions or configured timeouts changed.

## Round 2: lifecycle and error recovery

- Mission: traced open versus closed/pending briefing, surface/near-site starts,
  URL-probe and Home guards, props before/after content readiness, live/paused
  velocity and emergency ascent, statistics reset at Begin, voluntary
  surface/resume, replay, duplicate start events and disposal. The briefing
  itself prevents repeated Begin input; Mission.start emits once. Existing
  all-site first-move integration tests check the changed late-props behavior
  against real geometry. No further confirmed defect.
- Photo/gallery: traced manual and automatic render-time captures, denied/null
  context, draw/encoder failures and retries, capture cancellation under pause
  and debrief, touch/rebound controls, portrait cropping, quota eviction,
  unavailable/future storage, deletion/retry and ZIP URL cleanup. Existing
  capability units exercise these boundaries. No further confirmed defect.

Net simpler: two screenshot handlers become one (four fewer spec lines), with
the same evidence path for every layout. No production code, settings, UI,
dependencies, site branches or save formats changed. Cut logged in CHANGELOG.
Tests stay in the existing configuration capability file; no package numbers
were added to code or test comments.

## Validation

- Baseline: 349 tests across configuration, mission approach/core, overlay focus,
  photo mode and photo store passed. After the fix, the same 349 passed.
- Broader lifecycle run: 186 tests across configuration, first-move integration,
  mission router/timeline and session statistics passed, including all 111
  first-move cases. Combined with the run above, 527 distinct tests pass.
  Command: `npx vitest run tests/unit/playwrightConfig.test.ts tests/unit/firstMove.test.ts tests/unit/missionRouter.test.ts tests/unit/missionTimeline.test.ts tests/unit/gameObjectives.test.ts --configLoader runner --cache=false`.
- Final configuration regression: 8/8 pass after strengthening hook-inheritance
  coverage. TypeScript, repository-wide Prettier and `git diff --check` pass.
- Full gate unit suite: all **4,862 tests across 196 files pass**, in 1,226.31
  seconds. Final gate results and limitations are below.

Grepped `tests/e2e` for first-minute, teardown/screenshot, briefing/clock,
photo/gallery and touch coverage. Ran these selected capabilities against the
fresh production build (all commands exit 1 before browser tests at preview
startup):

```sh
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/verify-merges/dist PW_PORT=4193 \
  npx playwright test tests/e2e/phone-accept.spec.ts \
  -g 'kamaehuakanaloa: guidance reaches first scan within sixty seconds and debrief exits|touch help and photo gestures name no keyboard keys or boost' \
  --output=.cache/verify-merges/phone-results
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/verify-merges/dist PW_PORT=4194 \
  npx playwright test tests/e2e/d-photo.spec.ts \
  -g 'photo mode freezes the sim|a denied photo canvas context|empty gallery guidance' \
  --output=.cache/verify-merges/photo-results
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/verify-merges/dist PW_PORT=4195 \
  npx playwright test tests/e2e/mission.spec.ts \
  -g 'briefing freezes the game|scan bow and stern -> banner -> surface -> debrief|crush depth -> HULL FAILURE banner' \
  --output=.cache/verify-merges/mission-results
```

Playwright discovery confirms 5 phone, 3 photo and 3 mission cases selected.
Logs: `/tmp/verify-merges-{phone,photo,mission}-e2e.log`. An exact-capability rerun
with `DEBUG=pw:webserver` on port 4196 records `connect EPERM` for both `::1`
and `127.0.0.1` (`/tmp/verify-merges-browser-debug.log`). Browser acceptance
remains unverified; no hosted-CI green or under-30-minute claim.

Required gate command:

```sh
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/verify-merges/dist PW_PORT=4192 \
  bash tools/gates.sh
```

The gate completed with exit **1**, `FAIL gates (e2e=smoke)`.
Logs: `.cache/runs/20261111-003205-2-eqT7U1/`.

- **Pass:** writable configuration, strict content validation, root build and
  TypeScript, all 4,862 unit tests, attribution and repository-wide Prettier.
  The separate project-base build also passes.
- **Python:** 169 tests ran, with five failures in unchanged tools. Four
  build-manifest cases cannot spawn Git (`spawnSync git EPERM`); the golden
  comparison test cannot parse empty subprocess JSON. These match the earlier
  mission/photo verification notes. No tooling assertions or gates were changed.
- **Browser:** root smoke and project-base gates stop at preview startup,
  before executing browser tests. The selected phone/photo/mission attempts
  above fail at the same boundary; debug output confirms localhost `EPERM`.

Verification and the confirmed teardown fix are complete. Browser acceptance
and a green full-gate run require a runner that permits those operations.
After recording these results, changed-file formatting and `git diff --check`
pass again.
