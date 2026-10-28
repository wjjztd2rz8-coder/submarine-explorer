# S-verify — merged Kama and Hunga openings

Audited `8e74fda89c4b6d321b8f2960c8f925ed1bceb739`, 2026-10-28.
Only this report is a tracked change. No product data, runtime code, permanent
tests or screenshots were changed. Hull/frustum evidence is numerical, with
no renderer, rasterizer, browser or GPU involved in the calculation.

**Result:** the opening changes are data-driven, introduce no site branches,
and retain capability-based tests and Low quality settings. The original
Kama `35 / +100` camera arm excludes the entire hull on desktop and landscape
phone. The later merged `60 / −20` arm fixes that: the complete fitted hull
is inside all six frustum planes at all three tested layouts and tiers.
Retain that offset. Unit verification passes; targeted browser verification
is **blocked by sandbox permissions**, not established as passing.

## Merge and content audit

`2bb69ea3` implements both V-kama-opening and V-hunga-opening, merged in
`20bcf52b`. Its only runtime changes are the optional mission camera fields
in `src/core/SiteManifest.ts` and their propagation in
`src/game/Spawn.ts::composedMissionSpawn`. The schema reuses `cameraFields`;
the spawn copies `chaseRadius`, `chaseOffsetX` and `chaseOffsetY` from
`siteManifest(siteId).opening.mission`. The existing mission start consumer in
`src/app/systems/mission.ts` calls `rig.setChaseRadiusDefault(...)` before
`rig.snap(...)`. Neither it nor `DeepOpeningSpawn` needed a site-specific path.
The merge diff adds no site-ID conditional or config mutation; a search for
either site ID in these four shared files finds no matches at the audited head.

Read both sites' `mission.json`, `site.json`, `pois.json` and `props.json`:

| Mission data                                   | Kama             | Hunga                        |
| ---------------------------------------------- | ---------------- | ---------------------------- |
| First primary POI                              | `kh-hiolo-north` | `hunga-tonga-rim-wall`       |
| Second primary POI                             | `kh-hiolo-south` | `hunga-tonga-flank-transect` |
| Optional POI                                   | `kh-south-rift`  | `hunga-tonga-caldera-floor`  |
| Authored mission hull / briefing depth         | B / 1,300 m      | B / 469 m                    |
| Runtime fitted mission hull, by `requiredHull` | B                | A                            |
| Mission opening range, before → merged         | 130 → 110 m      | 160 → 120 m                  |
| Original merged camera radius / added y offset | 35 m / +100 m    | Default / 0 m                |
| Current camera radius / added y offset         | 60 m / −20 m     | Default / 0 m                |

The `mission.json` files themselves are unchanged from before the opening
merge through the audited head. Ranges and arms belong to `site.json`, not
the surface-start `mission.json.spawn`. The mission wrapper does not apply
the independent free-dive `opening.reframe` settings.

`89875fb2` subsequently merged V-kama-hull-frame: only Kama's mission arm
changed to `60 / −20`. The intermediate branch commit `85668f15` also touched
the free-dive reframe offset, but the **final merge** restored it to −10;
that accidental edit is absent at HEAD. Hunga's later V-hunga-bright lamp
multipliers are separate from the two opening changes.

## Tests and Low tier

The merge extended existing `missionApproach.test.ts` and
`missionComposition.test.ts`; it added no package-specific spec. They
parameterize the shared approach, collision/clearance, scan exclusion and
composition capabilities by catalog site and tier. Authored range expectations
now match 110/120 m. The 110 m lower bound became `110 - 0.01`, consistent
with the spawn reconciler's tolerance; Kama evaluates to
`109.99999999999999` m. The arm-forwarding assertions run across sites rather
than branching on Kama.

**Coverage limit:** the new assertions check radius and y offset, but not x
offset. The ordinary camera checks in `missionApproach` create a default rig
without applying the returned mission arm. The Kama subject-sightline block
in `missionComposition` does likewise, and its hull check measures bed
clearance, not full-hull frustum containment. Thus 574 passing tests alone
do not guard against the original hull framing defect. The temporary numeric
audit below explicitly applies the returned/authored arm and checks actual
hull geometry. No permanent tests were changed in this verification task.

