# 3630 — S-bughunt: sonar contact state

Serves DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**, the highest eligible Codex item. Audited checkout:
**`04cf357798c30dd34b782d0154ca1751bf8f1d36`**.

Result: **clean contact-state audit; no production correction indicated**. Four
new cases extend `tests/unit/uiSonar.test.ts`. No failing-before/passing-after
product change is claimed.

## Authority and ownership

Read `CONTRIBUTING-AGENTS.md`, DIRECTOR Backlog/simplicity/rubric, the top late
2026-10-23 targeted review and the 2026-10-24 early comprehensive entry, and
OVERNIGHT-LOG through run 105. Read the launched 3230/3240 and 3610–3630 briefs,
3230/3240 results/progress, and 3580–3600 results and progress. The historical
result wrappers claim smoke PASS while their agent reports retain failures;
only actual local command outcomes below count for this audit.

Checked registered worktree status, diff inventories and committed path
inventories before editing, and rechecked SHA and changed paths immediately
before the test edit. No other current diff owns either of this package's paths.
3610 owns LifeSim/lifeSim tests; 3620 owns power/powerSystem tests. Finished,
uncollected 3580 ripple, 3590 blur/focus and 3600 settings changes stay in their
own worktrees. 2980/3050 collision work, 3310/3510 journeys, 3320 full e2e,
3340 touch and 3380 hosted CI evidence remain untouched and uncollected.

Only this note and `tests/unit/uiSonar.test.ts` are authored. Production, shared
fixtures, authored data, snapshots, tools and DIRECTOR are read-only. This work
uses the pinned checkout independently of uncollected patches.

## Existing guards and missing contract

- [uiSonar.test.ts](../../tests/unit/uiSonar.test.ts): original `sonar canvas
sizing` and `D-SONAR sub-centred map` cases already guard tile/corner and
  metric projection, north/east orientation, sensor/view admission, scanned
  icon priority, zoom levels/easing and wheel cadence. The relief guards remain
  intact. No new pure helper matrix is needed.
- [3230 result](3230-S-bughunt-sonar-key-routing.md): the 29 routing cases added
  there deliberately avoid update/draw and assert input ownership. All 47 prior
  uiSonar cases remain unchanged; this package does not repeat their key/button,
  pinch, modal or cadence audit.
- [3240 result](3240-S-verify-waypoint-state.md): real Waypoints/Scanner/Mission
  handoff, scanned/current identity and name ownership are already covered in
  `uiWaypoints`. They do not establish Sonar's public markers/aria replacement.
- [sonarFlat1250.test.ts](../../tests/unit/sonarFlat1250.test.ts): existing guides
  exclude beyond-range contacts, suppress disabled guides and bound halos; hull
  orientation/minimum size also stays with that existing spec.
- [sonarPalette1200.test.ts](../../tests/unit/sonarPalette1200.test.ts): existing
  palette/depth normalization, no site colour exception, continuous ridge and
  DPR sampling guards are adequate. Their CPU recorder assertions are existing
  checks, not new pixel acceptance or a visual judgement in this package.

The missing capability was the real Sonar consumer rebuilding public identities,
flags, visibility and its canvas description after supported setter calls.

## Caller and visibility contract

[sonarSystem](../../src/app/systems/sonar.ts) constructs Sonar, sets the resolved
sensor range and, in `guide.sonar`, calls `setObjective(nextScanObjective?.poiId
?? null)` immediately before `update`. M calls `toggle`, which expands/collapses
the map and backdrop; it does not set `visible=false`.

[waypointsSystem](../../src/app/systems/waypoints.ts) installs the scan callback
against `Scanner.isScanned(landmarkId, id)` and delivers `discovery.pois` after
ready. The callback reads live per-dive scan state. That caller delivers POIs
once; repeated/empty `setPois` tests below are direct public API compatibility,
not a claim of repeated discovery-ready delivery in normal play. Likewise,
replacing `setScanState` exercises the public callback handoff, not a new reset
or restart orchestration. [modesSystem](../../src/app/systems/modes.ts) updates
sensor range from resolved effective settings.

[Sonar setters/update](../../src/ui/Sonar.ts) expose separate marker suppression
and whole-map `visible` state. No current production caller of `setMarkersVisible`
or writer of Sonar.visible was found. These hide/show checks are public API
controls, not an invented M-hide, Settings or photo lifecycle. `visible=false`
returns before refreshing metadata. Tests inspect recovery on the next visible
update, with no assertion requiring immediate refresh while hidden or in a
setter. Public zoom tests advance the deterministic clock to the endpoint; they
do not assess interpolation, animation or geometry.

Ordinary markers retain a record for each POI, even if sensor/view/suppression
rules make it invisible. Aria names only visible ordinary markers. Scanned
POIs are not current even if their ID still equals the objective, and keep the
scanned tick. Removing an objective does not remove legitimate contacts.

[exploreSystem](../../src/app/systems/explore.ts) separately delivers proximity-
filtered anonymous faint contacts (unscanned secrets plus available contacts).
They are not ordinary public markers. Sonar's faint drawing checks map bounds
without the ordinary sensor gate; its description appends one generic phrase
when the supplied list is nonempty and markers are enabled. It never names IDs.
The new faint case uses an in-view contact outside a tiny ordinary sensor range
and preserves that distinction.

