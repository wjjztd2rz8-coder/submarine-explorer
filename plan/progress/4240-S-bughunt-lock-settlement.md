# 4240 — S-bughunt: asynchronous lock settlement

DIRECTOR Backlog 7, **S-verify / S-bughunt [Codex, standing]**.
Audited HEAD: `77d5016a5be519b212ca1b7746e4ee8992e826e9`; initially clean.
Report only. Local e2e mode: **none**.

## Result

Live Pause, Settings and Quit/Home settle safely by the existing next-frame
release and frozen-input gates, with a bounded interval described below. Promise
pointer acquisition after final disposal is released. Keyboard rejection and
late disposal completion call unlock; no keyboard ownership failure established.

One narrower teardown-contract gap is reproducible: with the supported legacy
`requestPointerLock(): void` API, final system disposal while the browser request
is pending removes the event listeners after the synthetic promise continuation
has already run. Later acquisition on the still-connected canvas produces **zero
exit calls**, while mouse-look state stays false. This is a CPU/DOM disposal
contract failure, **not evidence of a shipped navigation/unload lock leak or a
replacement-runtime failure**. No correction was implemented.

## Intake and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR Backlog/simplicity/rubric, the newest dated
REVIEWS entry (2026-10-25 comprehensive, below the older top entry), and the
OVERNIGHT-LOG tail through run 151. Read the launched 4240–4260 briefs, cancelled
4210–4230 results and relevant historical briefs, results and collected notes.

Rechecked `git worktree list --porcelain`, main's queue/launched log, result-file
inventory and `tools/codex-status.sh` from main. Queue was empty; launched.log
records 4240/4250/4260 at 17:03:03 CDT, with separate registered worktrees and
no completed result files. The status helper printed “finished” alongside their
current in-progress commentary; that label alone does not establish completion.
Only this worktree owns lock settlement. 4250 owns startup rollback; 4260 owns
tile georeferencing. 4210–4230 stopped at the budget limit; run 150 records their
removal without requeue. Their slices were not repeated.

Registered held worktrees remain 2980/3050/3310/3320/3340/3380. Existing held
notes were inventoried without collecting or depending on their patches. At
recheck 4250 had only its own new progress note; 4260 was clean. No other
registered worktree or completed result owns this exact settlement slice.
Only this named note changes; diagnostics and logs remain under `/tmp`.

## Existing evidence and precise gap

| Evidence                                                                                            | Established boundary                                                                                                                                                               | Settlement limitation                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| d3-feel, commit `8aeb905e`, collected by `6f04a578`; cached brief/final/result                      | Persistent opt-in, gesture recovery, denial and ordinary loss pause. Current `tests/e2e/d2-camera.spec.ts:78` injects synchronous ownership/event success and immediate rejection. | No outstanding request across a later block or final teardown. Source read only; no browser spec executed. Historical wrapper PASS contradicts its embedded “did not run Vite or Playwright” report and is not fresh acceptance evidence. |
| [1680 / S-verify-2](S-verify-2.md), `overlayFocus.test.ts:2640`                                     | Settled teardown, pending keyboard and pending pointer promise completion; removed DOM/listeners and inactive mouse look.                                                          | **Pending promise disposal already established.** It supplies a promise, sets ownership before resolving, and dispatches a later event to check listener removal. No legacy void API or live modal settlement.                            |
| [2560 / S-bughunt-24](S-bughunt-24.md)                                                              | Hidden-pad neutralization, focus/visibility return, pointer cancellation and mode edits.                                                                                           | Input interruption, not browser lock settlement.                                                                                                                                                                                          |
| [2930](2930-S-bughunt-merged-lifecycle.md), `overlayFocus.test.ts:3183`                             | Real Escape → Pause → Quit/Home keeps the runtime alive; late mission reserves respect Home and disposal.                                                                          | Deferred mission work, not pointer/keyboard acquisition.                                                                                                                                                                                  |
| [3090](3090-S-bughunt-pad-handoff.md)                                                               | Selected-pad fallback, neutral composition, fresh edges and dispose/clear semantics.                                                                                               | Device polling, not browser locks.                                                                                                                                                                                                        |
| [3440](3440-S-verify-unit-gap-audit.md)                                                             | Denied pad polling, accessible settings consumers and detached subscriptions.                                                                                                      | API denial, not an outstanding lock's completion.                                                                                                                                                                                         |
| [3710](3710-S-bughunt-touch-input-state.md), incorporating [3590](3590-S-verify-loop-blur-focus.md) | Existing interruption/capture/scan guards; no duplicate sweep needed.                                                                                                              | Does not exercise pending browser lock requests.                                                                                                                                                                                          |
| `appSystems.test.ts:24,82`; `overlayFocus.test.ts:2534,2919`; `subInput.test.ts:48,58,391,424`      | Shell/input freeze, clocks, repeated shell lifetimes, partial scans, pure request/loss predicates and input teardown.                                                              | Pure decisions and ordinary input/lifecycle effects do not prove asynchronous acquisition cancellation.                                                                                                                                   |

