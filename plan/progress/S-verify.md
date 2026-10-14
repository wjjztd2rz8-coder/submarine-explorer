# S-verify — collection merge audit

Backlog item: **S-verify [Codex]**, brief 1620 in `plan/DIRECTOR.md`.
Date: 2026-10-13. Audited main/starting HEAD `0968fed` on
`codex/1620-S-verify-collection`.

## Scope and method

Reviewed `git log --topo-order d9fe38f~15..main`, its 21 merge commits,
combined diffs and relevant parent-to-result diffs, then read the resulting
runtime source and capability tests. The exclusive lower bound resolves to
`3366f5b`, the S-hygiene merge itself; inspected that baseline and its gate
script as well because the brief includes S-hygiene. Also checked the
non-merge conflict cleanup `59d4747`, formatting `01fd45f`, and the subsequent
tutorial helper fix `28b4235`.

No visual judgement was attempted. Tests use the existing capability specs;
the new regression runs real Mission, Scanner and SystemRunner logic with a
DOM-free Discovery adapter. No assertions protecting earlier bugs were
weakened, and no tests were skipped.

## Confirmed defect and fix

The scan-candidate package gives an eligible mission objective priority over
nearer contacts, but production `scan.discovery` ran before `guide.waypoints`
called `scanner.setObjective`. When objectives resolve between frames, a held
scan on the next frame could lock a nearer non-objective POI. Scanner's intended
active-target stickiness then kept that wrong initial choice across frames.
Existing waypoint integration tests manually ran guidance before scanning,
so they did not reproduce production ordering.

- Added a regression in `missionApproachWaypoint.test.ts` using the actual
  frame scheduler, with an objective becoming resolved between frames and a
  nearer debris contact. Before the fix: **FAIL**, expected `bow`, got `debris`.
- Discovery now sets the objective before calling its update/locking the beam.
  A small pure selector in `Mission.ts` is shared with the waypoint system:
  unfinished resolved primaries first, then unfinished resolved optionals.
  Waypoints still recompute after scanning, so same-frame completion can advance
  guidance. Scanner stickiness and candidate/card agreement remain intact.
- Extended the existing app-system test fixture with the scanner API it now
  needs; all its Journal/gamepad/freeze assertions remain intact.
- Logged the behavior fix in CHANGELOG.md. This audit cuts no capability.

This is an integration defect in the collected result, not evidence that a
textual conflict resolution alone introduced it.

Simplicity rules: the fix shares the existing objective-selection rule instead
of adding another state machine; adds no UI, guidance surface, setting, site
branch or config mutation; reuses the existing capability specs; and leaves
appearance and all historical assertions intact. No package IDs were added to
runtime source or test comments.

## Merge-by-merge review

Test names below refer to `tests/unit/`; all run in the targeted audit or full
unit gate. Documentation-only changes additionally receive formatting/content
checks where applicable.

