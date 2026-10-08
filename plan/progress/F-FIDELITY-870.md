# 870 — Blue Hole / Lost City terrain fidelity rollout

**875 retry status:** the director's carve repair is validated, both profiles are
enabled, and static gates pass. Rendered budgets, paired golden images and visual
sign-off remain pending sandbox browser/port access. See the retry section below;
the original stopped-preflight report is retained for provenance.

Date: 2026-10-08. Baseline: `2751dcf08c1c16a33c428e3bb733984efabf1267`.

**Stopped at preflight: 810 is broken on main.** The task explicitly requires
stopping and reporting in this note if that prerequisite is broken. Neither new
site profile was enabled. No terrain, shader, prop art or test assertions changed.

## Confirmed blocker

`Terrain.surfaceHeight` (`src/world/Terrain.ts:357`) starts with
`sampleDataHeight`, which applies the site's analytic carve. On Medium+ with a
fidelity profile, lines 364–371 overwrite that result with cubic interpolation
of raw `heightAtCell` samples. The carve is never reapplied. Both mesh generation
and triangle-based collision sampling use this function, so they agree with each
other while losing the intended landform.

This already erases Monterey's reconstructed opening S-bend from 810. The source
files `Terrain.ts`, `terrainFeatures.ts` and `core/config/terrain.ts`, and the
Monterey tile data, have no diff against local `main`
(`3504ea420a04cc6591cfb393bf1e81debbc00874`). This is a pre-existing main defect,
not a rollout change.

Using real Monterey bathymetry at the carve centre,
`x = -3230.927430367679`, `z = -1358.837559250192`:

| Tier   | Carved survey height | Collision sample | Independent near-mesh ray |
| ------ | -------------------: | ---------------: | ------------------------: |
| Low    |           −860.000 m |       −858.526 m |                −855.979 m |
| Medium |           −860.000 m |       −695.997 m |                −695.997 m |
| High   |           −860.000 m |       −696.061 m |                −696.061 m |
| Ultra  |           −860.000 m |       −696.061 m |                −696.061 m |

Medium+ loses approximately **164 m** of opening canyon depth. Medium+ collision
and mesh agree within 0.000015 m, independently confirming that the incorrect
height is rendered geometry rather than only a physics lookup error. Low retains
the carve; its existing continuous sampler differs from the coarser triangle
surface by about 2.55 m at this position. This is a baseline observation, not a new
Low regression. With the profile disabled, Medium's continuous surface here is
−858.637 m. Further north on the S-bend (`along = −300 m`), the carved survey is
−920 m but profiled Medium samples −670.683 m, a loss of approximately 249 m.

Blue Hole relies on the same analytic-carve path for its approximately 125 m
deep sinkhole. Enabling the current fidelity implementation there would also
bypass that carve; this consequence follows directly from the common code path.
No Blue Hole profile was enabled to demonstrate it visually.

## Reproduction

Run from the repository root. This reads the real tile and raycasts the existing
Medium mesh; it does not start a listener or edit configuration.

```bash
node --input-type=module <<'JS'
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
const server = await createServer({
  configFile: false, cacheDir: '.cache/fidelity-870/vite',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom',
});
try {
  const { makeConfig } = await server.ssrLoadModule('/src/core/Config.ts');
  const { Terrain } = await server.ssrLoadModule('/src/world/Terrain.ts');
  const { terrainCarveFor } = await server.ssrLoadModule('/src/world/terrainFeatures.ts');
  const meta = JSON.parse(await readFile('data/tiles/monterey-canyon/meta.json', 'utf8'));
  const bytes = await readFile('data/tiles/monterey-canyon/heightmap.bin');
  const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
  const terrain = new Terrain({ meta, heights }, makeConfig().terrain, 'medium');
  try {
    const { x, z } = terrainCarveFor(meta).centre;
    terrain.group.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
    console.log({ carved: terrain.sampleDataHeight(x, z),
      collision: terrain.sampleHeight(x, z),
      mesh: ray.intersectObject(terrain.group, true)[0].point.y });
  } finally { terrain.dispose(); }
} finally { await server.close(); }
JS
```

Local all-tier reproduction and raw evidence:
`.cache/fidelity-870/reproduce-carve.mjs`, `baseline-raycast.json`,
`baseline-raycast.log`, and `baseline-carve.json`.

## Validation and deferred work

- Unchanged baseline build/typecheck passed with the native writable Vite config.
  Log: `.cache/fidelity-870/baseline-build.log`; bundle: `dist-870-before/`.
- Existing `montereyFidelity`, `montereyFrameBudget` and `terrainFeatures` suites
  passed: **3 files / 11 tests**. The strict CPU frame guard still reserves 200k
  triangles under 900k; it does not catch carve preservation. Log:
  `.cache/fidelity-870/baseline-unit.log`.
- Baseline Monterey `f-geo-scarp.spec.ts` was attempted, but its preview server
  could not start. A separate native-config preview confirms
  `listen EPERM: operation not permitted 127.0.0.1:4270`. Logs:
  `.cache/fidelity-870/baseline-e2e.log`, `baseline-preview.log`.
