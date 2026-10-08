# F-BUGHUNT-880 — verification of the f30 merges

## Scope and two rounds

Checkout: `5ed3387` (2026-10-08). Read the progress notes for 770, 780,
790, 810, 820 and 840, and recovered 830's deleted note with
`git show 6cd1eb3:plan/progress/F-BLUEHOLE-830.md`. The older
`F-BLUEHOLE-WALL.md` describes a different package and is not 830's report.
Reviewed the corresponding package changes and current integration state.

1. Establish current behavior, audit the seven packages and existing tests,
   run the full gates, and add tests for uncovered interactions.
2. Exercise the new checks, repeat all static/release gates, and attempt the
   full browser suite twice at desktop, phone portrait and phone landscape.
   Record demonstrated defects separately from unresolved acceptance questions.

**No new runtime defect was demonstrated; no runtime, art, content, tuning or
quality settings were changed.** All additions are verification and this report.
Two important existing follow-ups must remain in place:

- `3f962b6` deliberately reverted 830. The director's review in
  `plan/REVIEWS.md` reports hard-edged sand patchwork and a smaller gallery;
  replacement geometry is assigned to 910. The current content has two
  galleries and **no `blue-hole-wall-relief` prop or builder**. Restoring it
  would contradict that decision and this task's no-art constraint.
- `5ce30c4` already reapplies Monterey's carve after 810's cubic reconstruction.
  This pass did not rediscover and refix that resolved canyon-depth regression.

## Orchestrator E2E follow-up — paused Journal input

The unrestricted full gate run passed build, unit, Python, content, attribution,
formatting and project-base E2E. Root E2E completed with **408 passed,
49 skipped and 10 failed** (26.3 minutes). All ten new Low/Medium hero-site
cases failed at the same Journal visibility assertion after two successful
discovery reloads; no other suite failed. The original logs are preserved in
`.cache/bughunt-880/followup/external-before/`, and their error contexts are in
`test-results-gates-4371-1279484/`.

**Confirmed test-harness defect:** `pauseClockBeforeNavigation` stops animation
frames. The test sent `J` and immediately waited for a DOM change. `Input`
queues the Journal edge in its key listener, `startLoop` samples it on the next
frame, and `Discovery.update` then toggles the Journal. A DOM-only visibility
poll cannot advance the paused simulation. The error context also retains the
old tutorial card after Skip for the same reason; Skip's saved completion itself
already passed. This was introduced by 880's test sequencing, not by a site or
Journal runtime change.

**Minimal correction:** present 34 ms of real browser frames immediately after
the native `J` press. The visibility assertion, its timeout, scan/reload counts,
authored text checks, Recreation tag, clipping check and screenshots are retained.
No direct Journal open call, injected input replacement or longer timeout is
used. The same correction applies to all five sites and both tiers.

One new headless case uses real `Input` and `Discovery.update` with mocked DOM
views: a press/release leaves the Journal closed until a frame samples the edge,
opens it on that frame, and leaves it open on the next frame after edge reset.
All **23 f30 regression tests pass**. Browser verification of the correction
requires the orchestrator's unrestricted rerun; this sandbox still cannot run
Vite/Chromium. The prior external run establishes opening, scan and save checks
before the failure, but not the final Journal selection/content assertions.

Follow-up validation: `GATES_CONFIG_MODE=writable PW_PORT=4880
tools/gates.sh --no-e2e` passes production build/typecheck, **144 unit files /
1,485 tests**, **148 Python tests**, content, attribution and repository
formatting. Logs: `.cache/bughunt-880/followup/gates.log` and `followup/static/`.
The first local follow-up gate process was interrupted with exit 143 after
build; its partial log is retained as `followup/gates-interrupted.log` and is
not counted as passing. The complete rerun above supplies the final results.
Three-project discovery still lists all **33 880 browser cases** (including
three conditional 830 cases); `followup/browser-cases.log` records them.

Inspected the external desktop Low opening PNGs for Titanic and Blue Hole in
`test-results-gates-4371-1279484/`: both render a scene, with the bow/gallery and
their scan reticles visible. These pre-fix opening captures do not establish
post-fix Journal rendering or portrait/landscape acceptance. The conditional
830 relief test and its revert reason remain unchanged.

