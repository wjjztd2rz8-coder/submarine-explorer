# 920 — Verify carve preservation and follow-on placement

Date: 2026-10-08. Uses shipped Float32 Monterey and Great Blue Hole heightmaps,
default graphics settings and independent Three.js downward raycasts against
near mesh geometry. No new fidelity profile is enabled in production.

## Findings and small fixes

The director's cubic repair holds: Monterey Medium/High retain the reconstructed
S-bend. The centre is `(-3230.927430, -1358.837559)` and its carved survey height
is −860 m. The Blue Hole centre is `(-157.430500, -44.801940)` and its carved
survey height is −125 m. These are reconstruction heights, not new survey claims.

| Site / tier      | Carved survey centre | Collision centre after | Near mesh centre | Largest collision/mesh gap before | Largest gap after |
| ---------------- | -------------------: | ---------------------: | ---------------: | --------------------------------: | ----------------: |
| Monterey Low     |           −860.000 m |             −855.979 m |       −855.979 m |                          20.717 m |        0.000319 m |
| Monterey Medium  |           −860.000 m |             −858.295 m |       −858.295 m |                        0.000714 m |        0.000714 m |
| Monterey High    |           −860.000 m |             −858.433 m |       −858.433 m |                        0.000737 m |        0.000737 m |
| Blue Hole Low    |           −125.000 m |             −126.365 m |       −126.365 m |                          30.092 m |        0.000006 m |
| Blue Hole Medium |           −125.000 m |             −125.533 m |       −125.533 m |                          20.890 m |        0.000007 m |
| Blue Hole High   |           −125.000 m |             −125.717 m |       −125.717 m |                          17.217 m |        0.000008 m |

Monterey samples include seven longitudinal stations (−500, −400, −250, 0,
250, 400, 500 m), following the sine axis, at transverse offsets −60, 0, 60 m.
Blue Hole samples include seven radii (0, 60, 108, 126, 153, 184, 215 m) at five
bearings (0, 0.7, 2.3, 3.9, 5.4 radians). Near mesh means LOD 0; agreement is
guarded within 2 mm to allow Float32 position rounding on steep triangles.

`Terrain.sampleHeight` previously used the continuous surface for Monterey Low
and every Blue Hole tier. On steep carve shoulders this put physics, POIs and
scatter metres above or below visible triangles. Carved sites now use the same
near-triangle interpolation already used by fidelity profiles, including when
detail strength is zero. Mesh generation, subdivision budgets, LOD selection,
carve profiles and uncarved-site sampling are unchanged. Detail-off still
retains site reconstruction; `sampleDataHeight` remains the bilinear survey
with the carve and no procedural detail. Its documentation now states that.

The changed seating exposed a Low opening scan failure: the North canyon wall
contact was 35.97° from the forward beam, outside the 35° cone. Increasing the
authored approach from 12 to 16 m restores scan angles of 33.08° / 30.91° /
31.60° on Low / Medium / High without changing scan limits. The existing
Monterey wildlife/framing/scan tests pass on all four existing tiers, including
Ultra. Blue Hole's authored gallery scan remains available on all three tiers.

## Follow-on audit and regression coverage

`tests/unit/terrainCarveAgreement.test.ts` covers all six site/tier combinations:

- Independent mesh rays vs collision across the bend, sinkhole floor, wall,
  ledge and rim; repeat the geometry comparison with detail disabled.
- Exact −860 / −125 m carved centre reference, centre mesh depth envelopes,
  and the fully carved Monterey axis at −400, −250, 0, 250 m.
- Actual free-dive spawn clearance, authored opening prop collision and first
  scan; every authored POI is above the rendered floor, and snapped POIs and
  centre-seated props agree with independent mesh rays.
- Submarine state depth is world Y; altitude is height above the rendered
  floor. Vertical sonar echoes hit the same floor within the 1 m march step,
  with the correct round-trip delay. UI sonar code reads `sampleDataHeight`,
  so both carves remain represented in its detail-free relief map.
- Actual biome scatter at nine 80 m cells around each carve: embedded bases
  agree with mesh rays. Low/Medium/High instance counts are 40/148/265 at
  Monterey and 35/105/206 at Blue Hole for deterministic audit seed 920.
- Chase, orbit and first-person camera endpoints keep the configured 6 m
  terrain clearance and 2 m underwater ceiling at pilot positions where a
  full hull fits. A shallow reef with insufficient hull space is excluded
  from these underwater-pilot endpoint checks, not treated as a safe spawn.

Two additional tests enable a Blue Hole fidelity profile only in a synthetic
shallow-shelf fixture on Medium/High. They catch the original cubic overwrite
that would erase the 125 m hole during a future rollout. The existing Monterey
pure-data test now checks survey vertices and independently raycasts an
off-vertex sample: a curved carve cannot be both its continuous height function
and its finite triangle approximation at arbitrary points.

`tests/e2e/f-verify-920.spec.ts` adds six runtime cases. They capture the authored
opening and an inspection frame, teleport to three S-bend stations or four
sinkhole radii, allow real render frames to select LOD, then independently
intersect the active triangle indices and check collision, depth, altitude and
camera clearance. JSON measurements accompany the screenshots on passing runs.

Raw CPU evidence can be regenerated with:

```bash
CARVE_AUDIT=1 npx vitest run tests/unit/terrainCarveAgreement.test.ts --configLoader runner --cache=false
```

