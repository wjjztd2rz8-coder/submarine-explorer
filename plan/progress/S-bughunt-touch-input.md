# S-bughunt-touch-input

Audited HEAD `17fd4b6d417bb1bf86cb424ca45024cea323b9a3`. Initial checkout
clean. Two rounds cover virtual stick, site-list swipe, scan hold, rotation,
blur/visibility release, multiple fingers and pointer cancellation. Browser
regressions target both 390×844 and 844×390; native browser execution is blocked
by this environment, so no phone, rendering or screenshot acceptance is claimed.

## Round 1 — reproduction and minimal fix

Read `CONTRIBUTING-AGENTS.md`, the Director simplicity rules, Input,
TouchControls, Home and existing gesture coverage. Searched `tests/e2e` with
`rg` for touch, swipe, pointer cancellation, orientation and visibility specs.
Relevant existing specs include `f1-touch`, `globe-pins`, `hud-touch`,
`phone-accept`, `d-input-hud` and `d-scan`, plus the Home gesture helper.

**Reproduced defect:** Home retained its captured swipe and original Y coordinate
across resize and orientation changes. A later pointer release could expand the
site list from the pre-rotation gesture. Extending the existing interruption
table in `tests/unit/touchControlsAudit.test.ts` produced **2 failures / 68
passes** before the fix (resize and orientationchange). Log:
`.cache/touch-audit/reproduction.log`.

Home now uses its existing cancellation function for blur, resize and
orientationchange, with the same disposer loop. It releases capture immediately,
ignores the stale release and accepts a fresh swipe. No new state, helper,
setting, layout/CSS change, dependency or site-specific branch. Production
change is a small extension of an existing release path, with shared listener
registration/cleanup instead of separate copies. No existing assertion weakened.

## Round 2 — capability review and regressions

- Existing event-level tests cover independent stick/ballast owners, unrelated
  pointer IDs, pointercancel/lost capture, scan held by two fingers, stale events
  after interruption, blur/hidden/rotation cleanup, modal transitions, camera
  drag/pinch/double-tap resets and teardown. Real Input/Scanner cases verify
  partial-scan release and exactly one completion while held. No additional
  production defect was reproduced in these paths.
- Added resize/orientation cases to the existing Home interruption table and
  strengthened it to check capture is released before the stale pointerup.
- Extended `tests/e2e/globe-pins.spec.ts` at both requested sizes: begin a native
  captured header swipe, rotate, require capture release, reject stale movement/
  release, then perform a fresh swipe through the existing native-touch helper.
  The list must remain expanded after that swipe's trailing click.
- Extended `tests/e2e/f1-touch.spec.ts` at both requested sizes: simultaneous
  native stick, ballast and Scan holds; pointer cancellation, blur, hiding and
  rotation; neutral axes/scan and visuals after interruption; stale movement
  rejection; and a fresh Scan reaching the real input consumer. Blur/visibility
  use dispatched lifecycle events; these are not actual OS app switches.
- No new specs or package numbers in code. Existing scan, keyboard sheet-control
  and double-fire assertions remain intact.

## Validation

- Focused units: **5 files / 350 tests passed**, including the **70-case** touch
  audit. Command:
  `npm test -- --configLoader runner --cache=false tests/unit/touchControlsAudit.test.ts tests/unit/touchControls.test.ts tests/unit/touch.test.ts tests/unit/subInput.test.ts tests/unit/overlayFocus.test.ts`.
  Log: `.cache/touch-audit/focused-unit.log`.
- Strict TypeScript: passed. Production build: passed with an isolated output
  and a locally bundled native Vite config, following writable gate mode:
  `npm run build -- --outDir dist-touch-audit --config .cache/touch-audit/vite.config.mjs --configLoader native`.
  Logs: `.cache/touch-audit/typecheck.log`, `.cache/touch-audit/build.log`.
- Playwright discovery finds all **4 new viewport cases**. Both required named
  browser commands were attempted against the fresh isolated build:

  ```sh
  GATES_CONFIG_MODE=writable PW_PORT=4194 PW_OUTDIR=dist-touch-audit npx playwright test tests/e2e/globe-pins.spec.ts -g 'rotation discards a held site-list swipe and a fresh swipe works|sheet keeps keyboard control after swiping'
  GATES_CONFIG_MODE=writable PW_PORT=4194 PW_OUTDIR=dist-touch-audit npx playwright test tests/e2e/f1-touch.spec.ts -g 'simultaneous flight and scan release on cancellation, blur, hiding and rotation|stick moves the sub, scan holds, pause opens by touch'
  ```

  Both exited **1 before running tests**: the configured preview cannot start.
  Direct preview reports `listen EPERM 127.0.0.1:4194`; debug Playwright logs
  also show `connect EPERM` for IPv4/IPv6 localhost. Logs:
  `.cache/touch-audit/site-sheet-e2e.log`, `.cache/touch-audit/controls-e2e.log`.
  There is no e2e pass, browser reproduction or screenshot to inspect.

