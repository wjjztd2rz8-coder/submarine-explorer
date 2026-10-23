# S-verify collected fixes — Director item 9

Audit base: `a545afe` (main, 2026-10-22). Scope: the collected
2920–3120 work, regression sensitivity and interactions. No collection, push,
authored-data changes or visual acceptance.

## Plan and progress

1. Audit merge provenance and capability coverage; independently remove each
   merged fix to establish that its regression fails.
2. Fill coverage gaps, check terrain/camera and scan/mission interactions, then
   run `tools/gates.sh` and record exact results.

Round 1: read `plan/DIRECTOR.md`, repository conventions, merge diffs and prior
evidence. Main contains `49e051f` (power Home guard), `1c54264` (scanner live-list
membership), `653ffd1` (mission completion during ascent), and `c42b503` (Low
triangle contact plus first-person eye-relative aim). Scarp crest collision
and terrain seam-clearance fixes were explicitly **not collected**: Director
item 9 leaves the 2980 and 3050 worktrees for later review. They are not merged
fixes, and this audit will not import their runtime changes or rebaseline hashes.

## Round 1 evidence: regression sensitivity

Each experiment substitutes only the named source file from its fixing
commit's first parent, runs the **current** tests, then restores the exact
original bytes in `finally`. Experiments are sequential; no runtime source
diff remains. These are observed failures, not conclusions drawn from test
names or earlier progress reports.

| Fix removed                                         | Current capability exercised                                                                            | Observed result without fix                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Power Home guard (`49e051f`)                        | `overlayFocus`: deferred mission reserves, both promise boundaries, Quit/Pause/dispose, three lifetimes | **2 failed / 4 passed**: Quit still writes reserves after Home                                                                           |
| Scanner membership clearing (`1c54264`)             | `gameScanner`: real Life live-list departure/range removal, active/interrupted scans                    | **4 failed**: expected idle, received interrupted                                                                                        |
| Mission ascent banner guard (`653ffd1`)             | `missionRouter`: ascent timing matrix plus newly covered first-primary scans                            | **6 failed / 12 passed**: completion banners reopen during ascent                                                                        |
| Low near-triangle routing (`c42b503`, Terrain only) | `Terrain`: shipped Lost City, synthetic tier controls, new camera interaction                           | **4 failed / 3 passed**: shipped height error **2.878808855 m**, synthetic error **0.051373474 m**, both new camera cases lose clearance |
| Eye-relative aim (`c42b503`, CameraRig only)        | `subCameraRig` eye-origin controls plus new Low terrain/camera cases                                    | **5 failed**: three existing direction errors and two new interaction errors                                                             |

All five mutation commands exit **1**. Logs:
`/tmp/3130-without-{power,scanner,mission,terrain,camera}.log`;
machine-readable run results: `/tmp/3130-mutations.json`.
The selector-filtered tests are reported as skipped by Vitest; no skip markers
were added to repository tests. Mutation driver: `/tmp/3130-mutations.py`.

Common command form:
`npm test -- --configLoader runner --cache=false <capability paths> -t <selector>`.
Selectors respectively: `deferred mission reserves`, `drops a partial wildlife`,
`ascent`, `Terrain near ground contact`, `keeps first-person`.

## Round 2: added coverage and interaction audit

- **Low terrain + CameraRig:** added two cases to `Terrain.test.ts`, desktop
  and portrait aspects. A nonplanar synthetic bank gives a valid hull more
  than its configured support clearance while its offset first-person eye
  requires clamping. Independent CPU intersections of generated triangles
  check eye clearance at snap and next-frame updates; world direction must
  remain level north within **1e-6**. Removing Terrain alone leaves **5.75 m**
  instead of the configured **6 m** clearance. Removing CameraRig alone leaves
  direction error **0.0147558003**. Both fixes together pass. This test checks
  two different contracts against mesh geometry and a known pilot direction,
  rather than making two consumers agree on the same potentially wrong sampler.
- **Mission primary completion during ascent:** added crush/power cases to
  `missionRouter.test.ts`. Previous ascent cases had already completed the
  primary before emergency ascent. The new cases exercise the direct
  `mission:primaryComplete` subscription while ascent is active. The scan must
  count, the banner must remain closed beyond its delay, and surfacing must
  emit exactly one abort/end with **1 of 2** objectives. Both fail without the
  guard; the existing optional/all-complete timing matrix remains intact.
- **Scanner + mission timing:** membership clearing acts before scan advancement
  and silently resets removed objects; it does not emit a phantom completion.
  Present objects receive `activeGeo` before reach/facing/scanned filtering, so
  ordinary interruptions retain their established decay/resume behavior.
  MissionRouter still counts legitimate scans during ascent but suppresses
  completion actions. These responsibilities are compatible. Existing Life,
  DiscoveryStore, objective identity, abort and completion tests remain intact.
