# 3040 — S-bughunt scan target lifetime

2026-10-21. DIRECTOR Backlog item 9, **S-verify / S-bughunt [Codex, standing]**.
Audited checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`.

## Scope and ownership

Read Director rules/rubric, the newest review and overnight runs 77–80,
the launched briefs through 3060, recent result files, relevant progress notes
(including the earlier contact-choice and anchored-event audits), and registered
worktree status/diff summaries before editing. Finished-but-uncollected work
remains separate. No other registered worktree changes Scanner.ts or
gameScanner.test.ts; 3050 and 3060 have disjoint ownership. No collection or
dependency on another package's changes, including 3010's expanded terrain,
CameraRig and derived-oracle work. 3000's event/prop accessibility remains separate.

Changed only `src/game/Scanner.ts`, `tests/unit/gameScanner.test.ts` and this note.
No merge, commit, push or tag. No browser, rendering or screenshots.

## Actual caller transition matrix

| Pool / owner                                             | Shipped transition                                                                                                                 | Object and discovery identity                                                                                           | Finding                                                                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Fixed / Discovery.load                                   | Set once after POI load; Scanner copies the array                                                                                  | Placed POI objects persist during the dive; dive restart clears session scans, not discovery records                    | Objective remains available independently of the optional pools                                                |
| Supplemental secrets and samples / explore               | Initial registration, then a new `[...targets, ...availableContacts]` array every `world.life` frame                               | The same placed secret/sample objects remain in `targets`, including after collection; scanned state suppresses repeats | Array replacement must preserve active progress; these callers do not remove a partially scanned secret/sample |
| Supplemental arrival contacts / explore + AnchoredEvents | Available while outside and no event is active; removed during playback/occupation; return after playback and exit, or event reset | Same EventContact objects; `event:<kind>` IDs, with `arrivalRadiusM`                                                    | Hint-only: never candidates or active scans; no partial arrival scan can exist through this caller             |
| Extra / Life.updateTargets                               | Scanner receives `life.targets` once; each Life refresh empties and repopulates that same array                                    | One cached target per species, `life:<species>`; position can switch individuals while the target object persists       | Losing the last eligible animal removes that species target without calling a Scanner setter                   |
| Extra / Life reappearance                                | A tracked animal returns inside the candidate range, or another individual becomes eligible after departure                        | The cached species target returns as the same object; the old individual need not return                                | Reproduced retained active/interrupted progress across actual pool absence                                     |
| Extra / restart                                          | Discovery resets the scanner, then Life.clear empties targets and its species cache on `mission:restart`                           | Subsequent population creates new target objects with the same site/species ID                                          | Repeat discovery uses the existing persisted key, with `firstTime: false`                                      |
| Extra / system disposal                                  | Life system explicitly calls `setExtraTargets([])` before disposal when it still owns the list                                     | Removed active object is cleared immediately by the existing setter                                                     | Existing disposal regression remains intact                                                                    |

No shipped caller moves one target object between fixed, supplemental and extra
pools. The three namespaces remain separate. A new dive/system can recreate
placed objects; that does not introduce a new discovery ID.

Life filters dead/leaving animals, spawn fades below 0.6 (sessile below 0.9), and
animals beyond 1.4 times the larger of species scan radius and mode floor. Its
species cache survives those temporary absences. A leaving individual does not
need to become non-leaving again: another animal of that species can supply the
same cached Scanner target. Fixture states follow those supported transitions;
they do not reverse a despawn fade or rely on a removed secret returning.

Runtime order is `world.life` before `scan.discovery`. The reproduction uses
real Life target refreshes and Scanner/EventBus/DiscoveryStore, with controlled
agent states and a zero-time Life refresh to isolate ownership from steering.
Three.js objects are built headlessly; no WebGL renderer is constructed. Coordinates
are a flat test fixture, not a claim about a particular site's arrival access.
The lifetime fixture uses species/data reach (no radius floor, corresponding to
Realistic). Existing Scanner regressions also exercise Arcade's 100 m floor and
arrival exclusion across mode changes. No default-mode journey is inferred.

## Reproduced defect and correction

The supplemental setter asymmetry alone was **not** a demonstrated shipped
defect: explore retains its beam targets, and only its automatic arrival contacts
disappear. The real failure is the live animal array bypassing all setter-based
membership clearing.

Four retained regressions combine departure/range disappearance with an active
or already-released scan. A comb jelly at `(0, -100, -12)` is scanned to 50%.
For departure, it becomes `leaving` while another nearby jelly is still below
the eligibility fade, then that incoming jelly finishes fading in. For range,
the animal moves to Z=-100 and returns to Z=-12; the same live list and cached
species target are used. All assertions about withdrawal occur after the normal
next Scanner.update, not before its view-update boundary.

On the pinned Scanner, the retained final tests fail **4 / 42**, with 38 passing:
expected idle after disappearance, received interrupted. A temporary diagnostic
against the same pinned source established the following exact state; diagnostic
instrumentation was removed and the fixed source restored afterward:

| Prior state                       | After removal + 0.1 s update                         | Events on removal                  | Same-object return with dt=0               |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------- | ------------------------------------------ |
| Scanning, progress 0.50           | Active `life:comb-jelly`, interrupted, progress 0.45 | `scan:aborted` with reason `range` | `scan:started` and `scan:progress` at 0.45 |
| Released for 0.1 s, progress 0.45 | Same missing active ID, interrupted, progress 0.40   | No second abort                    | `scan:started` and `scan:progress` at 0.40 |

Both disappearance paths have these results. Candidate is already null and the
nearest hint is the available `event:plume`; the defect is retained active state
and resumable progress, not a phantom candidate/completion while absent. No
discovery is recorded during absence. The explicit extra-target removal API
would instead clear active state and progress silently.

Correction: after the existing three pool traversals, if an active object has no
`activeGeo`, use the existing `clearActive()`. A present target always receives
geometry before range/scanned filtering, so this distinguishes missing membership
from an ordinary range/facing interruption. This is one conditional, reusing
work already performed; no additional target scan, registry, ID policy,
allocation, scheduling or per-frame subsystem. It applies the established
setter membership semantics at the live-list update boundary.

After correction, all four cases become idle with zero progress, no active or
candidate ID, and no new abort/progress/completion event on removal. Returning
cached objects start from zero. Completion emits exactly
`{ poiId: 'life:comb-jelly', landmarkId: 'lm', firstTime: true }`; same-dive repeat
attempts do not increment the record. Restart recreates the target object and
completion reports `firstTime: false`. Storage reload retains the single
`lm/life:comb-jelly` key with count 2, alongside `lm/objective`; no event entry is
created by Scanner. The fixed mission objective completes with its original ID
and the expected completion payload.

The fifth added case exercises explore's actual list replacement and
AnchoredEvents availability: a retained curiosity goes 25% → released/20% →
resumed/25% while the arrival contact retires, then returns as the same hint-only
object after expiry and exit. Only `lm/secret:rock` is recorded. Existing
arrival/mode, objective priority, active-target stickiness, range/facing/release
decay, target switching, completion identity and disposal assertions remain.
Selection, reach, cone, timing, mode resolution and persistence code are unchanged.

## Simplicity and acceptance limits

No UI surface or setting added/replaced, no layout patch, site branch, config
mutation, dependency, schema, authored data, snapshot or budget change. Reuse of
the existing membership signal and clear method keeps the repair local; tests
extend an existing capability spec. This protects correct scan behavior and
retained discoveries without changing guidance policy or phone resource limits.

The Director rubric's readability, beauty, composition and visual Phone-OK
judgments remain with Claude/owner. Headless checks do not establish GPU
behavior, successful unaided play, journey acceptance, real-phone performance
or visual guidance acceptance. **Actual e2e mode: none.**

## Validation

- Before: final regression cases against pinned Scanner, **4 failed / 38 passed**.
  Logs: `/tmp/3040-scanner-before.log`,
  `/tmp/3040-scanner-baseline-probe.log` (temporary diagnostic failures).
- Focused headless command: `npm test -- --configLoader runner --cache=false`
  with `gameScanner`, `gameDiscoveryStore`, `gameExplore`, `eventsSystem`,
  `lifeDisposal`, `missionCore`, `heroMissionJournal`, `guidance` unit paths:
  **152 tests / 8 files passed**. Log: `/tmp/3040-focused.log`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **exit 1, e2e=none**. PASS: config, strict content, TypeScript/production
  build, full unit suite (**3,394 tests / 192 files**, 528.66 s), attribution
  and repository-wide Prettier. No browser assertions ran.
- FAIL: Python tooling, **162 / 167 outer tests passed, 5 failed**. Four
  `test_ci_build_manifest` cases fail with `spawnSync git EPERM`; the remaining
  `test_golden_tooling` failure reports `Unexpected end of JSON input` in its
  subprocess output. These match the previously reported unrelated failures;
  the JSON failure's underlying cause was not established here. No tooling,
  fixture limit or unrelated file was repaired.
- Gate logs: `.cache/runs/20261021-135520-31-smXWvC/`; aggregate output:
  `/tmp/3040-gates.log`. These are this checkout's actual command results,
  independent of any external wrapper PASS labels.
- Final owned-file Prettier and `git diff --check`: **PASS**. Only the two
  owned code/test files and this progress note are changed.
