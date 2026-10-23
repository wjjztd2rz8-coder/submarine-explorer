# S-bughunt — opening-to-first-move handoff

Brief **3370**, **S-verify / S-bughunt**, DIRECTOR Backlog **9**.
Pinned checkout: `d8b0d5990bb8f79037e44f07e2b97b6117fbd340`.

One supported anchor defect reproduced and minimally corrected in
`src/app/systems/camera.ts`: a held command on the first unfrozen frame could
count the skip-briefing opening teleport as successful movement, even with zero
simulation steps. Mission starts now clear the published state immediately and
anchor on the first unfrozen frame, using the existing free-dive path.
`FirstMove.ts`, configured thresholds, camera poses and guidance policy are unchanged.
Late placement after an already armed command remains a finding for the mission/props owners,
documented below; this is not an all-opening-paths clean result.

## Scope and ownership

Before editing, read DIRECTOR Backlog/simplicity/rubric, the newest REVIEWS entry
(2026-10-23 morning), OVERNIGHT-LOG through run 93, CONTRIBUTING-AGENTS, launched
3370/3360/3310 briefs, available 3310/3320-R/3340 results, collected 3350 and
3280 progress, and launched `30-f-bughunt-2` / `F-BUGHUNT-2.md` findings.
Rechecked checkout SHA/status, worktree registrations and visible processes.
The checkout was clean; no overlapping local edit or active test process was found.
3350 owns tile loading, 3360 owns asset batches; neither overlaps this slice.
No uncollected code was imported or used. The journey, full-e2e, touch, collision
and release lanes remain with their owners; parked candidates were not examined.

Only `camera.ts`, `tests/unit/firstMove.test.ts` and this note change. All other
tests, shared helpers, mission/spawn/props code, input, HUD, onboarding, guidance,
data, art, CSS and tools remain read-only.

## Real supported order

- Camera controls initialize before the mission router and subscribe to the real
  EventBus. The controls publish one `{ moved }` object through both
  `ctx.cameraTips` and `ctx.expose`.
- Normal briefing: discovery readiness allows opening previews while frozen;
  changing the start choice can preview another pose. `MissionRouter.begin`
  awaits readiness, calls `applyStart`, hides the briefing, then calls
  `Mission.start`, which emits `mission:started` only from briefing state.
- `skipBriefing`: the router calls `Mission.start` synchronously, then registers
  `discovery.ready.then(applyStart)`. Thus the event may precede opening placement.
  Placement can finish before the first frame, or after unfrozen frames have run.
- Optional mission props can reapply the last opening when the sub is less than
  **2 m** from `lastStart`. The mission listener handles `props:loaded` after
  models load; no camera-anchor notification accompanies the resulting reset.
- Free dive has no `mission:started`. Its first unfrozen controls frame anchors
  movement. The props loader may later apply `composedFreeDiveSpawn` when the sub
  remains within **2 m** of its initial position, excluding explicit URL probes.
- Frame order is `gate.shell` → `gate.photo` → `gate.pointer` → `gate.input` →
  `sim.vehicles` → power/contact → `controls.camera` → later camera/HUD hooks.
  Home, pause and briefing freeze through the shell gate. Frozen input is neutral
  with zero steps; controls deliberately inspect sampled steering only when
  unfrozen. Startup and resume frames also have zero steps. Simulation/contact
  ordinarily run before movement detection, so fixtures place the resulting pose
  before invoking the camera hook; they do not run physics or rendering.
- Current Home boot uses the separate Home system list, without camera controls.
  Leaving a loaded dive for Home retains a frozen old context; selecting a site
  navigates to a fresh page. Dive again emits `mission:restart` and reloads.
  No synthetic same-instance restart/return-to-dive contract was imposed.
  Pause/resume retains the current context and movement progress.
- Production consumers of `ctx.cameraTips.moved` are the onboard creature-hint
  eligibility and clearing checks. They run after camera controls. The old
  F-BUGHUNT-2 persisted three-dive/three-axis hint scheme was later replaced;
  its frozen-start and disposal findings are historical controls, not new policy.

## Reproduction and correction

At the pinned baseline, the following public-behavior regression failed:

