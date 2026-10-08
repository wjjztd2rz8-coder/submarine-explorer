# 870 — Blue Hole / Lost City terrain fidelity rollout

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