**Low is unchanged in quality policy, not in opening composition.** The
opening merge changes neither quality settings, renderer/shader paths,
vehicle/prop geometry nor tier budgets. Both sites' entire `atmosphere`
sections, free-dive settings and reframe settings are identical across that
merge. The current Low atmosphere rows also still match the pre-merge rows:
Kama `(depthM −200, color 10135213, intensity 18)`; Hunga
`(−200, 7311262, 9)`. `src/core/config/quality.ts` is byte-identical from
before the merge through HEAD (SHA-256
`3783547b7924524b29d44c021c92eb6cc625eecbd94aa84043fe4d4b20dd296b`).
The intended opening changes apply on Low too. Furthermore, the separate later
Hunga brightness change now supplies lamp multipliers
`3 / 1.2 / 3.5 / 1.4` (intensity/distance/fill intensity/fill distance),
including on Low; whole-scene appearance at HEAD cannot be called unchanged
from the pre-opening baseline.

## Kama 110 m pose: numeric hull/frustum calculation

Loaded shipped tile metadata and float heightmap, constructed runtime
`Terrain`, `Props`, placed POIs, and called the actual mission spawn with
default Arcade effective settings and the fitted B hull. Used a length-26
`SubMesh`, chase view, stationary pitch/roll zero and the runtime `CameraRig`.
Traversed visible hull mesh vertices with object/instance transforms; excluded
zero-opacity meshes and non-mesh effects. This tests a conservative geometry
envelope, not visible pixel area or HUD overlap. The historical arm is evaluated
on this same audited pose and geometry, not a separate historical checkout.

Low submarine origin is **(−130.719294, −1282.984319, 580.627053) m**;
heading **355°**. The first POI is
**(−140.112727, −1304.984319, 473.259630) m**. Their 3D separation is
**110 m**, with **107.777549 m** horizontal separation and **22 m** elevation
difference. The Arcade cap is
`max(min(authoredRadius, (110−60)/2) × 2.4, 100) = 100 m`,
so the opening retains **10 m** of required approach. Hunga similarly has
120 m separation and a 100 m effective radius, leaving **20 m**.

The configured eye vector is `(0,38,90)`; the site y value is **added before
normalizing to the chase radius**. The aim remains `(0,15,−80)` relative to
the submarine. Consequently:

| Arm                          | Effective local eye (right/up/back), m | Low world eye, m                        |
| ---------------------------- | -------------------------------------- | --------------------------------------- |
| Original `35 / +100`         | `(0,29.316371,19.119372)`              | `(−129.052931,−1253.667948,599.673670)` |
| Current/suggested `60 / −20` | `(0,11.766968,58.834841)`              | `(−125.591500,−1271.217351,639.238009)` |

For each world hull vertex, computed
`clip = projectionMatrix × matrixWorldInverse × worldVertex`, then
`NDC = clip.xyz / clip.w`. Frustum containment requires each coordinate
within `[−1,+1]`. Landscape uses 62° vertical FOV; portrait expands it to
104.877° using `tan(vFov/2) = tan(31°) / min(1, aspect)`.
The landscape-phone result includes the runtime 0.14-width view shift.

| Low layout              | Original NDC y interval | Original containment    | Current NDC x interval | Current NDC y interval |
| ----------------------- | ----------------------- | ----------------------- | ---------------------- | ---------------------- |
| Desktop 1600×900        | −3.928266 … −1.076529   | Entire hull below frame | −0.104936 … +0.104936  | −0.650228 … −0.104601  |
| Portrait 390×844        | −1.815194 … −0.497448   | Partly clipped below    | −0.186552 … +0.186552  | −0.300461 … −0.048335  |
| Landscape phone 844×390 | −3.928266 … −1.076529   | Entire hull below frame | −0.366203 … −0.193797  | −0.650228 … −0.104601  |

Current Low NDC depth is **0.978751 … 0.986305**. All **47,472/47,472**
sampled geometry vertices are inside all six planes in each layout. Since
the frustum is convex, this also contains their triangles. The original
desktop/landscape has **0/47,472** vertices in frame and every vertex outside
the bottom plane, proving that no hull triangle intersects the frustum.
Portrait has **33,588/47,472** vertices inside; this fraction is not a pixel
coverage percentage.

