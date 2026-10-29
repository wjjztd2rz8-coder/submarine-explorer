# V-hunga-kama-subject-pins

## Scene restored for Claude's visual review

`git log -S '18, 16, 6' -- data/landmarks/kamaehuakanaloa/props.json`
identifies `6a5d2c26`, the scene recorded with Kama's
`2026-10-28-131853` golden in the earlier progress note. `9127cbff`, merged
by `aa928fa6`, backed it out to preserve the old pins. This change restores
that Kama scene data, rather than choosing another composition numerically:

- Existing north chimney becomes the 18×16×6 `smoker-cluster`; the existing
  south chimney returns to its 14×12×3.3 cluster. The redundant small north
  stack added during the rollback is removed: four prop declarations instead
  of five. The second north chimney stays present.
- Pillows return to the historical 18×15×2.5 size and east-southeast position.
  They remain scenery rather than the opening anchor.
- Reframe uses the north chimney directly, without a separate `aimHero`:
  range 26 m, altitude 9 m, yaw offset −16°. Mission approach tuning is retained.
- Reconstruction notes explicitly describe the invented cluster silhouettes
  and the north stack's roughly 9 m height; the old claim that every chimney
  remains under 5 m is removed.

Hunga data is unchanged. The gate follow-up below changes shared waypoint timing.
No visual rating or acceptance is
claimed; Claude still decides whether this scene merits merging.

## Capability pins and reasoning

The earlier `T-kama-pins` work already replaced the fixed chimney-centreline,
pillow-footprint and absolute-pose assertions. Those checks pass for the
restored shipped geometry. This follow-up preserves their thresholds and
solid-geometry visibility probe and fixes the following remaining assumptions:

- `missionComposition.test.ts`: require the **authored vent itself** to expose
  middle and upper solid body from the actual mission spawn, across all three
  tiers and desktop/portrait/landscape. Previously any nearby prop of the same
  model could satisfy the sightline. The subject must still belong to the first
  required contact's scan neighbourhood. Terrain and visible solid props
  occlude the rays; a plume or tip cannot establish visibility. Both primary
  scans still complete through the existing continuous pilot/contact test.
- `lowTierFollowups.test.ts`: the former hypothetical taller cluster is now
  shipped data. Its rename control selects the authored subject, preserves
  its dimensions and updates every manifest reference to that subject,
  including the base free-dive hero. The old fixture left that reference
  dangling when it renamed the newly shared anchor. No hard-coded future
  cluster dimensions are needed. Free/mission openings still require solid
  body visibility, safe hull/camera positions, ambient fill and a usable free
  opening scan beam. The opaque foreground blocker must still fail visibility
  in every matrix cell.
- `freeDiveComposition.test.ts`, `lowTierFollowups.test.ts`,
  `missionComposition.test.ts` and `opening-framing.spec.ts`: resolve the
  authored subject as `reframe.aimHero`, then `reframe.hero`, then
  `freeDive.hero`. A reframe without a separate aim target aims at its own
  anchor in production; tests must follow that meaning rather than silently
  measuring the base-pass subject.
- `eventsTerrain.test.ts`: use `DeepOpeningSpawn` for the authored opening,
  matching the live props system. The preliminary base pose moved 124.10 m
  from the optional plume, outside its 110 m discovery radius; the actual
  reframed opening satisfies the unchanged discovery and arrival checks.
  This corrects the test's spawn source without moving the event or widening
  its radius. The import change applies to every site in this capability test.

The mission sightline retains the supported first-person view used by the
existing pin. It proves environmental visibility from spawn. It does not
claim that the chase-view hull cannot cover the vent; that appearance remains
part of Claude's review. Chase framing, clearance and free opening subject
visibility remain separately checked.

## Simplicity

The scene restoration uses data and existing tests only; fewer prop declarations
and one fewer opening field. The requested gate follow-up changes one shared
runtime file, using the existing render-preparation stage and one microtask after
completion. No observer, extra frame stage, production site branch, new setting,
setting resolution pass, new spec file, geometry builder or snapshot update. No package identifier in
code, `tools/` changes, `DIRECTOR.md` changes, merge or push.

## Restoration validation (first handoff)

