# F-BEEBE-FRAMING-680

## Plan

1. Capture the existing Beebe golden set and portrait opening; inspect the first
   ten seconds for hull occlusion, a smoking chimney and readable nearby seabed.
2. Tune only Beebe's authored spawn and vertical chase offset. Check the actual
   hull and chimney against both desktop and portrait camera projections.
3. Add a local, terrain-following mineral sediment apron and sparse talus through
   Beebe's content extension and existing geometry/scatter helpers. Keep ambient
   fill, lights, atmosphere, chimney geometry, collisions and HUD unchanged.
4. Run full gates, repeat golden/portrait captures and document any acceptance gaps.

## Implementation

- Beebe opening in `src/game/Spawn.ts`: heading offset 10° → 11°, authored
  altitude 4 → 8 m, vertical chase offset -16 → -12 m, lateral chase offset
  0 → -10 m and approach range 46 → 76 m. Chase radius remains 54 m.
  Terrain/hull safety still takes precedence
  over the authored altitude. Other opening entries are unchanged.
- `data/landmarks/beebe-vent-field/props.json`: the existing raw prop extension
  holds the main cluster's `beebe_seabed` tuning. New site helper
  `src/world/props/geo/beebe.ts` is called through the chimney builder and requires
  both the exact Beebe hero ID and smoker feature. It uses the current terrain
  height provider, vertex colours, `heightMesh` and `scatterRubble`.
- The apron blends lighter grey-tan sediment with subtle rusty mineral islands
  over a 90 × 80 m footprint. Its outer rim sinks into the surrounding floor;
  rubble uses the same muted palette. Low retains vertex colours and reduced
  mesh/rubble detail. The existing main mound, chimneys and plumes remain intact.
  An initial 0.35 m lift intersected Low's coarse rendered seabed by about
  0.55 m. The final 1.1 m lift with 0–0.15 m relief clears the rendered inner
  apron in both Low and High; the outer ring still feathers down into the floor.
- The two new opaque meshes enlarge culling bounds, preserve the original
  collision boxes and vent tip, and add no lights or textures. Site-level
  ambient fill remains 8. No HUD, global terrain/material or camera code changes.
  Added geometry is approximately 3,420 triangles on Low and 13,728 on High,
  over two draws. The shared chimney builder has only a Beebe-gated helper call.

## Capture evidence and limitations

Fresh baseline command:

```bash
GOLDEN_SITES=beebe-vent-field tools/golden.sh
```

The tool accepts the full tile ID `beebe-vent-field`; `GOLDEN_SITES=beebe` is not
a supported alias. This worktree's shared dependency directory is read-only,
so the default Vite config loader cannot create `node_modules/.vite-temp`.
Baseline logs: `.cache/beebe-680/before/golden.log` and
`.cache/beebe-680/before/golden-build.log`.

- Historical f27 opening inspected and retained as
  [historical opening](../../.cache/beebe-680/before/historical-f27-opening.png),
  with `.cache/beebe-680/before/historical-f27-poses.json`. Source:
  `/home/vijay/submarine-explorer/.cache/golden/2026-10-04-110818/`.
  This is an archived reference, not a fresh baseline from this worktree.
- Direct baseline runner attempted after the default build failure:
  `.cache/beebe-680/before/capture.log`; failed manifest
  `.cache/golden/2026-10-05-052128/poses.json` has `complete: false`, zero captures.
  Chromium reports `sandbox_host_linux.cc:41 … shutdown: Operation not permitted`.
- Preview also fails with `listen EPERM` on `127.0.0.1:4280`. The Browser skill's
  alternate connection reports no available browser, with an empty browser list.
- New `tests/e2e/f-beebe-framing-680.spec.ts` requests the natural opening and
  ten-second views at 1600×900 High and 390×844 High/Low, with the HUD left on.
  Intended portrait paths are `.cache/beebe-680/after/beebe-portrait-high-0s.png`,
  `beebe-portrait-high-10s.png`, `beebe-portrait-low-0s.png` and
  `beebe-portrait-low-10s.png` under the same directory. Desktop paths follow
  `beebe-desktop-high-{0,10}s.png`. The orchestrator subsequently produced all
  six images outside the sandbox. They show the initial 24° opening and are
  retained in `.cache/beebe-680/facing-fix/before/`; they do not validate the
  corrected opening. Fresh captures of the final pose remain pending.