| Commit    | Collection / resolution checked | Source and verification outcome                                                                                                                                                                                                                                                                                                          |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `d992115` | Recovered hero-site fact audit  | Guide/POI data still connects to Journal content. `journalData`, strict content validation; factual citations were not independently re-researched.                                                                                                                                                                                      |
| `a5299a4` | CI sonar capture reduction      | Read workflow and affected sonar capability spec: reduced capture work retains numeric/color assertions. `sonarPalette1200`, `e2eShards`, `playwrightConfig`; hosted execution remains outside this local audit.                                                                                                                         |
| `b7e179d` | S-tests capability map          | Documentation-only coverage map; no runtime replacement. Full unit and formatting checks cover collection consistency.                                                                                                                                                                                                                   |
| `d796c13` | Earlier main into S-flow        | Checked guidance and touch-test integration against final three-step flow. `onboardCompletion`, `f3Onboard`, `touchControlsAudit`.                                                                                                                                                                                                       |
| `3f72b92` | Main into V-bluehole            | Shared geometry helpers and content survive; no appearance changes made. `blueHoleProps`, `blueHoleCollision`, `props-collision`.                                                                                                                                                                                                        |
| `17be8bf` | Main into S-bugs                | Live input map and audio events agree; retired ping/globe actions stay removed. `subInput`, `audioLifecycle`, `saveSoak`.                                                                                                                                                                                                                |
| `a09daed` | V-bluehole bowl                 | Numeric terrain/collider support survives the merge. `blueHoleProps`, `blueHoleCollision`, `geo-talus`; appearance remains Claude's review.                                                                                                                                                                                              |
| `3ac7cb7` | S-bugs collection merge         | Pad Journal still opens/closes through the freeze gate; camera/reset/photo mappings and auto graphics default remain. `appSystems`, `subInput`, `quality`.                                                                                                                                                                               |
| `11d4520` | S-dead shared helpers           | Read DOM/math/RNG extraction and callers: signed/unsigned hashes, separate snow generator and interpolation contracts remain. `presets`, `marineSnowReadability`, `props-procedural`, `touchControls`. Save fields were deferred in the actual progress note despite the commit subject.                                                 |
| `bd1901f` | Main into S-unused              | AssetService lazily loads plain GLTF; shipped assets and generated references agree after decoder removal. `assets`, `props-loader`, attribution. Compatibility decoder-path constants remain unused by loading; no broken runtime request found.                                                                                        |
| `74451fb` | Main into S-tests build-once    | CI root/project-base artifact names, paths and manifest checks agree with gates. `e2eShards`, `playwrightConfig`; Python manifest checks encounter the environment limit below.                                                                                                                                                          |
| `c34ba05` | Main into S-modal stage 1       | One FocusTrap stack/capture listener; Upgrades and modal/embedded Globe chooser ownership survive. `overlayFocus`, `shellEscape`, `globe`, `homeFocus`; legacy ownership remains explicitly staged.                                                                                                                                      |
| `0dc46e8` | Main into S-boot stage 1        | Read deferred lifetime cancellation, rollback, reentrant selection and release paths. `startupLifecycle` passes; boot/registry still eagerly initialize the dive, as already documented for stage 2.                                                                                                                                     |
| `0ecc64f` | Main into S-render nightly      | Read nightly workflow and its gate/capture paths; supported tiers and provenance upload preserved. No local hosted-run or visual claim. Full unit checks cover runtime consumers.                                                                                                                                                        |
| `5cbc226` | Main into collision fix         | Parent-to-result Collision/shared-builder changes preserve collider logic and RNG re-exports. `blueHoleCollision`, `props-collision`, `geo-talus`.                                                                                                                                                                                       |
| `b514a51` | Main into scan-candidate fix    | Candidate priority and active stickiness survive, but the production scheduler exposed the confirmed ordering defect above. `gameScanner`, `missionApproachWaypoint`, `progressScan`, `appSystems`; fixed with regression.                                                                                                               |
| `05a4d1a` | Main into S-rov, conflicts      | Reviewed Input and audio combined resolutions plus config/control parent diffs. ROV and dead ping/globe actions are absent; submarine fixed-step and power ordering retained. `saveSoak`, `subInput`, `audioLifecycle`, `appSystems`.                                                                                                    |
| `8815044` | Main into V-beebe               | Source/capability wiring agrees with merged helper and ROV removals. `beebeIsolation`, `beebeFraming`, `beebeOpeningReadability`; authored pose/appearance left to Claude.                                                                                                                                                               |
| `f0161bc` | Main into S-flow, conflicts     | Camera uses the sub without ROV branches; compact tips/controlTips/pauseSites stay removed. Reviewed actual onboard, Settings, ControlsCard, progress and MissionRouter results, and combined tutorial-test resolution. `cameraControls`, `onboardCompletion`, `f3Onboard`, `settingsSave`, `saveSoak`, `dailySystem`, `progressSystem`. |
| `5f0dda2` | Final S-flow collection merge   | Home/pause/control callbacks, stars and three-step tutorial survive. `homeFocus`, `onboardCompletion`, `tutorialCardDevice`, `missionRouter`, `progressSystem`; recovery and early scans remain covered.                                                                                                                                 |
| `d1cbbf9` | Later main into V-endurance     | Read final camera/lighting data and kept all existing opening guards. `deepOpening`, `openingClearance1290`, `enduranceAtmosphere`; no visual tuning or acceptance claimed.                                                                                                                                                              |

Baseline `3366f5b` (S-hygiene): read the run-scoped gate output/cleanup and
CI callers. Gate invocation keeps its unique build directory and log symlinks;
the smoke/project-base paths were attempted without editing tools.
`59d4747` removes obsolete ROV test references; runtime searches and the unit
suite confirm no action was reintroduced. `01fd45f` is formatting only.
`28b4235` uses the scan-card-aware tutorial helper; the unit tutorial visibility
and completion checks remain intact.