- Final unfiltered run of all four changed unit specs: **101/101 passed**,
  81.18 s. Log: `.cache/kama-pins-unit-final.log`.

  ```sh
  npx vitest run tests/unit/missionComposition.test.ts \
    tests/unit/lowTierFollowups.test.ts tests/unit/freeDiveComposition.test.ts \
    tests/unit/eventsTerrain.test.ts --configLoader runner --cache=false
  ```

- The broader seven-spec run also passed `phonePitch.test.ts`,
  `missionApproach.test.ts` and `perf-budget.test.ts`. It reported 222 passes
  and the preliminary-spawn event failure described above, subsequently fixed
  and verified by the final unfiltered run. Log: `.cache/kama-pins-unit.log`.
- Final typecheck, strict content validation, attribution, formatting of all
  changed files and `git diff --check` pass. The full gate's production build
  passes. A semantic JSON comparison confirms geometry/opening equality with
  `6a5d2c26`, ignoring only prop notes.
- Required `rg` searches of `tests/e2e` found the opening, mission, hero
  approach and optional plume capabilities. All four targeted commands were
  executed against the isolated production build:

  ```sh
  GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/kama-pins-dist PW_PORT=4282 PW_RENDER_REVIEW=1 \
    npx playwright test tests/e2e/opening-framing.spec.ts \
    -g 'kamaehuakanaloa: underwater free-dive opening'
  GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/kama-pins-dist PW_PORT=4283 \
    npx playwright test tests/e2e/content-missions.spec.ts \
    -g 'kamaehuakanaloa: briefing to primary scans to debrief'
  GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/kama-pins-dist PW_PORT=4284 PW_RENDER_REVIEW=1 \
    npx playwright test tests/e2e/terrain-render.spec.ts \
    -g 'kamaehuakanaloa: spawn, hero approach, hero detail'
  GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/kama-pins-dist PW_PORT=4286 \
    npx playwright test tests/e2e/f-events-reform.spec.ts \
    -g 'kamaehuakanaloa/plume: anchored arrival, live cue, sighting and bounded active frame'
  ```

  Each stops during preview startup, before browser assertions. Debug logs
  show the sandbox rejecting localhost connections with `connect EPERM` for
  IPv4 and IPv6. Logs: `.cache/kama-pins-e2e-{opening,mission,approach,events}.log`.
  The requested full browser suite was also attempted with `npx playwright test`
  on port 4287, with the same startup failure:
  `.cache/kama-pins-e2e-full.log`. No browser pass or new golden shot is claimed.

- `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/kama-pins-gates-dist PW_PORT=4285
bash tools/gates.sh --full-e2e` was attempted. Python tooling reports four
  build-manifest subprocess failures (`spawnSync git EPERM`) and one golden
  comparison test failure (`Unexpected end of JSON input`). Content and build
  pass. The aggregate run was interrupted during its full unit phase after
  about six minutes; it produced no unit summary and did not reach its browser
  phases. The affected unit specs passed independently, and the separate full
  browser attempt confirms the preview blocker. No complete gate pass is
  claimed. Logs:
  `.cache/kama-pins-gates-full.log` and
  `.cache/runs/20261029-025402-3-g7m3W9/`.
- Repository-wide Prettier flags only the existing `plan/DIRECTOR.md` issue;
  the explicit no-edit constraint leaves it unchanged.

## Gate follow-up: root causes and fixes

The orchestrator's unrestricted run in
`.cache/runs/20261029-030117-485889-zm8iUC/` passed Python, content, build,
the full unit suite, project-base e2e and attribution. Its full browser suite
reported 844 passes, 50 skips and eight failures. The following changes address
those failures; that earlier run does not validate these corrections.

- Four phone journey failures came from waypoint measurement during an
  unfinished HUD update. The synchronous mission-change listener runs inside
  scanner completion, before the result replaces the scan guidance card. Touch
  CSS hides the waypoint while that scan card is active, so its measured width
  and height are zero. When the result makes the label visible, its existing
  coordinates spill outside the viewport or overlap touch controls.
  `src/app/systems/waypoints.ts` now queues completion layout in a microtask,
  after synchronous reward subscribers, with a disposal guard. Each rendered
  frame measures in the existing `render.prepare` stage after tutorial,
  warning, readout and mission DOM updates. Objective selection stays in its
  original early stage for sonar and tutorial use. No CSS hiding rules, label
  limits or journey bounds/overlap assertions changed.
