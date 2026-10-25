# S-verify: Endurance opening clearance and angular size

Audited **`b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8`**, pinned before investigation.
Backlog **7, S-verify**, supplying numbers for Backlog **4, V-endurance-spawn**.
Report only; no shipped defect demonstrated and no production or guarding-test change.

## Findings

**An 85 m Endurance mission opening breaks first-target scan exclusion in Arcade
and Custom based on Arcade.** The resolved scan radius is **100 m**, leaving the
first target **15 m inside range**, versus **10 m outside** at today's 110 m.
Realistic and Custom based on Realistic remain outside range. Changing the
range alone therefore cannot preserve the rule in the default mode.

**The altitude barely changes.** On Low, the submarine is **27.381 m above its
local seabed at 110 m**, versus **27.415 m at 85 m**. Both poses have world
**Y = −2973 m**, **22 m above the first POI**. Here “110 m floor” means the
minimum mission **three-dimensional target distance**, not a seabed-altitude
floor. There is no literal universal 110 m clamp in Spawn: Endurance's shipped
`opening.mission.rangeM` is 110, and capability tests enforce the 110–300 m policy.

**The measured hull is larger than its nominal dimensions.** Authored length ×
beam × height is **44 × 7.6 × 8 m**. The placed `endurance-hull` mesh and main
prop bounds measure **47.869 × 9.759 × 11.025 m** (length Z × width X × height Y).
The local min/max are `(-4.902764, -1.5, -25.268963)` and
`(4.856023, 9.525343, 22.600039)`. These include the builder's wooden projections
and structures; the separate rigging/helm debris props are excluded.

**The default chase camera gains about 13.27% in horizontal angular span**, from
**13.332° to 15.101°** on Low. From the submarine position itself, the hull grows
from **25.257° to 32.870°**, about **30.14%**. A nominal 44 m broadside rod estimate
would give **22.620° versus 29.022°**; that approximation omits the chase arm,
modeled extensions, terrain seating and actual viewing geometry.

All **13 shipped sites × 3 tiers × 4 mode/base combinations** retain first-target
scan exclusion at their current authored ranges: **156/156 outside range**.
If an opening were placed at 85 m, **all 13 sites** would violate the rule under
the shipped Arcade scan floor. The safe bearing search actually accepts an
85 m pose in **29/39** site/tier cases; all 29 are inside the 100 m Arcade radius.
The other 10 return null, so no composed 85 m pose is claimed for those cases.
Reducing only Endurance's range leaves every other site's authored opening alone.
Lowering only a test's minimum from 110 to 85 does not move any opening.

## Endurance geometry

Mission opening with shipped hull class B, authored bearing 90°, mission yaw
offset +25°, default chase camera, zero initial pitch/speed, real GMRT terrain,
and all shipped props placed. Coordinates are world metres, yaw radians.

| Quantity                                    | Shipped 110 m | Hypothetical 85 m |
| ------------------------------------------- | ------------: | ----------------: |
| Submarine X                                 |   −321.509313 |       −347.183269 |
| Submarine Y                                 |         −2973 |             −2973 |
| Submarine Z                                 |   1074.411250 |       1074.411250 |
| Submarine yaw                               |     −1.134464 |         −1.134464 |
| Horizontal distance to first POI            |    107.777549 |         82.103593 |
| Height above first POI                      |            22 |                22 |
| Low seabed Y under submarine                |  −3000.380998 |      −3000.415028 |
| Low altitude over local seabed              |     27.380998 |         27.415028 |
| Medium altitude over local seabed           |     27.421147 |         27.326882 |
| High altitude over local seabed             |     27.429396 |         27.293697 |
| Low height above placed prop origin         |     27.558499 |         27.558499 |
| Chase camera X                              |   −239.941613 |       −265.615568 |
| Chase camera Y                              |         −2935 |             −2935 |
| Chase camera Z                              |   1112.446894 |       1112.446894 |
| Low camera distance to hull bounding centre |    202.973812 |        179.259134 |