- No rendered budget claim or before/after golden images are made. Per the stop
  condition, site tuning, three rollout rounds, full E2E, visual QA, and rollout
  seam/popping/collision checks are deferred until 810 is repaired and validated.

The prerequisite repair should preserve the analytic carve after cubic survey
reconstruction, with tests for real rendered/collision heights on Monterey and
Blue Hole. Then rerun Monterey's unchanged strict 900,000-triangle browser guard
and golden poses before restarting 870. This report does not implement that
repair because the task directs stopping on a broken 810.

## 875 retry — repaired carve and terrain-only rollout

Date: 2026-10-08. Retry baseline: `5ed338762226aa81dffa278c741cc6f0629fdcd9`.
Director repair: `5ce30c4` (`fix(terrain): reapply site carve after fidelity cubic
reconstruction`). The 870 blocker is no longer present. Configuration, tests,
this note, geometry evidence and CHANGELOG are the only changed files; no prop
art, shared terrain implementation or shader changes were needed.

### Carve and Monterey prerequisite

`fidelityCarve.test.ts` reads the real Monterey and Blue Hole tiles at Medium,
High and Ultra. It checks `surfaceHeight - detailHeight` against the carved
survey, independent downward mesh rays against collision sampling within 1 mm,
and the final centre depth within 3 m of the carve. It also checks Monterey's
deeper north bend and the Blue Hole ledge. All six cases pass. A Vite transform
that restores the old `base = measured` bug makes **all six cases fail**, without
editing the working source. Log: `.cache/fidelity-875/carve-mutation.log`.

| Site / tier            | Carved survey | Continuous surface | Collision | Independent mesh ray |
| ---------------------- | ------------: | -----------------: | --------: | -------------------: |
| Monterey Medium        |      −860.000 |           −858.667 |  −858.295 |             −858.295 |
| Monterey High / Ultra  |      −860.000 |           −858.820 |  −858.433 |             −858.433 |
| Blue Hole Medium       |      −125.000 |           −125.675 |  −125.666 |             −125.666 |
| Blue Hole High / Ultra |      −125.000 |           −125.606 |  −125.603 |             −125.603 |

These centre measurements include the existing procedural detail and triangle
interpolation; subtracting detail from the continuous surface recovers exactly
−860 / −125 m. Monterey's original Medium scarp guard still passes, with a peak
CPU terrain/prop census of **682,886**, plus its unchanged 200,000 reserve, below
900,000. `tools/terrain-fidelity.mjs` also rechecks the authored High Monterey
approach/close poses for both layouts: they remain clear of terrain and props.
The opening/ambient readability tests pass. **Rendered Monterey readability at
the restored depth is not verified**: golden preview failed with `listen EPERM`
at 127.0.0.1:4298, and direct Chromium launch also fails.

### Three rollout rounds

1. **Profile allocation and carve preservation.** Blue Hole focuses on the hole
   centre (17.3156, −87.5356), covering the first gallery scan, the opening sub
   pose and the eastern gallery. Radius/fade are 310/90 m. Eight-cell patches
   retain subdivision 2 outside the envelope; six local patches use 16 on Medium
   and 32 on High/Ultra (about 3.65 × 3.82 m / 1.82 × 1.91 m spacing).
   Only the intersecting 64-cell parent splits. Relief is 0.18 m at a 24 m
   wavelength with normal strength 0.16, keeping additional relief small around
   the existing narrow limestone shelves. Lost City focuses on the Poseidon
   first scan (30.124, −42.1195), with radius/fade 650/250 m, 16-cell patches,
   nine locally refined chunks at subdivision 4 / 8 (about 13.22 × 15.29 m /
   6.61 × 7.64 m), 1.8 m relief at 36 m wavelength and normal strength 0.20.
   Both use the existing cubic, common derivative spacing, filtered normals,
   skirt and triangle-sampling paths. Resident allocations stay below 4M.
2. **Boundary, collision and budget verification.** Added real-tile tests for
   common-edge heights/normals/cavity, intact 60 m skirts, valid indices at all
   LODs, independent rays at prop origins, POIs and every golden station, and
   first-scan/start coverage inside each focus radius. Low mesh attributes and
   every LOD index buffer are byte-identical with profiles enabled/disabled;
   composed poses and all CPU pose budgets are identical too. The first test
   fixture included scatter groups as meshes; filtering to actual terrain
   meshes corrected the fixture. Blue Hole's frozen west close golden station
   already intersects a prop collision proxy before rollout at all Medium+
   tiers; baseline/after comparison confirms the same collision at that station
   and no new collisions elsewhere. Lost City and both openings are clear.
   This pre-existing authored-shot condition was not changed through prop art.
3. **Full gates and visual/performance attempts.** Built the final bundle and
   ran all unit/Python/content/attribution/format gates. Added four browser
   guards that measure full rendered Medium triangles at every golden pose,
   both layouts, and ±2 m drift, retaining the strict `< 900_000` ceiling.
   Attempted full E2E, project-base, before/after captures and all-tier rendered
   perf. Browser/server restrictions prevent those measurements; no pixel QA,
   screenshot improvement score, frame time or rendered-budget pass is claimed.