- **Power + mission lifetime:** the Home check cancels only abandoned deferred
  reserve writes. Pause stays a live dive, and runtime disposal remains guarded.
  The real shell lifecycle tests cover both readiness/microtask boundaries and
  repeated lifetimes on one bus. No extra flag or timing policy is needed.
- **Derived Low oracles:** inspected `c42b503` changes to free-dive/deep-opening
  snapshots, Challenger placement fixtures and effect budgets. They add triangle
  checks before pinning derived positions. Previous projected-resource ceilings
  remain explicit upper bounds. No historical clearance, framing or budget
  assertion is loosened by this audit; no oracle is updated here.

## Outstanding gaps: unmerged scarp and seam repairs

**Scarp crest contact is still broken on main.** Added four executable probes
to the existing `montereyScarpSupport.test.ts`, using the published local ray
coordinates from `2950-S-verify-monterey-crest.md`: Medium east, High west,
Medium west, Low west. They load all authored props and actual terrain at
the corresponding tier, use native Three.js ray/triangle intersections, and
put the shipped **8 m** hull sphere at each exposed hit. All four
`Props.collide` calls return **false**. The hit centres are below sea level and
more than **100 m above the terrain**; changing Terrain height sampling or
first-person aim cannot supply this missing prop collision.

Fixture validity is asserted in `beforeAll`, outside the expected-failure
test: missing assets, absent/wrong-facing triangles or wrong floor coordinates
therefore cause real setup failures. Only the desired `collides === true`
assertion uses **`it.fails`**, explicitly recording the unresolved defect.
An unexpected pass fails the suite and requires promotion to a normal test
when the scarp repair lands. No existing test was converted or weakened.
Temporarily running these four as ordinary assertions gives **4 failed**,
exit **1**, `/tmp/3130-without-scarp-gap.log`. This is retained evidence of
an outstanding defect, **not repaired scarp coverage or clean acceptance**.

**Terrain mixed-resolution seam clearance also remains outstanding.** Director
leaves the independent 3050 repair unmerged for a smaller implementation.
Its note documents Lost City High Float32-edge sheet selection losing
**0.161092108 m** of the configured support margin. This audit confirms the
merged Low-routing change does not alter the subsequent patch-selection
algorithm; High already used that path. CameraRig's change translates its
look target, not the sampled floor. Thus the seam issue is an inherited gap,
not a contradiction introduced by these two fixes. This audit does not claim
to have rerun the unmerged seam fixture or solved its broader boundary matrix.
No production patch, scarp hash rebaseline, or pending-worktree test/helper
was imported. Worktrees 2980 and 3050 remain untouched.

## Validation

- New/adjacent capabilities together, restored production source:
  `npm test -- --configLoader runner --cache=false tests/unit/Terrain.test.ts tests/unit/subCameraRig.test.ts tests/unit/missionRouter.test.ts tests/unit/montereyScarpSupport.test.ts`:
  **4 files, 89 passed + 4 expected failures**, exit **0**, **21.09 s**.
  Log: `/tmp/3130-new-tests.log`.
- `npm run typecheck`: **PASS**, exit **0**; `/tmp/3130-typecheck.log`.
- Required aggregate invocation:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **completed, exit 1, FAIL gates (e2e=none)**.
  Aggregate log: `/tmp/3130-gates.log`; detailed logs:
  `.cache/runs/20261022-121956-7-Lu2yC2/`.
- **PASS:** writable config preparation, strict content, production build
  (TypeScript and Vite), full units (**192 files; 3,523 passed + 4 expected
  failures = 3,527 tests; 566.01 s**), attribution and repository-wide Prettier.
  The four expected failures are exclusively the new, unresolved scarp probes;
  no other test failed. The existing non-failing build chunk-size warning remains.
- **FAIL:** Python, **162 passed / 5 failed / 167 total**, **10.422 s**.
  Four `test_ci_build_manifest` cases fail with `spawnSync git EPERM`;
  `test_golden_tooling` reports `Unexpected end of JSON input`. These reproduce
  the same five failures documented by earlier audits. Tooling is unchanged;
  the golden JSON error's underlying cause is not established here. No checks
  were bypassed, assertions relaxed, or unrelated tooling changes made.
- Final owned-file formatting and `git diff --check`: **PASS**. Final changes
  are three existing capability specs and this note; `git diff -- src` is empty.
- Browser mode is **none**, following Director's Codex lane restriction on
  game rendering. No visual, unaided-play, real-phone, GPU or screenshot
  acceptance is claimed. CPU Three.js geometry requires no renderer.

Simplicity: no production changes, new files of runtime code, UI, settings,
site branches, dependencies, package numbers in code, snapshots or assertion
relaxations. Tests extend three existing capability specs. The only new file
is this requested evidence note for Director item 9.
