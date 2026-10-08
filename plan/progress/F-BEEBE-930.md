# F-BEEBE-930 — lit-pool edge and close-up

## Plan

1. Trace the cream disc and blue rim in the October 8 Beebe goldens; retain a
   baseline and fingerprint the original 850 geometry before changing its finish.
2. Blend only the main smoker's sediment apron into 850's surrounding seabed.
   Preserve chimney geometry, vent clumps, opening composition and all other sites.
3. Run static and full E2E/project-base gates, attempt matched desktop goldens,
   inspect the images, and record Low's incremental cost and any blocked checks.

## Findings and implementation

- The cream disc is `beebe-mineral-seabed`, the raised 90 × 80 m height-mesh apron
  built by `addBeebeApron` in `src/world/props/geo/beebe.ts`. Its previous untextured
  vertex-colour finish used a pale centre and radial edge tint, visibly separate
  from the textured grey-tan sand/rubble/basalt floor added in 850. The apron
  already has a noise-lobed outline and buried perimeter; its plain finish made
  that join read as the edge of a plate.
- The blue oval in the available close-up is the **cockpit viewport bezel**, drawn
  by `CockpitView` in `src/vehicles/cockpit.ts`. It is locked to the camera and
  always passes the depth test. The golden tool uses the cockpit for poses 2–3.
  No seabed halo/ring geometry or vent light effect draws that blue oval. Shared
  cockpit rendering and the golden camera modes remain unchanged.
- The apron now uses the supporting terrain's exact world-space shader and live
  uniforms: the existing 850 sediment palette, sand/rubble/basalt textures, macro
  patches, ripples, distance filtering and fog. There is no radial colour band.
  Patch variation continues across its existing noisy buried join. Neutral
  `aCavity` data replaces the apron vertex tint. Its height/normal/index bytes,
  width and depth stay fixed, retaining every supporting clump position.
- Only the main Beebe smoker receives the optional supporting `seabedMaterial`.
  Its wrapper owns its own material lifetime but shares terrain-owned maps and
  uniforms, including asynchronous texture updates. Standalone builder fixtures
  use the same Beebe terrain-material factory when no supporting material exists.
  Rubble keeps its original material and colours. No content, camera, chimney,
  clump, lighting, plume, terrain-biome or other-site shader settings change.

## Verification

- **147 unit files / 1,481 tests pass**, including the unchanged non-Beebe biome,
  terrain-buffer, uniform, shader and opening fingerprints. The complete original
  non-Beebe snapshot is byte-identical; only Beebe evidence was appended.
- The new Beebe snapshot was captured from the original `HEAD` (850) builder
  before the finish replacement. All four tiers match it after the change:
  chimney/apron/rubble/clump geometry, clump anchor metadata, instance buffers,
  bounds, collisions, vent tops and geometry budgets. Only the apron's finish
  attributes are excluded: its RGB colours are replaced by neutral cavity data.
  Log: `.cache/beebe930/baseline-snapshot.log`.
- Material tests compare the complete compiled shader with the supporting terrain,
  check shared live uniforms after a simulated asynchronous map load, and check
  the actual placed apron shares the real terrain uniforms on Low and High.
  Existing terrain-clearance and habitat attachment checks pass.
- **Build, 148 Python tests, content, attribution and repository-wide Prettier
  gates pass.** Full E2E and project-base E2E were selected and attempted using:

  ```bash
  FULL_E2E=1 GATES_CONFIG_MODE=writable PW_PORT=4393 PW_OUTDIR=dist-beebe930 tools/gates.sh --full-e2e
  ```

  Both browser gates fail **before tests start** because their preview servers
  cannot start in this sandbox. The project-base build itself passes. Gate exit
  code is **1**: these browser gates are blocked, not passed. Overall log:
  `.cache/beebe930/gates.log`; individual logs: `.cache/beebe930/gates/`.

- Final `git diff --check` passes. No runtime rendering or GPU performance success
  is inferred from the static checks.

## Before/after golden evidence

The requested `2026-10-08-150848` directory is absent from this workspace and the
shared checkout. The available post-850 `2026-10-08-155020` desktop PNGs and pose
manifest were copied to `.cache/beebe930/before/` and inspected. Pose 1 has the
three-quarter hull beside the smoker; poses 2–3 clearly show the plain apron
and camera-locked blue viewport bezel.

| Pose         | Before                                          | After                     |
| ------------ | ----------------------------------------------- | ------------------------- |
| 1 — opening  | `.cache/beebe930/before/beebe-vent-field-1.png` | Blocked — no PNG produced |
| 2 — approach | `.cache/beebe930/before/beebe-vent-field-2.png` | Blocked — no PNG produced |
| 3 — detail   | `.cache/beebe930/before/beebe-vent-field-3.png` | Blocked — no PNG produced |

The before command used the requested site/layout selection:

```bash
GATES_CONFIG_MODE=writable GOLDEN_SITES=beebe-vent-field GOLDEN_LAYOUTS=desktop tools/golden.sh
```

It built successfully but could not start preview: `listen EPERM` on
`127.0.0.1:4298`. Log: `.cache/beebe930/golden-before.log`.
The baseline bundle is retained as `dist-beebe930-before/`. The same requested
command was run again after the implementation; its build passed, and preview
again failed with `listen EPERM` on `127.0.0.1:4298`. Log:
`.cache/beebe930/golden-after.log`. The final bundle is retained as
`dist-beebe930/` (also built by the full gates). **No after PNG exists.**

On a browser-capable host, rerun the golden command above and compare all three
matched desktop poses. Confirm the apron reads as continuous textured sediment,
without a coloured rim, and the chimney, clumps, hull and opening composition
remain stable. The shared blue cockpit bezel remains in poses 2–3; it is not a
seabed ring. Documentary-still visual approval and a Low render-cost measurement
remain pending.

## Low-tier cost

- No added draws, triangles, lights, transparent passes or texture allocations
  in the placed scene. The main smoker retains **7 draws / 14,356 triangles**;
  its two secondary smokers retain **2 draws / 1,170 triangles each**.
- The apron retains **1 draw / 3,200 triangles / 1,681 vertices**. Its new one-float
  cavity buffer is 6,724 bytes, replacing a 20,172-byte RGB buffer: **13,448 fewer
  vertex-buffer bytes**. One extra lightweight material wrapper separates the
  apron from the unchanged rubble material.
- The apron now runs the already-existing Low terrain shader instead of a plain
  material: up to three active albedo fetches per flat pixel plus analytical
  terrain noise/ripples. Low still omits PBR normal-map fetches and texture
  breakup. Texture storage and uniform state are shared with the floor.
- These are CPU geometry/material counts, not measured GPU timings. Rendered
  performance and documentary-still appearance require browser-capable QA.

## Verification update (2026-10-08, browser-capable host)

`GOLDEN_SITES=beebe-vent-field GOLDEN_LAYOUTS=desktop tools/golden.sh` now runs.
Before (main, plain pale apron): `.cache/beebe930/before/beebe-vent-field-3-main.png`
(flat cream disc with sharp edge, clearly plate-like). After (this branch):
`.cache/beebe930/after/beebe-vent-field-{1,2,3}.png`. The apron now reads as the
same rippled grey-tan sediment as the surrounding floor; the edge is gone and
the pale radial tint is absent. The remaining blue oval is the cockpit bezel
(camera-locked), not seabed. `PW_PORT=4930 tools/gates.sh` passes (build, unit,
python, content, attribution, prettier, e2e, e2e-base).