The first POI is `endurance-hull` at `(-429.286862, -2995, 1074.411250)`.
Spawn initializes Y with `target.y + clearance`; clearance is
`hullRadius 8 + seabedClearance 4 + spawnClearanceM 10 = 22 m`.
The approach's sampled terrain does not raise that Y in either Endurance case.
Horizontal distance is reconciled to `sqrt(range² − 22²)`. The selected bearing
and yaw are unchanged. The default chase offset is `(0, 38, 90)` in local metres;
mission spawn does not apply the free-dive reframe camera offsets.

Angular spans below use actual `endurance-hull` vertex directions, with azimuth
and elevation measured in each observer's frame. They are angles, not pixels,
visible-area percentages or a rendering judgment. For a ray with camera-local
components `(x, y, zForward)`, azimuth is `atan2(x, zForward)` and elevation is
`atan2(y, hypot(x, zForward))`; span is max minus min over the vertices.
The camera frame comes from the real `CameraRig.snap` matrix, at aspect 16:9.
The submarine frame uses the selected yaw, world up and zero pitch.

| Tier / observer       | 110 m azimuth × elevation | 85 m azimuth × elevation |
| --------------------- | ------------------------: | -----------------------: |
| Low / submarine       |    25.257322° × 6.357681° |   32.869701° × 8.495520° |
| Medium / submarine    |    25.257322° × 6.358878° |   32.869701° × 8.497102° |
| High / submarine      |    25.257322° × 6.358848° |   32.869701° × 8.497726° |
| Low / chase camera    |    13.331706° × 4.294877° |   15.101227° × 5.045435° |
| Medium / chase camera |    13.330655° × 4.297902° |   15.099861° × 5.049250° |
| High / chase camera   |    13.330988° × 4.298319° |   15.100295° × 5.049808° |

For an explicitly conservative alternative, the eight main-prop bounding-box
corners subtend **14.025964° × 4.974904°** at the Low chase camera at 110 m,
versus **15.964505° × 5.907069°** at 85 m. This rectangular envelope is larger
than the actual mesh's directional envelope.
The basic nominal-length calculation is `2 * atan(44 / (2 * range))`.
Neither approximation determines occlusion, contrast or beauty.

## Scan exclusion across shipped sites

The runtime order matters:

1. `missionApproachScanRadius` caps a primary's base radius to
   `min(authoredRadius, (missionRange − 60) / 2)`.
2. `resolveEffective` applies sensor multipliers **2.4** in Arcade (Extended 2 ×
   equipment 1.2), or **1.2** in Realistic.
3. `resolveScanRadius` applies a **100 m minimum** in Arcade and **0 m** in
   Realistic. Custom uses its saved base mode. Daily modifiers do not change
   this scan-radius calculation.

Thus at an authored 85 m range, the base cap is **12.5 m**; every shipped first
primary has a base radius at least 30 m, so all resolve to **100 m Arcade** or
**15 m Realistic**. The test-era “Extended ×2 leaves 60 m” arithmetic alone is
insufficient: it omits equipment scaling and the final mode floor.

| Site                 | Current range (m) | First base radius (m) | Current Arcade radius (m) | Current Realistic radius (m) | 85 m composed pose Low/Medium/High |
| -------------------- | ----------------: | --------------------: | ------------------------: | ---------------------------: | ---------------------------------- |
| great-blue-hole      |               150 |                    36 |                       100 |                         43.2 | null/null/null                     |
| hunga-tonga-caldera  |               160 |                   250 |                       120 |                           60 | null/null/null                     |
| blake-plateau-corals |               160 |                   250 |                       120 |                           60 | yes/yes/yes                        |
| lost-city            |               220 |                   150 |                       192 |                           96 | null/null/null                     |
| kamaehuakanaloa      |               200 |                   120 |                       168 |                           84 | yes/yes/yes                        |
| axial-seamount-ashes |               110 |                    60 |                       100 |                           30 | yes/yes/yes                        |
| hudson-canyon        |               112 |                   180 |                       100 |                         31.2 | yes/yes/yes                        |
| monterey-canyon      |               240 |                   200 |                       216 |                          108 | null/yes/yes                       |
| endurance            |               110 |                    60 |                       100 |                           30 | yes/yes/yes                        |
| titanic              |               140 |                    30 |                       100 |                           36 | yes/yes/yes                        |
| bismarck             |               110 |                   100 |                       100 |                           30 | yes/yes/yes                        |
| beebe-vent-field     |               220 |                   150 |                       192 |                           96 | yes/yes/yes                        |
| challenger-deep      |               140 |                   120 |                       100 |                           48 | yes/yes/yes                        |