On Medium and High, the current arm also contains **92,312/92,312** vertices
at each layout. Desktop/landscape y bounds remain the same; portrait remains
inside. Across all nine current Kama cases, minimum hull-to-frustum-plane
distance is **8.756741 m**, minimum hull-to-bed gap is **45.080771 m**,
minimum camera-to-bed gap is **91.029473 m**, and all 24 radius-6 m
prop-collision samples along each camera arm are clear. This verifies the
stationary pose, not a piloted route or arbitrary zoom/motion.

**Suggested pose offset:** retain `opening.mission.chaseRadius: 60` and
`chaseOffsetY: -20`, with x offset 0 and range 110 m. Relative to the original
arm, the effective eye moves **17.549403 m down and 39.715468 m back** in
the submarine's frame. This correction is already merged; no additional
product edit is proposed. On Low desktop the resulting hull envelope is
approximately x **716.052–883.948**, y **497.070–742.603 px**, leaving
**157.397 px** below the hull. That is geometric screen clearance, not a
claim about HUD clearance, occlusion, lighting or visual quality.

## Validation and reproducibility

- `npx vitest run tests/unit/missionApproach.test.ts tests/unit/missionComposition.test.ts tests/unit/siteManifest.test.ts --configLoader runner`:
  **3 files, 574 tests passed**, 74.57 s. A second run with `--cache=false`
  also passed all 574 tests, 82.12 s; its log is
  `.cache/S-verify-kama-hunga-unit.log`.
- `npx vitest run --config .cache/S-verify-kama-hunga.config.ts --configLoader runner --cache=false`:
  **1 audit passed**, 4.83 s; checks both sites, all tiers, all three layouts,
  and Kama's historical/current arms (27 projections). Hunga's fitted A hull
  also fits all nine current frusta. Scratch source, config, results and log
  are retained under ignored `.cache/S-verify-kama-hunga*`.
- Searched `tests/e2e` for the changed mission/approach/camera capabilities
  and read `content-missions.spec.ts`, `mission.spec.ts` and relevant
  `opening-framing.spec.ts` blocks. The latter's mission-preview matrix
  currently omits Kama and Hunga; its catalog cases for them exercise free
  dives rather than the changed mission arm.
- Attempted the required targeted browser commands below, with
  `CI=1 GATES_CONFIG_MODE=writable PW_PORT=4867 PW_OUTDIR=dist-s-verify-kama-hunga`:

  ```sh
  npx playwright test tests/e2e/content-missions.spec.ts \
    -g '(kamaehuakanaloa|hunga-tonga-caldera): briefing to primary scans to debrief' \
    --output=test-results-s-verify-missions
  npx playwright test tests/e2e/mission.spec.ts \
    -g 'approaching a scan target does not move the chase camera' \
    --output=test-results-s-verify-camera
  ```

  Both exit before tests start: `Process from config.webServer was not able
to start. Exit code: 1`. `DEBUG=pw:webserver` additionally confirms
  `connect EPERM ::1:4867` and `connect EPERM 127.0.0.1:4867`.
  `--list` successfully selects exactly the two intended mission cases.
  These browser checks need rerunning where localhost/server access is allowed;
  no E2E pass or screenshot acceptance is claimed here.

- TypeScript checking completed successfully in the build attempt. Default
  Vite config loading hit the read-only dependency tree; runner loading hit
  the existing late PWA-import issue. The repository's documented workaround,
  `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-s-verify-kama-hunga tools/gates.sh --phase build`,
  successfully bundled/copied the app and stamped its service worker. The
  build gate nevertheless **failed** afterward when the CI manifest writer's
  `spawnSync git` returned `EPERM`; this is not a green complete build gate.

Current site-data SHA-256 values: Kama
`69bdd29a59d64d0270d3cc3e14b7637c90095a750ddcd8d60e9126c4fe3ce1d0`;
Hunga `a7253bed27c433aa32614cda30297d51187bb841fbc95a0bbfb4989a202e6447`.

Report-only Prettier and `git diff --check` passed. Final `git status --short`
contains only this new report; all audit/build/test artifacts are ignored.