## Regression risks by package

| Package / progress note             | What could regress, and how it is checked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 770 — `F-BLUEHOLE-770.md`           | Scenic versus surveyed mission/surface starts; Low terrain and prop bounds; portrait/landscape framing and scan-panel layout; first scan radius/facing; unchanged discoveries and the linked Recreation Journal entry; deferred animal hint history, frozen time, restart clock and safety priority. Existing `blueHoleOpening`, hero integrity/composition, Surface 740, flow 510 and onboarding suites remain. New 880 opening/sight-line tests and browser scan/reload/Journal checks cover both Low and Medium; three new onboarding system cases cover restart, early card disappearance and safety priority.                                                                                                         |
| 780 — `F-TITANIC-780.md`            | Fade leaking into other sites or hull materials; direct Low output differing from post output; portrait/pitched horizon; surface/ascent activation; backdrop hiding scan targets; scan/reward/save/Journal identity; tutorial readability. Existing `titanicHorizon` covers real shader composition, Low fog colour, pitched ray hits, other-site isolation, ascent and teardown. New real-tile tests prove the opening target is within the unfaded 300 m region, in view, and in front of intervening terrain at all three sizes; prop programs do not receive the terrain fade. Browser cases retain rendered opening evidence and scan/persistence/Journal checks. Pixel acceptance is blocked.                        |
| 790 — `F-CI-790.md`                 | Shared clock helpers affecting other specs; slow Low rendering, mobile navigation and touch holds; save-soak texture/allocation readiness; Journal/debrief timing; scans/tutorials earning too little simulation time; auxiliary axe page closure masking a real page failure; shard discovery/timing estimates. Existing clock, soak-warmup, timing/shard unit tests and complete flow/soak/a11y specs remain unchanged. New tests use paused boot clocks and explicit readiness frames, wait for carbonate as well as terrain textures, and use native touch scan input on phone projects. Full matrix discovery and both release-browser gates were attempted. Hosted acceptance is not established by this local pass. |
| 810 — `F-FIDELITY-810.md`           | Shared terrain/scarp code affecting other sites; Low isolation; survey carve/surface collision and POI seating; mixed-density seams/LOD changes; portrait culling and Medium frame budget; load/save/restart allocations; scan targets below the drawn mesh; Journal/tutorial flow. Existing Monterey fidelity, real-tile scarp support, frame-budget, hero and scan-seat tests run in the full unit suite, including the already-fixed carve. New browser cases cover Low/Medium opening, debug scan station, two reloads and Journal at three inherited viewport sizes; Beebe is an unchanged-site browser control. Renderer cost and appearance remain unverified here.                                                 |
| 820 — `F-LOSTCITY-820.md`           | Carbonate-only scope versus shared smoker materials; Low albedo-only path and flange budget; portrait close views; asynchronous image failure/disposal across reloads; scan anchors/collision near thinner flanges; old discoveries/Journal links; tutorial/scan card integration. Existing surface/flange, Lost City biome/readability/camera and hero suites remain. New mixed-tier lifecycle test disposes the old field before its images finish, builds a replacement field, completes old/new loads out of order and checks sharing/final release. Browser checks wait for actual prop maps, scan and read saved authored text on Low/Medium.                                                                        |
| 830 — recovered `F-BLUEHOLE-830.md` | Shared geology dispatch and prop counts; Low wall/rubble cost; both gallery mouths and phone approaches; hull/camera collision; added relief obscuring original scan contacts; unchanged POI/save/Journal identities and first tutorial scan. **Package is reverted.** Current Blue Hole geometry and opening clearance are checked on Low/Medium. An explicit browser acceptance case is skipped with the revert reason when relief is absent, rather than claiming the feature works. The unit sight-line check also raycasts relief when present. Low relief acceptance is outstanding for 910.                                                                                                                         |
| 840 — `F-BUGHUNT-840.md`            | Failed/shared terrain maps hanging scan/save readiness or disposing a live fallback; Low versus normal-map tiers; unchanged other-site materials; identifier migration/Journal links; phone Surface layout; tutorial priorities; numeric queue ordering after 999. Existing ten-case terrain readiness and Python queue regression tests run unchanged. New checked-in f27 ID fixture covers all 13 sites' real legacy POI/guide links through migration, Journal unlock and two reloads. No queue/runtime fix was necessary in this pass.                                                                                                                                                                                 |