Read the real factory and consumers: `src/app/systems/pointer.ts`, shell,
settings, photo, camera controls, input, `System.ts`, `loop.ts`, `startup.ts`,
`deferredStartup.ts` and `main.ts`. Relevant guards at this SHA:

- `Input.ts:227,237`: requests require enabled, diving, unobstructed and unlocked;
  loss pauses only after prior active look in an unobstructed dive.
- `pointer.ts:32–42`: fullscreen/API/disposed preconditions; post-await disposed
  keyboard unlock and rejection unlock. Cleanup at 47–50 unlocks keyboard,
  exits an owned canvas lock and clears mouse look.
- `pointer.ts:91–139`: pending suppression, promise late-disposal ownership
  guard at 107, rejection/error pending reset, ownership read from the document
  in the change listener. Promise success does not clear pending by itself.
- `pointer.ts:223–236`: frozen-frame pointer release and resume keyboard request.
  `shell.ts:49`, `loop.ts:25` freeze input; `camera.ts:110–118` suppresses ordinary
  frozen camera movement and unlocks keyboard on each non-photo frozen frame.
- `shell.ts`: Escape and entering Pause exit pointer lock; Quit changes shell
  state to Home. `settings.ts:31–34` exits pointer lock and unlocks keyboard on
  open. `photo.ts:30–39` releases pointer lock on entry; photo freezing precedes
  `gate.pointer`. These policies remain intact.

## Contract and diagnostic method

