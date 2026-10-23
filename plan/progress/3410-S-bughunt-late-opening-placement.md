# S-bughunt: late opening placement

Brief **3410**, **S-verify / S-bughunt**, DIRECTOR Backlog **9**.
Pinned checkout: `db48e944cd9e9c85b38209393185dae2395b2b65`.
Actual local e2e mode: **none**.

**Confirmed reachable headless defect:** real optional props completion after a
partial commanded move can publish `cameraTips.moved=true` for authored placement.
Beebe and Monterey reproduce through the mission caller in both briefing and
skip-briefing orders; all four sampled free dives reproduce through the props
caller. Titanic and Lost City mission reapplications actually reset the sub but
do **not** reproduce learning. This replaces the arbitrary far-pose witness with
shipped data and actual callers; it does not establish live-load frequency,
journey, visual or phone acceptance. No production or test file changes.

## Provenance and ownership

Before editing, read DIRECTOR Backlog, simplicity rules and rubric; the newest
REVIEWS entry (2026-10-23 morning comprehensive review); OVERNIGHT-LOG through
run 93; CONTRIBUTING-AGENTS; the launched 3370/3390/3400/3410 briefs; 3140 and
3280 spawn progress; finished 3370's result and matching uncollected progress.
Evidence locations:

- `/home/vijay/submarine-explorer/.cache/codex/3370-S-bughunt-opening-first-move-result.md`
- `/home/vijay/subexp-wt/3370-S-bughunt-opening-first-move/plan/progress/3370-S-bughunt-opening-first-move.md`
- `plan/progress/3140-S-bughunt-hero-spawn.md`
- `plan/progress/3280-S-verify-spawn-clear.md`

`git rev-parse HEAD`, `git status --short` and
`git worktree list --porcelain` pinned the clean input and registered ownership.
Read-only `git -C <3370-worktree> status --short` / `diff --stat` / diffs of
`camera.ts` and `FirstMove.ts` established the collection boundary. **None of
3370's changes is in this checkout**: its camera callback still calls
`startTips()` eagerly; the 154 added test lines and progress note are absent;
FirstMove was unchanged there. `git diff d8b0d5990bb8f79037e44f07e2b97b6117fbd340
HEAD -- src/app/systems/camera.ts src/game/FirstMove.ts tests/unit/firstMove.test.ts`
is empty. No patch was imported, copied into the probe or depended upon.

3370's result wrapper says gates PASS / smoke; its own detailed note and final
report say non-e2e gates failed on five Python tooling cases and actual e2e was
none. Those historical wrapper labels are not evidence for this package.
3140/3280 provide existing real-heightmap, shipped-prop, fitted-hull and runtime
contact fixture precedent; their spawn-clearance results do not cover late
placement or establish this handoff as safe.

Rechecked worktrees before writing: finished 3360 still has its asset-test/note
edits, 3370 its camera/firstMove edits and note, and 3380 its report; none was
collected. 3390 owns only its two Monterey tests and note (clean at this check);
3400 has its owned missionCore test edit. This package owns **only this note**.
3310's remaining journey extension, 3320-R, 3340, 2980/3050 and the four existing
collision expected failures remain with their owners. No ownership conflict.

## Caller and consumer trace

- `src/app/systems.ts:49-88`: initialization builds the submarine, discovery,
  then props; camera controls subscribe before mission initialization. Props IO
  is optional and can settle after active frames. EventBus dispatch is
  synchronous, in subscription order (`src/core/EventBus.ts`).
- `src/app/systems/submarine.ts:36-64`: the initial free-dive pose comes from
  `chooseSpawn`, with a depth-fitted hull and pressure clamp; a mission initially
  uses `applyMissionLoadout`. The probe invokes this actual initialization.
- `src/game/MissionRouter.ts:396-418,445-452`: briefing preview waits for
  discovery; Begin waits for readiness, applies start, hides briefing, then
  starts Mission. Skip briefing emits `mission:started` synchronously and
  registers `ready.then(applyStart)` afterward. No extra start is emitted in the
  probe; every mission run has exactly the router's one start, free dives none.