- After golden attempts: `.cache/beebe-680/after/golden.log`,
  `golden-build.log` and `capture.log`; direct runner manifest
  `.cache/golden/2026-10-05-052630/poses.json` is incomplete with zero captures.
  The targeted desktop/portrait E2E attempt is recorded in
  `.cache/beebe-680/after/portrait-capture.log`; its preview server also failed
  before any tests or screenshots ran.

**Rendered acceptance and a matched before/after golden pair remain pending.**
The geometry tests establish framing and clearance, not rendered beauty,
lighting or ten-second gameplay acceptance.

## Validation

Executed:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4280 PW_OUTDIR=dist-beebe-680 tools/gates.sh --full-e2e
```

- PASS production build (strict TypeScript, Vite and PWA stamp).
- PASS complete unit suite: 126 files, 1,336 tests. Existing hero integrity,
  readability, free-dive composition, plume and performance guards are intact.
- PASS Python: 144 tests; strict content validation; attribution; repository formatting.
- PASS new framing tests on actual Low/High survey terrain and C hull geometry
  at 1600×900 and 390×844. They include hull screen bounds, main chimney and
  34 m plume-axis visibility, hull raycast occlusion and camera/floor clearance.
  `.cache/beebe-680/framing-check.log` retains projection diagnostics.
- PASS new apron tests: natural vertex colour variation, tier budget, original
  chimney/collider/vent-tip/impostor preservation and non-Beebe exclusion.
  Raycasts against actual rendered Low/High terrain require at least 0.05 m
  clearance across sampled points in the inner 65% of the apron radius.
- BLOCKED full E2E and project-base E2E: preview process cannot start in this
  sandbox. Both production builds pass; no browser test pass is claimed.
  Full gate output: `.cache/beebe-680/gates.log`; individual logs retained in
  `.cache/beebe-680/gates/`. The targeted first-ten-seconds/portrait spec is
  likewise blocked, and rendered acceptance remains outstanding.
- PASS `git diff --check`.

Reproduction on a browser-capable host:

```bash
GOLDEN_SITES=beebe-vent-field tools/golden.sh
GATES_CONFIG_MODE=writable PW_PORT=4280 PW_OUTDIR=dist-beebe-680 tools/gates.sh --full-e2e
GATES_CONFIG_MODE=writable PW_PORT=4280 PW_OUTDIR=dist-beebe-680 npx playwright test tests/e2e/f-beebe-framing-680.spec.ts
```

## Facing gate follow-up

The orchestrator ran full gates outside this sandbox: build, unit, Python,
content, attribution, formatting and project-base E2E passed. Full E2E had
395 passing tests, eight skips and one failure in Beebe's
`f-visual-fixes.spec.ts` opening facing check: 0.913545 versus the unchanged
required value greater than 0.98. The three new desktop/portrait opening and
ten-second tests passed on that initial version. Pre-fix browser logs are
retained in `.cache/beebe-680/facing-fix/before/{e2e,e2e-base}.log`.

Root cause: the 24° hull turn used to clear the chimney has a facing dot product
of `cos(24°) ≈ 0.913545`. Fix: the final 11° turn gives `cos(11°) ≈ 0.981627`;
the existing -10 m lateral camera extension and 76 m approach separate the
chimney and hull while keeping both within the portrait frame. The short
54 m camera arm, -12 m vertical offset and seabed treatment remain in place.
No existing browser assertion or threshold changed.

The headless framing regression now also checks the same greater-than-0.98
facing requirement against the placed hero bounds, on Low, Medium and High.
It additionally checks the existing browser spec's orifice-left-of-`-0.1`
requirement alongside all prior visibility, raycast occlusion, hull bounds,
plume axis and camera/terrain clearance assertions. Final targeted projection
diagnostics: `.cache/beebe-680/facing-fix/framing.log`.

Final `tools/gates.sh --no-e2e` PASS: production build, all 1,337 unit tests
(126 files), all 144 Python tests, content, attribution and repository
formatting. Logs: `.cache/beebe-680/facing-fix/gates.log` and
`.cache/beebe-680/facing-fix/gates/`. `git diff --check` passes.
Browser recapture and the final full E2E rerun must be performed outside this
sandbox, which cannot start Vite or Chromium.
