# 3240 — S-verify: waypoint objective state

DIRECTOR Backlog item **9, S-verify / S-bughunt [Codex, standing]**,
specifically **S-verify**, the highest eligible nonvisual Codex entry.
Pinned checkout: **`a545afe00196649a2d6de4cf1c8039851aba9074`**.

The consumer audit is clean. Five additional cases in the existing
`tests/unit/uiWaypoints.test.ts` exercise the real `Waypoints`, `Scanner`,
`Mission`, `GuidanceSlot` and `ObjectivesPanel`. The original readout regression
is intact. No product correction is indicated; production is unchanged.

## Authority, history and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR direction/simplicity/rubric, the newest
2026-10-22 comprehensive review and OVERNIGHT-LOG through run 82. Read the
launched briefs, result/agent reports and progress evidence for 1690
(`S-bughunt-2`), 2010, 2440 (`S-bughunt-19`) and 3140. Historical wrapper PASS
summaries conflict with their agents' recorded Python failures and blocked
browser startup; those summaries are not validation evidence for this work.

Before editing, checked launched scopes through 3240, queue inventory,
registered worktree changed-path/diff inventories and main-relative committed
paths, including finished work awaiting collection and progress notes for
3130–3210. Rechecked the SHA and both owned paths across every registered
worktree immediately before editing: no conflict. Main and this checkout
were clean. Work remains independent of all uncollected changes.

Excluded 2980 scarp and 3050 seam repairs, 3130 sensitivity, 3140 spawns, 3150
hosted CI, 3160/3170 Kama material/ambient, 3180 wildlife, 3190 currents, 3200
captions and 3210 secrets. Preserved 3080 restart and collected 3120 namespace
coverage; neither is repeated. Active 3220 owns `modesExploration.test.ts`;
3230 owns Sonar routing and its spec. This package edits only the waypoint
spec and this note. No collection, commit, merge, push or tag was performed.

## Caller contract and evidence

`scan.discovery` selects `nextScanObjective` before the beam update. Scanner
completion adds the site/POI key to its per-dive set and emits `scan:complete`;
Mission's listener marks the objective complete. Later `guide.waypoints`
selects the next resolved unfinished primary, then an optional objective,
sets Scanner's objective and passes `{ poiId }` or `null` to Waypoints.
The ready callback calls `setPois` once. Repeated POI replacement is not a
contract inferred from this caller and is not tested.

The fixture uses that selector and public handoff directly, without running
the application loop or duplicating system ownership tests. Its real Scanner
completes scans through `update`, so neither mission completion nor scanned
state is manually inserted. Two ordinary geology POIs use distinct names and
IDs. A fixed CPU PerspectiveCamera has its projection/world matrices updated
once; both contacts stay simply in front. No renderer or terrain is created.

| Supported handoff/state                        | Semantic result observed                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A unfinished, hints on                         | Only A is current; A is unscanned and shown as `◇`; B is hidden. Edge names First contact and reads `41 m · ↓10 m · IN RANGE`.                                                                   |
| Scan A normally; select B                      | Only B is current; A remains `✓`, `is-scanned`, with its scanned-this-dive title. The active cue names Next contact and reads `102 m · ↑20 m`, with no A identity in the current marker or name. |
| Move the pilot into B's radius                 | B's readout changes to `40 m · ↑0 m · IN RANGE`; camera matrices remain fixed.                                                                                                                   |
| Scan B normally; selector returns no objective | No current markers; edge is hidden; both scanned markers remain.                                                                                                                                 |
| B current; hints off                           | No current markers; B and the edge are hidden; A's scanned marker remains.                                                                                                                       |
| Hints back on                                  | B's current marker, correct name and range/depth return; A remains scanned.                                                                                                                      |
| `Scanner.resetDive()` with B still selected    | A loses its scanned class/check/title and becomes hidden; B remains the sole current unscanned marker. No mission restart orchestration is exercised.                                            |
| Explicit objective removal after reset         | Edge and both unscanned markers are hidden; no current class remains.                                                                                                                            |

