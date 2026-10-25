# S-bughunt — startup rollback through the real runner

Report-only brief **4250**, serving **S-verify / S-bughunt**, DIRECTOR Backlog 7.
Audited HEAD: **`77d5016a5be519b212ca1b7746e4ee8992e826e9`** (2026-10-25).
No supported product defect reproduced. The missing multi-system init/start
rollback evidence passes with actual DeferredStartup, SystemRunner, Disposables
and EventBus. Injected exceptions establish cleanup behavior; they do not show
that a shipped site fails to initialize. No correction is proposed or implemented.

## Coordination and prior evidence

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, simplicity rules and rubric; the
newest dated REVIEWS entry (2026-10-25 comprehensive, despite an older targeted
entry above it); OVERNIGHT-LOG through run 151; launched 1550/1590/2810/3350
briefs/results and their collected progress; and the distinct 4240/4250/4260
briefs. Initial working tree was clean and the owned note did not exist.

`git worktree list --porcelain` showed main and these three current worktrees at
the pinned SHA, plus held 2980/3050/3310/3320/3340/3380 worktrees. The shared
`.cache/codex/queue/*.md` glob had no matches. Newest result files were cancelled
4210/4220/4230 followed by collected 4200/4190; run 150 explicitly records the
cancelled worktrees' removal with no output. The three current briefs and recent
round-one logs identify separate ownership: 4240 lock settlement, this 4250
rollback audit, 4260 tile georeferencing. No duplicate completed report was found.
The status script labels all three “finished” because its process lookup cannot
see the outer tasks inside this sandbox; its current commentary/logs and absent
result reports do not establish completion. No uncollected patch was inspected
as an implementation dependency or collected. Held and cancelled slices remain
untouched.

Coverage mapping:

- **1550** introduced injected load/init operations and DeferredStartup's lifetime.
  [startupLifecycle.test.ts:36](../../tests/unit/startupLifecycle.test.ts#L36)
  substitutes initialization. Its load-error/same-key retry (line 140), partial
  initialization/release (160), late-load cancellation (182), and cleanup error
  aggregation (282) are existing controls, not real multi-system runner tests.
- **1590** wired the actual caller; [S-boot.md](S-boot.md) records deferred Home,
  first-frame readiness, fatal startup handling and partial rollback. Crucially,
  [startupLifecycle.test.ts:574](../../tests/unit/startupLifecycle.test.ts#L574)
  already invokes real startRuntime → DeferredStartup → SystemRunner with one
  injected system throwing in init. It checks that system's disposer once,
  original message at showFatal and zero queued frames. Thus the real boundary
  was already partially tested; claiming all startup fixtures replace it would
  be incorrect. It lacks an earlier live subscription, multi-system reverse
  rollback and a start exception after all initialization.
- **2810** [Low-tier journey](S-bughunt-lowtier-journey.md) repaired missing owner
  teardown and late landmark/discovery/prop/mission callbacks. Those completed
  repairs supply supported disposal contracts, not new startup failure evidence.
- **3350** [tile failure/fallback](3350-S-bughunt-tile-load-fallback.md) connects
  real loader request/body failures to real startRuntime with system factories
  stubbed. No systems initialize in those failure cases. Its IO/signal matrices
  were not repeated. Its result wrapper says PASS while the command evidence
  records Python failures and no local e2e; those labels are not validation here.
- [appSystems.test.ts:303](../../tests/unit/appSystems.test.ts#L303) already checks
  normal init order, all init before start, staged frames and reverse disposal.
  Lines 327–367 protect registry freshness/listener ordering. Neither forces an
  init/start failure through a lifetime. Existing runtime tests at lines 433,
  487, 526 and 557 in startupLifecycle cover repeated final teardown, readiness,
  late tile suppression and fatal load reporting respectively.

## Actual ownership and failure policy

[startup.ts:20](../../src/app/startup.ts#L20) loads the tile and deferred registry,
then assigns tile/meta and emits tile:loaded. It constructs the runner, registers
`lifetime.addCleanup(() => runner.dispose())` **before** `runner.init`, and only
publishes the context and registers loop cleanup after initialization succeeds.

[System.ts:145](../../src/app/System.ts#L145) owns each system before invoking its
init. All registered systems, including the currently failing one, are therefore
available to reverse disposal. Starts run only after every init; the frame
schedule is built only after every start succeeds. On successful final teardown,
lifetime cleanup stops the loop, disposes the runner, then calls tile release.
[deferredStartup.ts:122](../../src/app/deferredStartup.ts#L122) clears the failed
current attempt, aborts its signal, drains registered cleanups newest first and
rethrows the original failure when cleanup succeeds.

This matches real registrations: [input.ts:11](../../src/app/systems/input.ts#L11)
tracks input disposal and its app:state unsubscribe through Disposables;
[discovery.ts:38](../../src/app/systems/discovery.ts#L38) registers owner teardown
and the suppression subscription; [world.ts:54](../../src/app/systems/world.ts#L54)
registers landmark teardown before starting its async load. The ordered registry
in [systems.ts](../../src/app/systems.ts) is unchanged. Home independently registers
runner cleanup before its init as well (startup.ts:78).

The shipped runtime catches failure, performs final disposal, emits tile:error
and calls showFatal (startup.ts:89). It returns a disposer, not a retry control.
Site selection uses page navigation, as 1590/2810 document. DeferredStartup's
public API independently permits a fresh same-key selection after failure while
it remains undisposed; final dispose permanently cancels later selections. This
audit does not require an in-page restart of shipped singleton systems or change
the fatal-page policy.

## Disposable diagnostic and exact observations

Retained locally at `/tmp/4250-startup-rollback/probe.mts`, with output in
`/tmp/4250-startup-rollback/probe.log`. It directly imports the four actual modules
from this pinned checkout. Three small systems a/b/c each acquire a tracked
resource and a real app:state subscription through their own real Disposables.
Cleanup registration uses the shipped placement before runner.init. No module is
mocked or copied. There is no renderer, DOM, network request or animation loop;
the successful control invokes only CPU event-stage frame hooks.

| Probe                                   | Observed sequence                                                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| b fails during init, after a subscribed | load → init a → init b (both subscriptions respond) → throw original → abort → dispose b → dispose a → release tile → caller receives the identical Error object                                               |
| b fails during start                    | load → init a → init b → init c → start a → start b (all three subscriptions respond) → throw original → abort → dispose c → dispose b → dispose a → release tile → caller receives the identical Error object |
| Successful control                      | load → init a → init b → init c → start a → start b → start c → CPU frame a/b/c → final abort → dispose c → dispose b → dispose a → release tile                                                               |

Init failure never initializes c or starts any system. Start failure never starts
c, but still disposes c because its init completed. Both failed runners have an
empty schedule; invoking frame afterward performs no hook. On every failure and
final teardown, tracked system resources = **0**, retained diagnostic tiles =
**0**, and a subsequent bus emit invokes **0** old handlers. Before success
teardown exactly a/b/c respond once each. Empty EventBus handler sets may remain
as bookkeeping; no callback remains subscribed.

Each failure is followed by a same-key select on the still-live DeferredStartup,
with fresh instrumented systems and the injection disabled. Both retries start
successfully; each scenario has exactly two loads. Repeated pending/successful
select calls share their promise. The standalone success uses one load. Final
dispose called twice adds no cleanup calls, and selecting afterward returns
cancelled without loading. These are API probes, not calls to startRuntime twice.

Tile release is checked by exact object identity and one removal from the
instrumented owner set, after system rollback. In production, startup.ts:28–29
has a no-op release hook: tiles are CPU arrays, not an explicit free/GPU handle.
The diagnostic proves the release callback contract, not heap collection or
clearing every context reference; startup assigns the tile onto the request
context. No browser heap retention or GPU release claim follows from this probe.

## Repeated disposal, late completion and exceptions

[Disposables.ts:34](../../src/app/Disposables.ts#L34) drains ordinary unsubscribers
in reverse order and empties its list. Existing
[disposables.test.ts:30](../../tests/unit/disposables.test.ts#L30) already checks
init/dispose/init, duplicate disposal, zero listeners and no further bus callback.
The runtime's final-dispose guard and its existing repeated page teardown case
supply caller-level evidence; the diagnostic adds the real runner/lifetime pair.

Late completion is already guarded where shipped owners support it:

- [Landmarks.ts:179](../../src/world/Landmarks.ts#L179) refuses placement after
  disposal; [Landmarks.test.ts:172](../../tests/unit/Landmarks.test.ts#L172) holds
  content until after teardown, then checks no markers or terrain access.
- [Discovery.ts:133](../../src/game/Discovery.ts#L133) checks disposal after async
  POI/guide loading, and its probe callback also checks disposal.
  [discoveryReward1240.test.ts:391](../../tests/unit/discoveryReward1240.test.ts#L391)
  verifies no repopulation, terrain sampling or teleport and one guide disposal.
- [Props.ts:214](../../src/world/Props.ts#L214) and the disposed guard in
  [systems/props.ts:39](../../src/app/systems/props.ts#L39) suppress late content,
  model placement and downstream callbacks.
  [props-loader.test.ts:689](../../tests/unit/props-loader.test.ts#L689) covers late
  content/model completion; line 729 covers the real system's late events and
  scatter/spawn callbacks. Shared model resources retain their existing ownership.
- [systems/mission.ts:30](../../src/app/systems/mission.ts#L30) records disposal
  before wiring and guards deferred application; MissionRouter's ready callbacks
  check its disposed flag (lines 397–408, 446–447). These are the 2810 repairs.

These adequate guards were read and cited, without repeating their asset/terrain
inventories or adding another async matrix. They use owner disposal flags, not a
claim that the startup signal cancels every optional content request.

The runner and Disposables are not exception-isolating loops. The existing
startupLifecycle cleanup-throws fixture checks DeferredStartup's aggregation of
separate lifetime callbacks, not continuation within a throwing runner disposer.
No concrete shipped disposer exception was demonstrated in this slice. No
arbitrary throwing destructor was injected, no remaining-cleanup failure is
claimed, and no exception framework is proposed.

## Commands, results and limits

- `git rev-parse HEAD`, `git status --short`, `git worktree list --porcelain`,
  shared queue/result listings and the status script supplied the coordination
  observations above. An empty queue glob reports no matching files; sandbox
  process visibility limits the status script's “finished” labels.
- `node --experimental-transform-types /tmp/4250-startup-rollback/probe.mts`
  completed successfully: five JSON records (init rollback/retry, start
  rollback/retry, successful control); every behavioral assertion passed. Node
  v22.23.2 emitted its Transform Types experimental-feature warning only.
- `npm test -- --configLoader runner --pool=threads --cache=false tests/unit/startupLifecycle.test.ts tests/unit/appSystems.test.ts`
  exited **0**: **2 files / 39 tests passed**, 970 ms. These are existing CPU/DOM
  fixtures; fake render hooks do not render a game or create a WebGL context.
- `npx prettier --write plan/progress/4250-S-bughunt-startup-rollback.md`, followed
  by `npx prettier --check plan/progress/4250-S-bughunt-startup-rollback.md` and
  `git diff --no-index --check /dev/null plan/progress/4250-S-bughunt-startup-rollback.md`
  checked only this owned note. Both Prettier commands exited **0**, with the
  check reporting all matched files formatted. The no-index check exited **1**
  with no whitespace diagnostics: it reports the new file's difference from
  `/dev/null`. Final `git status --short` lists only this new note and
  `git rev-parse HEAD` still returns the audited SHA.

No product assertion failure or test environment block occurred. Prior wrapper
PASS summaries are historical evidence only. Local e2e mode is **none**. No
build, repository-wide gate, browser launch, hosted CI, GPU, unaided journey,
offline-play or real-phone validation was performed.

Simplicity/rubric: report only, with no runtime machinery, UI/guidance surface,
settings, site branch, layout patch, config mutation, schema/dependency change or
new permanent spec. Existing APIs, assertions, tolerances, budgets and lifecycle
policy remain intact. Correct rollback protects entering/exploring a real site;
reward and factual content behavior are preserved rather than newly validated.
Beauty, opening readability, touch layout and real-phone acceptance remain with
Claude/owner. Only this progress note is a repository change; no merge, push, tag,
workflow dispatch or other-lane edit.