- `src/app/systems/mission.ts:42-106,173-175`: `applyMissionStart` calls
  `DeepOpeningSpawn.composedMissionSpawn` for near-site primaries, otherwise
  `missionStartPose`, then `sub.reset` and updates `lastStart`. On `props:loaded`
  it reapplies only when distance to that saved opening is **<2 m**. That is
  distance **before** replacement, not a bound on the resulting reset.
- `src/app/systems/props.ts:38-87`: after real `Props.load`/`placeAll`, the free
  dive applies `DeepOpeningSpawn.composedFreeDiveSpawn` and `sub.reset` if still
  **<2 m** from its initial pose; then emits `props:loaded`. Missions skip this
  free-dive branch and reset in their synchronous bus listener instead.
- Both callers exclude Home and `at`/`poi`/`depth` URL probes; the mission route
  exclusion also protects free-dive composition. None of these rules changed.
- `src/game/Spawn.ts:48-139` and `src/game/DeepOpeningSpawn.ts`: loaded hero
  orientation, bounds and actual collision checks can select a different
  authored opening. The reset itself clears velocity/yaw rate
  (`src/sub/Submarine.ts:219`). The camera rig's renderer-facing methods are
  stubbed; the composition code's own real CameraRig calculations are retained.
- `src/app/systems/camera.ts:46-76`: FirstMove has no knowledge of actual opening
  replacement after its command is armed. Its first active idle update refreshes
  the anchor even on this eager-anchor baseline, isolating the late case from
  3370's completed first-frame finding.
- `src/game/FirstMove.ts:22-58`: a command above **0.2** arms detection; movement
  at least **0.5 m** or yaw at least **pi/90** learns permanently. Released-input
  displacement intentionally counts; idle drift before a command reanchors.
  No threshold or heuristic changed.
- `src/app/System.ts:32-40`: shell/photo/pointer/input gates precede vehicle
  physics, power, prop contact and camera controls. The probe runs the relevant
  real shell/input/vehicle/contact/camera hooks in this order at **1/60 s**;
  photo and pointer are inactive DOM boundaries. Rendering, environment IO,
  power UI, scanner and the remaining frame hooks are not run. The vehicle has
  its default zero optional current field; this is a calm-water headless case.
- The downstream production use at `src/app/systems/onboard.ts:207,221` clears
  or excludes a creature hint when moved becomes true. That UI consequence is
  source trace, not an executed guidance or visual acceptance test here.

## Executed event/frame sequences

All cases use Low, default resolved Arcade settings, actual terrain heightmaps,
fitted hulls, parsed shipped mission/POI/prop documents, real Props and
Submarine. Four sampled sites have entirely procedural shipped props: Titanic
**7**, Lost City **12**, Beebe **3**, Monterey **5**; all load with **0 failed /
0 skipped**. Their collider counts are respectively **12/60/15/836**.
Only DOM UI methods, canvas/image decoding, rig presentation, HUD/save boundaries
and optional IO scheduling are stubbed. No pose is injected after initialization:
`sub.reset` is spied upon without replacing its implementation.

1. Start actual props IO but hold its response. Initialize actual camera
   controls and mission system in production order. Resolve placed shipped POIs
   and the discovery-ready promise. Normal briefing previews then calls real
   `MissionRouter.begin`; skip briefing uses its constructor's start/ready path.
   Free dive has no mission event.
2. Run the first unfrozen **idle startup frame**, with `resumeFrame=true` and
   zero physics steps. This establishes the first active anchor with moved false.
3. Command throttle **1** for **20 frames/20 actual fixed physics steps**. The
   first such frame arms FirstMove. Release for **one more real physics frame**.
   Measured displacement is about **0.292653 m**, below the configured **0.5 m**
   threshold and inside the caller's **2 m** replacement allowance. Moved is false.
4. Settle props IO and await the actual `props:loaded` notification. Real
   `Props.load` builds all shipped props. Mission order is load → emit →
   mission listener → `applyMissionStart` → `sub.reset`. Free-dive order is
   load → composed placement → `sub.reset` → emit. Capture poses and spy calls
   after the synchronous listener chain has completed. Moved is still false.
