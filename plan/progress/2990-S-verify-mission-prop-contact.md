# S-verify — Monterey mission approach with prop contact

Director Backlog item **9, S-verify / S-bughunt [Codex, standing]**; this
slice serves **S-verify**. The first required Monterey scan is approachable
on the pinned checkout with the actual runtime prop-contact stage included.
No mission-access regression is demonstrated. The original terrain-only loop
was missing that stage and is retained as historical coverage, with an additional
Monterey runtime route in the existing capability spec.

## Pin, authority and ownership

- Checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`.
- Profile merge: `00d159b00c46d215727137658fe1490502f0ae1d`.
- Actual first parent: `a35a9c2b1a56ac631147c9622a9e70a176ed7f81`.
  Second parent: `0f0607663b48405a68b89295cb22d3fdb5606a8f`.
- Range: `00d159b^1..00d159b`. Merge-to-checkout differences are only
  `plan/DIRECTOR.md` and `plan/OVERNIGHT-LOG.md`; production/data agree.
- Read Director rules/rubric, newest 2026-10-21 evening review, overnight
  runs 79–80, V-monterey-foot, F-VERIFY-1000, V-journeys,
  J-journeys-repeat, 2700 harness and Low-tier journey work, current
  2920–3000 briefs/results and available worktree progress. Review/journey
  findings do not provide a Monterey prop-contact navigation result.
- Rechecked queue/hold/launched, results/progress and every registered active
  worktree's status/diff before editing. Main/2920 were clean; 2930 has
  power/focus work, 2940 shell/touch CI specs, 2950/2960 report-only audits,
  2970 wall-life rotation coverage. 2980 owns the active scarp/collider repair;
  3000 owns eventsTerrain. No overlap with this owned spec. No changes from
  those worktrees were collected, copied, committed or imported. Their notes
  were read as evidence only; all runs use this checkout or independent git
  archives. The 2980 implementation is outside this audit.
- Retained changes: `tests/unit/heroMissionSpawn.test.ts` and this note only.
  No production, data, collider, snapshot, tool, Director, opening, geometry,
  visual or other package edits; no merge, push or tag.

## Runtime semantics actually used

`FRAME_STAGES` and the submarine/props/discovery/mission systems order the
relevant stages as `sim.vehicles` → `sim.power` → `sim.contact` → events/pose/
camera → `scan.discovery` → `play.mission`. The fixture represents an unfrozen
60 Hz frame with one fixed 1/60 s physics step at 1x. `PropContact.resolve`
runs **once after Submarine.step and before Scanner.update**, then
`Mission.update` follows the scan. Frozen/resume frames, multiple fixed steps
per displayed frame and other refresh rates are not simulated.

- Submarine physics integrates thrust, pitch/yaw, ballast, buoyancy/drag and
  limits. Its own seabed response pushes along the terrain normal, removes
  inward normal velocity and applies the existing `.35` speed penalty;
  closing normal speed contributes impact stress. Surface and pressure/crush
  checks also stay inside Submarine. No custom collision integrator is added.
- `Props.collide` applies existing placed colliders with push stiffness `1`.
  Volumes are processed before collision surfaces, with the existing floor
  handling if present. Monterey scarps export compound boxes, not triangle
  collision surfaces. Full authored procedural props and normal tier terrain
  are loaded, so the mission route does not isolate just the hero collider.
- `PropContact` uses the resulting normal to remove inward velocity with
  damping `1`; it emits `sub:collided` on initial/closing contact with the
  existing `.6 s` cooldown. It does **not** call Submarine's terrain impact
  routine, apply its speed penalty, add impact stress, breach the hull or
  initiate an emergency blow. No extra damage response is invented here.
- Resolved Arcade is `resolveEffective(defaultSettings(config), 'arcade',
null, config)`: fast profile plus shipped equipment, currents off and
  battery/oxygen disabled. Thus no power/current stage changes this route.
  The authored mission Class B is retained as requested, with radius 8 m,
  4 m seabed clearance and the existing rating/pressure rules.
- The near-site pose comes from the existing composed mission opening,
  targets from shipped Monterey POIs, and required targets from mission
  objectives rather than the POI `primary` field. Initial 3D range is 240 m.
  `missionApproachScanRadius` caps the first base radius at 90 m; resolved
  Extended equipment multiplier is 2.4, yielding **216 m** after the normal
  100 m Arcade floor. Only mission primaries are capped in the runtime run;
  optional POIs keep normal radii. Scanner's facing, depth and three-second
  beam rules remain intact. The first wall POI has no minimum-depth field.
  The existing target-priority selection is applied before the beam update.
  No reach or occlusion feature is changed or assumed.

## Routes and mesh evidence

Independent `git archive` fixtures live at `/tmp/2990-route-audit/{parent,current}`
with the same read-only dependencies. Instrumented copies of the existing
heroMissionSpawn fixture record all 7,200 frames: input-driven pre-step and
pre-contact/final positions, pre/post velocity, contact result, range, stress
and actual scan time. The only controller is the existing yaw/pitch/throttle/
ballast script, without pose/velocity injection or synthetic scan events.
Routes continue to 120 s even after the scan.

Parent and current route JSON are **exactly equal at every recorded frame**
for each tier, including spawn/target, velocities, range, contact status and
scan time. The profile merge has no observable effect on this route. The
merge's other production change is apron colour; neither causes route changes.
This is a route comparison, not a repetition of the collider matrix.

All routes have X `-3400.927430367679`, start Z `-1119.8480197301537`, face
north at yaw 0 and finish Z `-1293.2951699544008`. The target is at the same X,
Z `-1358.837559250192`.

| Tier   | Spawn Y / target Y (m)                  | First scan, parent/current (s) | Min centre seabed clearance (m) | Contact frames / correction / events | Max hull stress |
| ------ | --------------------------------------- | ------------------------------ | ------------------------------- | ------------------------------------ | --------------- |
| Low    | -724.0153360942545 / -746.0153360942545 | 6.55 / 6.55                    | 28.18                           | 0 / 0 m / 0                          | 0               |
| Medium | -723.1366901430162 / -745.1366901430162 | 6.55 / 6.55                    | 28.53                           | 0 / 0 m / 0                          | 0               |
| High   | -723.41579069787 / -745.41579069787     | 6.55 / 6.55                    | 28.69                           | 0 / 0 m / 0                          | 0               |

Relative horizontal progress is identical across tiers/revisions:

| Time (s)            | Travel north (m) | 3D target range (m) |
| ------------------- | ---------------- | ------------------- |
| 0                   | 0                | 240                 |
| 5                   | 42.9471          | 197.10              |
| 6.55, scan complete | 64.5845          | 175.50              |
| 10                  | 100.4156         | 139.55              |
| 20                  | 140.0972         | 100.26              |
| 60                  | 170.0361         | 70.82               |
| 120                 | 173.4472         | 67.51               |

No collision correction occurs along this approach. Contact resolution is
called on every runtime frame; **positive push-out, damping and collision-event
branches are not triggered by this clear route**. Their generic capability
coverage remains separate. Zero proxy hits alone would not certify clearance.

The scratch mesh check reads actual stored wall/apron vertices and indices
from all four placed banks, applies their full world matrices, and checks
every actual triangle's bounds against the entire route envelope expanded by
the 8 m hull sphere. The unexpanded envelope includes the spawn and all frame
centres, so its expansion contains every interpolated segment's swept sphere.
No triangle-bound candidate overlaps it on either revision, making a wall
crossing or hull/triangle overlap impossible within this conservative envelope.
This uses actual triangle data, not the analytic wall profile or proxy boxes.
No universal mesh/proxy equivalence assertion is introduced. Decorative
instanced growth/rocks are outside this structural wall/apron check.

Triangle counts and conservative separation measurements are recorded in
`/tmp/2990-{parent,current}-triangles.log`; final values follow below after
validation. The already-known 2950 east/west contact misses are away from this
route and were not encountered. They remain known collision defects; this
successful mission approach neither repairs nor clears them. No new occurrence
is classified as a new finding. There is no blocked straight line, stuck
controller or demonstrated mission regression here, so no alternate approach
or production correction is needed.

The original unchanged terrain-only Monterey route also passes (10.8333 s,
180 m sensors, 192.2 m final transit), but **is not used as prop-safe evidence**.
Its difference from 6.55 s comes from resolved equipment/sensors, not the
profile: the resolved route is identical parent/current. The old 1000 report
predates the later 240 m opening and cannot establish today's approach.

## Scan, retained discovery and guard

The added runtime variant retains the original authored pose/hull, steering,
7,200-step duration, ≤120 s first-scan contract, camera/seabed clearance and
no-breach assertions. All prior hero routes/assertions remain. It checks that
resolved sensors still require transit, feeds the real Scanner a real
DiscoveryStore, resolves the mission and selects its current primary target.
The resulting `scan:complete` updates `canyon-wall` through Mission's existing
listener. The second required `canyon-axis` remains incomplete; this is first
objective completion, **not full mission completion**.

The actual scan persists exactly one `monterey-canyon/monterey-canyon-wall`
record. Loading the shipped Journal content maps it to the existing
`canyon-wall` entry; a fresh DiscoveryStore over the same storage unlocks that
entry. Nothing manually calls `store.record` or injects completion. This fills
the gap between the existing heroMissionJournal mapping test (manual record)
and the old mission approach (no recorder/contact stage).

## Validation

Pending final gates. Actual e2e mode is **none**. No game rendering, browser,
screenshots, hosted CI, unaided desktop/phone journey or real-phone testing.

Simplicity: existing fixture/controller, runtime classes and resolved settings
are reused; no new runtime machinery, UI/guidance surface, setting, layout,
site branch in shared production code, dependency or budget change. All past
assertions/tolerances, fixed geometry/placement/material baselines and instance
counts remain. Real GMRT terrain, all 13 site identities, five heroes, scanning,
Journal, marine life, keyboard/pad/touch input and accessibility are untouched.
The rubric result is numerical approachability and retained discovery only;
readability, beauty, composition, visual Phone-OK, unaided usability and phone
resource/performance acceptance remain with Claude/owner. A CPU route is not
a successful unaided journey.