The [Pointer Lock 2 draft algorithm](https://w3c.github.io/pointerlock/#requestpointerlock)
sets ownership, then dispatches the success event before resolving its promise;
errors dispatch their event before rejection. A promise alone was never used as
ownership evidence. The [2016 Pointer Lock API](https://www.w3.org/TR/2016/REC-pointerlock-20161027/#extensions-to-the-element-interface)
returns void and communicates completion through events. Exit without a current
target does not cancel a pending request. The
[Keyboard Lock draft](https://wicg.github.io/keyboard-lock/#keyboard-interface)
queues lock and unlock operations; a delayed JavaScript continuation does not
establish that a lock overtook a previously requested unlock.

Read-only specification retrieval used `web.run` after discovering no connected
Bright Data MCP tools; its skill was read, but no plugin/configuration was
installed or edited. These sources define permitted diagnostic order, not
browser implementation or permission acceptance.

`/tmp/4240-lock-settlement/diagnostic.test.ts` extracts the existing
`overlayFocus.test.ts` CPU DOM fixture and imports actual modules by absolute
path. Real `SystemRunner` initializes shell, Input, camera controls, pointer,
settings and shell keys in their supported relative order. It runs real frame
hooks in stage order. Fetch/storage/navigation/media primitives use fixture
stand-ins; only browser lock APIs and their completion are controlled for the
race. No implementation was copied as an oracle. Rig methods are inert spies;
there is no renderer, context, drawing or layout measurement.

Requests come through canvas mousedown/up/click listeners. Pause uses the actual
Escape dispatcher; Settings uses its real open/close; Quit clicks its actual
button. Pending suppression/retry is observed through public request counts,
not private flags or hint appearance. Browser success explicitly sets
`pointerLockElement`, dispatches `pointerlockchange`, then resolves. Rejection
fires `pointerlockerror`, rejects, then flushes microtasks. Exit clears ownership
and queues a separately delivered release event, rather than reentering the
change handler synchronously. Legacy void completion never resolves a browser
promise. Hint strings, visibility policy and pause policy are unmodified.

## Observed timelines

Ordinary promise and void controls: initial gate → fresh gesture → one request;
additional gesture while pending → still one request. Flushing microtasks with
no acquisition leaves ownership null and mouse look false, including void.
Browser acquisition/event → active/owned true, no exit and only initial `dive`
state event. This confirms that void return does not falsely clear pending.

Failure controls: gesture → error event → rejection (promise API only) →
microtasks. Active/owned remain false; no exit or Pause event. A new gesture
issues request 2. Neither an automatic retry nor native permission behavior is
claimed.

For the following live cases: gesture → real transition → frozen frame while
ownership is still null → acquisition/change event → promise resolution → next
frozen frame → queued release event. Exit counts are cumulative actual calls;
Escape makes two calls before success (shell key handler plus setAppState).

| Transition            | Before success: active / owned / exits | After event + promise | After next frame | After release event |
| --------------------- | -------------------------------------- | --------------------- | ---------------- | ------------------- |
| Escape → Pause        | false / false / 2                      | true / true / 2       | true / false / 3 | false / false / 3   |
| Settings open         | false / false / 1                      | true / true / 1       | true / false / 2 | false / false / 2   |
| Escape → Quit to home | false / false / 2                      | true / true / 2       | true / false / 3 | false / false / 3   |

This is an event-to-next-frame acquisition window, followed by a state flag
lasting until the release event. No wall-clock bound is asserted. The frozen
input state has zero look delta and no simulation steps; camera controls do not
orbit for ordinary Pause/Settings/Home. State events stay respectively
`dive,pause`, `dive`, and `dive,pause,home`: no spurious loss-induced Pause.
Pause Escape-resume and Settings close permit a fresh gesture/request 2.
The observed temporary acquisition does not justify requiring locks to persist
while blocked or changing pause policy. If eliminating the bounded recapture is
desired, the smallest proposal is to check current blocked state in the existing
ownership-change handler, release its own canvas immediately and keep mouse
look false. No new gate, retry loop or UI is needed; this was not implemented.

Keyboard: fullscreenchange → one deferred lock. Ordinary completion adds no
unlock; rejection adds one. Settings open adds one unlock and its frozen camera
frame adds another; later resolution adds none, leaving two. Final runner
teardown calls unlock once; later pending completion calls it once more. No
keyboard events imply lock ownership, and fake promise completion proves no OS
capture. In particular, “resolve after Settings unlock” is **not** evidence of
reacquisition: the platform's serialized operations must be respected.

Final disposal: gesture → pending request → microtasks → real runner.dispose →
platform acquisition/change event → promise completion when applicable.

| API         | Mouse look after disposal and settlement | Exit calls at disposal → settlement | Final document ownership  |
| ----------- | ---------------------------------------- | ----------------------------------- | ------------------------- |
| Promise     | false → false                            | 0 → 1                               | null                      |
| Legacy void | false → false                            | 0 → 0                               | original connected canvas |

For void, `Promise.resolve(undefined).then(...)` ran before disposal, when no
lock existed. Cleanup removed the only change/error listeners. There is no
later observer to release the acquired lock. The minimal reproduction asserts
one exit and fails with **expected once, got 0**. This is the precise additional
gap beyond 1680's promise guard; it is not a failure of retry eligibility in a
live runtime.

Smallest proposed teardown correction: make completion tracking event-aware for
void requests. Preserve only the pending request's terminal change/error
observation through disposal; on completion release only this canvas if still
owned, then remove that observation. Keep disposed Input, hints and app state
untouched. Reuse the existing handler where practical; avoid a second runtime,
registry, generation framework, polling or timer. The need to remove both event
subscriptions on either outcome is part of the proposal. Implement nothing in
this report-only slice.

## Supported lifetime and limits of the finding

Quit uses history + `setAppState('home')`, without runner disposal. Its loop
continues, so the next frozen gate releases late acquisition. The diagnostic
then activates the actual Home Dive button: it writes
`https://example.test/?mission=titanic`, keeps the old app Home and issues no
second pointer request. It does not synthesize Home → dive on the same runtime.

`startup.ts:57–95` exposes final disposal, also used by non-persisted pagehide
and startup failure; the dive lifetime owns runner.dispose. `main.ts` starts one
runtime. Site selection navigates/reloads. Persisted pagehide retains the
existing runtime. Although DeferredStartup supports generic selection replacement,
the shipped caller does not replace an initialized dive in the same document.
No supported replacement lifetime was found in which old promise/keyboard
cleanup releases a new runtime's lock, so none was fabricated or claimed.

The final-disposal diagnostic leaves a connected canvas in an active fixture
document, as the teardown API permits. It does **not** deliver a success into a
destroyed, unfocused or replaced document, or claim a real browser would do so
following pagehide. Browser focus/disconnection/unload rules can remove or deny
ownership independently. Shipped navigation impact of the legacy teardown gap
therefore remains unestablished. No owner policy decision or new Backlog item
is inferred from this bounded evidence.

## Commands and actual outcomes

- `git rev-parse HEAD`, `git status --short`, `git worktree list --porcelain`,
  read-only queue/result/status inspection: audited SHA above; clean before
  the note. No collection or reliance on uncollected patches.
- `npm test -- --configLoader runner --cache=false tests/unit/appSystems.test.ts tests/unit/overlayFocus.test.ts tests/unit/subInput.test.ts`
  exited **0**: **3 files / 225 tests passed**, 2.02 s.
  Log: `/tmp/4240-capabilities.log`.
- `node_modules/.bin/vitest run --config /tmp/4240-lock-settlement/vitest.config.mjs --configLoader runner --cache=false`
  final exit **0**: **1 file / 13 observation cases passed**, 399 ms.
  These assert actual current behavior, including the legacy ownership gap;
  they are not a claim all desired teardown assertions pass.
  Log: `/tmp/4240-lock-settlement/results.log`; public observations:
  `/tmp/4240-lock-settlement/observations.jsonl`.
- While extending the diagnostic to Home navigation, one run exited **1**:
  **12 passed / 1 failed**, plus an Invalid URL error, because the temporary
  fixture supplied `/` where `missionUrl` requires an absolute base. Corrected
  only that fixture to `https://example.test/`; the final real-button navigation
  check passed. Log: `/tmp/4240-lock-settlement/navigation-fixture-failure.log`.
  This was a diagnostic fixture failure, not a product defect.
- Minimal retained reproduction, from this checkout:
  `python3 /tmp/4240-lock-settlement/make-repro.py`, then
  `node_modules/.bin/vitest run --config /tmp/4240-lock-settlement/minimal.config.mjs --configLoader runner --cache=false`.
  Actual exit **1**: **1 file / 1 failed**, 121 ms, solely at expected one
  late release versus zero. Log: `/tmp/4240-lock-settlement/minimal.log`.
  The generator reuses the existing fixture and imports real pointer/Input/runner.
  It tests the public teardown contract, without requiring a new product lifetime.
- Retained reproduction hashes (SHA-256): `make-repro.py`
  `8a6e50c3689aa90a87d4117cb2ac1827fa97653941d4d372815bbdb275316d54`;
  `minimal.test.ts`
  `ad1b9e46ca5703f5e65212b5dd5bd353720d4072cbdfa0eab39b36cea410283c`.
- `node_modules/.bin/prettier --write plan/progress/4240-S-bughunt-lock-settlement.md`
  and `node_modules/.bin/prettier --check plan/progress/4240-S-bughunt-lock-settlement.md`
  exited **0**. `git diff --check -- plan/progress/4240-S-bughunt-lock-settlement.md`
  exited **0**; because the note is new, also checked its content with
  `git diff --no-index --check /dev/null plan/progress/4240-S-bughunt-lock-settlement.md`
  (exit **0**). Final status contains only this owned note.

No repository-wide gates, build, Python suite, local e2e, hosted workflow,
GPU compilation, WebGL, screenshots, pixels, unaided journey or physical device
acceptance. No environment block affected the final focused runs. Historical
wrapper PASS labels are separate from all command outcomes above.

## Simplicity and rubric

No production/test/fixture/data/dependency/configuration/snapshot edits; no
assertion, tolerance, count, budget, skip, schema or public API change. The only
proposals extend existing lock lifecycle handling. No setting, guidance surface,
text, layout/CSS patch, site branch or runtime Config mutation. The audit protects
comfortable keyboard/mouse piloting while preserving Arcade default, real GMRT,
all 13 sites, five heroes, Scan, Journal, marine life, pad/touch and accessibility.
Correctness, simple recovery, uninterrupted rewards and honest evidence are
assessed here. Beauty/readability, touch layout and real-phone acceptance remain
with Claude/owner. Fake browser APIs establish neither permission behavior nor
physical keyboard/mouse compatibility. No merge, push, tag or other note edit.
