# 460 marine-snow audit

## Scope and plan

Two passes: (1) trace the particle shaders, calculate per-site/per-tier inputs,
apply safe sprite bounds and add regression tests; (2) review the change, verify
first-frame projections and run `tools/gates.sh`, including browser smoke.

Audit all 13 shipped sites at Low, Medium, High and Ultra, in both composed
free-dive and near-site mission openings. Use real terrain/mission/POI data,
procedural prop bounds, camera depth and the actual environment-preset update,
as in the 380 `heroReadability.test.ts` tests. Fog and ambient floors are fixed
constraints; the snow change must not mutate either.

## Pass 1: findings and fix

- Permanent white snow lives in `src/render/MarineSnow.ts`; GPU drift/wrapping
  follows the camera in a 160 m cube, with 600/3,000/9,000/9,000 points by tier.
- Old sprites had an 18 drawing-buffer-pixel ceiling, up to 1 centre alpha and
  a 3.6 linear colour multiplier under lamps. Seed controls both flake size
  and admission by density, so site/preset density matters as well as budget.
- Titanic ambient fill saturates base snow brightness at 1. Wreck sediment haze
  and rust motes are separate systems in `WreckPreset.ts`, with larger 256 px
  projection ceilings and ambient-coupled colour. Titanic's haze can reach
  about 46 px at 20 m; this is a stronger large-disc candidate than permanent
  snow alone. Plumes, mist, wash and title snow use their own shaders.
- Applied a spherical foreground guard: within 6 m, diameter <=2 buffer px,
  centre alpha <=0.12, linear colour multiplier <=0.65. Smoothstep restores
  normal alpha/lamp lighting from 6 to 12 m; all snow has a 6 px diameter cap.
  The Gaussian edge, seeds, counts, wrapping and current-driven drift remain.
- Added configuration knobs only for snow; no fog/ambient/default band change.
- Added `marineSnowReadability.test.ts`: 52 site/tier cases, each covering both
  openings, lit/unlit samples, foreground/off-axis distances and 720/1440/2160
  buffer heights. A CPU shader mirror computes projected size, centre alpha and
  linear brightness; shader/uniform assertions guard their GPU connections.

## Pass 2 and validation

- Reviewed camera projection, seed/density coupling, radial versus axial
  distance, the lamp's +X heading convention, physical buffer pixels versus
  CSS pixels, and the fragment Gaussian. The projection audit uses elapsed=0,
  currents off, both composed openings and default Enhanced lamps.
- Extended the same foreground guard to wreck haze and motes after identifying
  their much larger sprites and ambient-coupled brightness. These layers retain
  their authored size, alpha and lighting beyond 12 m. Shared snow uniforms are
  passed from the game's water config through the preset factory. No ambient
  sample/fill, fog, plume/mist, drift, wrapping or particle budget changed.
- Initial full gate: build, 1,209 unit tests (including all 380 tests), Python,
  content, attribution and formatting passed. Browser smoke and project-base
  preview could not start: read-only `node_modules/.vite-temp`; a writable
  native-config retry then reached the sandbox's `listen EPERM` on localhost.
- Final snow + 380 tests: 63 passed. Final `tools/gates.sh --no-e2e`: all
  static gates passed, including 108 unit files / 1,209 tests. Fresh screenshot
  inspection is blocked by localhost binding restrictions.
- Per-site measurements, final gate results and limits are in
  `plan/progress/460-snow-audit-report.md`.