## Added evidence and coverage

- `tests/unit/f30Regression.test.ts`: 23 tests. Four real-tile Low/Medium
  opening cases raycast intervening terrain at 1280×800, 390×844 and 844×390.
  Titanic targets remain nearer than the fade's 300 m start. Thirteen cases
  seed actual pre-merge discovery IDs from f27 and retain authored Journal links
  across migration and two store reloads. Four all-tier Monterey checks retain
  the independent canyon carve at survey knots; the three Medium+ cases fail
  with the historical pre-`5ce30c4` behavior, and Low stays green. One Lost City
  case covers late image
  completion after field disposal/replacement and mixed-tier shared ownership.
  One Journal input case establishes the paused-clock failure mechanism and
  confirms the queued edge opens the view exactly once when frames resume.
- `tests/fixtures/f30-legacy-discoveries.json`: POI/guide identifiers extracted
  from f27, with the resolved source commit recorded in the fixture. This is
  historical compatibility evidence, not IDs regenerated from current content.
- `tests/unit/onboardCompletion.test.ts`: three added 770 system checks.
  Mission restart resets the eight-second delay; frozen frames do not consume
  it or mark the hint seen; card disappearance allows an early hint; low battery
  still preempts animal guidance. Real tutorial, hint engine, event bus and save
  are retained; only DOM views are mocked.
- `tests/e2e/f-bughunt-880.spec.ts`: ten Low/Medium site cases and one explicit
  conditional 830 acceptance case. Render actual openings for five hero sites,
  inspect Titanic's Low-compatible backdrop state, scan with native held input,
  reload discoveries twice, skip the real tutorial and read the authored Journal
  row. Blue Hole scans from the actual 100 m opening; other sites use supported
  debug scan stations **after** the untouched opening capture. These debug
  stations do not prove swimming reachability. Capture opening state, opening
  PNG and post-reload Journal PNG for review. Console shader errors remain fatal.
- `playwright.bughunt-880.config.ts`: repeats the full suite at 1280×800,
  390×844 touch portrait and 844×390 touch landscape. Specs that explicitly
  own a viewport or an existing layout matrix keep those choices; suites that
  inherit a viewport exercise all three sizes. No shared Playwright default,
  threshold, frame count, retry count, skip policy or assertion was weakened.

## Director: suspected or unproven issues

1. **830 Low wall relief is unavailable, not verified.** Revert provenance and
   absent content are confirmed. Do not treat the conditionally skipped Low
   acceptance case as a pass. Recheck actual relief, both galleries, camera/hull
   clearance and target sight lines after 910 lands; adding art is outside 880.
2. **780 pixel readability:** shader, material isolation, Low colour path and
   opening sight lines pass headlessly. A gradual horizon and readable distant
   scan geometry still need actual rendered Low/Medium views and pitched phone
   captures; DOM scan completion does not establish visual target contrast.
3. **810 performance/LOD:** CPU frame-budget guards and allocation/seam checks
   pass. Actual Medium scarp renderer triangles, High/Ultra cost and physical
   height versus a coarse visible LOD still warrant browser inspection. No new
   numerical budget failure or collision bug was reproduced.
4. **820 save-soak readiness:** the existing soak waits on terrain textures,
   while carbonate now exposes separate material `userData.texturesReady`
   promises. Whether a late carbonate replacement causes an allocation flake
   is unproven without GPU accounting. The new 880 browser readiness includes
   those promises; existing soak assertions were not relaxed or changed.
5. **770 completion-hint priority:** 840 already raised the possibility that a
   fresh player's completion toast is replaced by an animal hint. Existing
   tests explicitly retain that behavior. Timing-reset and safety tests pass;
   a minimum toast lifetime remains a director decision, not a proven defect.
6. **790 hosted timing/shard acceptance:** local discovery and headless helper
   tests do not establish that the next hosted run stays under its wall-clock
   cap. Refresh timings from a complete hosted run and inspect retries rather
   than interpreting this sandbox's startup failures as product failures.