5. Run the next **idle 1/60 s frame**, including actual physics/contact before
   camera controls. Moved becomes true in the reproduced cases. The newly reset
   velocity cannot account for the large authored change. There is no command
   in this frame and no extra `mission:started`.

Poses below are actual `(x, y, z, yaw radians)`, rounded to six decimals; the
executable prints full precision. Mission rows represent **both** briefing and
skip-briefing late-props runs, which produced identical poses/state. `A` is the
first active anchor, `B` after release immediately before IO, `C` immediately
after the real caller returns. Every row had **one actual reset**, and public
moved was false at A, B and C.

| Site / caller              | A                                                     | B                                                     | C                                                     | Moved after idle |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ---------------- |
| titanic / mission          | `(426.885002, -3768.000000, -275.987110, -0.785398)`  | `(426.678076, -3767.996951, -276.194036, -0.785398)`  | `(426.885002, -3768.000000, -275.987110, -0.785398)`  | **false**        |
| titanic / free             | `(0.000000, -3712.910778, 0.000000, 0.000000)`        | `(0.000000, -3712.907729, -0.292637, 0.000000)`       | `(328.247243, -3779.354592, -294.359758, -1.396263)`  | **true**         |
| lost-city / mission        | `(266.938156, -728.647542, -1048.329135, -1.963495)`  | `(266.667794, -728.644493, -1048.217148, -1.963495)`  | `(266.938156, -728.647542, -1048.329135, -1.963495)`  | **false**        |
| lost-city / free           | `(0.000000, -1199.981646, 0.000000, 0.000000)`        | `(0.000000, -1199.978597, -0.292637, 0.000000)`       | `(68.247236, -781.672479, -928.028662, 0.174533)`     | **true**         |
| beebe-vent-field / mission | `(81.055482, -4966.835609, -231.299319, -2.879793)`   | `(80.979742, -4966.832560, -231.016653, -2.879793)`   | `(52.972531, -4966.835609, -236.885366, -3.010693)`   | **true**         |
| beebe-vent-field / free    | `(0.000000, -4901.396728, 0.000000, 0.000000)`        | `(0.000000, -4901.393679, -0.292637, 0.000000)`       | `(10.007404, -4967.586414, -87.705188, 3.071779)`     | **true**         |
| monterey-canyon / mission  | `(-3492.384768, -724.015336, -1579.635103, 2.748894)` | `(-3492.272780, -724.012287, -1579.364742, 2.748894)` | `(-3400.927430, -724.015336, -1119.848020, 0.000000)` | **true**         |
| monterey-canyon / free     | `(0.000000, -534.647460, 0.000000, 0.000000)`         | `(0.000000, -534.644411, -0.292637, 0.000000)`        | `(-3400.927430, -721.739422, -1298.110226, 0.191986)` | **true**         |

Beebe's mission opening shifts **28.633128 m** from A, with **0.130900 rad**
authored yaw change; Monterey shifts **468.794845 m**, with **2.748894 rad** yaw
change. Both exceed learned distance and turn thresholds despite the real pilot
having moved only 0.293 m before replacement. Titanic's new mission anchor differs
by only about **3.35e-12 m**, and Lost City's is identical: a real reset does not
necessarily mean a learning defect. Their negative result is retained.

### Other supported orders and exclusions

- **Props first, then discovery, then play:** executed on all four sites through
  the skip-briefing router. `mission:started` occurs at construction;
  `props:loaded` arrives while discovery is still pending, before any `lastStart`
  exists. Readiness then places the loaded opening. After the same partial
  commanded move, no additional reset occurs and moved remains false after
  the next idle frame. This control does not fabricate a second notification.
- **No-reset props notification:** all four free dives start with the supported
  `depth=5` URL probe present from initialization (actual clamped y=-8).
  After the same command/release, B=C=`(0,-8,-0.292637,0)`. Props really load and
  emit; reset spy count is **0**, and the next idle frame stays unlearned.
  A real notification alone therefore does not reproduce the defect.
