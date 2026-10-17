# S-bughunt-18

Scope: `plan/DIRECTOR.md` Backlog 8, audited at `c5e983e`. Read
`CONTRIBUTING-AGENTS.md`, the Director simplicity rules, and previous numerical
reviews. Examined Titanic biome ripples/scatter, Blue Hole roof notches and the
112–168 m terrain apron, Beebe torn rims/lamp data, and Lost City rolled rims.
The unmerged Blue Hole hood branch is outside this checkout and this audit.

## Result and regression coverage

No newly introduced defect requiring a production change was established.
No geometry, collision approximation, budget limit, snapshot, site identifier,
save shape/key, or tuning value was changed. Extended existing capability specs:

- `blueHoleWall.test.ts`: compare physical terrain sampling with downward rays
  at radii 160, 168 and 172 m on both gallery bearings, on all three tiers.
  Sweep underwater chase poses over both gallery sectors and apron transitions;
  verify finite camera state, eye clearance, underwater ceiling, and unobstructed
  terrain sightlines with independent dense arm probes. Exclude reef positions
  too shallow to fit the submarine underwater.
- `sonarScour1320.test.ts`: run actual sonar rendering at both gallery bearings,
  centred on radius 168 m, on Low/High. Assert samples on both sides of the
  widened apron boundary are finite, relief/contour metrics are valid and
  contour/label coordinates remain finite.
- `journalData.test.ts`: four real-content cases load the shipped Titanic,
  Blue Hole, Beebe and Lost City documents through `loadJournalSites`, complete
  an authored POI scan with `Scanner`, reload the saved discovery store, and
  verify target/site unlock, unscanned target and other-site isolation, first
  timestamp/count, and unchanged saved bytes after reads. Blue Hole's first two
  POIs intentionally share an entry; isolation checks a different entry.

No package-named specs, modules, dependencies, UI or settings were added. All
new coverage is in existing capability specs; no old assertion was loosened.

## Geometry and Low budgets

- Titanic ripples perturb fragment normals in continuous world coordinates;
  they do not displace vertices or change physical terrain heights. Scatter
  remains seeded, cell-capped and anchored to `Terrain.sampleHeight`, with
  existing finite-buffer/matrix and grounding coverage. Existing Low fixture:
  9 cells, 190 stones, 68 rubble, 13 mounds; 36,860 triangles / 3 mesh draws.
- Blue Hole finite/deterministic buffer, bounds, notch thickness, grounding,
  all-tier triangle contact and opening/close-camera contracts were reviewed.
  Existing wall/apron budgets are unchanged: west Low 11,392 triangles / 3
  draws; east Low 9,656 / 3. The terrain apron is reconstructed in
  `sampleDataHeight` as well as the triangulated terrain, so sonar samples it.
- Beebe's torn spire and Lost City's rolled lip retain finite buffers and
  cap/wall rim joins. The existing spire fixtures cover zero/fractional segment
  requests and zero tip radius. Authored all-tier goldens retain bounds,
  colliders, vent sources and counts. Beebe hero Low: 18,010 triangles / 9
  draws, ventTop 27.84017558. Lost City Poseidon Low: 15,400 / 3; rolled beads
  add no topology, and Low omits its rubble.
- The four sites retain their POI/site identities, mission references, guide
  links and discovery storage schema. The existing migration and Journal
  capability suites pass; the added real-content tests cover the previous
  integration gap. No save migration was needed.

## Reported limitations and follow-ups

These are recorded rather than changing established rendering/collision design:

1. **Blue Hole roof colliders remain approximate.** `wallColliders` does not
   consume the roof's vertical `roofRise` callback. Sampling actual placed roof
   vertices with an 8 m hull centre 7.5 m above each vertex finds exposed
   contacts that `Props.collide` misses. Before/after comparison of only
   `stalactites.ts` and `terrainFeatures.ts` against `4ac96b6` confirms this
   predates the reviewed roof/apron merge: west misses Low/Medium/High
   **8/14/22 → 9/14/22**; east **154/335/648 → 87/206/390**. These counts are
   vertex probes, not unique reachable routes or a severity metric. Exact roof
   collision needs a separate design that preserves the traversable cavity;
   expanding all boxes indiscriminately can close that space. The existing
   floor/sphere solver still clears rendered apron triangles and volumes.
