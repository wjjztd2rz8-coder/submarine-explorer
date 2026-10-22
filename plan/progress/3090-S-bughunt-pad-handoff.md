# 3090 — S-bughunt: selected standard-pad fallback

Item: `plan/DIRECTOR.md` Backlog 9, **S-verify / S-bughunt [Codex, standing]**.
Pinned checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`, initially clean.

## Scope and ownership

Read Director rules and rubric, newest evening review, overnight-log tail through
run 80, STATUS, CONTRIBUTING-AGENTS, S-bughunt-19, queued/launched briefs through
3090, available 2920–3060 results and worktree progress notes. Rechecked all
registered worktree diff paths and diffs for the two owned files before editing.
Queue was empty; 3070/3080/3090 had clean worktrees at that check. Older finished
and active packages remain uncollected. No other worktree changed Input.ts or
subInput.test.ts; no ownership conflict found. Wrapper smoke PASS summaries were
not treated as local browser assertion evidence.

Only `tests/unit/subInput.test.ts` and this named note change. All excluded
terrain/tint/contact/resource, shell/focus/power, hosted CI, Scanner, cache,
photo/export, Journal and exploration work stays independent and read-only.
No production changes, collection, commit, merge, push, tag, Director or tools edits.

## Supported contracts and clean finding

Traced Input.sample/clear/dispose/endFrame, app/loop.ts, homeStartup.ts and
systems/input.ts. Runtime samples once before the frame's systems/physics and
clears edge flags in late.input; frozen non-photo frames clear held/queued input.
Home also samples and ends frames. `endFrame` clears edges and camera deltas,
not held axes/scan or button history. `clear` discards keyboard/touch and sampled
state while retaining pad history; `dispose` also resets selected index/history
and interruption flags. Existing capability tests cover these lifecycle controls.

Selection is the first **connected entry in getGamepads array order**, including
an idle first pad. This is the existing first-connected policy, not remembered
connection chronology or most-recently-used selection. Standard mapping uses
left X/Y for yaw/throttle, right Y for pitch, A/B values for ballast and RB held
for scan. Nonzero touch axes override keyboard per axis; nonzero selected-pad
axes override those values after the existing 0.15 dead zone. Neutral pad axes
leave keyboard/touch values available. Scan combines held sources with OR.

On a selected-index change, the existing code clears the previous selected pad's
button history before computing edges. An empty connected-pad interval clears
index/history too. A newly sampled held edge button therefore fires on fallback
and reconnect, then requires release/repress after endFrame. Window focus and
visibility interruption baselining retain their separate existing semantics;
connection transitions are not focus-return events.

**Clean supported audit:** all added guards pass against the pinned, unchanged
Input.ts. No suppressed fresh action, stale old-device axis/ballast/scan, or held
edge repetition reproduced. No failing-before/passing-after production claim.

## Missing coverage added and transition evidence

Extended the existing capability spec with eight table-driven edge cases and
two active/neutral axis fallback cases. The navigator fixture returns controlled,
stable device objects at distinct indices 1 and 3 in `[null, A, null, B]`.
Objects stay stable across polls; connection flags, axes and buttons change only
at explicit test steps. No gamepad registry, new mapping or selection policy.

Each of these edge mappings runs the same transition table below, checking every
other edge remains false and all neutral axes/scan remain neutral:

| Button | Existing action       |
| -----: | --------------------- |
|      2 | toggleLights          |
|      3 | toggleCamera          |
|      4 | capturePhoto          |
|      8 | toggleSonar           |
|      9 | togglePhotoMode       |
|     12 | cycleSimSpeed         |
|     13 | resetCamera           |
|     14 | toggleGuide (Journal) |

| Transition / sample                                 | Selected index | Button state / result                                             |
| --------------------------------------------------- | -------------: | ----------------------------------------------------------------- |
| A pressed, B neutral                                |              1 | A action true                                                     |
| endFrame; B newly presses same button, A still held |              1 | No edge from B; A holding does not repeat                         |
| Remove A slot, B remains held                       |              3 | B action true despite A's same-button history                     |
| Repeat sample before endFrame                       |              3 | Sampled action remains true for this frame                        |
| endFrame; repeated samples and another endFrame     |              3 | Held B produces no new edge                                       |
| B release, then repress                             |              3 | False, then exactly its action true                               |
| endFrame; all-null interval                         |           none | All edges/axes/scan neutral; gamepadActive false                  |
| B reconnects at 3 while held                        |              3 | Its action true, matching existing single-pad reconnect assertion |
| endFrame; B remains held                            |              3 | No repeat                                                         |

Axis assertions use literal expected observations, not copied production formulas.
Underlying keyboard is S/A/F/C; touch contributes throttle 0.25, pitch 0.35 and
ballast 0.45. The neutral fallback tuple is therefore
`(throttle, yaw, pitch, ballast; scan) = (0.25, -1, 0.35, 0.45; false)`.

| Device / step                                                                             | Selected | Observed contribution and expected final state                                        |
| ----------------------------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------- |
| A deflected, A/RB held; B active or neutral                                               |        1 | A supplies `(0.8, 0.6, 0.4, 1; true)`                                                 |
| A neutral but connected, B active or neutral                                              |        1 | Keyboard/touch fallback tuple; active B cannot take selection; gamepadActive false    |
| A active again, then disconnected but retained with stale axes/buttons in array; active B |        3 | B supplies `(-0.6, -0.3, -0.7, -1; false)`; none of A's held scan/axes survives       |
| Same transition with neutral B                                                            |        3 | Keyboard/touch fallback tuple; A's throttle/ballast/scan cleared; gamepadActive false |
| Repeat after endFrame                                                                     |        3 | Same selected B contribution/fallback, no state drift                                 |
| B RB pressed and held across endFrame, then released                                      |        3 | B scan true on both samples; release removes B scan                                   |
| Neither device connected, stale samples retained                                          |     none | Keyboard/touch fallback tuple; gamepadActive false                                    |
| B reconnects                                                                              |        3 | B's own active/neutral contribution returns                                           |
| B fully neutral                                                                           |        3 | Keyboard/touch fallback tuple; touch scan, then keyboard scan each work and release   |

The prior individual edges, reconnect, simultaneous-source, focus/blur/hidden,
editable-focus, clear/dispose and binding regressions remain unchanged. Existing
focus controls were executed without adding or repeating their test matrix.

## Report-only boundaries, simplicity and rubric

Same-slot replacement between polls cannot be distinguished by the existing
index-only history; this audit makes no device-identity guarantee there. Input
documents standard mapping but does not filter `mapping`; non-standard mappings
remain unsupported/report-only. Most-recently-used selection and binding migration
conflict policy remain the deferred S-bughunt-19 product decisions. No registry,
configuration, rebinding change or additional owner decision introduced.

Tests use the existing capability file and shared edge table. Production remains
unchanged: no machinery, UI, guidance, setting, layout, site branch, runtime config
mutation, dependency, save schema, tolerance, snapshot, budget or instance-count
change. No retries, skips or timeout increases. This protects comfortable input
and scanning while retaining all exploration/Journal/discovery behavior, real GMRT,
13 site identities, five heroes, marine life, accessibility and Arcade default.

The rubric applies here to correct input behavior and unchanged guidance,
discoveries and established phone resource limits. Mocked standard-pad samples
do not establish physical-controller compatibility, native browser event timing,
visual glyph correctness, GPU behavior, unaided play or real-phone performance
or acceptance. Readability, beauty, composition and visual Phone-OK remain with
Claude/owner. Actual e2e mode is **none**; no browser/game launch or screenshots.

## Validation

- Baseline focused controls: **5 files / 138 tests passed**, exit 0, 1.20 s.
  Log: `/tmp/3090-baseline-focused.log`.
- Final focused run with ten added transition guards: **5 files / 148 tests
  passed**, exit 0, 1.17 s. Log: `/tmp/3090-focused.log`.
  Command for both runs: `npm test -- tests/unit/subInput.test.ts
tests/unit/appSystems.test.ts tests/unit/touch.test.ts
tests/unit/touchControls.test.ts tests/unit/touchControlsAudit.test.ts
--configLoader runner --cache=false`.
- Owned-spec Prettier and `git diff --check`: passed.
- Required gates: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Final outcomes will be recorded after completion; e2e mode **none**.
