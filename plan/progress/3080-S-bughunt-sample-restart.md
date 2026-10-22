# S-bughunt — same-instance sample restart

Backlog item **9, S-verify / S-bughunt [Codex, standing]**.
Pinned checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`.
Date: 2026-10-21. Clean integration finding; production code is unchanged.

## Scope and prior evidence

Read Director direction, simplicity rules and rubric, the newest two reviews,
overnight-log tail through run 80, prior 1440, 1730 (`S-verify.md` and result),
2810 (`S-bughunt-lowtier-journey.md` and result), F2-EXPLORE progress, existing
gameExplore, modesExploration, eventsSystem and discoveryReward1240 fixtures.
The older F2 reward-point prose is historical: current Progress preserves award
tokens but sample/secret awards leave points at zero.

Rechecked the main checkout's queued/launched briefs and newest results,
registered worktree status/diffs, and finished-but-uncollected work before
editing. No registered change touched either owned implementation/test path.
3070 owns journalData tests; 3090 owns Input/subInput. Worktrees 2930–3060
retain separate work, including 3040's Scanner repair. None was imported or
used here; this runs against the pinned Scanner. No ownership conflict found.

Existing guards already prove separate Samples.reset and Scanner.resetDive,
mode switches and fresh second sessions, Discovery's scan/session reset for
POIs/wildlife, and event restart behavior. They did not combine the sample
collection and Discovery reset listeners on the same instances. Added two
cases to the existing `modesExploration.test.ts` capability spec for that gap.
No removed-target, event witness, resource/disposal, visual sampling, migration,
photo-export or input audit was repeated.

## Actual event path and supported boundary

`src/app/systems.ts` initializes Progress before Discovery, and Explore last.
EventBus invokes a snapshot of subscribed handlers in registration order,
synchronously; caught handler errors are also asserted absent in the fixture.

1. Progress's restart subscription calls `beginDive`, clearing dive earnings
   and bonus without changing persistent award tokens.
2. Discovery registers its restart subscription in its constructor
   (`Discovery.ts:100`), before starting its content load. It calls
   `resetDive`: overlay.clear → Scanner.resetDive → SessionStats.reset.
3. Explore registers its subscription synchronously during init
   (`explore.ts:173`), outside the optional-content Promise.all. It clears
   Samples, witnessed events and existing event/sampling state. It does not
   register listeners again when content resolves or when a restart occurs.

`Mission.restart` emits before clearing mission objectives and returning to
briefing. MissionRouter's actual Dive again callback calls mission.restart
before navigation/reload (`MissionRouter.ts:647`). Thus the same-instance
reset is a supported event boundary, though the ordinary UI then reloads.
The fixture emits that typed event with missionId `shallow`; it does not invoke
either reset directly or simulate the subsequent page navigation.

Normal MissionRouter.begin waits for Discovery.ready, but does not await
Explore's independent optional-content promise. The second case therefore
restarts after Discovery settles while the optional secret/sample document is
pending, then resolves that promise. Both cases subsequently exercise full
and partial restarts after both promises settle. Restart before Discovery.ready
was not added to the normal-launch contract; the skipBriefing URL probe has a
distinct immediate-start path and is outside this test boundary.

## Per-dive and persisted state

| State                                                             | Restart result                       | Replay result                                     |
| ----------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| Samples.collected                                                 | Empty                                | One Sediment entry                                |
| Scanner completed set, active identity/progress, completion hints | Clear; idle, progress 0, completed 0 | New held frame starts at 0.5; completion once     |
| SessionStats discoveries/new entries                              | Empty                                | One Sediment scan; no new Journal entry           |
| Exploration summary sample/secret arrays                          | Empty                                | Sediment only; prior Arch absent                  |
| Summary secret found/total                                        | Remains 1/1 from Journal             | Remains 1/1                                       |
| DiscoveryStore sample key/first timestamp                         | Retained byte-equivalent snapshot    | Same key and timestamp, count 1 → 2               |
| Lifetime scan statistics                                          | Retained                             | 3 → 4, legitimately counting replay               |
| Progress sample award identity                                    | Retained once                        | Still one `sample:shallow/sediment`               |
| Neighbor POI and secret records/awards                            | Persist; per-dive scan flags clear   | No unintended notification or record/count change |

## Integration outcomes

Fixture uses real EventBus, Progress plus its system subscriptions, Discovery
(including its real Scanner, DiscoveryStore and SessionStats), and Explore.
Only the DOM view classes are replaced, following discoveryReward1240's
headless pattern. Valid secret/sample content is parsed through Secrets;
Discovery loads a valid ordinary POI through the existing fetch/parser path.
Scene objects are constructed without a renderer. The optional-content promise
is explicitly controlled; fake dates distinguish original and replay timestamps.
No wall-clock wait, rendering or manual collection/reset is used.

Each case follows this event order:

- Settle content (the second case first emits an optional-load-pending restart).
- Complete ordinary Marker, secret Arch, sample Sediment through Scanner.
  Observe three scan completions, one sample collection event and one sample
  confirmation with firstTime=true. Continuing to hold emits no duplicate.
- Restart through the bus. Assert collection, scanner and stats clear while
  Journal and award snapshots persist and the same summary closure now returns
  no names from the old dive.
- Keep Scan held: the next update reaches half progress without collecting.
  Restart during that partial scan; active identity/progress clear immediately.
- Keep Scan held again: the next update starts at half progress, then completes
  once with firstTime=false. Further held and release/repress updates do not
  duplicate collection or confirmation.

Final totals per case: four scan completions, two sample events, exactly two
Sediment confirmation calls, one secret event and one sample award identity.
Award identities remain exactly `poi:shallow/marker`, `secret:shallow/arch`,
`sample:shallow/sediment`; no generic POI token is created for a curiosity.
Reconstructed stores retain the same Journal and award results. Replay does
not rewrite the original discovery timestamp.

Explore assigns the same live summary function to Discovery's debrief and the
mission-router provider (`explore.ts:79–91`). The tests retain that function
across all restarts and check its changed contents. Static consumer trace:
MissionRouter assigns the provider to its lazy debrief before show
(`MissionRouter.ts:637`); Debrief.show reads `this.exploration?.()` at show time
(`Debrief.ts:191`). This establishes provider freshness, not visual debrief
acceptance or execution of a real DOM debrief.

## Simplicity and rubric

No correction or follow-up outside ownership is needed. Added only missing
integration guards in the existing capability spec and this note. No registry,
lifecycle framework, setting, dependency, schema, UI, guidance surface, site
branch, runtime config mutation or package number in test comments. Existing
assertions, budgets, tolerances, snapshots and instance counts are unchanged.

Correct behavior retains discoveries and one confirmation per collection;
established guidance text and the Arcade default are unchanged. No added phone
resource cost. Readability, beauty, composition, visual Phone-OK and owner
real-phone acceptance remain unassessed. No browser, screenshots, GPU behavior,
unaided journey or physical-device acceptance is implied.

## Validation

- Focused final command: `npm test -- --configLoader runner --cache=false
tests/unit/modesExploration.test.ts tests/unit/gameExplore.test.ts
tests/unit/eventsSystem.test.ts tests/unit/discoveryReward1240.test.ts
tests/unit/progressScan.test.ts tests/unit/gameScanner.test.ts
tests/unit/f2-modes.test.ts tests/unit/exploreRegressions.test.ts
tests/unit/debriefSummary.test.ts tests/unit/gameDiscoveryStore.test.ts
tests/unit/progress.test.ts tests/unit/missionCore.test.ts` — **169 tests in
  12 files PASS**, exit 0. Log: `/tmp/3080-focused-final.log`.
- Initial fixture attempt failed because its new POI metadata omitted bbox;
  corrected that fixture before the passing run. This was a harness error,
  not a demonstrated game failure or failing-before production regression.
- `npm run typecheck` — PASS. Owned-file Prettier and `git diff --check` — PASS.
- Required aggregate `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`
  — pending. Actual e2e mode is **none**; no browser assertions run.

No merge, commit, push or tag.
