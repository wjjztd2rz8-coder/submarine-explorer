# F-BEEBE-SEABED-560

## Plan

1. Capture Beebe golden poses 1–3 before editing and inspect the opening, floor and chimneys.
2. Lift only Beebe's sediment and hard-substrate palette modestly, retain texture variation,
   and let the existing warm vent lights form a slightly stronger pool around the vents.
3. Add patchy mineral crust to Beebe's three chimney bodies using their existing vertex
   colours and bump textures; preserve geometry, collisions, camera and plume code.
4. Run build, unit/readability guards, Python checks and full E2E; capture the same golden
   poses afterward, retain the best before/after pair, and log the result in CHANGELOG.md.

## Baseline and environment

- `GOLDEN_SITES=beebe-vent-field tools/golden.sh` attempted before edits. Vite's default
  config loader cannot write into the read-only, symlinked `node_modules/.vite-temp`.
- A config-runner build exposed the known PWA late-import failure; use the repository's
  supported `GATES_CONFIG_MODE=writable` workflow for validation.
- Preview with `--configLoader runner` fails with `listen EPERM` on `127.0.0.1:4298`.
  The golden capture runner also fails at Chromium launch with
  `sandbox_host_linux.cc:41 … shutdown: Operation not permitted`.
- Failed fresh baseline manifest: `.cache/golden/2026-10-04-062558/poses.json`
  (`complete: false`, no captures).
- Reviewed the director's archived 1600×900 Beebe shots 1–3 from
  `/home/vijay/submarine-explorer/.cache/golden/2026-10-04-031944/`.
  Copies retained at `.cache/beebe-560/before/`, with the original pose manifest.
  These are historical reference images, not a fresh baseline from this worktree.
- Shot 1: floor is very dark brown, with small warm pools. Shots 2–3: the main cluster
  reads as smooth, mostly uniform brown columns; the subsidiary chimney reads almost black.
  The close sediment already has detail, so the proposed lift is restrained.

## Progress

Implemented; static validation passes. Rendered acceptance remains pending.

- Beebe biome only: sediment A `#5A544D → #635D55`, silt patches B
  `#645D55 → #70685D`, exposed basalt C `#2F2E30 → #45413D`. Patch coverage
  `0.30 → 0.36`, texture contrast `0.55 → 0.60`, normal detail `0.50 → 0.55`.
  Existing macro variation, staining and texture distance fade still apply.
- Existing Beebe vent lights: intensity `520 → 650`, with the same warm colour,
  80 m cutoff, positions and light count. This reinforces their floor pools rather than
  raising global ambient light. Ambient fill remains 8; fog/depth atmosphere is unchanged.
- `Config.props.chimneyCrust` selects only `beebe-chimney-1..3`: neutral warm-grey
  precipitate (`#9A8E7B`, maximum blend 0.32), with 1.4 m islands and finer broken
  edges, preferentially on shelves. Applied to existing vertex colours; Low retains
  the same colour detail without bump maps. Medium and above reuse their rock maps
  at bump strength 1.3. The main merged smoker body and the two plain chimneys use
  the same finish. No extra geometry, textures, draws or lights.
- Geometry, collisions, spawn and camera are unchanged. The director tracks Beebe
  sub/camera scale separately; this package addresses floor and chimney materials.
- No changes to `geo/plume.ts`, `VentPreset.ts`, their shader code, smoke/haze parameters
  or readability guard assertions. The only mission change is point-light intensity.
- Renderer tuning is documented in `docs/props.md`; CHANGELOG entry added.

## Validation

`GATES_CONFIG_MODE=writable PW_PORT=4260 PW_OUTDIR=dist-beebe-560 tools/gates.sh --full-e2e`

- PASS production build (TypeScript + Vite, PWA stamp).
- PASS complete pre-existing unit suite: 123 files, 1,307 tests. Includes
  `heroReadability`, `heroIntegrity`, `freeDiveComposition`, marine-snow readability,
  vent haze budgets and static prop budgets. No guard thresholds weakened.
- PASS Python: 144 tests; all strict content validators; attribution; repository formatting.
- BLOCKED full E2E and project-base E2E: preview process cannot start in this sandbox.
  A separate preview attempt reports `listen EPERM`; Chromium also cannot launch.
  The project-base production build succeeds. These are environment failures,
  not successful browser tests. Logs: `.cache/gates/`.
- After adding eight targeted regression cases, PASS `props-geo.test.ts`: all 40 tests.
  On Low and High, all three Beebe chimney bodies have a positive mean albedo lift
  and spatially varied crust, with identical positions, normals, bounds and geometry/draw
  counts compared with crust disabled. Unselected smoker bodies retain identical colours
  and bump strength.
- PASS final `npm run typecheck` and `git diff --check`.

## Golden comparison and retained pair

- Both before and after attempts used `GOLDEN_SITES=beebe-vent-field tools/golden.sh`.
  Its default config loader fails in the read-only dependency tree. Attempt logs are
  retained in `.cache/beebe-560/before/golden-build.log` and
  `.cache/beebe-560/after/{golden.log,golden-build.log}`.
- The capture runner was also attempted directly at both stages. After manifest:
  `.cache/golden/2026-10-04-063203/poses.json` (`complete: false`, no captures).
  `.cache/beebe-560/after/capture.log` records the launch failure.
- Retained before references:
  [opening / shot 1](../../.cache/beebe-560/before/beebe-vent-field-1.png),
  [40 m / shot 2](../../.cache/beebe-560/before/beebe-vent-field-2.png),
  [30 m / shot 3](../../.cache/beebe-560/before/beebe-vent-field-3.png).
  Shot 1 is the preferred before half because it shows the target floor pools and the
  first-10-seconds composition; shot 3 is useful for mineral finish review.
- **Best before/after pair: pending.** No fresh after image exists, so no rendered
  improvement or best-pair selection is claimed. Archived images are explicitly historical.
  In a browser-capable run, capture all three unchanged poses with `tools/golden.sh`,
  compare floor pools and distant darkness in shot 1, and inspect crust in shots 2–3.
  Keep the winning matched pair here and rerun the full-E2E command above, including
  `f-verify-520`'s 844×390 Low lighting guard, before visual acceptance.