2. **Chase-arm clearance is sampled.** Dense probes of underwater poses at
   both galleries find requested 6 m clearance undershoots: Low minimum
   **4.879289 m**, High **4.148713 m**. The eye maintains 6 m clearance and
   sampled sightlines remain above terrain. The pre-merge versions also
   undershoot (Low **4.953573 m**, High **4.715926 m**). No eye or sightline
   clipping was reproduced. A full swept-clearance guarantee would need more
   than the camera's existing 24 arm samples; the added guard checks actual
   visibility, without freezing the shortfall as an accepted tolerance.
3. **Decorative scatter has no collision shapes.** Enlarged Titanic stones can
   be passed through, as other scatter could before. Lost City likewise uses
   coarse axis-aligned boxes around leaning columns. These are existing
   approximations; no new collider system was added in this numerical audit.
4. High Titanic scatter reaches the existing 4,096-stone cap (748,180 scatter
   triangles in the existing fixture). Low remains within its tested budget.
   Static triangle/draw counts are not real-phone performance measurements.
   Visual appearance, GPU shader readback and owner phone acceptance remain
   unverified here.

Temporary comparison harnesses and source versions are retained in `.cache/`:
`apron-camera-audit.test.ts`, `roof-collision-audit.test.ts`,
`apron-camera-vitest.config.mjs`, `bluehole-before-vitest.config.mjs`,
`bluehole-before-{stalactites,terrainFeatures}.ts`. Logs:
`bluehole-audit-actual.log`, `bluehole-audit-before.log`.

## Validation

- Titanic focused capability audit: 3 files / 16 tests passed.
- Beebe/Lost City focused audit: 4 files / 156 tests passed.
- Journal/save focused audit including new cases: 3 files / 101 tests passed.
- Blue Hole final focused run: 2 files / 69 tests passed (58.30 seconds),
  including the three new camera sweeps and two sonar cases. Log:
  `.cache/bluehole-focused-valid.log`.
- Production TypeScript/build gate and strict content validation passed.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4342 bash tools/gates.sh`.
  Config bundling, strict content validation and the root production build
  (including TypeScript) passed. Canonical logs:
  `.cache/runs/20261017-010524-28-TpA71N/`; aggregate log:
  `.cache/S-bughunt-18-gates.log`. The default fork-pool unit gate emitted only
  its RUN header for eight minutes and was interrupted (exit 130). This
  aggregate gate invocation is **not a pass**.
- Python: **161/166 pass**. Four unchanged build-manifest tests fail with
  `spawnSync git EPERM`; the unchanged golden CLI test fails parsing empty
  subprocess stdout (`Unexpected end of JSON input`). These are the same five
  sandbox tooling failures recorded in the previous audits; no tools or
  assertions were modified.
- Separately attempted root browser smoke and project-base browser checks
  using isolated build outputs and ports 4343/4344. Both stop before assertions
  because Playwright's preview process cannot start. A direct preview with the
  native bundled config confirms `listen EPERM: operation not permitted
127.0.0.1:4345`. The separate project-base production build passes. Logs:
  `.cache/S-bughunt-18-{browser,base-build,base-browser,preview}.log`.
- Separate attribution check passes (14 assets), repository-wide Prettier
  passes, and `git diff --check` passes. Log:
  `.cache/S-bughunt-18-prettier.log`.
- Full-unit thread-pool fallback: **192 files / 2,874 tests passed**, no skips,
  exit 0, 551.15 seconds. Command:
  `npx vitest run --configLoader runner --pool=threads --cache=false`.
  Log: `.cache/S-bughunt-18-unit-threads.log`. The default pool was interrupted
  while silent; that establishes an incomplete gate run, not a demonstrated
  unit-test failure or proof of deadlock.

Removed the isolated project-base build and temporary preview config after
validation; retained logs and numerical audit harnesses. Final changes comprise
nine added capability cases, extra apron-boundary ray probes, and this report.
No production fix was made. No commit was requested or created.
