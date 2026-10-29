# T-golden-mission — default mission openings in the golden set

2026-10-29, Codex. Implementation ready, with corrections for both causes of the six externally reported E2E failures. The orchestrator's pre-fix run produced all 13 Low portrait mission captures. Browser verification of the fixes and a clean-tree default golden set remain pending; this sandbox cannot bind the preview server. The DIRECTOR item remains IN FLIGHT until acceptance is complete.

`tools/golden.sh` now defaults to a combined set: the existing High desktop hero spawn/approach/detail views plus **one first-loaded default mission frame at each of the 13 catalog sites**, including Bismarck, Blake and Hudson. All images share `index.html` and `poses.json`. Mission starts reuse the existing `?mission=<site>&skipBriefing=1` route and loaded-frame hold; no free-dive pose, camera or physics override reaches missions. Fresh contexts retain Arcade defaults. Each mission capture checks its mission ID, chase camera, Arcade mode, tier and failed prop count.

One capture plan feeds the existing runner. There are no new site branches or player settings, and no added HUD surfaces. `GOLDEN_SITES` and layout filtering still apply; a Blue Hole gallery filter maps to the site's single mission. `GOLDEN_MODE=free-dive` retains hero-only runs. The existing opt-in `GOLDEN_MODE=mission` sweep retains all three layouts and opening/+10 s frames. Default combined runs capture only the opening. Golden comparison accepts the combined mode and still rejects incompatible modes/poses.

The existing served-build SHA, dirty flag and build mode are retained per image and in the manifest; the sheet now explicitly labels a clean tree as well as a dirty one. The build used for local checks stamped `2c1aa14672c3ab408e1e4f91df04bd12abced3db`, `dirty: true`, production, accurately describing this uncommitted worktree. A review set must be rebuilt from the final clean checkout. Each context creation is bounded to 10 s, each site's capture work to 180 s, and context cleanup to 10 s. Failures record site/layout/mode/stage, continue to the next context and preserve an incomplete sheet with a failing exit status.

## Quality auto-tier and P2 phone acceptance

`src/core/Quality.ts:detectTier` selects **Medium** for a strong phone: recognized recent GPU (for example Adreno 740 or Apple GPU), short screen side below 600 CSS pixels, at least 8 reported cores and at least 6 GB reported memory. Missing core/memory hints are neutral: a recognized Apple GPU with both hints hidden also selects Medium. Reported 6 cores selects Low even for Apple GPU; masked/unrecognized phone GPUs select Low. Software renderers select Low before phone detection. Rotation does not change the tier. These are code/test findings, not a measurement on an owner's physical phone.

P2-phone-accept must cover **Auto as well as forced Low**. On the actual phone, start without `tier`, `dynres` or pose overrides, select Auto, reload, and record device/browser, deployed build SHA, `window.__game.quality` (including source, detected tier and reason), and `window.__game.perf.tier`. Record performance/readability at Lost City and the other checklist sites at the selected tier with normal dynamic resolution; repeat the existing forced-Low checklist. A strong phone may run Medium automatically, so a Low-only pass does not establish the default experience. Forced-High golden captures and SwiftShader emulation do not establish real-phone Auto performance.

## Verification

- Extended the existing `tests/e2e/opening-framing.spec.ts` capture capability from eight non-hero sites to all 13 catalog sites; retained its spawn PNG/manifest assertions and regression comment. No package-named spec added.
- Playwright discovery selects exactly 13 `persists spawn PNG and golden manifest` cases. Required focused command attempted for two rounds:

  ```sh
  GATES_CONFIG_MODE=writable PW_PORT=4297 PW_OUTDIR=.cache/golden-mission-dist \
    npx playwright test tests/e2e/opening-framing.spec.ts \
    -g 'persists spawn PNG and golden manifest' --repeat-each=2 \
    --output=.cache/golden-mission-focused
  ```

  Blocked before tests: preview cannot start; debug log shows `connect EPERM ::1:4297` and `connect EPERM 127.0.0.1:4297`. Evidence: `.cache/golden-mission-focused.log` and `.cache/golden-mission-discovery.log`.

