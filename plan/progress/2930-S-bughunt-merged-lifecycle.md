# S-bughunt: merged lifecycle audit

Director Backlog item 9, S-verify / S-bughunt; brief 2930. Audited HEAD:
`f8a4d49162d8172aa9a7c10237125e402ab30515`.

Read the three progress notes and first-parent merge diffs for deferred power
start (`cf96678`), journey copy/wrapping (`22b6fe7`), and Your sub/Journal cleanup
(`c6e9cd9`). Traced their current shell, mission, startup, overlay dispatcher and
HUD grid contracts. Other worktrees, tools and Director are untouched.

## Round 1: reproduced defect and smallest fix

Pause's **Quit to home** changes the live shell state and disposes the mission
router through `app:state`; it does not dispose the whole runtime. The deferred
power callback only checked runtime disposal. Consequently, a supported deep
URL probe followed by Quit before discovery readiness, or after its promise
handler queues the reserve microtask, still initialized supplies and published
the descent notice after Home opened.

Extended the existing `overlayFocus.test.ts` capability with the real
`SystemRunner`, power system, shell, mission system, parsed Titanic mission,
`MissionRouter`, EventBus and shell Escape fallback. Only discovery readiness is
held manually; the DOM uses that spec's existing headless double. Escape opens
Pause and its actual Quit button returns Home. No game renderer is involved.

Before the fix, the six-case test had **2 failures / 4 passes**, exit 1:
`/tmp/2930-reserves-before.log`. Both Quit cases called `setLevels` after Home,
changing battery/oxygen from **1 / 1** to
**0.7718803640985014 / 0.8246415770609319** at 3,800 m. Pause and runtime disposal
controls passed. This extends the earlier disposal evidence to a distinct,
supported leave-dive path without inventing multiple starts in one mission.

The production fix adds one condition to the existing deferred callback:
skip it when the shell is Home, matching the mission pose guard. Pause continues
to initialize the current dive's reserves. No new flag, subscription, generation
counter, reset policy, UI or CSS. The six-case rerun **PASS**, exit 0:
`/tmp/2930-reserves-after.log`.

## Round 2: interaction and leak audit

- The six boundary cases now run three successive lifetimes each on one bus.
  Both Quit and page teardown cancel the queued write/notice; Pause initializes
  exactly once using effective settings. Disposed routers do not resolve late
  objectives. Old power reset spies stay untouched by replacement starts and
  by a post-teardown bus emission. Repeating the old runner's disposal after a
  new initialization preserves the new lifetime. Window listener registration
  and removal counts balance after every lifetime, and Escape is unhandled
  after final teardown.
- Extended both existing Home/Pause Your sub cases to install the real shell
  Escape fallback. Repeated Escape keydown leaves the screen open; Escape or
  Back dismisses it, restores the opener and preserves the source shell state.
  A subsequent Escape resumes Pause or leaves Home unchanged. Existing pending
  import, duplicate-open, Tab/Shift+Tab, disabled-option, navigation, resource,
  context-loss and RAF assertions remain intact. Final teardown releases the
  dispatcher and balances window listeners. No additional defect reproduced.
- Journal's removed cosmetic focus branches have no remaining consumer; the
  Journal grouping and cosmetics capability assertions are retained unchanged.
- For title growth, `hud-layout.css` assigns desktop objectives and readouts
  separate auto grid rows. On touch, the title/list are hidden and the guidance
  card uses its own full-width row beneath sonar/readouts in portrait. Both
  375x667 and 320x568 select that portrait layout and the existing short-phone
  scale cap. No overlap is demonstrated by source inspection, so no CSS change
  is justified. **Actual rectangle measurements at those two sizes remain
  unverified**: no game rendering or screenshot acceptance was performed. The
  merged unaided journeys cover 390x844, not these two sizes; the existing
  320x568 touch-target case does not establish mission-card clearance.

Simplicity: one extra lifecycle condition, tests in an existing capability spec,
no weakened historical assertions, site branches, package numbers in code,
settings mutation, art, camera or CSS tuning. Scope is the power condition,
overlay capability evidence and this note. No merge or push.

## Validation

- Initial focused suite: **PASS, 6 files / 258 tests**, exit 0
  (`/tmp/2930-focused.log`). TypeScript check **PASS**, exit 0
  (`/tmp/2930-typecheck.log`).
- Expanded final focused suite: **PASS, 9 files / 275 tests**, exit 0
  (`/tmp/2930-focused-final.log`):
  `npm test -- --configLoader runner --pool=threads --cache=false tests/unit/overlayFocus.test.ts tests/unit/powerSystem.test.ts tests/unit/startupLifecycle.test.ts tests/unit/missionRouter.test.ts tests/unit/journalGroups.test.ts tests/unit/cosmetics.test.ts tests/unit/power.test.ts tests/unit/d2Hazard.test.ts tests/unit/disposables.test.ts`.
- Required aggregate invocation:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  **Completed, exit 1**, `/tmp/2930-gates.log`; detailed logs:
  `.cache/runs/20261021-031934-3-SnNHHs/`.
- Aggregate **PASS**: writable config preparation, strict content validation,
  production build (TypeScript and Vite), full units (**192 files / 3,395 tests**,
  519.28 seconds), attribution and repository-wide Prettier. The existing
  non-failing Vite chunk-size warning remains unchanged.
- Aggregate **FAIL**: Python, **5 failures / 167 tests**, in unchanged tooling.
  Four build-manifest cases fail with `spawnSync git EPERM`; the golden-tooling
  wrapper reports `Unexpected end of JSON input`. These match the environment
  failures in the audited progress notes. They do not exercise the changed
  lifecycle code; no tooling, assertion or runner configuration was changed
  to bypass them. The aggregate result is not green.
- While waiting for the full suite, an isolated check of the gate's default
  worker mode **PASS, 1 file / 6 power tests**, exit 0:
  `timeout 30s npm test -- --configLoader runner --cache=false tests/unit/powerSystem.test.ts`
  (`/tmp/2930-fork-probe.log`). The full gate subsequently completed normally;
  no unit stage was interrupted and no full-suite timeout/block is claimed.
- Owned-file Prettier and `git diff --check`: **PASS**. Final note formatting
  is checked again after recording the gate result.
- Actual e2e mode: **none**. The required aggregate invocation uses
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` to honor the explicit
  no-game-rendering constraint. No browser tests, game rendering or screenshots
  are claimed, and omitted browser coverage is distinct from environment blocks.
