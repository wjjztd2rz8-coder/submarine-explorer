# F-BEEBE-850 — seabed fidelity and sub readability

## Plan

1. Inspect the October 8 Beebe golden poses and F-TITANIC-780's horizon fix.
   Retain all three baseline PNGs and freeze non-Beebe rendering evidence.
2. Tune Beebe's existing terrain slots, add cooler-margin tube-worm/mussel clumps
   and broken chimney rubble, and correct its authored chase view. Keep Low cheap.
3. Run three verification rounds, full E2E/project-base gates, and Beebe golden
   capture. Compare all poses and record any blocked visual checks explicitly.

## Implementation

- Only Beebe's `TerrainBiome.ts` entry changes: sand / rubble / basalt slots
  reuse the shipped CC0 textures. Cooler grey-tan sand and darker cobble patches,
  increased patch coverage and contrast, 0.8 m ripples, and reduced rusty staining
  replace the nearly uniform orange surrounding floor. Instanced rubble replaces
  the mound scatter kind; the number of active scatter kinds remains three.
- Opt Beebe into the **same 300–1,100 m seabed fade** used in 780. The existing
  material mixes to Three's output-space `fogColor` after normal fog, also on Low,
  with the same 700–1,200 m camera-depth activation. Beebe already uses the fog
  colour as its water background, so it needs no extra dome or backdrop draw.
  This fade leaves the seabed within 300 m untouched. Atmospheric lighting, fog
  density, exposure and hull materials are unchanged.
- `props/geo/beebe.ts` extends its existing Beebe-only builder hook. Each of the
  three authored smokers gets sparse tube-worm / mussel clumps circling its base
  and following two broken cooler-flow margins, plus fractured column rubble.
  Geometry is deterministic, opaque, vertex-coloured and non-emissive, merged
  into **one extra draw per smoker**. Main-cluster placements raycast its actual
  apron triangles; the plain secondary smokers use a Beebe-only near-triangle
  sampler. Existing shrimp, stack bodies, vent sources, collision volumes and
  impostors are retained.
  Beebe-only additive dispatches in `Props.ts` prevent the secondary smokers'
  enlarged decorative footprints from sinking their roots. Their ground sampler
  interpolates the existing near-grid triangle vertices, without per-shell whole-
  chunk raycasts; other sites retain their previous sampler and placement bytes.
  The content notes identify the added fauna placement as scenic illustration.
- Beebe's authored `composedFreeDiveSpawn` chase offsets change from X −24 / Y −38
  to **X −48 / Y −12 m**, retaining its 54 m arm, spawn location and 11° yaw offset.
  Relative to the default offsets, this gives about **28° to the side / 14° above**
  the stern, showing more hull length and deck while keeping the smoker to port.
  Camera reset preserves this view. Other opening presets are byte-identical.
- No new textures, external assets, dependencies, lights or terrain geometry.

## Verification round 1

- Captured the pre-change non-Beebe snapshot before editing production code.
  SHA-256 evidence covers every other biome plus the unknown-site default,
  Low/High synthetic terrain attribute/index bytes, material uniforms, generated
  shaders, cache keys, and the spawn source with only its Beebe entry excluded.
  `beebeIsolation.test.ts` compares against those committed baseline fingerprints.
- New habitat/terrain tests fail on the original implementation, establishing the
  absent clumps, rubble slot and fade. Log: `.cache/beebe850/round1-red.log`.
- The first wider-angle camera failed the existing smoker-position guard. Tuned
  the offsets/arm until all existing desktop/portrait hull, plume-axis, terrain
  clearance, target-reticle and raycast sightline assertions passed. Added lateral
  angle, elevation and projected longitudinal-axis bounds; no framing assertion
  was relaxed. Log: `.cache/beebe850/framing-tune.log`.
- The older apron test now disables the independent habitat layer in its fixture
  so its exact apron dimensions still apply; its original geometry, collision and
  vent-tip assertions are retained. The new suite separately checks habitat bounds.

## Verification round 2

- **6 unit files / 36 tests pass**, including all four tiers of clump construction,
  deterministic placement, supporting apron/ground heights, collision preservation,
  geometry budgets, fog-output integration and existing opening readability.
  An Axial builder test checks identical vertex/instance buffers with Beebe
  extensions present versus absent. The frozen non-Beebe snapshot passes.
  Log: `.cache/beebe850/round2-unit.log`.
- Type checking passes: `.cache/beebe850/typecheck.log`. Final full-gate results
  and CPU geometry counts are recorded below after the third round.

## Verification round 3

- The initial full run found a TypeScript error in the new buffer-comparison
  test, corrected before the final build. It also hit existing Monterey timeouts:
  `heroIntegrity` Medium (15 s) and `montereyWallLife` High (45 s). Their isolated
  single-worker rerun passed with the Beebe checks: **7 files / 42 tests**.
  Logs: `.cache/beebe850/round3-initial-gates.log`, `round3-initial-unit.log`,
  `round3-correction-unit.log`. No timeout thresholds or Monterey code changed.
