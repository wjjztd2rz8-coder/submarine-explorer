# 3430 — S-bughunt: reward and next-objective directions

Items: **S-verify / S-bughunt** and **V-journeys-current**, DIRECTOR Backlog 9
and 11. Starting HEAD: `e4ce192496195c06acfb655ac3d05dd559391691` (clean).

## Plan

1. Trace scanner completion, mission advancement, reward composition and waypoint
   selection using the current checkout; use headless unit fixtures only.
2. Extend the existing guidance capability spec with every shipped mission's
   first and second scan objectives, respecting primary-before-optional order.
   Check completion, the next frame, movement during the reward and expiry on
   keyboard and touch, for new and previously logged discoveries.
3. Correct only a reproduced behavioral defect; preserve one guidance slot,
   data-driven site behavior and existing assertions.
4. Run focused capability checks and `GATES_CONFIG_MODE=writable bash
tools/gates.sh --no-e2e`; record exact results and limitations here and in the
   final report. Browsers are excluded by the task environment.

## Progress

- Read CONTRIBUTING-AGENTS, DIRECTOR simplicity rules/backlog, the existing
  guidance/waypoint capability specs, and production scanner, Discovery, mission
  and waypoint wiring.
- The current reward already refreshes its touch-only objective cue each frame
  and rejects the just-completed objective. Discovery renders the reward before
  the waypoint stage selects the next objective, so the completion frame and the
  following frame need separate assertions.
- Added 104 data-driven cases to `tests/unit/guidance.test.ts`: 13 manifest
  missions × Arcade/Realistic × keyboard/touch × first-time/repeat discoveries.
  Each completes the first two runtime objectives (208 completions), with
  primary-before-optional selection. In particular, Lost City's second runtime
  objective is IMAX Tower, not the earlier optional Beehive data row.
- Focused capability checks pass: **4 files / 288 tests**, including guidance,
  waypoint UI, mission/waypoint ordering and overlay focus. No production defect
  reproduced; production code is unchanged.
- Required headless gates are running. Config, content and production build pass.
  Python reports five tooling failures matching the existing mission-catalog
  audit: four CI build-manifest checks report `spawnSync git EPERM`, and the
  golden-tooling check reports `Unexpected end of JSON input`.

## Behavioral findings

History confirms the completion guard is already on this checkout:
`38c62967135c4c3fc236a5122d9f4f0942709240` (2026-10-23,
`fix(V-journeys-current): objective wins the next hold over a partial contact;
touch turn cue`) added `objectiveId === lastCompleteId` rejection and retained
turn text on remote touch guidance. This audit verifies the resulting behavior;
it does not reapply that fix or collect an unmerged journey-capture extension.

The reward card **is the guidance slot**, rather than another competing card.
`ScanOverlay.completeMessage` retains the completed contact as its title. On
keyboard it offers the Journal binding (or “LOGGED · JOURNAL” on repeat scans),
without a directional instruction. On touch it can carry the outstanding
objective's name and direction, computed by `objectiveCue` from `Scanner.view`.

Production frame ordering is important:

1. `discoverySystem` selects the current `nextScanObjective` before scanning.
2. `Scanner.complete` marks the POI scanned, records `lastCompleteId` and emits
   `scan:complete` synchronously. Discovery offers the reward; Mission marks the
   objective complete on the same event.
3. Still within Discovery's update, `ScanOverlay.update` sees the completion
   frame's old geometry. `objectiveCue` rejects `lastCompleteId`, so the rendered
   reward has a Journal detail rather than a direction back to that contact.
4. The later waypoint stage selects the newly outstanding objective. The next
   frame updates its scanner geometry before refreshing the reward detail. The
   reward then follows that objective's current bearing, or drops the cue when
   it is ready to scan. Refreshing detail does not renew the reward's lifetime.

The fixture uses real Mission, Scanner, ScanOverlay, GuidanceSlot, Waypoints,
Discovery's update method and the discovery/waypoint frame hooks through
SystemRunner. It reproduces Discovery-before-Mission completion listener order.
The completion listener only supplies the authored POI name to `showComplete`;
the full Journal constructor, storage and unlock plumbing are outside this
fixture. Existing discovery reward tests cover that separate mapping.