Separate direct-consumer compatibility check: an already-scanned A passed to
`Waypoints.update` produces a scanned marker without `is-current`, but still
has an edge name/readout until the supplied objective changes. This preserves
the existing API semantics. The normal Mission listener advances selection to
B synchronously; the direct check does not claim that the application selector
returns completed A or impose a new scanned-objective filter. A hidden edge
may retain cached child text; removal means hiding the active cue, not erasing
its cache.

Name ownership uses the caller's callback composition:
`slot.showsName(name) || panel.showsTarget(name)`, with both real owners.
Each owner first names A while B is current: B's name stays visible. Naming B
hides only the redundant name; the edge, range/depth and current marker remain.
Withdrawing the slot offer or clearing panel navigation restores B's name.
The panel's uppercase target text also exercises its existing case-insensitive
match. No matching policy or guidance source was changed.

## Existing versus added coverage and simplicity

- Existing `uiWaypoints` covered the pure range/depth formatter only. It still
  does; the five new cases guard the missing consumer states above.
- `missionApproachWaypoint` already covers pre-scan objective priority,
  optional progression/debrief resume and the Realistic approach exception
  using a waypoint double. No new mode-resolution or approach tests were added.
- `overlayFocus` already covers preference delivery, reduced motion,
  disposal and late readiness; `guidance` covers priority and names;
  `gameScanner` covers selection, per-dive completion and reset. These remain
  read-only controls. The new reset assertion verifies the view consumes that
  state rather than retesting restart/session orchestration or persistence.
- Reused the existing small EventTarget/DOM fixture pattern locally; no shared
  helper, dependency, snapshot, timeout, retry or skip was added. Assertions
  concern semantic identity, text, hidden state and current/scanned classes.
- No new screen element or setting, site branch, runtime config mutation,
  resource allocation policy, layout patch or package number in test comments.
  Existing guidance surfaces and the deduplicated-name contract are protected.
  Terrain, all site identities/heroes, scanning/Journal, marine life, input and
  accessibility production paths are unchanged; Arcade stays the default.

## Validation and limits

Focused command:

```bash
npm test -- --configLoader runner --cache=false tests/unit/uiWaypoints.test.ts tests/unit/missionApproachWaypoint.test.ts tests/unit/missionApproachSystem.test.ts tests/unit/guidance.test.ts tests/unit/gameScanner.test.ts tests/unit/overlayFocus.test.ts
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Focused capabilities: **229 tests / 6 files PASS**, including all six waypoint
tests (one historical, five added). Log: `.cache/waypoint-focused.log`.
Gate log: `.cache/waypoint-gates.log`; individual logs:
`.cache/runs/20261022-193757-27-rnA9rB/`.

- Config bundling, strict content and production build/typecheck: **PASS**.
- Python: **162/167 pass, five failures**. Four unchanged
  `test_ci_build_manifest` cases fail with `spawnSync git EPERM`:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
  The unchanged `test_golden_tooling` wrapper fails because the Node subtest
  “golden comparison refuses partial sets, missing files and incompatible
  poses” gets `Unexpected end of JSON input` at
  `tools/tests/golden-manifest.test.mjs:151`. These are retained tooling/
  environment failures, not waypoint assertion failures. No cause beyond the
  observed errors is claimed for the empty golden CLI result.
- Full unit suite: **3,524 tests / 192 files PASS**, 561.99 seconds. No
  retries, skips, timeout changes or assertion relaxations.
- Attribution and repository-wide formatting gates: **PASS**.
- Required gate command: **exit 1**, `FAIL gates (e2e=none)`, solely from
  the five Python failures above. No smoke, project-base or full browser gate
  ran. A wrapper summary cannot turn this command into a pass.
- Final owned-file formatting and `git diff --check`: **PASS**. SHA remained
  pinned; final changed paths are only the owned spec and this note.

No supported product failure was reproduced; there is no retained product
reproduction or proposed production correction. Unrelated gate failures remain
outside ownership and are retained without repairs.

Actual e2e mode: **none**. No game rendering, browser launch or screenshots.
Semantic DOM assertions do not establish readable composition, label overlap,
silhouette, screen bounds, successful unaided navigation, Phone-OK layout,
GPU behavior, screen-reader behavior, visual acceptance or real-phone
performance. Readability, beauty, composition and phone/visual acceptance
remain with Claude/owner. No visual rubric score is claimed.