Report-only policy observation: the generic faint phrase is based on list
presence, not admitted map bounds. Thus source permits the phrase when all
supplied faint contacts are off-map. The caller owns proximity, and the existing
wording may intentionally describe nearby curiosity. This is not established as
a regression; no new per-view announcement requirement, failing policy test or
painter correction is proposed. Ordinary POI aria admission is checked exactly.

## Two audit rounds and observed metadata

Round 1 traced the callers and mapped the guards above, then added the four
missing consumer cases. All passed on the unchanged production checkout.
Round 2 reviewed identity removal, scanned-objective compatibility, hidden-map
caching, range versus view admission, and faint policy against the real callers.
No supported stale ordinary-contact or obsolete objective description survived
the next visible update. No additional helper matrix or product change followed.

| Supported action                                                              | Public marker / canvas description evidence                                                                                   |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| POIs A and B; objective A                                                     | A current/unscanned/◇, B ordinary/·; `First contact, objective; Next contact, contact`                                        |
| Live callback now reports A scanned, while A still selected                   | A scanned/✓ and not current; `First contact, scanned; Next contact, contact`                                                  |
| Objective A → B → null                                                        | Only B current while selected; then none current. A stays scanned and both legitimate contact names remain with correct roles |
| Replace POIs with renamed B                                                   | Exactly one B marker with new name; old A identity and old B name absent; `Replacement contact, contact`                      |
| Replace scan callback, then empty POIs                                        | B becomes scanned; then markers empty and `Sonar map: no contacts in view`                                                    |
| Suppress markers; replace A with B; restore                                   | Records update while suppressed, all invisible; restored B alone is current/visible and description names B alone             |
| Pause map updates; replace B with scanned A and remove objective; show/update | Exactly A scanned/not current/visible; `Sonar map: First contact, scanned`                                                    |
| Sensor 100 → 500 m, B at 200 m                                                | B is current but initially invisible/unnamed; widening admits B and its objective description                                 |
| Public zoom 250 m → tile, sensor 500 m                                        | B remains current but is hidden/unnamed at 250; visible/named at tile. Scanned near A remains legitimate                      |
| Shrink sensor at tile                                                         | B again invisible/unnamed; only A scanned remains in description                                                              |
| Supply faint contact with ordinary range 1 m                                  | A ordinary marker invisible; no named contact; generic `faint unidentified contact` only                                      |
| Suppress/replace/restore/remove faint list                                    | Generic phrase suppressed, restored anonymously, then absent after empty list; no secret identity exposed                     |

## Fixture and simplicity

Reused the local SonarElement DOM and existing no-op 2D context via one optional
metadata mode on the existing fixture. A tiny 2×2 terrain metadata descriptor
provides dimensions; no Terrain is constructed, terrain mesh generated or
height sampled. The backing relief canvas returns no context, taking the real
renderBathymetry early return before raster work. The foreground context consumes
calls without recording paths, text, images or pixels. Sonar construction,
setters, range endpoints and update are real. Clock spies are restored per test.
This validates metadata even without a relief context, not relief drawing.

Net simpler assessment: four consumer cases in the existing capability spec;
no new shared abstraction, spec, UI, guidance, setting, layout patch, site branch,
runtime config mutation, dependency, save schema, retry, skip or timeout. All
historical assertions, tolerances, budgets and snapshots remain intact. The
rubric is applied to correct navigation/accessibility metadata and understandable
existing names; rewarding scanned discoveries retain their meaning and anonymous
curiosity remains honest. All 13 site identities, five heroes, real GMRT terrain,
scan/Journal/marine life/input and Arcade default are unchanged. Visual rubric
acceptance remains with Claude/owner.

## Validation

- `npm test -- --configLoader runner --cache=false tests/unit/uiSonar.test.ts tests/unit/sonarFlat1250.test.ts tests/unit/sonarPalette1200.test.ts`:
  **PASS, 3 files / 59 tests**, including all 47 prior uiSonar cases plus four
  new ones (51 uiSonar), three flat-guide and five palette cases. Log:
  `/tmp/3630-focused.log`.
- `npx prettier --write tests/unit/uiSonar.test.ts`: **PASS**.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`: **exit 1,
  `FAIL gates (e2e=none)`**. **PASS** config preparation, strict content,
  production build/typecheck, unit suite, attribution and repository-wide
  Prettier. Units: **192 files / 4,089 passed / four existing expected failures
  (4,093 total)**, 726.40 seconds. The four expected-failure collision cases
  remain untouched. Aggregate `/tmp/3630-gates.log`; individual logs
  `.cache/runs/20261023-235116-27-szgDG8/`.
- Python: **167 tests / five failures**, in unchanged tooling. Four
  `test_ci_build_manifest` cases fail at `spawnSync git EPERM`; the
  `test_golden_tooling` wrapper fails because the partial-set/missing-file/
  incompatible-pose comparison subtest receives unparseable child output
  (`Unexpected end of JSON input`). These match earlier recorded tooling
  failures; no unrelated repair, retry or assertion relaxation was attempted.
- Final `npx prettier --check tests/unit/uiSonar.test.ts plan/progress/3630-S-bughunt-sonar-contact-state.md`
  and `git diff --check`: **PASS**. Final ownership check found no other
  registered worktree diff on either owned path; HEAD remains pinned and only
  the two owned files are changed. No commit, merge, push, tag or hosted workflow
  was made.
- Actual local e2e mode: **none**. No browser, WebGL/GPU context, actual canvas,
  screenshot, game rendering, visual/pixel acceptance, unaided journey,
  screen-reader behavior, hosted CI or real-phone performance is claimed.