If instead a pose were moved to 85 m while preserving its shipped mission cap,
the Arcade result is still inside range for every site. Realistic would also
be inside range at Lost City (96 m radius), Beebe (96 m), and Monterey (108 m).
That is a different counterfactual from changing the range data and letting
the production cap follow it, as this probe does.

“Null” means no candidate passed the existing composition search, which guards
terrain transit, other primaries, tile bounds, hull and chase-arm collisions.
The diagnostic did not attribute each rejection to a particular guard or
exercise fallback placement for these counterfactuals.

At Endurance, the real `Scanner` independently reports `nearestInRange=false`
at 110 m and `true` at 85 m in Arcade/Arcade-based Custom, across all three
tiers. Realistic variants report false in both cases. The scanner was aimed
directly at the contact to isolate range eligibility. This does not claim an
automatic completed scan at the authored yaw, nor bypass the held scan control,
beam direction, dwell time, minimum depth or persistence.

With unchanged scanning rules, a first-target distance must be **strictly
greater than 100 m** to remain outside the Arcade floor (`distance <= radius`
is eligible). A closer 85 m proposal therefore requires a separate decision
about scan behavior; no policy or guard is changed by this report.

## Audit method and sources

Read `CONTRIBUTING-AGENTS.md`, `plan/DIRECTOR.md` (Backlog 4 and 7, simplicity and
rubric), and the last 160 lines of `plan/OVERNIGHT-LOG.md` before investigation.
Also read the prior Endurance and start-clearance notes.

The disposable Node/Vitest probe is
`/tmp/4130-endurance-clearance/probe.test.ts`; full precision records are
`/tmp/4130-endurance-clearance/results.json`. It enumerates the independently
shipped `data/landmarks/index.json` (13 sites), builds `Terrain` from each actual
Float32 `heightmap.bin` and metadata, places every prop with `Props.placeAll`,
and uses `parseMission` plus `parsePois`/`placePois` to obtain the first required
primary. Local GLBs are parsed with the production GLTFLoader; only image
loading is replaced with empty textures, following existing missionComposition
headless practice. No prop is filtered out: **159 placements** across 39
site/tier builds (**153 procedural, 6 GLB**, **0 failed, 0 skipped**).

For each site/tier the probe calls the production `composedMissionSpawn` first
with the shipped range, then with 85 m. Only the disposable process's derived
`MISSION_APPROACH_M[site]` entry is temporarily set to 85 and restored in a
`finally` block; this changes both the composition range and its associated
scan cap consistently. No file or authored manifest is mutated. Four resolved
scan configurations are measured for each record: Arcade, Realistic, Custom
based on Arcade and Custom based on Realistic. Endurance additionally records
the actual hull vertices, main prop bounds and real chase camera pose.

Primary implementation references:

- `src/game/Spawn.ts`: range lookup, cap, candidate geometry and clearance.
- `src/game/DeepOpeningSpawn.ts`: mission wrapper returns the base pose;
  only free dives receive the subject reframe.
- `src/app/systems/mission.ts` and `src/app/systems/modes.ts`: cap, scaling and
  floor application order.
- `src/game/EffectiveSettings.ts`, `src/game/Scanner.ts`,
  `src/core/config/gameplay.ts`, `src/core/config/progress.ts`: resolved radii
  and scanner range predicate.
- `src/world/props/wrecks/endurance.ts`, `src/world/props/wrecks/assemble.ts`,
  `src/world/Props.ts`: actual hull geometry, bounds and terrain seating.
- `data/landmarks/endurance/{site,props,pois,mission}.json`: shipped inputs.

Probe SHA-256:
`fb6f3ece42e65b1d180f22eb6d21d1043f2868639db4edce17861d50ebf2c167`.
Results SHA-256:
`6873dde45eabafecc8c3a758b7d049f6bd66699999bdd9f66bf4cae6f98eb292`.
These temporary files and logs are local audit artifacts, not shipped files.

