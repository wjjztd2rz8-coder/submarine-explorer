# 4080 — R-ci-green: Monterey completion-banner contract

DIRECTOR Backlog **8, R-ci-green [Codex]**, 2026-10-25. Audited HEAD:
`d7a02fd78fa4c3fa34057b2e53b1b149729ff8e3`; initially clean and unchanged
through validation. Report only; this note is the sole repository change.

## Finding

No event/state defect was established. Primary completion deliberately precedes
the banner by **three counted play seconds**. Those seconds come from capped
frame deltas, excluding freezes and the first returning interval; they are not
an independent wall-clock timeout. A controlled headless callback schedule
reproduces **primaries done, reward visible, completion banner hidden after
16 wall seconds**, with only two seconds admitted to the banner clock. Four
more callbacks open the banner at three counted seconds. This establishes a
supported mechanism, **not the cause of the hosted failure**: its artifacts
contain no callback, pause or banner-clock history.

The existing capability guards pass. Guidance does not wait for the Journal
reward to expire before opening this banner. No production fix, timeout change,
selector change or permanent test is justified by this audit. The historical
browser/runner timing question remains unresolved.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, seven simplicity rules and rubric;
REVIEWS' newest dated entry (**2026-10-24 night**, below the older leading
targeted entry); OVERNIGHT-LOG through run 140; launched 4030/4040/4050/4080
briefs; retained 4030/4040 results and their progress scope; collected
[4050](4050-R-ci-green-after-4000.md), [4020](4020-R-ci-green-hosted-evidence.md),
[3850](3850-S-bughunt-journal-scan-reward.md),
[3660](3660-S-bughunt-mission-objective-order.md) and
[3880's clock audit](3880-S-bughunt-pause-resume-clock.md).
The launched 4080 brief matches this banner investigation. Neither the older
general clock audit nor 4050 diagnoses this specific failure's clock contract.

Inspected all registered worktrees' HEAD/status/diff statistics and unique
committed paths against main, then rechecked ownership before writing. Finished
4030/4040 await collection with LifeSim/lifeSim-test and Progress/progress-test
changes respectively; neither owns this slice. Their wrapper gate PASS labels
and embedded reports disagree about Python/browser outcomes; neither supplies
validation for this note. The held 3310 branch includes Scanner/ScanOverlay and
guidance-test changes, but is outside scope and is not used. Held 2980/3050,
3320/3340/3380 and neighboring 4060/4070 remain separate. No other checkout
claims the named note. No patch was collected or made a dependency; future
4030/4040 merges are not prerequisites.

## Retained failure evidence beyond 4050

Read existing `/tmp/4050-ci-triage/failed-job.log` and
`historical-failure.zip`, associated with
[run 40174754472 / job 121113004608](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40174754472/job/121113004608),
SHA `1c620c846d0101e5650113ac9ae75ef2027c2d86`. No network request was needed;
no historical run listing, polling, dispatch, rerun or network setup occurred.

- Job-log lines 324–349 record the line-195 visibility assertion and **six
  observations of `<div hidden="" role="status" class="obj-banner">`**.
  This is explicit element state, not merely an absent selector or evidence of
  slow painting. The observations do not establish uninterrupted hidden state
  between polls or whether the banner had appeared earlier.
- The zip's
  `test-results/content-missions-monterey--73871-to-primary-scans-to-debrief-chromium/error-context.md`
  has **2 of 5 objectives · primaries done**, three optional objectives and
  **New Journal entry Canyon floor, 1,000 m**. It does not report the router's
  pending delay, admitted elapsed time, frame cadence, event history or
  visibility/freeze transitions.
- Its `test-results/e2e-timings.json` records **127,432 ms** duration,
  **240,000 ms** overall allowance, **retry 0**, and empty result stdout/stderr.
  The failed assertion's allowance is **15,000 ms**. The zip has 16 entries and
  no trace entry. Empty result stderr does not prove no application exception:
  this test collects console/page errors for an assertion reached only later.
- `git diff --quiet 1c620c84 HEAD -- <audited paths>` exited **0** for EventBus,
  Time, loop, frame-stage ordering, Discovery, Scanner, Mission, MissionRouter,
  Guidance, ObjectivesPanel, GuidanceSlot, ScanOverlay, the discovery system,
  content-missions and its scan helper. The traced mechanisms are unchanged
  from the failed SHA, rather than inferred from an uncollected fix.

## Exact event and timer sequence

1. The Monterey mission orders **canyon-wall**, then **canyon-axis** as primary,
   followed by three optional objectives
   ([mission.json:48](../../data/landmarks/monterey-canyon/mission.json#L48)).
   The e2e loop scans those primaries and checks actual mission completion and
   increased scanner totals before asserting progress and banner visibility
   ([content-missions.spec.ts:159](../../tests/e2e/content-missions.spec.ts#L159)).
2. Scanner records the contact, updates `completed` and `lastCompleteId`, emits
   final scan progress, then emits `scan:complete`; it clears active scan state
   after synchronous subscribers return
   ([Scanner.ts:481](../../src/game/Scanner.ts#L481)). EventBus calls subscribers
   in registration order ([EventBus.ts:102](../../src/core/EventBus.ts#L102)).
   Discovery initializes before MissionRouter
   ([systems.ts:59](../../src/app/systems.ts#L59),
   [:79](../../src/app/systems.ts#L79)). Its subscriber focuses/refreshes the
   Journal entry and immediately offers the POI reward
   ([Discovery.ts:181](../../src/game/Discovery.ts#L181)).
   The reward lifetime is **six frame-delta seconds**
   ([discovery.ts:95](../../src/core/config/discovery.ts#L95),
   [ScanOverlay.ts:90](../../src/ui/ScanOverlay.ts#L90)).
3. Mission's scan subscriber marks the objective complete and emits
   `mission:objective`. On the last primary it sets `primaries-complete`, emits
   `mission:primaryComplete` once, then notifies change listeners
   ([Mission.ts:516](../../src/game/Mission.ts#L516)). Router receives the primary
   event, sets pending kind `primary`, initializes delay **3**, and explicitly
   hides the banner. Its change listener then refreshes the progress text
   ([MissionRouter.ts:391](../../src/game/MissionRouter.ts#L391),
   [:510](../../src/game/MissionRouter.ts#L510)). Thus `primaries done` with
   `.obj-banner.hidden === true` is initially intentional.
4. The scan helper used by this e2e case advances real Discovery/Scanner logic
   with `discovery.update(scanDt, 0, ..., clockDt=0)` while the real scan key is
   held ([scan.ts:39](../../tests/e2e/helpers/scan.ts#L39)). It does **not** call
   MissionRouter.update or advance reward/UI time. Completing both scans does
   not imply that any of the completion delay has elapsed. Normal callbacks
   between helper calls can separately advance the game clocks.
5. During normal callbacks, `scan.discovery` precedes `play.mission`
   ([System.ts:53](../../src/app/System.ts#L53)). Discovery updates the reward
   with `f.dt`; the mission system updates the router with `f.clockDt`
   ([discovery.ts:67](../../src/app/systems/discovery.ts#L67),
   [mission.ts:229](../../src/app/systems/mission.ts#L229)).
   `Time.tick` caps every frame gap at **0.25 s**
   ([Time.ts:28](../../src/core/Time.ts#L28),
   [:47](../../src/core/Time.ts#L47)). Input gating sets `clockDt=0` on frozen
   and first returning frames; otherwise it equals that capped delta
   ([loop.ts:25](../../src/app/loop.ts#L25)). Hidden documents, Pause/Home,
   briefing/debrief, globe, settings and Journal freeze play
   ([shell.ts:49](../../src/app/systems/shell.ts#L49)); photo mode also gates
   play. App/visibility/blur/focus transitions reset the returning interval
   ([loop.ts:74](../../src/app/loop.ts#L74)). Blur is an interval reset, not a
   permanent auto-pause policy. No callback means no banner-clock advancement.
6. Router subtracts that admitted `clockDt` until delay reaches zero while
   Mission is still diving. It immediately calls `showBanner`, which writes
   the title and clears the element's `hidden` attribute
   ([MissionRouter.ts:533](../../src/game/MissionRouter.ts#L533),
   [ObjectivesPanel.ts:195](../../src/ui/ObjectivesPanel.ts#L195)). There is no
   setTimeout, asynchronous paint acknowledgement, reward-dismiss event or
   guidance-winner prerequisite in this path. With ordinary callbacks the
   six-second reward and three-second completion delay overlap.
7. Guidance priority is urgent → scan → discovery → hint → objective, with
   ready/soft-contact exceptions
   ([Guidance.ts:5](../../src/game/Guidance.ts#L5)). `panel.setGuided` suppresses
   only the hint line ([ObjectivesPanel.ts:170](../../src/ui/ObjectivesPanel.ts#L170)).
   Covered play clears transient reward offers
   ([Discovery.ts:259](../../src/game/Discovery.ts#L259),
   [ScanOverlay.ts:75](../../src/ui/ScanOverlay.ts#L75)); it does not make reward
   dismissal a banner trigger. A pending banner waits through pause because
   its own clock receives zero. Emergency ascent separately cancels it.
8. An open completion banner lasts **20 admitted play seconds**, then applies
   **Keep exploring** without ending the dive; no automatic rescheduling occurs
   ([mission.ts:41](../../src/core/config/mission.ts#L41),
   [MissionRouter.ts:543](../../src/game/MissionRouter.ts#L543)). Primary progress
   can therefore also coexist with a hidden banner after intentional dismissal.
   **Surface and debrief** remains voluntary, including through the existing
   pause action while the banner is pending. This audit changes neither choice
   and leaves debrief/Journal/save divergence to 4040.

## Existing guards and controlled diagnostic

Existing headless capabilities directly guard the boundaries:

- [missionCore.test.ts:441](../../tests/unit/missionCore.test.ts#L441): one
  primary-complete event, continued diving, no automatic end.
- [missionRouter.test.ts:516](../../tests/unit/missionRouter.test.ts#L516):
  reversed/logged scans and duplicates do not postpone completion;
  [:618](../../tests/unit/missionRouter.test.ts#L618): exact pending/open/dismissed
  timing, pause/first-return exclusions, all-objective promotion and full
  auto-dismiss lifetime; [:660](../../tests/unit/missionRouter.test.ts#L660):
  voluntary Surface at pending/open boundaries. Existing ascent cases guard
  cancellation rather than restoring completion actions.
- [guidance.test.ts:564](../../tests/unit/guidance.test.ts#L564) and
  [:587](../../tests/unit/guidance.test.ts#L587): reward handoff through two scans
  across all 13 sites, both modes, keyboard/touch and new/logged contacts;
  [:855](../../tests/unit/guidance.test.ts#L855): reward clearing through Journal,
  blocked play and restart;
  [discoveryReward1240.test.ts:85](../../tests/unit/discoveryReward1240.test.ts#L85):
  real content/Scanner/Discovery reward identity and authored Journal mapping,
  including Monterey.
- [appSystems.test.ts:82](../../tests/unit/appSystems.test.ts#L82): controlled
  production-loop timestamps, capped gaps, paused/hidden intervals and
  coalesced lifecycle resets. These collected clock guards remain adequate;
  this audit does not repeat the general pause/resume investigation.

Disposable diagnostic: `/tmp/4080-banner-diagnostic/diagnostic.test.ts`, temporary
Vitest config and `trace.json`. It composes production Time, inputGateSystem,
Scanner, MissionRouter and ScanOverlay using the existing EventTarget DOM-double
pattern and Monterey's authored mission/POI names. Targets use synthetic scan
positions; the reward subscriber is a narrow stand-in for Discovery.onComplete,
whose full path is covered by the existing capability above. No RAF loop,
browser, rendering, terrain simulation, real sleep or storage integration runs.

After scanning both primaries without advancing router time:

| Controlled schedule                                      | Wall seconds | Counted play seconds | Banner state                  |
| -------------------------------------------------------- | ------------ | -------------------- | ----------------------------- |
| Eleven callbacks 250 ms apart                            | 2.75         | 2.75                 | Hidden                        |
| Twelfth callback                                         | 3            | 3                    | Open, no debrief              |
| Eight callbacks 2,000 ms apart                           | 16           | 2                    | Hidden, reward kind discovery |
| Four more callbacks 2,000 ms apart                       | 24           | 3                    | Open, no debrief              |
| 16 s frozen, one 250 ms return, then twelve active ticks | 19.25        | 3                    | Open, no debrief              |

The sparse schedule asserts exactly one primary-complete event, **2/5** mission
counts and the live discovery reward at 16 s. Each schedule additionally asserts
that 20 more admitted seconds hide the banner while diving continues. The frozen
schedule isolates clock gating; full blocked-play reward clearing belongs to the
existing guidance guard, not this miniature fixture.

The sparse schedule proves the state is reachable without lost events. It does
not prove hosted callbacks arrived every two seconds, or distinguish stalls,
freezes, lifecycle resets, prior dismissal or a browser-only defect there.
The snapshot alone cannot make those distinctions.

## Actual validation and smallest follow-up

- `npm test -- --configLoader runner --cache=false tests/unit/missionCore.test.ts tests/unit/missionRouter.test.ts tests/unit/guidance.test.ts tests/unit/discoveryReward1240.test.ts`
  — **exit 0, 4 files / 240 passed**, 800 ms.
- `npm test -- --configLoader runner --cache=false tests/unit/appSystems.test.ts`
  — **exit 0, 1 file / 9 passed**, 1.12 s.
- `./node_modules/.bin/vitest run --config /tmp/4080-banner-diagnostic/vitest.config.mjs --configLoader runner --cache=false`
  — **exit 0, 1 disposable diagnostic passed**, initially 356 ms; after adding
  file-based trace recording, **exit 0 / 287 ms**, with the states above.
- `./node_modules/.bin/prettier --write plan/progress/4080-R-ci-green-banner-triage.md`
  and the corresponding `--check` — **exit 0**. Local citation validation —
  **exit 0, 44 local targets and cited line bounds checked**.
- `git diff --check` — **exit 0**. Final HEAD/ownership recheck retains the
  audited SHA and only this new note in this checkout. No aggregate gate or
  orchestrator outcome is claimed.
- Extra `git diff --no-index --check /dev/null <owned-note>` — **exit 1**, with
  no whitespace diagnostics; no-index reports the new-file difference. This
  also stopped that `&&` command chain before its HEAD/status commands; those
  were then run separately and confirmed the state above.

Smallest justified follow-up is evidence capture if this same case recurs in an
already authorized run: retain callback timestamps, admitted mission elapsed
delta, freeze/visibility/return state, pending/open/dismissed banner state and
any EventBus exception around the final primary and visibility wait. This would
distinguish insufficient admitted time from a missing event or already expired
banner. Keep the existing 15 s assertion and behavior requirements intact until
that distinction is supported. No additional hosted run is requested here.

[4050's green verdict](4050-R-ci-green-after-4000.md) applies to its observed
`164da7fe6e82e4abfcee270c123106f36bda2707`, not to this audited SHA or future
merges. Pages and local smoke are not full-CI evidence. No new release
recommendation is made.

Simplicity/rubric: evidence only, no new machinery, guidance surface, setting,
site branch, Config mutation, authored data or duplicate permanent guard.
Correct completion and the voluntary choices preserve simple, rewarding and
honest exploration. Real GMRT terrain, 13 site identities, five hero set pieces,
scan/Journal/life, keyboard/pad/touch, accessibility and Arcade default retain
their implementations. Assertions, tolerances, budgets, skips and all four
expected collision failures remain untouched. Visual readability/beauty, touch
layout and physical-phone performance remain with Claude/owner.

Actual local e2e mode: **none**. No full suite, Python gate, browser launch, game
rendering, WebGL context, screenshots, pixel acceptance, GPU, unaided journey,
real-phone validation or additional hosted run. No merge, push, tag, workflow
dispatch/rerun, tools edit or other-note formatting.