- In those **eight no-late-reset controls**, a paused throttle frame has **0
  steps**, unchanged pose and moved false. After zero-step resume, coasting
  with released controls reaches the configured threshold after **8 additional
  physics frames** (the logged loop counter is 9 due to its terminating check),
  and moved becomes true. It remains true across another pause/resume. This
  guards preserving valid post-release learning and learned state; it is not
  evidence that an authored reset is legitimate learning.
- Existing `firstMove.test.ts` retains its exact 0.4/0.5 m, post-release, sticky
  learned-state, 100 m idle-current drift, axis noise, ballast and yaw-wrap
  guards. `cameraControls.test.ts` retains public publication, frozen commands,
  mission reset and camera reset controls. Existing `appSystems.test.ts` was
  read for pause/resume/input/stage contracts, not rerun. No suite was extended,
  no historical assertion loosened, no skip or expected failure added.
- `at` and `poi` exclusion branches, Home, non-default settings, other tiers,
  other nine sites, nonzero currents and real network/asset timing are **not
  executed** in this probe. Their preservation is source trace and the absence
  of production changes, not new acceptance evidence.

### Delayed skip-briefing readiness, separately

Executed through actual MissionRouter and `applyMissionStart`, with props still
held: initialize at the real mission surface pose → router emits its one start →
first active idle anchor → the same 20 commanded physics frames and one released
frame → populate real placed POIs and resolve controlled `discovery.ready` →
real opening reset → next idle frame learns. This is a concrete router/caller
witness, stronger than 3370's arbitrary consumer-pose injection. It is **not**
an execution of Discovery's fetch/guide/UI loader: that loader's completion is
represented by its public promise. Whether its real optional requests actually
remain pending through a player's partial move is a live-timing inference.
`Discovery.ts:133-159` confirms ready awaits POIs and guide before publishing
placed POIs. No claim is made that this timing was observed in a player journey.

All four rows had one reset, moved false before and immediately after it, then
true after the idle frame. No props notification occurs in these cases.

| Site             | A                                                    | B                                                    | C                                                     |
| ---------------- | ---------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| titanic          | `(-711.186512, -8.000000, -2036.587816, 2.617994)`   | `(-711.040193, -8.000000, -2036.334385, 2.617994)`   | `(426.885002, -3768.000000, -275.987110, -0.785398)`  |
| lost-city        | `(405.275267, -8.000000, -1633.948662, -2.670354)`   | `(405.142412, -8.000000, -1633.687920, -2.670354)`   | `(266.938156, -728.647542, -1048.329135, -1.963495)`  |
| beebe-vent-field | `(235.478428, -8.000000, -197.972826, -2.443461)`    | `(235.290324, -8.000000, -197.748652, -2.443461)`    | `(81.055482, -4966.835609, -231.299319, -2.879793)`   |
| monterey-canyon  | `(13478.293192, -8.000000, -2906.185559, -1.780236)` | `(13478.006949, -8.000000, -2906.124717, -1.780236)` | `(-3492.384768, -724.015336, -1579.635103, 2.748894)` |

## Minimal proposed correction, not implemented

After **actual authored reset only**, have `mission.ts` and `props.ts` invoke a
narrow callback on GameContext owned by camera controls. In `camera.ts`, re-arm
only an **unlearned** session so its next unfrozen frame resets FirstMove at the
new pose before processing that frame's input. Already learned state stays true.
Affected modules: `src/app/context.ts`, `src/app/systems/camera.ts`,
`src/app/systems/mission.ts`, `src/app/systems/props.ts`; FirstMove's existing
reset/update API can remain unchanged. This also covers delayed router readiness
because it uses `applyMissionStart`. This is an owner proposal, not a collected
3370 patch or implemented contract.

A generic `props:loaded` camera listener is insufficient: it also runs when no
reset occurs and a camera listener registered earlier would precede mission
placement. Preserve armed progress on no-reset notifications, post-release
learning, pause behavior, URL probes, the **2 m** allowance and **0.5 m** learned
threshold. No teleport heuristic, extra mission start, new EventBus protocol,
opening composition change or new policy is proposed here.

