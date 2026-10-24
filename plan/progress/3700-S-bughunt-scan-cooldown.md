# 3700 — S-bughunt scan cooldown and reach

2026-10-24. Director Backlog 9, **S-verify / S-bughunt [Codex, standing]**.
Audited SHA: **`d2dba6e75319b4be556a2372834f3cef4be8d567`**.

## Scope and ownership

Read Director Backlog, simplicity rules and rubric; the newest dated review
(2026-10-24 early, beneath the older targeted-review preamble); Overnight Log
through run 111; CONTRIBUTING-AGENTS; launched 3040 and 3670–3720 briefs;
3040/3670–3690 result/last reports and relevant progress notes, including
P2-scan-range and S-scan-reach. Wrapper gate summaries are not substituted for
the actual results recorded in those notes.

Inventoried every registered worktree's status and main-relative committed
paths, and inspected owned-path diffs before editing. Rechecked HEAD and
ownership immediately before writing. Main and this checkout were clean at the
pinned SHA. Finished 3670/3680 own their notes, 3690 owns uiHud tests and its
note; 3710 input and 3720 clock work remain separate. Held 2980/3050 collision,
3310 journeys, 3320/3340 browser audits and 3380 CI work are untouched. The held
3310 branch's main-relative Scanner/test patch is already present at this SHA:
direct comparison of its Scanner.ts and gameScanner.test.ts against HEAD is
empty. No patch was collected or used from another worktree.

Only `tests/unit/gameScanner.test.ts` and this note are owned/changed. Scanner
is the closest existing capability: it already owns minimum-depth eligibility,
100 m reach and beam completion; the submarine physics spec only carries the
scan input bit. Production, fixtures, authored data, snapshots and tools are
read-only.

## Existing contract and guards

There is **no separate scan cooldown timer**. Completed contacts remain suppressed
for this dive; interrupted scans decay and can resume. Progress-event throttling
is a different contract. Multiple eligible contacts share one beam; no threaded
or reentrant Scanner invocation is supplied by the shipped caller.