- Independent terrain rays found secondary-colony centres up to **0.326 m buried**
  on Low when using continuous procedural heights. The Beebe-only near-triangle
  sampler fixes that: secondary-colony centre error is below **0.000001 m** on
  all four tiers. Main-cluster colonies sit on the raised apron, about 0.05–1.2 m
  above underlying terrain at Medium+. Actual placed root heights, anchors and
  counts: [geometry evidence](F-BEEBE-850-geometry.json).
  The main flow extent is bounded inside the existing apron bounds so the hero's
  bounds centre and composed spawn position remain stable.
- New real-terrain placement tests use independent Three raycasts and catch both
  footprint sinking and continuous-versus-triangle placement errors. The shared
  prop file is fingerprinted with only the explicit Beebe dispatches excluded.
  Log: `.cache/beebe850/placement-fix.log` (**4 tests passed**).

CPU geometry added by the habitat (all three smokers resident, before culling):

| Tier   | Added draws | Added triangles | Clumps / worms / mussels / rubble per smoker |
| ------ | ----------: | --------------: | -------------------------------------------- |
| Low    |           3 |           2,250 | 3 / 9 / 15 / 9                               |
| Medium |           3 |          10,140 | 7 / 42 / 84 / 22                             |
| High   |           3 |          27,360 | 12 / 120 / 240 / 36                          |
| Ultra  |           3 |          67,320 | 19 / 304 / 608 / 58                          |

These are actual constructed CPU mesh counts, **not measured GPU frame counts**.
Terrain tessellation is unchanged; Low keeps PBR normal maps disabled. Rendered
frame budgets still need the blocked browser run below.

Final run: `GATES_CONFIG_MODE=writable PW_PORT=4850 PW_OUTDIR=dist-beebe850
tools/gates.sh --full-e2e`.

- Build/typecheck, **146 unit files / 1,473 tests**, **148 Python tests**, strict
  content validation and attribution pass. The earlier Monterey timeouts did
  not recur in this complete final unit run.
- The format gate caught the geometry evidence while it was being written;
  formatted the final evidence and reran the repository-wide format check.
  Final formatting and `git diff --check` pass.
- Full E2E and project-base E2E were attempted; both fail **before tests start**
  because Playwright cannot start its preview server in this sandbox. Project-base
  build succeeds. Gates exit **1**; browser gates are blocked, not passed.
- Logs: `.cache/beebe850/round3-gates.log`, retained
  `round3-{build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`,
  and `final-prettier.log` for the completed evidence formatting.

## Golden poses and visual QA

Baseline inspected: `/home/vijay/submarine-explorer/.cache/golden/2026-10-08-121600/`.
All three PNGs and its complete pose manifest are retained locally in
`.cache/beebe850/before/`. Shot 1 shows the hard distant skyline, warm flat outer
floor and foreshortened tall hull; shots 2–3 show the lit apron and shrimp but
sparse cooler-margin life. Baseline hull remains the brightest large object.

| Golden pose       | Before                                                     | After                     |
| ----------------- | ---------------------------------------------------------- | ------------------------- |
| 1 — opening chase | [PNG](../../.cache/beebe850/before/beebe-vent-field-1.png) | Blocked — no PNG produced |
| 2 — 40 m approach | [PNG](../../.cache/beebe850/before/beebe-vent-field-2.png) | Blocked — no PNG produced |
| 3 — 30 m detail   | [PNG](../../.cache/beebe850/before/beebe-vent-field-3.png) | Blocked — no PNG produced |

The requested `GATES_CONFIG_MODE=writable GOLDEN_SITES=beebe-vent-field tools/golden.sh`
built the baseline successfully but preview failed with **`listen EPERM` on
127.0.0.1:4298**. Direct desktop/portrait capture also failed at **launch Chromium**,
before any page was created. No after PNGs exist and visual QA is **pending**,
including distant ripple/cobble readability and the hull remaining the brightest
large shape. Geometry/material checks cannot establish rendered pixel brightness.
Logs: `.cache/beebe850/golden-before.log`, `.cache/beebe850/golden-after.log`,
`.cache/beebe850/chromium.log`. Failed desktop/portrait manifest:
`.cache/golden/2026-10-08-134650/poses.json` (`complete: false`, `captures: []`).

Baseline bundle: `dist-beebe850-before/`. Final after bundle: `dist-beebe850/`.
The after `tools/golden.sh` attempt again built successfully and failed to listen
on 127.0.0.1:4298. No rendered success is inferred from either build. On a
browser-capable host, serve the baseline and after bundles on separate ports
and use this branch's unchanged golden script for both:

```bash
GATES_CONFIG_MODE=writable GOLDEN_SITES=beebe-vent-field GOLDEN_LAYOUTS=desktop,portrait tools/golden.sh
# Or with baseline/after previews already running:
GOLDEN_SITES=beebe-vent-field GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs --base-url http://127.0.0.1:4310/
GOLDEN_SITES=beebe-vent-field GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs --base-url http://127.0.0.1:4311/
```

Compare all three matched desktop poses, repeat portrait and Low, check the
smoker beside the three-quarter hull, scan clearance, readable cool/dark sediment
patches beyond the pool, clumps/rubble attachment, and a gradual far-floor fade.
Record actual renderer counts and confirm the hull's brightness from those PNGs.