1. Initialize real camera controls and EventBus at `(0, -100, 0)`.
2. Emit `mission:started` as skip-briefing does before discovery readiness.
3. Apply the permitted opening pose `(120, -300, -80)` before the first frame.
4. Run the real shell/input gates and camera hook with throttle `1` and
   `resumeFrame=true`. Assert `steps=0`.
5. Expected `cameraTips.moved=false`; actual **true**. No displacement from
   piloting occurred after opening placement.

The mission callback had reset FirstMove at the old pose and marked its camera
session started. It now re-arms that existing session initialization instead.
The first unfrozen camera hook resets at the placed pose before processing the
held command. A subsequent released-input frame at exactly the unchanged
**0.5 m** threshold publishes true. No new distance/time heuristic, opening wait,
input mapping or camera pose change was introduced.

Baseline failure: `.cache/3370-reproduction.log`, exit **1**, **10 passed / 1 failed**.
The same permanent regression passes after the correction.

## Existing versus added guards

Existing `firstMove.test.ts` retains every assertion for 0.4/0.5 m displacement,
post-release motion, idle drift, axis noise, ballast, yaw wrap and sticky learned
state, plus its objective-selection checks. `cameraControls.test.ts` already
covers basic public publication, a frozen command and immediate clearing on a
later mission event; it also guards reset controls. `appSystems.test.ts` guards
real stage ordering, freeze/input gates, resumed clocks and separate Home startup.
Existing camera rig/ceiling/focus/phone/Lost City capabilities are controls.
Existing first-minute e2e specs observe moved state under native controls; they
were read, not run or extended here.

Five added cases extend the existing firstMove capability spec using the camera
fixture pattern, EventTarget canvas, headless rig/HUD, real EventBus and real
shell/input/camera hooks:

- Normal briefing and skip-briefing event/placement orders, frozen commands,
  resumed zero-step frame, **10 m** idle drift, genuine command, then threshold
  displacement and mutation of the same exposed public object.
- The reproduced held-command/skip-briefing/zero-step failure above.
- Free dive without a mission event, paused opening placement, first active
  held command, successful motion, terminal frozen Home, disposal, then a fresh
  mission context with cleared learned state and a new successful movement.
- Paused commands cannot arm movement; uncommanded drift after resume stays
  unlearned. A commanded **0.25 m** partial move survives pause/resume and learns
  at a cumulative **0.5 m**, including motion after release; learned state survives
  another pause/resume.

New distances come from `FIRST_MINUTE_GUIDANCE.moveDistanceM`; no configured
values were changed. There are no private-field or source-text assertions.

## Retained late-placement defect and smallest proposed follow-up

A temporary two-case probe through the same fixture reproduces this distinct
supported boundary in both mission and free dive after the correction:

1. Mission emits `mission:started` (free dive omits it); run the first unfrozen
   idle frame to establish the anchor.
2. Run throttle `1` at the current pose, then release and move **0.25 m**.
   Public moved state remains false. The sub is still within the callers' **2 m**
   opening-replacement allowance.
3. Optional loading applies a far opening reset; the fixture injects
   `(120, -300, -80)`, representing the permitted pose replacement.
4. Run the next unfrozen **idle** camera frame. Expected false; actual **true**.

For missions the real order is props load → `props:loaded` → mission handler's
`applyMissionStart`/`sub.reset` → next camera frame. For free dive it is props
load → composed opening/`sub.reset` → `props:loaded` → next camera frame.
Delayed skip-briefing `discovery.ready` can likewise replace a pose after a
command has armed detection. That last variant is a source-trace inference;
the two tested optional-placement sequences establish the consumer failure.

Evidence: `.cache/3370-late-placement-probe.log`, exit **1**, **11 passed /
2 failed**; exact temporary cases retained in
`.cache/3370-late-placement-probe.ts.txt`. They are not left as new failing,
skipped or expected-failure tests in the capability suite. This fixture injects
the supported caller placement; it does not claim a real asynchronous asset-load
journey or that the chosen coordinates are an authored site's actual spawn.

Smallest proposed owner correction: have the opening-placement callers notify
camera controls **after an actual authored pose reset**, allowing an unlearned
movement anchor/command to restart without clearing an already learned result.
`props:loaded` alone is insufficient: it need not cause placement, and the
camera's earlier subscription would run before mission placement. Inferring a
teleport from distance or ignoring post-release motion would change existing
policy and break retained controls. The required caller/event contract crosses
read-only mission/props/EventBus ownership, so no speculative correction is made.