## Commands and actual outcomes

All commands ran from the pinned worktree. Logs are under
`/tmp/4130-endurance-clearance/`.

```bash
git rev-parse HEAD
git status --short
node node_modules/vitest/vitest.mjs run --config /tmp/4130-endurance-clearance/vitest.config.mjs --configLoader runner --cache=false --reporter verbose > /tmp/4130-endurance-clearance/probe.log 2>&1
```

Initial status was clean. The disposable configuration sets Node environment,
one worker, 120 s test timeout and includes only the temporary probe.
Probe **exit 0: 1 file / 1 diagnostic passed**, duration **69.93 s**.
Its actual output: **78 records**, **0 shipped in-range comparisons**,
**29 accepted 85 m poses**, and the **10 null** cases listed above.
The 78 records cover 39 shipped plus 39 counterfactual combinations, with
four radius evaluations each. All 39 shipped poses exist. Endurance's 24
Scanner range checks agree with the independently calculated distance/radius
predicate. A redundant threads-pool probe was started and cancelled (exit 130)
after confirming the original probe had already completed successfully.

```bash
npm run build -- --outDir /tmp/4130-endurance-clearance/dist > /tmp/4130-endurance-clearance/build.log 2>&1
npm run build -- --configLoader runner --outDir /tmp/4130-endurance-clearance/dist > /tmp/4130-endurance-clearance/build-runner.log 2>&1
```

Both **exit 1**, after TypeScript checking succeeded. The default config loader
cannot write the read-only shared `node_modules/.vite-temp` (EROFS). The runner
loader transforms 301 modules but fails in the PWA closeBundle hook with
`Vite module runner has been closed`. No repository fix was attempted.
A temporary config copy changes only import paths to preserve the original
plugins while permitting the standard bundle loader to write under `/tmp`:

```bash
python3 - <<'PY'
from pathlib import Path
root = Path.cwd()
s = (root/'vite.config.ts').read_text()
s = s.replace("from 'vite'", "from '"+str(root/'node_modules/vite/dist/node/index.js')+"'")
s = s.replace("from './tools/pwaPlugin.js'", "from '"+str(root/'tools/pwaPlugin.ts')+"'")
s = s.replace("from './tools/golden-build.mjs'", "from '"+str(root/'tools/golden-build.mjs')+"'")
Path('/tmp/4130-vite.config.ts').write_text(s)
PY
npm run build -- --config /tmp/4130-vite.config.ts --outDir /tmp/4130-endurance-clearance/dist > /tmp/4130-endurance-clearance/build-temp-config.log 2>&1
```

Temporary-config build **exit 0**, **301 modules**, Vite **635 ms**, TypeScript
zero errors; service worker stamped with **14 shell files**. The usual >500 kB
chunk warning remains. The config copy is outside the repository; source,
plugins and build settings are unchanged apart from import resolution paths.

```bash
npm test -- --configLoader runner --cache=false > /tmp/4130-endurance-clearance/unit.log 2>&1
npm test -- --configLoader runner --cache=false --pool=threads > /tmp/4130-endurance-clearance/unit-threads.log 2>&1
node node_modules/vitest/vitest.mjs run --configLoader runner --cache=false tests/unit/missionApproach.test.ts tests/unit/missionComposition.test.ts tests/unit/deepOpening.test.ts tests/unit/gameSpawn.test.ts > /tmp/4130-endurance-clearance/capabilities.log 2>&1
PYTHONDONTWRITEBYTECODE=1 npm run test:py > /tmp/4130-endurance-clearance/python.log 2>&1
```

