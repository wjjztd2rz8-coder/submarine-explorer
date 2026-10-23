# S-bughunt: late opening placement fix

Brief **3420**, **S-verify / S-bughunt**, DIRECTOR Backlog **9**.
Input main/HEAD: `e4ce192496195c06acfb655ac3d05dd559391691` (clean checkout).

## Plan and baseline

1. Recreate the executable retained in 3410's progress note against current main,
   including its six supported orderings at Titanic, Lost City, Beebe and Monterey.
2. If still reproducible, notify camera controls only after actual authored opening
   resets and reuse its existing first-unfrozen-frame anchor reset. Preserve learned
   movement and partial progress when props finish without resetting the sub.
3. Extend `tests/unit/firstMove.test.ts`, run gates, review the result twice, and
   report the actual validation limits.

Read CONTRIBUTING-AGENTS, DIRECTOR's scope/simplicity/rubric, the latest review,
3370's progress note, 3410's full witness, and the real initialization, frame,
mission/props, FirstMove and disposal paths. This branch already contains 3370's
lazy first-frame anchor correction; `FirstMove.ts` itself was unchanged by it.

**3370 does not fix this late case.** The unchanged retained witness passes all
24 historical observation assertions on current main, confirming the same defects:

| Ordering                         | Titanic | Lost City | Beebe | Monterey |
| -------------------------------- | ------- | --------- | ----- | -------- |
| Briefing, then late props        | false   | false     | true  | true     |
| Skip briefing, then late props   | false   | false     | true  | true     |
| Free dive, then late props       | true    | true      | true  | true     |
| Props before discovery/play      | false   | false     | false | false    |
| Free dive with depth probe       | false   | false     | false | false    |
| Skip briefing, delayed readiness | true    | true      | true  | true     |

Values are public `cameraTips.moved` after the next idle frame. The pilot commanded
about **0.293 m**, below the **0.5 m** learning threshold and within the callers'
**2 m** replacement allowance. Real shipped props/heightmaps, hull selection,
MissionRouter, Submarine physics and contact ran. IO completion and DOM/UI/image
boundaries are controlled as in 3410; this establishes reachability, not live-load
frequency. The temporary source and full logs are in `/tmp/late-placement-fix/`.

## Change and regression

`GameContext.reanchorFirstMove` is an optional camera-owned callback, called after
`sub.reset` in the mission opening function and the optional free-dive props
placement. It marks an unlearned session for the existing lazy reset on the next
unfrozen controls frame. It preserves already learned movement and is removed on
camera disposal. Mission readiness and late mission props share the same opening
function, covering both orders. Props notifications that cause no placement never
call the callback. Earlier initialization can safely precede camera controls.

Production change: **10 added lines across four files**, no new state, event,
listener, timer, heuristic, setting, dependency or placement algorithm.
`FirstMove.ts`, thresholds, the 2 m allowance, authored data, camera presentation,
input and guidance policy are unchanged. No site branches or package numbers
are added to source/tests. This explicit handoff reuses the existing anchor path
and avoids inferring movement intent from distance or asset events.

The existing firstMove capability spec gains a typed version of the real Beebe
witness with eight orders: briefing/skip/free late props, props first, depth-probe
no reset, delayed readiness, and already learned free/mission movement. It checks
real reset counts, loaded prop counts, public moved state, idle drift after a
replacement, subsequent genuine piloting, and continued post-release learning
across pause/resume when no replacement occurs. Only the explicit idle-drift
control injects a position; authored replacement poses come from actual callers.
The existing capability assertions remain intact. No new spec, skip, retry,
expected failure or relaxed assertion is introduced.

Before production edits, the first seven regression orders produced **4 failures /
14 passes**: briefing, skip, free late props and delayed readiness all incorrectly
published true on the next idle frame. The learned mission control was added in
the second review pass. The corrected focused run and witness results follow.

## Validation

- Original witness recreation: extract the TypeScript block from 3410's note,
  replace `__ROOT__` with this checkout, and use a `/tmp/late-placement-fix`
  Vitest config with `maxWorkers: 1`. For each of `titanic`, `lost-city`,
  `beebe-vent-field`, `monterey-canyon`, run:

  ```bash
  PROBE_SITE=<site> node node_modules/vitest/vitest.mjs run --config /tmp/late-placement-fix/vitest.config.mjs --configLoader runner --cache=false --reporter verbose
  ```

  Baseline: **6/6 historical observations per site, 24 total**; logs
  `titanic-baseline.log`, `lost-city-baseline.log`, `beebe-baseline.log`,
  `monterey-canyon-baseline.log` under that temporary directory.

- Corrected witness: change only the old `movedAfterIdle` expectation to false
  and repeat the same commands: **24/24 pass**. Logs `<site>-fixed.log`.
  A separate JSON-record comparison verifies exact equality of all before/after
  poses, reset counts, event lists, prop statistics and post-release coast
  controls between baseline and corrected runs. This confirms placement behavior
  did not change.
- Regression before production edits:
  `npm test -- --configLoader runner --cache=false tests/unit/firstMove.test.ts`:
  **4 failed / 14 passed**, `/tmp/late-placement-fix/regression-before.log`.
- Corrected focused run:

  ```bash
  npm test -- --configLoader runner --cache=false tests/unit/firstMove.test.ts tests/unit/cameraControls.test.ts tests/unit/missionApproachSystem.test.ts tests/unit/missionRouter.test.ts tests/unit/appSystems.test.ts
  ```

  **5 files / 84 passed**, exit **0**, **6.74 s**;
  `/tmp/late-placement-fix/focused-final.log`.

- Two review passes: first checked caller notification ordering and existing
  startup/frozen-frame behavior; second checked callback teardown, learned-state
  preservation, and no-reset post-release controls. Added the learned mission
  ordering and an exact loaded-prop count assertion in the second pass. All eight
  permanent caller orders pass. The existing 11 firstMove cases are retained.
- `npx tsc --noEmit`: exit **0**. Owned-file Prettier and `git diff --check` pass.
- Required `GATES_CONFIG_MODE=writable PW_PORT=4342 bash tools/gates.sh` is running;
  aggregate log `.cache/3420-gates.log`, per-gate logs
  `.cache/runs/20261023-103408-28-m01tD1/`. Final results pending.

## Scope and acceptance limits

Only the context/camera/mission/props handoff, existing firstMove spec and this note
are owned. No visual asset, CSS, camera pose or composition changes. Real terrain,
all site identities, scan, Journal, marine life, input and accessibility remain
untouched; Arcade stays the default. Behavioral tests support honest movement
reporting and comfortable piloting; no beauty, readability, journey, phone or
performance score is inferred. No merge, push, tag or hosted workflow action.