### Geometry evidence and cost

Raw durable evidence: [F-FIDELITY-875-geometry.json](F-FIDELITY-875-geometry.json).
The before census disables only the relevant site's profile on this repaired
baseline. `fidelitySceneHelpers.ts` reproduces the golden pose recipe: opening,
west/east Blue Hole approaches and closes, and Lost City's clear Poseidon axis
approach/close. Each pose is counted at desktop 1600 × 900 and portrait 390 × 844,
with −2/0/+2 m vertical drift. The table gives the largest terrain/prop count
across those views, **not renderer.info**; sub, swimming life, scatter and post
passes are excluded. Low retains its old counts. High/Ultra distant geometry
uses the existing fidelity power-of-two subdivision 2 rather than the old 3;
local resolution increases to the profile values above.

| Site      | Tier   | Resident vertices before → after | Peak terrain + props before → after |
| --------- | ------ | -------------------------------: | ----------------------------------: |
| Blue Hole | Low    |                343,476 → 343,476 |                     48,442 → 48,442 |
| Blue Hole | Medium |            1,312,263 → 1,418,754 |                   206,784 → 290,496 |
| Blue Hole | High   |            2,906,766 → 1,718,274 |                   563,020 → 791,272 |
| Blue Hole | Ultra  |            2,906,766 → 1,718,274 |                   620,808 → 849,060 |
| Lost City | Low    |                124,296 → 124,296 |                   108,388 → 108,388 |
| Lost City | Medium |                474,630 → 513,522 |                   458,288 → 330,646 |
| Lost City | High   |              1,051,152 → 627,570 |                   822,112 → 592,764 |
| Lost City | Ultra  |              1,051,152 → 627,570 |                   988,900 → 724,122 |

Both Medium peaks plus the unchanged 200,000 frame reserve are below 900,000
(490,496 / 530,646). Lost City's Medium reduction comes from local splitting
and the existing fidelity bounds-based LOD distances. These are CPU guards;
the new full-frame browser assertions still require execution outside this
sandbox. Common seam samples and skirts pass; **visible LOD popping is pending
browser inspection**.

### Validation and outstanding visual gate

- Build/typecheck pass, including the new browser spec; project-base build passes.
- **145 unit files / 1,473 tests pass**, including 14 new regression/rollout
  cases and existing Monterey budget, hero integrity, Blue Hole opening and
  ambient readability guards. **148 Python tests pass**. Strict content,
  attribution and repository formatting pass. No dependencies/assets added.
- Full E2E and project-base were invoked through
  `GATES_CONFIG_MODE=writable PW_PORT=4275 PW_OUTDIR=dist-875-after tools/gates.sh --full-e2e`.
  Neither ran a browser test: the configured preview process could not start.
  A separate native-config final preview confirms `listen EPERM` at
  127.0.0.1:4275. Logs: `.cache/fidelity-875/full-gates.log`, `full-e2e.log`,
  `project-base.log`, `after-preview.log`, `full-unit.log`, `python.log`.
- Both capture manifests plan every golden hero for desktop/portrait, including
  Monterey: before `.cache/golden/2026-10-08-150741/poses.json`; after
  `.cache/golden/2026-10-08-151524/poses.json`. Both contain **zero captures** and
  `complete: false`; Chromium terminates with `sandbox_host_linux.cc:41`,
  `Operation not permitted`, SIGTRAP. Rendered perf also fails at launch. Logs:
  `.cache/fidelity-875/before-golden.log`, `after-golden.log`, `rendered-perf.log`.
- Matched built bundles remain in `dist-875-before/` and `dist-875-after/`.
  These allow the same capture script/poses to be run against both versions
  outside this sandbox. The implementation is ready for review; visual sign-off
  and actual Medium renderer counts are outstanding, not waived.

With those bundles served on separate unrestricted previews, run both captures
using the unchanged script, then rendered perf, the strict browser guards and
full gates:

```bash
GOLDEN_SITES=monterey,great-blue-hole,lost-city GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs --base-url http://127.0.0.1:4310/
GOLDEN_SITES=monterey,great-blue-hole,lost-city GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs --base-url http://127.0.0.1:4311/
PERF_SITES=monterey-canyon,great-blue-hole,lost-city PERF_TIERS=low,medium,high,ultra node tools/perf-budget.mjs http://127.0.0.1:4311/ .cache/fidelity-875/rendered-after
PW_REUSE_SERVER=1 PW_PORT=4311 npx playwright test tests/e2e/f-fidelity-rollout.spec.ts tests/e2e/f-geo-scarp.spec.ts
GATES_CONFIG_MODE=writable PW_PORT=4275 PW_OUTDIR=dist-875-after tools/gates.sh --full-e2e
```

Inspect all 16 paired Blue Hole/Lost City golden frames plus all six Monterey
frames at restored depth. Check contour steps, silhouette/detail readability,
gallery and tower contacts, density boundaries during approach and LOD changes,
and the extra Blue Hole High/Ultra geometry cost before visual acceptance.