- Gate invocation: `GATES_CONFIG_MODE=writable bash tools/gates.sh`. Log:
  `.cache/touch-audit/gates.log`; stage logs:
  `.cache/runs/20261105-064847-7-5CkaxY/`. Config, content and production build
  passed. Python: **167 tests / 5 failures**, matching the earlier recorded
  environment failures: four manifest tests on `spawnSync git EPERM`, and
  `test_golden_tooling` on `Unexpected end of JSON input`. The full unit stage
  produced only its startup banner for about four minutes; stopped this owned
  gate session with SIGINT (exit **130**). No full-unit or aggregate gate pass
  is claimed. The gate did not reach e2e, project-base, attribution or Prettier;
  targeted e2e attempts and independent attribution/format checks are recorded
  separately. No test, gate or timeout assertion was weakened to obtain a pass.
  A diagnostic retry with `timeout --signal=INT --kill-after=10s 300s npm test
-- --configLoader runner --cache=false --reporter=verbose` confirmed the
  broader suite was actively progressing through expensive mesh/site tests,
  rather than proving a hang. It reached the five-minute limit (exit **124**)
  with no assertion failures reported and no full-suite result. Log:
  `.cache/touch-audit/full-unit-verbose.log`.
- A separate retained-build gate bundled successfully but its subsequent CI
  manifest step failed on `spawnSync git EPERM`. The ordinary gate build and
  standalone production build above pass; no gate/tool assertions were changed.
- Attribution, repository-wide Prettier and `git diff --check`: passed.
  Full formatting log: `.cache/touch-audit/prettier.log`.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside this sandbox. Logs are in
`.cache/runs/20261105-070055-4119430-0yIEG7/`. Python, content, build, smoke
e2e (**3 tests**), project-base e2e (**8 tests**), attribution and Prettier
passed. Units reported **4,585 passes / 1 failure**: the existing
`lowTierFollowups` pinhole-ray comparison exceeded its unchanged **30-second**
limit (**31.623 seconds**). These results supersede the earlier sandbox-only
gate limitations above; the aggregate gate was still red on that timeout.

The same geometry test took **28.515 seconds** in an isolated local baseline.
Temporary phase/mesh instrumentation identified the cause: full-scene ray
queries spent roughly **22 seconds** intersecting terrain. One dense chunk
alone consumed about **18 seconds**, walking **133,120 triangles** for rays
that passed its broad bounding box. Scene construction took about 5–6 seconds;
full-resolution CPU rasterization took less than a second. The diagnostic
instrumentation was removed.

The fix is local to the existing capability test: partition terrain indices
into bounded batches for the independent ray queries. Batches share the exact
original vertex data, retain every index in order (including the final partial
batch), and use the original material and world transform. The rasterizer still
receives the original unpartitioned scene. No production geometry, LOD, camera,
viewport, sample grid, expected label, occlusion assertion or timeout changed.
No dependency, new spec or global test configuration was added.

The optimized isolated test passed in **9.830 seconds**. The final unchanged
test passed in **13.562 seconds** while running alongside the expensive
`missionComposition` spec with the normal two-worker limit. Final validation:
**7 files / 460 tests passed** in **266.14 seconds**, including all 17
`lowTierFollowups` cases, all 93 `missionComposition` cases and the 350 touch/
input cases. Command:
`npm test -- --configLoader runner --cache=false tests/unit/lowTierFollowups.test.ts tests/unit/missionComposition.test.ts tests/unit/touchControlsAudit.test.ts tests/unit/touchControls.test.ts tests/unit/touch.test.ts tests/unit/subInput.test.ts tests/unit/overlayFocus.test.ts --reporter=verbose`.
Strict TypeScript, changed-file Prettier and `git diff --check` passed. No
additional production behavior changed in this gate follow-up. Logs:
`.cache/touch-audit/hood-before.log`, `.cache/touch-audit/hood-profile.log`,
`.cache/touch-audit/hood-mesh-profile.log`, `.cache/touch-audit/hood-batched.log`,
`.cache/touch-audit/gate-followup-unit.log`,
`.cache/touch-audit/gate-followup-typecheck.log`.

A full gate rerun outside the sandbox is still required; this focused
verification does not claim an aggregate gate pass. The external Python,
content, build, smoke, project-base, attribution and formatting passes above
remain the latest supplied gate evidence.

Outstanding acceptance: execute the listed Playwright cases in an environment
that permits localhost preview and browser launch; inspect their screenshots;
then repeat the full gates and perform the owner's real-iPhone check. The
rotation fix is supported by failing-before/passing-after event-level tests,
not by a claimed native-device reproduction.