## Save, focus and guidance findings

- **Removed code references:** searched runtime, tests, content, README and docs
  for ROV actions/state/imports. Runtime has none; remaining ROV mentions are
  legacy migration fixtures, real survey facts and art/source references.
  Upgrade code is still intentionally live (`Progress`, config, Upgrades and
  save migration), pending S-rewards; removing it here would exceed S-verify.
- **Old saves:** existing `saveSoak` covers v1/v2/v3 binding records containing
  `toggleRov`, custom reuse of E, intentional unbinding, retired onboard `rov`
  hints, preserved tutorial completion and supported hints. Settings migration
  drops and rewrites `controlTips`. Progress round trips preserve balances,
  earned tokens, upgrades and ratings. Future versions remain byte-for-byte
  protected. No migration loss found in these collection paths.
- **Focus:** top-only Tab/Escape, focus return eligibility, repeated activation,
  nested chooser closure, out-of-order removal and shared listener teardown
  pass the capability suite. Globe's chooser trap is intentional nesting;
  embedded Globe has no enclosing modal trap, and closed choosers do not own
  host keys. No duplicate active trap found in the migrated consumers.
- **Tutorial:** only completing/skipping the tutorial persists tutorialDone;
  scan progress/abort alone do not. Early completed scans survive the earlier
  movement/depth steps; restarting a dive clears early events. Suppression is
  recomputed per frame, so a hidden actionable card releases the current step.
  Dim logged/navigation cards leave tutorial guidance available. Existing unit
  coverage verifies those transitions; no permanent hidden-state latch found.

## Verification

- Initial targeted collection audit: **PASS — 18 files / 304 tests**.
- New scheduler regression before fix: **FAIL as expected**, debris instead of bow.
- Final affected scanner/objective/mission/system tests: **PASS — 5 files / 60 tests**.
- `npm run format:check`: **PASS**, repository-wide, including this note.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh`: **exit 1**, with the following
  actual results. This is the existing CLI workaround for shared read-only
  node_modules; no source, configuration or gate was disabled.
  - Config bundle, strict content validation, root production build (including
    `tsc --noEmit`), attribution and repository-wide Prettier: **PASS**.
  - Full unit suite: **PASS — 192 files / 2,040 tests**, 434.10 s.
  - Python: **165 tests run, 161 passed / 4 failed**. All four failures are in
    `test_ci_build_manifest.py`, where Node's `execFileSync('git', ...)` is
    rejected with `spawnSync git EPERM`; manifest fixture setup fails before
    the assertions can run. Tools remain unedited; this needs a permitted host.
  - Root smoke and project-base browser gates: **BLOCKED/failed startup**;
    Playwright reports its webServer exiting with code 1, so no browser
    assertions executed. The project-base production build itself **PASS**
    (including TypeScript and the PWA service-worker stamp).
  - Diagnosed preview startup directly using the same runner loader/port and
    an existing output directory:
    `npm run preview -- --port 4371 --strictPort --outDir /tmp --configLoader runner`.
    It fails with **`listen EPERM: operation not permitted 127.0.0.1:4371`**.
    No alternate build was used to pass browser tests.
- Existing Vite large-chunk warning remains; it does not fail either build.
- Full gate logs: `.cache/runs/20261013-124919-2-S7zC5O/` (also linked by
  `.cache/gates/<gate>.log`). Final changed-note formatting and
  `git diff --check`: **PASS**.

## Remaining / decisions

- S-modal stage 2 still needs Settings, MissionRouter, shell, onboarding and power
  legacy-handler migration; stage 1 never promised global initialization-order
  independence. Globe host disposal is also already tracked there. S-boot stage 2
  must wire deferredStartup. These are existing backlog items, not merge fixes.
- Phone tutorial/card/banner readability and guidance priority require Claude's
  visual/design review under S-guidance/S-hud. No appearance or layout was tuned.
  Beebe/Blue Hole/Endurance beauty and framing also remain with the visual lane.
- Hosted build-once CI and the first render-nightly run need hosted execution;
  this audit verifies the local code/wiring only.
- Rerun the four Python manifest tests and smoke/project-base browser gates on
  a host that permits child-process and loopback-server operations. The local
  gate result is not fully green, despite passing build/unit/formatting checks.
- No merge, push or tag performed; plan/DIRECTOR.md and tools/ remain unedited.