- The gallery spec pressed J under a paused clock without processing the input
  in a rendered frame. Both that case and the counts cases now pump frames
  until the Journal opens. The counts cases also pump frames until the resized
  Journal has switched to the expected desktop or phone layout, before helpers
  select navigation controls. Previously a helper selected a desktop nav item
  just before a media-query refresh removed it. Titles, distinct articles,
  unlocks, totals, reload persistence and viewport assertions remain intact.
- `f2-explore.spec.ts` still expected samples in the hidden-secret denominator
  (`3/5`), contradicting the passing sample case in the same file and the
  existing `journalGroups.test.ts` contract. The expectation now derives both
  numerator and denominator from hidden secrets (`3/3`). Its sibling sample
  case still requires `0/3` after collecting a sample. Persistent sample Finds
  and hidden secrets remain distinct; production Journal counts are unchanged.
- `appSystems.test.ts` adds guards that objective selection precedes tutorial
  drawing and label measurement follows all HUD updates and precedes drawing.
  `missionApproachWaypoint.test.ts` adds a regression for measuring the settled
  reward HUD before another rendered frame, including cancellation on disposal.
  Existing mission navigation and live-settings tests retain their assertions
  and now invoke the actual preparation hook alongside selection.
- Prettier's only repository-wide difference renumbers five Markdown list
  markers in `plan/DIRECTOR.md`; prose is unchanged. The original brief forbids
  editing that file, so it remains untouched. An exception was requested;
  no formatting exception is assumed.

## Gate follow-up validation

- **318/318 passed** in seven related unit specs: `appSystems`,
  `missionApproachWaypoint`, `uiWaypoints`, `overlayFocus`, `journalGroups`,
  `missionApproachSystem` and `missionRouter`. Log:
  `.cache/kama-pins-gate-fixes-unit-final.log`. The new queued-layout regression
  also passes in isolation: `.cache/kama-pins-queue-isolated.log`.
- **207/207 passed** in `f3Onboard`, `onboardCompletion` and `guidance`, checking
  the tutorial and guidance dependencies preserved by the timing change. Log:
  `.cache/kama-pins-gate-fixes-guidance.log`. That is **525 related unit tests**
  passing across the follow-up runs.
- Final production build includes typechecking. Log:
  `.cache/kama-pins-gate-fixes-build.log`.
- `rg` searches of `tests/e2e` found the failed Journal/curiosity cases and the
  existing waypoint capability checks. The following targeted filters were
  attempted against `.cache/kama-pins-fixes-dist` with
  `GATES_CONFIG_MODE=writable` and separate preview ports:

  ```sh
  npx playwright test tests/e2e/f2-explore.spec.ts \
    -g 'three hidden discoveries: close sonar, reveal, Journal, persistent count and rewards'
  npx playwright test tests/e2e/journal-debrief.spec.ts \
    -g 'consecutive gallery scans unlock distinct Journal entries'
  npx playwright test tests/e2e/journal-debrief.spec.ts \
    -g 'Journal counts points of interest consistently across views and reload'
  npx playwright test tests/e2e/journal-debrief.spec.ts \
    -g 'two-objective scan journey (390x844|844x390)'
  npx playwright test tests/e2e/d-scan.spec.ts \
    -g 'visual hints show an objective waypoint and obey the saved toggle|completion advances navigation and direction in the same frame'
  ```

  All stop before assertions because this sandbox still denies localhost
  connections with `EPERM`. Logs:
  `.cache/kama-pins-fix-e2e-{secrets,gallery,counts,journey,waypoints}.log`.
  The orchestrator must verify the browser corrections outside the sandbox;
  no passing browser rerun is claimed here.

## Commit limitation

The working branch is `codex/v-hunga-kama-subject-pins`. Staging was attempted,
but the sandbox mounts the shared worktree Git metadata read-only:

```text
fatal: Unable to create '/home/vijay/submarine-explorer/.git/worktrees/v-hunga-kama-subject-pins/index.lock': Read-only file system
```

The edits are saved in the worktree. This prevents creating the requested
branch commit in this session; no merge or push was attempted.