## Commands, results and limits

Focused existing controls, unchanged:

```bash
npm test -- --configLoader runner --cache=false tests/unit/missionApproach.test.ts tests/unit/missionApproachSystem.test.ts tests/unit/firstMove.test.ts tests/unit/cameraControls.test.ts
```

Exit **0**, **4 files / 52 passed**, **60.22 s**. Separately by capability:

| Existing capability                                   | Result    |
| ----------------------------------------------------- | --------- |
| missionApproach (13 sites × 3 tiers plus enumeration) | 40 passed |
| missionApproachSystem                                 | 4 passed  |
| firstMove                                             | 6 passed  |
| cameraControls                                        | 2 passed  |

The temporary source below ran with:

```bash
PROBE_SITE=titanic node node_modules/vitest/vitest.mjs run --config /tmp/late-opening-probe/vitest.config.mjs --configLoader runner --cache=false --reporter verbose > /tmp/late-opening-probe/titanic-final.log 2>&1
PROBE_SITE=lost-city node node_modules/vitest/vitest.mjs run --config /tmp/late-opening-probe/vitest.config.mjs --configLoader runner --cache=false --reporter verbose > /tmp/late-opening-probe/lost-city-final.log 2>&1
PROBE_SITE=beebe-vent-field node node_modules/vitest/vitest.mjs run --config /tmp/late-opening-probe/vitest.config.mjs --configLoader runner --cache=false --reporter verbose > /tmp/late-opening-probe/beebe-vent-field-final.log 2>&1
PROBE_SITE=monterey-canyon node node_modules/vitest/vitest.mjs run --config /tmp/late-opening-probe/vitest.config.mjs --configLoader runner --cache=false --reporter verbose > /tmp/late-opening-probe/monterey-canyon-final.log 2>&1
```

Each exited **0**, **6/6 observations passed**, respectively **2.84/11.49/3.94/
15.40 s**. These **24 passing observation checks affirm the recorded defects and
controls**, not a corrected product. Full-precision poses, reset counts, event
names, stats and coast controls were captured separately in those temporary logs.
No failing, skipped or expected-failure case is left in the repository suite.

Probe construction failures are excluded from product evidence: the first
`node ... --configLoader runner --cache=false` launch had no tests because the
Vitest mocks API was imported by absolute path; using bare `vitest` with a
`/tmp` node_modules link fixed that probe-only resolution issue. The next launch
had **3 failed / 3 passed and 30 unhandled errors** from an incomplete DOM/Image
stub, an invalid base URL and a wrong hullFor adapter. Corrected only those
`/tmp` boundaries. A later complete Titanic run had **2 failed / 4 passed**
because the exploratory assertions assumed its mission reset must learn; the
actual negative result is now explicitly preserved. No repository/tooling repair
was attempted. The final runs have no unhandled errors; optional seabed-image
warnings come from the deliberately failed image IO boundary, not prop failures.

No full gates/build/browser rerun: they add no evidence for this report-only
reproduction. Actual e2e mode **none**; no hosted workflow, game rendering,
screenshot, GPU, visual score, journey, real-phone performance, offline-play or
phone acceptance is established. Headless geometry/physics and controlled IO
prove the caller can reach the observed state, not its frequency in the wild.

## Retained executable probe

This is the single reusable temporary source for all six orderings; no second
opening algorithm or hard-coded replacement pose. To recreate from this note,
run at the pinned checkout root (all generated files stay under `/tmp`):

````bash
mkdir -p /tmp/late-opening-probe
python3 - <<'PYSETUP'
from pathlib import Path
root = Path.cwd()
probe = Path('/tmp/late-opening-probe')
note = (root / 'plan/progress/3410-S-bughunt-late-opening-placement.md').read_text()
source = note.split('```typescript\n', 1)[1].split('\n```', 1)[0]
probe.joinpath('probe.test.ts').write_text(source.replace('__ROOT__', str(root)))
modules = probe / 'node_modules'
if not modules.exists():
    modules.symlink_to(root / 'node_modules', target_is_directory=True)