- `GATES_CONFIG_MODE=writable tools/golden.sh` builds successfully, then fails at preview startup: `listen EPERM 127.0.0.1:4298`. Evidence: `.cache/golden-mission-capture.log`, `.cache/golden-build.log`, `.cache/golden-preview.log`.
- Direct `golden-shots.mjs` invocation also reaches the sandbox browser-launch block (`Target page, context or browser has been closed`). It persists an explicitly INCOMPLETE contact sheet and manifest at `.cache/golden/2026-10-28-234027/`: audited **11 planned hero entries, all 13 planned missions, zero captures**, one launch failure. Evidence: `.cache/golden-mission-runner.log`, `.cache/golden-mission-plan-audit.json`. This is failure-path evidence, not a golden capture set.
- Golden Node suite: 26/27 passed. The CLI comparison test gets empty child stdout and fails JSON parsing; repeating it against unchanged HEAD's comparison module reproduces the failure (`.cache/golden-mission-baseline.log`). All 20 selected mission/planning/manifest/settings capability tests pass (`.cache/golden-mission-tooling.log`).
- `npx vitest run tests/unit/quality.test.ts --configLoader runner --cache=false`: **48 passed**, including flagship Medium, hidden-hint Apple Medium, reported-six-core Apple Low, precedence and rotation cases (`.cache/golden-mission-quality.log`).
- Full `GATES_CONFIG_MODE=writable PW_PORT=4296 PW_OUTDIR=.cache/golden-mission-dist tools/gates.sh --full-e2e`: initial default fork-pool unit run was stopped after remaining silent for over five minutes. Following the sandbox workaround documented in `2190-S-bughunt-9.md`, restarted the unchanged gates with an exported shell-only `npm` function appending `--pool=threads` solely to `npm test`. No assertions, timeout limits or repository configuration were changed. Initial logs: `.cache/runs/20261028-183210-2-94slHY/`; final run: `.cache/runs/20261028-183742-2-8Exbq4/`. Final result: **FAIL, exit 1**. **PASS:** production/typecheck builds at both deployment bases, strict content, **192 unit files / 4,415 tests** (677.91 s), attribution, and repository-wide Prettier. **FAIL:** Python 162/167 (four existing build-manifest `spawnSync git EPERM` cases plus the baseline-reproduced empty-output golden CLI case). **BLOCKED:** full root E2E and project-base E2E cannot start their preview servers; no browser assertions ran. `git diff --check` passes.

After merge into a clean checkout with loopback/browser access, rerun the focused two-round command, `tools/gates.sh --full-e2e`, and plain `tools/golden.sh`; verify exactly 13 mission PNGs, all represented in the combined sheet, with `dirty: false`. Visual ratings and physical-phone acceptance remain with their existing review/owner workflows.

## Follow-up verification

Reviewed the existing implementation and full-gate logs, then repeated the focused two-round Playwright command, golden tooling checks, Quality tests and `GATES_CONFIG_MODE=writable tools/golden.sh`. Playwright still fails before executing assertions because its preview cannot start. The golden entry point rebuilds successfully with the served SHA above, `dirty: true` and production mode, then fails with `listen EPERM 127.0.0.1:4298`. No clean-tree capture evidence can be produced from this uncommitted checkout in the current sandbox.

Current results: Playwright discovery lists all **13** catalog mission cases; **18/18** selected mission/planning/manifest/settings Node checks pass; the full golden Node suite remains **26/27** with the same baseline-reproduced empty CLI stdout failure; Quality remains **48/48**. Logs: `.cache/golden-mission-discovery-current.log`, `.cache/golden-mission-focused-current.log`, `.cache/golden-mission-tooling-current.log`, `.cache/golden-mission-quality-current.log` and `.cache/golden-mission-capture-current.log`. The full gate result above remains failing, with browser acceptance unexecuted; this follow-up does not claim a passing gate or visual rating.

## External gate failures and corrections — 2026-10-29

The orchestrator ran `tools/gates.sh --full-e2e` with working Vite/Chromium outside this sandbox. Its run at `.cache/runs/20261028-223305-281427-ovEweU/` passed Python, content, build, unit, project-base E2E, attribution and Prettier. Root E2E finished **825 passed, 6 failed, 50 skipped**. This supersedes the earlier local inability to execute browser assertions; it is the pre-fix result, not acceptance of the corrections below.