The initial full unit run was interrupted (exit 130) while checking probe status;
it supplied no completed test summary. The threads retry and initial two-worker capability run were also interrupted
(exit 130) after emitting only their Vitest startup lines; neither supplied a
completed test summary. No pass is inferred for these runs. A one-worker
capability retry likewise emitted only the startup line and was interrupted
(exit 130), with no completed summary. Focused completed checks are recorded
below. These interrupted runs are not a green full unit-suite claim.
Python **exit 1: 167 tests, 5 failures, 13.321 s**. Four CI build-manifest cases
fail at `spawnSync git EPERM`; `test_golden_tooling` fails because its nested
comparison test receives truncated/empty JSON (`Unexpected end of JSON input`).
These are observed validation limitations outside the spawn calculation; no
assertions or tooling are changed to conceal them. No visual output was
inspected or generated by this investigation; Python's tooling tests exercise
fixtures and mocked commands. Browser/e2e execution is excluded by the task.

## Simplicity, rubric and limits

The report adds no settings, guidance, layout patches, site branches, runtime
machinery or permanent tests. No guarding assertion is loosened. No change to
`tools/` or `plan/DIRECTOR.md`, merge, push, tag or external message occurs.
The current code meets the measured first-target exclusion requirement; the
85 m violation is a proposed configuration's consequence, not a shipped bug.

All work is numeric/headless: mesh construction and camera matrices only;
no browser, renderer, WebGL context, screenshot, art/CSS/layout work or visual
acceptance. The rubric's beauty, readability, rewardingness and phone-OK
judgments remain untested. This audit informs the owner choice without
claiming that a 13% angular increase fixes the composition.

Angles measure the hull mesh's directional envelope; they do not subtract
self-occlusion, submarine occlusion or terrain occlusion, and do not include
all decorative fittings or the separate debris field. Camera angles describe
the default initial chase pose only; first-person/free-look, phone-specific
projection and subsequent motion are outside scope. The nominal rod estimate
is explicitly an approximation. No photographic or archaeological measurement
is inferred from procedural geometry.

The counterfactual varies the authored mission range and the coupled cap only.
It preserves altitude policy, yaw, camera, props, terrain and all safety checks.
Null counterfactuals are not successful 85 m openings; their fallback mission
poses and complete routes are not audited. Only first-primary range exclusion
is tabulated; no new exhaustive reachability, every-primary, scan completion,
Journal persistence or full application lifecycle claim is made.

## Focused verification and final file checks

```bash
node node_modules/vitest/vitest.mjs run --configLoader runner --cache=false --maxWorkers=1 tests/unit/missionApproach.test.ts tests/unit/missionComposition.test.ts tests/unit/deepOpening.test.ts tests/unit/gameSpawn.test.ts > /tmp/4130-endurance-clearance/capabilities-single.log 2>&1
node node_modules/vitest/vitest.mjs run --configLoader runner --cache=false tests/unit/gameSpawn.test.ts --maxWorkers=1 --reporter verbose > /tmp/4130-endurance-clearance/gameSpawn.log 2>&1
node node_modules/vitest/vitest.mjs run --configLoader runner --cache=false --maxWorkers=1 tests/unit/missionApproach.test.ts -t endurance > /tmp/4130-endurance-clearance/endurance-capability.log 2>&1
```

The first command is the interrupted one-worker capability run described above.
The isolated spawn capability **exit 0: 1 file / 12 tests passed, 401 ms**.
The unchanged Endurance mission-approach capability **exit 0: 1 file / 3 tests
passed, 43 filtered out, 2.57 s**, covering Low/Medium/High with the existing
110 m range policy, resolved scan exclusion, safe hull, transit and camera
navigation assertions intact. Name filtering does not add skips or change
assertions. Together these are **15 completed existing tests**, plus the
successful 78-record disposable diagnostic. No green claim is made for the
interrupted wider runs or the failing Python suite.

```bash
node_modules/.bin/prettier --write plan/progress/4130-S-verify-endurance-clearance.md
node_modules/.bin/prettier --check plan/progress/4130-S-verify-endurance-clearance.md
git diff --check
git diff --no-index --check /dev/null plan/progress/4130-S-verify-endurance-clearance.md
git rev-parse HEAD
git status --short
```

Owned-note Prettier write/check and `git diff --check`: **exit 0**.
The new-file no-index check: **exit 1 with no whitespace diagnostics**, because
it compares a newly added file against `/dev/null`. Final HEAD remains the
pinned audited SHA. Final status contains only
`?? plan/progress/4130-S-verify-endurance-clearance.md`.