Output: `.cache/verify920/surfaces.json`. The original pre-fix measurements are
retained locally as `.cache/verify920/surfaces-before.json`.

## Larger issues retained for follow-up

1. **Mesh fidelity still differs from the continuous carved survey.** The
   maximum survey/mesh differences in this grid are 22.445 / 3.216 / 2.349 m
   for Monterey Low/Medium/High and 32.853 / 21.216 / 15.946 m for Blue Hole.
   Consequently the sonar relief map can describe a steeper wall than the
   low-resolution visible triangles. The centres retain the intended depths,
   and collision now follows the visible floor. Full analytic agreement on
   the walls requires local refinement and budget/LOD/seam review, particularly
   the deferred Blue Hole 870 rollout. Do not interpret this verification as
   acceptance of that rollout or exact analytic/mesh agreement everywhere.
2. **Camera arm occlusion across steep banks.** Endpoint clamping passes, but
   independent segment rays from the pilot to the endpoint hit terrain in
   4/4/4 Monterey and 2/4/4 Blue Hole sampled views on Low/Medium/High. The
   current `CameraRig.clampToTerrain` retracts only when the terrain cannot fit
   beneath the underwater ceiling; otherwise it lifts the endpoint without
   checking the entire arm or the view back to the pilot. This can hide the
   submarine behind a bank even though the camera endpoint is clear.
   Reproduce Monterey Medium at pilot
   `(-3310.318549, -797.777764, -1758.837559)`, chase yaw 0.7, pitch −0.3:
   endpoint `(-3368.298141, -708.448044, -1690.001762)` is clear, but the arm
   first intersects terrain 6.231 m from the pilot. Blue Hole Medium orbit at
   pilot `(-74.827544, -81.327796, 24.773570)` reaches clear endpoint
   `(-74.827544, -8.091474, 109.317115)` through terrain at 19.810 m.
   A complete fix needs continuous arm/sightline clearance, prop occlusion,
   near-plane checks and motion/framing review; it is outside a small placement
   correction. `cameraObstructions` in the audit JSON preserves all 22 cases.
3. **Distant LOD remains a separate contract.** Collision deliberately samples
   near triangles, independent of the camera, as in the existing fidelity
   implementation. Far LOD approximation can differ from that surface; these
   CPU near-mesh results do not claim equality at every distant LOD.

## Validation

Focused shipped-tile, Monterey opening and Blue Hole opening checks pass:
3 files / 15 tests. TypeScript passes. Final focused audit passes 8/8 cases.

Two negative controls confirm sensitivity, with the source restored afterwards:

- Remove the director's post-cubic carve application: four cases fail
  (Monterey Medium/High and the two Blue Hole profile preflight cases).
- Restore continuous sampling for non-fidelity carved sites: four real-tile
  cases fail (Monterey Low and Blue Hole Low/Medium/High).

Logs: `.cache/verify920/negative-{cubic,continuous}.log`.

Ran `tools/gates.sh --full-e2e` twice with writable config, ports 4920/4921 and
isolated retained build outputs `dist-verify920-r1/r2`:

| Gate                         | Round 1                        | Round 2 after test maintenance |
| ---------------------------- | ------------------------------ | ------------------------------ |
| Build / TypeScript           | PASS                           | PASS                           |
| Unit                         | 1,483 pass / 3 fail            | PASS — 148 files / 1,486 tests |
| Python                       | PASS — 148 tests               | PASS — 148 tests               |
| Strict content / attribution | PASS                           | PASS                           |
| Whole-repository Prettier    | PASS                           | PASS                           |
| Full E2E                     | BLOCKED — preview cannot start | BLOCKED — preview cannot start |
| Project-base build           | PASS                           | PASS                           |
| Project-base E2E             | BLOCKED — preview cannot start | BLOCKED — preview cannot start |

Round 1 found two historical `f-bughunt-4` assertions that explicitly required
the old collision defect. Retain their original audit grid, convert collision
and hull burial assertions into strict mesh/clearance regressions, and keep
the remaining analytic survey/mesh discrepancy measurement. Both corrected
cases pass, with all five tests in that file passing. Its dense Low Blue Hole
grid's maximum collision/mesh error is now 0.0000122 m. The third failure was
850's source fingerprint for shared spawn presets. Refresh **only** the spawn
hash for the intentional Monterey approach change; every biome, terrain
buffer, material uniform and shader snapshot remains byte-identical. That
suite passes 2/2 tests. Final full-unit validation includes both maintained
suites, all new cases, and the unchanged Monterey CPU frame-budget guard.

Logs are retained in `.cache/verify920/round-{1,2}.log` and
`.cache/verify920/round-{1,2}-gates/`. The new Playwright file lists all six
cases successfully. A direct preview attempt confirms the environmental
failure: `listen EPERM: operation not permitted 127.0.0.1:4929`, preserved in
`.cache/verify920/preview.log`. Browser tests never reached page execution in
either round; no screenshots, live frame budgets or rendered acceptance are
claimed. Approval escalation is unavailable in this workspace.

Required external browser rerun, twice, on the final build:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4920 tools/gates.sh --full-e2e
GATES_CONFIG_MODE=writable PW_PORT=4921 tools/gates.sh --full-e2e
```

Review the six new opening/inspection screenshot pairs and attached JSON,
plus the unchanged Monterey 900,000-triangle browser guard. Browser acceptance
remains open until these runs execute successfully.