probe.joinpath('vitest.config.mjs').write_text("export default { test: { root: '/tmp/late-opening-probe', include: ['probe.test.ts'], environment: 'node', maxWorkers: 1, testTimeout: 30000 } };\n")
PYSETUP
````

```typescript
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { Scene } from '__ROOT__/node_modules/three/build/three.module.js';
import { makeConfig, FIRST_MINUTE_GUIDANCE } from '__ROOT__/src/core/Config.ts';
import { defaultSettings } from '__ROOT__/src/core/Save.ts';
import { EventBus } from '__ROOT__/src/core/EventBus.ts';
import { resolveEffective } from '__ROOT__/src/game/EffectiveSettings.ts';
import { parseMission } from '__ROOT__/src/game/Mission.ts';
import { parsePois, placePois } from '__ROOT__/src/game/Pois.ts';
import { Terrain } from '__ROOT__/src/world/Terrain.ts';
import { requiredHull } from '__ROOT__/src/game/Progress.ts';
import { createSubmarineSystem } from '__ROOT__/src/app/systems/submarine.ts';
import { propsSystem } from '__ROOT__/src/app/systems/props.ts';
import { missionSystem } from '__ROOT__/src/app/systems/mission.ts';
import { cameraControlsSystem } from '__ROOT__/src/app/systems/camera.ts';
import { shellSystem } from '__ROOT__/src/app/systems/shell.ts';
import { inputGateSystem } from '__ROOT__/src/app/loop.ts';
import { FROZEN_INPUT } from '__ROOT__/src/game/MissionRouter.ts';

// DOM-only boundaries; MissionRouter, Mission, placement and physics stay real.
vi.mock('__ROOT__/src/ui/ObjectivesPanel.ts', async (original) => ({
  ...(await original()),
  ObjectivesPanel: class {
    setTitle() {}
    setObjectives() {}
    setVisible() {}
    setGuided() {}
    dispose() {}
  },
}));
vi.mock('__ROOT__/src/ui/Briefing.ts', () => ({
  Briefing: class {
    isOpen = false;
    startChoice = 'near-site';
    root = { querySelector: () => null };
    show() {
      this.isOpen = true;
    }
    hide() {
      this.isOpen = false;
    }
    attachDiveSettings() {}
    dispose() {}
  },
}));
const json = (p) => JSON.parse(readFileSync(`__ROOT__/${p}`, 'utf8'));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const flush = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};
const pose = (ctx) => [...ctx.sub.position.toArray(), ctx.sub.yaw];

const site = process.env.PROBE_SITE ?? 'titanic';
for (const order of [
  'briefing-late-props',
  'skip-late-props',
  'free-late-props',
  'mission-props-first',
  'free-no-reset',
  'skip-delayed-ready',
]) {
  it(order, async () => {
    vi.stubGlobal('document', { hidden: false, createElement: () => ({ getContext: () => null }) });
    vi.stubGlobal(
      'Image',
      class {
        set src(v) {
          this.onerror?.();
        }
      },
    );
    const config = makeConfig(),
      settings = defaultSettings(config);
    const effective = resolveEffective(settings, 'arcade', null, config);
    const meta = json(`data/tiles/${site}/meta.json`);
    const bytes = readFileSync(`__ROOT__/data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      'low',
    );
    const def = parseMission(json(`data/landmarks/${site}/mission.json`), site);
    const free = order.startsWith('free');
    const ready = deferred(),
      propsIO = deferred();
    const events = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        expect(url).toContain(`/data/landmarks/${site}/props.json`);
        await propsIO.promise;
        return {
          ok: true,
          text: async () => JSON.stringify(json(`data/landmarks/${site}/props.json`)),
        };
      }),
    );
    const ctx: any = {
      config,
      settings,
      effective,
      meta,
      terrain,
      tier: 'low',
      scene: new Scene(),
      spawnDepth: order === 'free-no-reset' ? 5 : null,
      app: { state: 'dive' },
      params: new URLSearchParams(
        order === 'free-no-reset' ? 'depth=5' : free ? '' : `mission=${site}`,
      ),
      route: free
        ? null
        : {
            landmarkId: site,
            missionId: site,
            tileId: site,
            def,
            skipBriefing: order !== 'briefing-late-props',
          },
      bus: new EventBus(),
      progress: { hullFor: (d) => requiredHull(d).id, cosmetics: {} },
      baseScanRadii: new Map(),
      input: { wheelDelta: 0 },
      canvas: new EventTarget(),
      rig: { resetView() {}, snap() {}, setChaseRadiusDefault() {} },
      hud: { onResetCamera: () => () => {}, setHullNote() {} },
      headlights: { setEnabled() {} },
      photoMode: { active: false },
      keyboard: { unlock() {} },
      globe: { isOpen: false },
      settingsScreen: { isOpen: false },
      save: { get: () => settings, onChange: () => () => {} },
      expose() {},
      shellBaseHref: () => 'http://localhost/',
      guidance: { visible: false },
      discovery: {
        ready: ready.promise,
        pois: [],
        guide: { isOpen: false },
        debrief: { isOpen: false },
      },
    };
    const vehicle = createSubmarineSystem();
    const resets = [];
    try {
      vehicle.init(ctx);
      const reset = vi.spyOn(ctx.sub, 'reset');
      ctx.bus.on('mission:started', () => events.push('mission:started'));
      ctx.bus.on('props:loaded', () => events.push('props:loaded'));
      propsSystem.init(ctx);
      cameraControlsSystem.init(ctx);
      missionSystem.init(ctx);
      const loaded = new Promise((r) => ctx.bus.on('props:loaded', r));
      if (order === 'mission-props-first') {
        propsIO.resolve();
        await loaded;
      }
      const settleReady = async () => {
        ctx.discovery.pois = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        );
        ready.resolve();
        await flush();
      };
      if (order !== 'skip-delayed-ready') await settleReady();
      if (order === 'briefing-late-props') {
        ctx.missionRouter.begin('near-site');
        await flush();
      }
      const frame = (throttle = 0, resumeFrame = false) => {
        const f: any = {
          sampled: { ...FROZEN_INPUT, throttle },
          dt: 1 / 60,
          fixedDt: 1 / 60,
          realSteps: 1,
          resumeFrame,
        };
        shellSystem.frame['gate.shell'](f, ctx);
        inputGateSystem.frame['gate.input'](f, ctx);
        vehicle.frame['sim.vehicles'](f, ctx);
        propsSystem.frame['sim.contact'](f, ctx);
        cameraControlsSystem.frame['controls.camera'](f, ctx);
        return f;
      };
      frame(0, true);
      expect(ctx.cameraTips.moved).toBe(false);
      const anchor = ctx.sub.position.clone(),
        anchorPose = pose(ctx);
      frame(1); // arm and move through real fixed-step physics
      let steps = 1;
      while (
        steps < 600 &&
        ctx.sub.position.distanceTo(anchor) < FIRST_MINUTE_GUIDANCE.moveDistanceM / 2
      ) {
        frame(1);
        steps++;
      }
      frame(); // release, genuine post-release physics before IO settles
      const before = pose(ctx),
        partial = ctx.sub.position.distanceTo(anchor);
      expect(partial).toBeGreaterThanOrEqual(FIRST_MINUTE_GUIDANCE.moveDistanceM / 2);
      expect(partial).toBeLessThan(FIRST_MINUTE_GUIDANCE.moveDistanceM);
      expect(partial).toBeLessThan(2);
      expect(ctx.cameraTips.moved).toBe(false);
      const calls = reset.mock.calls.length;
      if (order === 'skip-delayed-ready') await settleReady();
      else if (order !== 'mission-props-first') {
        propsIO.resolve();
        await loaded;
      }
      const after = pose(ctx),
        resetCalls = reset.mock.calls.length - calls;
      resets.push(...reset.mock.calls.slice(calls));
      const movedAfterPlacement = ctx.cameraTips.moved;
      frame();
      const movedAfterIdle = ctx.cameraTips.moved;
      console.log(
        JSON.stringify({
          site,
          order,
          anchor: anchorPose,
          steps,
          partial,
          before,
          after,
          resetCalls,
          resets,
          events,
          movedAfterPlacement,
          movedAfterIdle,
          stats: ctx.props.stats,
        }),
      );
      // Assert the observed distinction, retaining the defect as evidence only.
      expect(ctx.props.stats.failed).toBe(0);
      expect(ctx.props.stats.skipped).toBe(0);
      expect(resetCalls).toBe(['free-no-reset', 'mission-props-first'].includes(order) ? 0 : 1);
      expect(movedAfterPlacement).toBe(false);
      const changedMission = ['beebe-vent-field', 'monterey-canyon'].includes(site);
      expect(movedAfterIdle).toBe(
        order === 'free-late-props' ||
          order === 'skip-delayed-ready' ||
          (changedMission && order.endsWith('late-props')),
      );
      if (resetCalls === 0) {
        const pausedPose = pose(ctx);
        ctx.app.state = 'pause';
        expect(frame(1).steps).toBe(0);
        expect(ctx.cameraTips.moved).toBe(false);
        expect(pose(ctx)).toEqual(pausedPose);
        ctx.app.state = 'dive';
        frame(0, true);
        let coastFrames = 0;
        while (
          coastFrames++ < 600 &&
          ctx.sub.position.distanceTo(anchor) < FIRST_MINUTE_GUIDANCE.moveDistanceM
        )
          frame();
        expect(ctx.cameraTips.moved).toBe(true);
        ctx.app.state = 'pause';
        frame();
        ctx.app.state = 'dive';
        frame(0, true);
        expect(ctx.cameraTips.moved).toBe(true);
        console.log(
          JSON.stringify({
            site,
            order,
            coastFrames,
            learnedAfterReleaseAndPause: ctx.cameraTips.moved,
          }),
        );
      }
    } finally {
      missionSystem.dispose();
      cameraControlsSystem.dispose();
      propsSystem.dispose();
      vehicle.dispose();
      terrain.dispose();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
}
```

## Simplicity and final verification

Net simpler: report only, one temporary parameterized fixture, no production
state, dependency, UI, setting, save schema, site branch or permanent test.
Guidance surface and layout are untouched. Rubric evidence is behavioral and
honest: distinguishing authored placement from actual piloting protects
comfortable exploration, while negative mission controls prevent overclaiming.
No readability, beauty, composition, rewardingness or Phone-OK score is assigned.
All 13 site identities, real GMRT terrain, hero set pieces, scan, Journal, marine
life, input and accessibility remain untouched; Arcade stays the default.

Final verification:

- `npx prettier --write plan/progress/3410-S-bughunt-late-opening-placement.md`
  and `npx prettier --check plan/progress/3410-S-bughunt-late-opening-placement.md`:
  exit **0**, formatting passes.
- `git diff --check`: exit **0**. Because the note is untracked, also ran
  `git diff --no-index --check /dev/null plan/progress/3410-S-bughunt-late-opening-placement.md`:
  exit **0**, checking the actual new note's whitespace.
- Recreated the temporary source from the **formatted note** using its setup
  command, then ran the Titanic probe command above with output redirected to
  `/tmp/late-opening-probe/note-extracted.log`: exit **0**, **6/6 passed**, **3.17 s**.
  This checks that the retained executable, rather than just the working copy,
  reproduces the reported distinction.
- Final `git rev-parse HEAD` still matches the pinned SHA. Own `git status --short`
  shows only this untracked note. Read-only ownership recheck still shows 3370's
  uncollected camera/firstMove/note changes; 3390 and 3400 now also have their
  own progress notes, and 3400 retains its missionCore edit. No overlap collected.

No merge, push, tag, dispatch or collection. Only this owned note is written in
the checkout; temporary probe files/logs live under `/tmp/late-opening-probe`.