## Simplicity, rubric and validation limits

The correction replaces eager mission anchoring with the existing lazy free-dive
path. No new production state, listener, dependency, UI, setting, save schema or
site branch. Tests extend one capability spec without shared-helper edits,
relaxed assertions, retries, skips or timeout increases. The behavior evidence
supports comfortable piloting and honest reporting; no readability, beauty,
reward quality or phone-layout score is inferred. All 13 site identities, real
GMRT terrain, hero set pieces, scanning, Journal, life, input and accessibility
remain untouched; Arcade remains the default.

Actual local e2e mode is **none**. No browser, game rendering, screenshots,
unaided journey, hosted CI, GPU, offline-play or real-phone acceptance is
established. Pose changes and frozen/resume flags are injected at the traced
consumer boundary; full startup/router/physics/asset timing is outside this
headless integration fixture. The tests do not prove every opening is immune
to authored placement, as the retained failure explicitly demonstrates.

## Commands and outcomes

- Unmodified baseline: `npm test -- --configLoader runner --cache=false
tests/unit/firstMove.test.ts tests/unit/cameraControls.test.ts
tests/unit/cameraCeiling.test.ts tests/unit/subCameraRig.test.ts
tests/unit/subCameraFocus.test.ts tests/unit/phoneCamera.test.ts
tests/unit/lostCityCamera.test.ts tests/unit/appSystems.test.ts`:
  exit **0**, **8 files / 49 tests**, 4.63 s.
- Reproduction and retained probe commands both used
  `npm test -- --configLoader runner --cache=false tests/unit/firstMove.test.ts`;
  their separate failures are reported above, not hidden by a later suite pass.
- Focused corrected capabilities: baseline command plus
  `tests/unit/missionRouter.test.ts`: exit **0**, **9 files / 104 tests**, 4.77 s,
  `.cache/3370-focused.log`. Final check of the same command after fixture
  refinement: exit **0**, **9 files / 104 tests**, 5.60 s,
  `.cache/3370-focused-final.log`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  exit **1**, `FAIL gates (e2e=none)`, solely from the five Python tooling
  failures below. Aggregate log:
  `.cache/3370-gates.log`; per-gate logs:
  `.cache/runs/20261023-084809-7-KcpBYe/`.

| Gate                    | Completed result                                                      |
| ----------------------- | --------------------------------------------------------------------- |
| Writable config         | PASS                                                                  |
| Python tooling          | FAIL: 5 failures / 167 tests                                          |
| Content                 | PASS                                                                  |
| Root build / typecheck  | PASS; existing large-chunk advisory only                              |
| Full unit suite         | PASS: 192 files; 3,842 passed, 4 existing expected failures; 568.85 s |
| Attribution             | PASS                                                                  |
| Repository formatting   | PASS                                                                  |
| Root / project-base e2e | Not run: mode **none**                                                |

The unit log contains the completed Vitest summary, not just a wrapper PASS.
The four existing expected failures remain unchanged with their collision owner.
While the full unit run was pending, independent `python3 tools/check_attribution.py`
and `npx prettier --check .` also exited **0**; logs are
`.cache/3370-attribution.log` and `.cache/3370-prettier.log`.

The Python tooling gate retains **5 failures / 167 tests**: four
`test_ci_build_manifest` cases fail at `tools/ci-build-manifest.mjs:11` with
`spawnSync git EPERM`, despite status 0/SHA output captured on the error; the
`test_golden_tooling` wrapper fails parsing empty child stdout at
`golden-manifest.test.mjs:151` (`Unexpected end of JSON input`). These match
previous 3280/3340 environment/tooling evidence and are unrelated to camera
behavior. Smallest proposed follow-up: tooling owner validates synchronous
child-process execution on a suitable runner and diagnoses the golden child's
status/stdout/stderr; no provenance or golden assertion is weakened here.

Final owned-file Prettier and `git diff --check` pass. The checkout SHA remains
the pinned input. Only the three owned files differ. No merge, push, tag or
hosted workflow action was performed.