Five failures shared an invalid scene-graph assumption in `tests/e2e/opening-framing.spec.ts`: the opening probe searched only the hero's direct children for a mesh. Wrecks nest their body under LOD/groups; plain vent/chimney heroes can be meshes themselves. The probe now uses Three's recursive `getObjectByProperty('isMesh', true)`, which includes the root, and explicitly fails when no mesh exists. Existing facing, screen bounds, underwater clearance, collision and illumination assertions are unchanged. No prop hierarchy, site data or camera behavior was changed to satisfy the probe.

The sixth failure exposed a product counter bug in `src/ui/Journal.ts`. Samples intentionally share the Finds group with secrets, but the site chip counted every group member as a secret. Monterey's three scanned secrets therefore displayed `3/5 secrets` because two unscanned samples inflated its denominator; scanning a sample also inflated the numerator. The secret chip now excludes sample identities. Samples remain discoverable and readable in Finds. The original E2E assertion for `3/3 secrets` is unchanged.

Added four cases to the existing `tests/unit/journalGroups.test.ts` capability suite: no scans, secret only, sample only, and both. They verify exact secret progress and that scanned samples still open their Journal entries. All four fail against the original counter and pass with the fix. Targeted Journal/exploration suites: **4 files / 243 tests passed**; typechecking passes. Logs: `.cache/golden-mission-gatefix-regression-before.log`, `.cache/golden-mission-gatefix-unit.log`, `.cache/golden-mission-gatefix-typecheck.log`.

Required focused Playwright commands were attempted after searching the existing specs by capability:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4297 PW_OUTDIR=.cache/golden-mission-gatefix-dist \
  npx playwright test tests/e2e/opening-framing.spec.ts \
  -g 'underwater free-dive opening|persists spawn PNG and golden manifest' \
  --repeat-each=2 --output=.cache/golden-mission-gatefix-opening
GATES_CONFIG_MODE=writable PW_PORT=4299 PW_OUTDIR=.cache/golden-mission-gatefix-dist \
  npx playwright test tests/e2e/f2-explore.spec.ts \
  -g 'three hidden discoveries|samples collect per dive' \
  --repeat-each=2 --output=.cache/golden-mission-gatefix-explore
```

Discovery selects **52 opening/capture cases** and **4 exploration cases** across two rounds. Both executions stop before assertions because the preview server cannot start here. Logs: `.cache/golden-mission-gatefix-opening.log`, `.cache/golden-mission-gatefix-explore.log`, and corresponding `-list.log` files. The orchestrator must rerun these against a build containing the fixes, then the full gates.

The external run did pass all 13 catalog mission capture cases. Audited the resulting files: exactly one 390 × 844 mission PNG per catalog site, linked in each test's `golden/index.html`, with matching mission ID, Arcade mode, chase camera, Low tier and zero failed props. All stamp SHA `2c1aa14672c3ab408e1e4f91df04bd12abced3db`, production, **dirty: true**. Audit: `.cache/golden-mission-external-capture-audit.json`; images and sheets are under the external run's `test-results/opening-framing-catalog-mi-*/golden/`. These are real capture evidence, but do not replace the requested combined default golden set from a clean checkout or physical-phone Auto acceptance.

Full local gates rerun after the fixes: `GATES_CONFIG_MODE=writable PW_PORT=4296 PW_OUTDIR=.cache/golden-mission-gatefix-dist tools/gates.sh --full-e2e`, using the same shell-only `npm test` thread-pool workaround documented above. Completed at `.cache/runs/20261029-000125-3-iNZBH5/`, **FAIL, exit 1**. **PASS:** content, root production/typecheck build, **192 unit files / 4,419 tests** (592.87 s), project-base production/typecheck build, attribution and repository-wide Prettier. **FAIL:** Python **162/167**, the same four `spawnSync git EPERM` build-manifest cases and empty CLI-output golden case; these passed in the orchestrator's environment. **BLOCKED:** root and project-base E2E preview startup; no post-fix browser assertions ran locally. Aggregate log: `.cache/golden-mission-gatefix-gates.log`. `git diff --check` passes. External browser rerun remains required; no passing full gate is claimed.
