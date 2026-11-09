# S-verify-fish-lock-plates — verification

Brief 151, 2026-11-08. Nonvisual verification of `9427fc29`
(U-scan-fish-lock-landscape) and `20e9c9d9` (V-titanic-detail-plates).
Read the last five Scanner and wreck-material commits and both implementation
diffs, plus the earlier new-hold objective-priority fix `38c62967`.

## Scope and simplicity

Audit the existing scanner and steel material, extend their existing unit specs,
fix reproducible bugs minimally, run `tools/gates.sh`, the scan/wildlife e2e
capabilities and `tools/site-specs.sh titanic`. No new controls, guidance surfaces,
settings, dependencies, site branches or package-named specs.

## Bugs and regression coverage

- Reproduced: after starting a fixed POI scan, changing the marked objective,
  releasing and holding again, the partial fixed POI wrongly retains the beam.
  Both target orders fail before the fix. Fixed by limiting fixed-target
  stickiness to the scanning phase, preserving uninterrupted holds and restoring
  the earlier new-hold objective-priority contract.
- Added six scanner cases: both target orders through guidance change/release;
  off-cone interruption with one abort and exact decay/resume; fish fallback
  after range loss or full decay; a school entering on the completion frame
  while synchronous mission advancement selects the next objective afresh.
  All 53 scanner tests pass after the minimal fix.
- Reproduced: High-tier steel samples its normal map with warped UVs while
  Three's derivative tangent frame still uses the original UVs. Current wreck
  geometries do not supply tangents. Inline the existing normal-begin chunk
  with the same UV substitution as the normal-map chunk. The new tangent-frame
  assertion fails before the fix; all 40 wreck tests pass afterward.
- Extended the existing wreck shader test across all three tiers to preserve
  Three's normal-map preprocessor guards, retain the standard derivative-call
  count, use matching UVs for sampling and tangent-frame construction, and check
  the actual inlined normal operation precedes orientation lighting. This also
  replaces a vacuous ordering check against an include already inlined by the
  audited merge.
- No Low-tier shader bug reproduced by source/unit inspection: Low and Medium
  have no normal maps and retain the guarded derivative tangent-frame path.
  Installed Three r186 explicitly rejects WebGL1 and creates only `webgl2`
  (`WebGLRenderer.js`); there is no WebGL1 fallback compile path. Derivatives are
  core in WebGL2. No compatibility branch or setting was added. These source
  checks do not establish actual driver compilation.

## Validation

- Focused unit run: `npx vitest run tests/unit/gameScanner.test.ts
tests/unit/wrecks.test.ts --configLoader runner --cache=false`: **93 passed**.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4315
PW_OUTDIR=.cache/verify-fish-lock-plates-dist tools/gates.sh` to completion.
  Build (including TypeScript), content validation, attribution and Prettier
  passed. The full unit gate passed **4,645 tests in 196 files** (882.36 seconds).
  Overall gates **failed**: Python tooling reported five failures (four
  build-manifest tests with `spawnSync git EPERM`, plus a golden CLI test
  receiving empty JSON output from its subprocess); smoke and project-base e2e
  both failed to start their web servers. Root and project-base builds passed.
  Logs: `.cache/runs/20261108-162022-2-PlqYX7/`.
- Grepped `tests/e2e` for scan/fish/school capabilities. Attempted:
  - `npx playwright test tests/e2e/d-scan.spec.ts -g 'opening guidance and phone directions follow the primary beside optional wildlife|completion advances navigation and direction in the same frame|scanned contacts stay marked'`
  - `npx playwright test tests/e2e/f2-life.spec.ts -g 'an animal can be scanned: banner, Journal wildlife entry, persistence|animals spawn at a site and stay inside the low tier draw-call budget'`
  - `npx playwright test tests/e2e/props.spec.ts -g 'loads the fixture props, lights them, and logs no errors|Titanic hull ends read differently'`
  - `tools/site-specs.sh titanic`
    All stop before executing tests because Playwright cannot start its web server.
    A debug rerun confirms sandbox-denied localhost connections:
    `connect EPERM ::1:4316` and `connect EPERM 127.0.0.1:4316`.
    Commands use `GATES_CONFIG_MODE=writable`, the retained isolated build at
    `.cache/verify-fish-lock-plates-dist` and separate ports 4315–4317.
- Browser behaviour, real GLSL compilation and screenshots remain unverified.
  Screenshot output is local to this worktree so tests do not write through the
  pre-existing shared screenshot symlink. No visual acceptance is claimed.

Implementation and unit verification are complete. Browser acceptance and a
clean full-gates run remain pending in an environment that permits the required
subprocess and localhost operations. No unrelated tooling changes were made.