| Contract                                                                                                     | Production evidence                                                                                                                                                                                                                                                               | Existing capability evidence                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same-dive repeats count once; a new dive may record an existing discovery again                              | [Scanner.isScanned/resetDive](../../src/game/Scanner.ts#L258), [complete](../../src/game/Scanner.ts#L481) marks the landmark/POI key before recording/emitting; [DiscoveryStore.record](../../src/game/DiscoveryStore.ts#L181) intentionally increments each valid completed scan | [rescan suppression and reset](../../tests/unit/gameScanner.test.ts#L711) asserts completion-event cardinality, completed count, Journal count 1 then 2, and firstTime=false after reset; [store reload](../../tests/unit/gameDiscoveryStore.test.ts#L59) retains original discovery time |
| Eligible objective wins; otherwise one selected contact, with active lock retained                           | [Scanner.update](../../src/game/Scanner.ts#L278) selects one candidate across fixed, supplemental and extra pools; [held beam](../../src/game/Scanner.ts#L402) advances only that candidate                                                                                       | [overlapping radii in both list orders](../../tests/unit/gameScanner.test.ts#L416), [objective selection and switching](../../tests/unit/gameScanner.test.ts#L477); prior [3040 audit](3040-S-bughunt-scan-target-lifetime.md) covers disappearing live targets and persisted identity    |
| Arcade and Arcade-based Custom resolve to a 100 m floor; Realistic retains data reach; larger radii survive  | [resolveEffective](../../src/game/EffectiveSettings.ts#L53), [resolveScanRadius](../../src/game/Scanner.ts#L56) uses max after scaling/caps                                                                                                                                       | [all three pools at 100 m, outside at 101 m and restored 30 m reach](../../tests/unit/gameScanner.test.ts#L390); [mode/equipment resolution](../../tests/unit/f2-modes.test.ts#L42); [mission approach cap and surface restoration](../../tests/unit/missionApproachSystem.test.ts#L79)   |
| Range, depth and facing still gate a hold; arrival contacts cannot claim the beam                            | [geometry](../../src/game/Scanner.ts#L506) uses inclusive radius and minimum depth, plus cone/close-range eligibility; supplemental selection excludes arrivalRadiusM                                                                                                             | [remote hold](../../tests/unit/gameScanner.test.ts#L581), [minimum depth](../../tests/unit/gameScanner.test.ts#L591), [coincident arrival contacts in all pools/mode changes](../../tests/unit/gameScanner.test.ts#L224)                                                                  |
| Interruption emits one abort, decays rather than completing, and resumes or clears                           | [interruption handling](../../src/game/Scanner.ts#L435) bounds decay at zero; cancel and missing membership clear active state                                                                                                                                                    | [release/resume and abort cardinality](../../tests/unit/gameScanner.test.ts#L661), [facing/range/fully decayed cases](../../tests/unit/gameScanner.test.ts#L680), [real Life removal transitions](../../tests/unit/gameScanner.test.ts#L51)                                               |
| Finite supported geometry and elapsed time produce bounded progress; zero separation avoids division by zero | [geometry](../../src/game/Scanner.ts#L506) uses hypot, distance epsilon, forward-length fallback and clamped acos/asin inputs; [progress](../../src/game/Scanner.ts#L423) floors the denominator and caps at 1                                                                    | [completion timing and event-rate limit](../../tests/unit/gameScanner.test.ts#L559), [accumulated-dt equivalence](../../tests/unit/gameScanner.test.ts#L744); explicit zero-distance numeric/completion coverage added below                                                              |

Caller boundary: [discovery system](../../src/app/systems/discovery.ts#L54)
updates Scanner once per frame with fixed-step elapsed time and one sampled
boolean scan state, through [Discovery.update](../../src/game/Discovery.ts#L249).
[Time.tick](../../src/core/Time.ts#L43) bounds normal RAF deltas and step counts.
[parsePois](../../src/game/Pois.ts#L82) rejects nonfinite numeric content,
deduplicates IDs, and accepts only positive scan durations/radii before
[placePois](../../src/game/Pois.ts#L190) supplies defaults. Raw NaN dt, malformed
vectors or arbitrary reentrant event callbacks are not established shipped
inputs by this audit; no universal malformed-input guarantee is claimed.
Infinity is the documented absent-distance sentinel in ScanView, so requiring
every idle field to be finite would be incorrect.

The second source pass confirmed the floor is also supplied before wildlife
selection: [Life.updateTargets](../../src/world/life/Life.ts#L102) uses it for
candidate retention and the target radius; [lifeDisposal](../../tests/unit/lifeDisposal.test.ts#L117)
already guards availability at 100 m and restored Realistic reach. Fixed targets
are resolved from pristine radii in [modes](../../src/app/systems/modes.ts#L17),
and [mission setup](../../src/app/systems/mission.ts#L53) applies the floor after
the approach cap and sensor multiplier. No additional gap was found there.

## Material addition and findings

Two cases in [the existing Scanner capability](../../tests/unit/gameScanner.test.ts#L327)
exercise three simultaneously eligible contacts (fixed objective, curiosity,
wildlife) through completion, at **0 m** and **exactly 100 m**, using 30 m data
radii and the Arcade floor. Existing overlap cases only checked selection and
partial locks; they did not assert the combined completion/count and numeric
contract at these edges.

Each contact receives its own partial progress and completion, producing exactly
one payload and one stored count. Continued holds and release/re-hold after all
three complete produce no duplicates. Geometry angles and emitted progress are
finite, progress stays in [0,1], and idle numeric state contains no NaN while
allowing absent-distance Infinity. These are compact synthetic contacts, not
claims that authored sites put those objects at the same position.

No supported-path defect was reproduced, and no production fix is proposed.
The new tests pass against the pinned production code; there is **no
failing-before/passing-after repair claim**. Existing range/depth/facing, mode,
arrival, interruption and persistence assertions remain unchanged.

## Validation

- Baseline: `npm test -- --configLoader runner --cache=false tests/unit/gameScanner.test.ts`
  — **exit 0; 43 tests / 1 file passed**, 618 ms.
  Log: `/tmp/3700-scanner-baseline.log`.
- Focused: `npm test -- --configLoader runner --cache=false tests/unit/gameScanner.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/gamePois.test.ts tests/unit/f2-modes.test.ts tests/unit/missionApproachSystem.test.ts tests/unit/lifeDisposal.test.ts tests/unit/missionCore.test.ts tests/unit/Submarine.test.ts`
  — **exit 0; 143 tests / 8 files passed**, 1.89 s.
  Log: `/tmp/3700-focused.log`.
- Required: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`
  — pending at the time of this initial note; actual result will be recorded.

## Simplicity and limits

Two cases extend an existing capability; no runtime complexity, new abstraction,
UI surface, setting, site branch, config mutation, dependency, schema or policy
change. Correct single-beam counting protects the scan reward and Journal; the
floor remains mode-resolved. All historical assertions and tolerances remain.

Actual local e2e mode: **none**. No browser, game rendering, WebGL context,
screenshot, hosted workflow, merge, push or tag. Visual readability, beauty,
unaided journeys, touch layout, GPU behavior and physical-phone performance
remain unvalidated and with Claude/owner. This audit supplies numeric/behavioral
evidence for correct, simple, rewarding and honest exploration only.