Assertions cover the completed contact identity, completion-frame Journal detail,
next waypoint identity and range/depth, current reward bearing, opposite turns,
movement while the reward persists, scan-ready cue withdrawal, expiry, and exactly
one guidance slot. Realistic respects its disabled visual-waypoint preference;
the selected objective is still checked. Authored mission/POI coordinates, scan
times, minimum depths, sensor scaling, primary approach caps and mode radius
floors are loaded/resolved rather than replaced with fabricated mission IDs.

The seabed sampler deliberately returns the tile's `min_m` for this text/state
fixture. Snapped POI elevations therefore are **controlled fixture geometry**,
not a claim about the real terrain surface. Test poses directly exercise the
beam and reward transitions; they do not establish transit times, hull clearance,
playability or camera composition. Existing synthetic guidance cases also guard
vertical corrections, disappearing objectives, mode/binding changes, warnings,
interrupted scans and modal suppression.

All eight mode/input/history combinations pass for each row below. “Next” is
the selected optional waypoint after the second primary; it is not scanned by
this fixture.

| Mission              | First scan                                  | Second scan                               | Next                                  |
| -------------------- | ------------------------------------------- | ----------------------------------------- | ------------------------------------- |
| great-blue-hole      | Stalactite gallery                          | Eastern stalactite gallery                | Eastern atoll drop-off                |
| hunga-tonga-caldera  | Volcanic rim slope (pre-2022 survey)        | Volcanic flank transect (pre-2022 survey) | Caldera floor (pre-2022 survey)       |
| blake-plateau-corals | Dense coral mound cluster                   | Desmophyllum pertusum thicket             | A neighbouring mound                  |
| lost-city            | Poseidon carbonate tower                    | IMAX Tower                                | Beehive chimney                       |
| kamaehuakanaloa      | Hiolo North vent site                       | Hiolo South vent site                     | South rift zone                       |
| axial-seamount-ashes | Mushroom (ASHES vent field)                 | Inferno (ASHES vent field)                | Hell, Phoenix and Virgin chimneys     |
| hudson-canyon        | Coral-habitat ledge                         | Canyon flank transect                     | North wall of the upper canyon        |
| monterey-canyon      | North canyon wall                           | Canyon floor, 1,000 m                     | Upper canyon channel                  |
| endurance            | Endurance: main hull                        | Stern: "ENDURANCE" and the pole star      | The ship's wheel                      |
| titanic              | Bow section                                 | Stern section                             | Boiler field                          |
| bismarck             | Bismarck: main hull                         | Detached main gun turrets                 | Battle damage: shell and torpedo hits |
| beebe-vent-field     | Beebe-125 black smokers                     | Rimicaris hybisae swarm                   | Western sulfide mound                 |
| challenger-deep      | "Leggo" lander site — amphipod bait station | Eastern Pool floor transect               | North inner wall                      |

## Simplicity and scope

Clean behavioral audit: no runtime change is justified. The additions
extend the existing guidance capability spec and its small fake DOM, without a
browser, dependency, new guidance surface, setting, site-specific branch or
package number in code. Historical assertions and expected failures are intact.
No visual, phone-layout, screenshot, hosted-CI or first-five-minute journey
acceptance is claimed. DIRECTOR and authored content are unchanged.

## Validation

- `./node_modules/.bin/vitest run tests/unit/guidance.test.ts
tests/unit/uiWaypoints.test.ts tests/unit/missionApproachWaypoint.test.ts
tests/unit/overlayFocus.test.ts --configLoader runner --cache=false` — **PASS,
  exit 0, 4 files / 288 tests**, 3.86 s; `/tmp/3430-focused.log`.
- `./node_modules/.bin/tsc --noEmit` — **PASS, exit 0**;
  `/tmp/3430-typecheck.log`.
- Owned-file Prettier and `git diff --check` — **PASS**.
- Initial fixture runs exposed only harness assumptions: missing fake-DOM
  `querySelectorAll`, uninitialized per-instance waypoint visibility when using
  frame hooks without system constructors, and an assumed 60 m scan-ready pose
  that exceeded some Realistic radii. The fixture now initializes its view and
  uses a 5 m ready pose. No production assertion was weakened or runtime issue
  inferred from those harness failures.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` — **running**;
  `/tmp/3430-gates.log`, `.cache/runs/20261023-103434-3-NIjx9J/`.