7. **880 Journal correction needs browser acceptance.** The external default
   Chromium run exercised all ten site/tier cases through opening, scan and
   two reloads, then exposed the paused Journal input defect corrected above.
   Final Journal selection/content and the three-project follow-up remain
   unverified until the unrestricted rerun. No completed local browser result
   is inferred from a passing headless input test.

## Validation and execution limits

- Focused post-addition run: **8 files / 62 tests pass**, including the new
  real-tile/legacy/lifecycle cases, onboarding, Titanic horizon, terrain failure
  readiness, Monterey fidelity/frame budget, Lost City surface and Blue Hole
  opening. Log: `.cache/bughunt-880/focused.log`.
- Round 1 release gates: root and project-base production builds/typecheck,
  **143 unit files / 1,459 tests**, **148 Python tests**, strict all-site content,
  attribution and repository formatting pass. Full E2E and project-base E2E
  fail before assertions at preview startup. Gate exit is 1. Logs:
  `.cache/bughunt-880/round1.log` and `round1/*.log`.
- Round 2 final release gates: root and project-base production builds/typecheck,
  **144 unit files / 1,484 tests**, **148 Python tests**, strict all-site content,
  attribution and repository formatting pass. Full E2E and project-base E2E
  again stop at preview startup before assertions; gate exit is 1. Logs:
  `.cache/bughunt-880/round2.log` and `round2/*.log`.
- A round 2 development run caught the new carve test accessing Terrain's
  private exaggeration field; it now reads the public config value. The failed
  intermediate project-base build is retained in
  `.cache/bughunt-880/round2-development.log` and `round2-development/`.
  No product failure was implicated. Final typecheck, changed-file formatting
  and `git diff --check` also pass after the report and browser diagnostics update.
- Full matrix discovery with the same `FULL_E2E=1 ROUNDS=2` environment lists
  **1,479 test instances / 71 files** across the three projects. The 880 spec
  contributes 30 active site/tier/viewport cases and three conditional 830 cases.
  Log: `.cache/bughunt-880/matrix-list.log`. Discovery is not execution.
- Full browser matrix: two rounds, each independently attempts all three
  projects. **All six attempts fail before any browser assertion** because
  `config.webServer` cannot start. Logs:
  `.cache/bughunt-880/matrix/round{1,2}-880-{desktop,portrait,landscape}.log`.
- The carve regression negative control temporarily exercised the old missing-
  carve assignment, restored the current source in a `finally` block, and
  produced **three expected failures on Medium/High/Ultra; Low passed**. All
  22 f30 regression tests pass on the restored source. Logs:
  `.cache/bughunt-880/carve-before-fix.log` and `carve-final.log`.
- Direct listener probe independently confirms `listen EPERM
 127.0.0.1:4880`. Direct Chromium launch aborts in
  `sandbox_host_linux.cc:41` with `shutdown: Operation not permitted`.
  Logs: `.cache/bughunt-880/listen-probe.log` and `chromium-probe.log`.
  This managed session cannot request a sandbox override. No PNGs were produced
  by the local attempts. The later external run supplied opening captures, but
  post-fix screenshots and complete visual acceptance remain outstanding.
- Replaced only the checkout's untracked `.cache/codex/shots` symlink with a
  writable local directory. Its prior target was outside the writable workspace;
  the external screenshots remain untouched.

On a browser-capable host, run both release gate rounds and the complete
viewport matrix, then inspect new opening/Journal screenshots as well as
Surface, scan, tutorial, debrief and scarp evidence from the existing suites:

```bash
FULL_E2E=1 ROUNDS=2 GATES_CONFIG_MODE=writable PW_PORT=4880 \
  PW_OUTDIR=dist-bughunt-880 tools/gates.sh --full-e2e
# Repeat the gate command for round 2.
FULL_E2E=1 ROUNDS=2 GATES_CONFIG_MODE=writable PW_PORT=4880 \
  PW_OUTDIR=dist-bughunt-880 npx playwright test \
  --config=playwright.bughunt-880.config.ts --repeat-each=2 \
  --output=test-results-bughunt-880
```

The intentionally missing 830 feature must remain identified as skipped until
replacement geometry is reviewed; successful scan tests on the reverted scene
cannot establish its relief acceptance.
