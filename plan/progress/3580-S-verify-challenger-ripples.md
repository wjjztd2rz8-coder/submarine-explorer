# 3580 — S-verify: Challenger ripples

## Scope and merge prerequisite

Numeric verification for DIRECTOR Backlog 9, following the existing-capability-spec rule.
Reviewed checkout: `04cf357`. The named `claude/V-challenger-ripples` branch and
worktree are no longer present locally, but its implementation `7a9a311`, snapshot update
`a259aaf` and final package commit `c83b305` are ancestors of both `main` and this
checkout (`git merge-base --is-ancestor c83b305 main` and `HEAD` both exit 0).
The audit therefore proceeds. Baseline: `ccef323`, parent of the implementation.

Result: **no numeric discrepancy found**. No runtime fixes, data changes, snapshot
updates, visual assessment or push.

## Tier costs

Lander costs come from `landerVerification.test.ts`. Dimensions, seed and flat/sloped
ground variants retain the same counts. The full lander uses no instancing.

| Tier   | Lander triangles before → after | Budget | Spare | Full draws | Alternate impostor triangles / draws |
| ------ | ------------------------------: | -----: | ----: | ---------: | -----------------------------------: |
| Low    |                   1,985 → 1,985 |  2,000 |    15 |          3 |                               12 / 1 |
| Medium |                   2,822 → 2,822 |  3,000 |   178 |          3 |                               12 / 1 |
| High   |                   2,822 → 2,822 |  3,000 |   178 |          3 |                               12 / 1 |

Ultra/unknown fallback remains 2,822 triangles and three draws. Ripples change
fragment shading and add no mesh, instance or draw call; the existing Low margin
remains only 15 triangles. This does not measure shader execution time.

Scatter counts below use the **existing synthetic Challenger fixture** in
`beebeScatter.test.ts`: seed 1130, camera X/Z (32, 32), sloped ground
`-100 + 0.05x - 0.1z`, 128 settling updates, authored tier density/range.
They are bounded fixture costs, not full-scene or rendered-frame counts.

| Tier   | Resident cells | Dropstone | Boulder | Rubble | Mound | Total instances | Instanced triangles | Draws |
| ------ | -------------: | --------: | ------: | -----: | ----: | --------------: | ------------------: | ----: |
| Low    |              9 |        91 |      12 |    144 |    55 |             302 |              25,720 |     4 |
| Medium |             25 |       596 |      78 |    360 |   128 |           1,162 |             133,520 |     4 |
| High   |             45 |     2,138 |     246 |    636 |   213 |           3,233 |             438,540 |     4 |

Every kind stays below the existing 4,096-instance cap. The existing real-survey
opening/keep-out fixture also passes unchanged: Low 291 instances / four draws;
High 3,187 / four draws, identical across its three viewports. Scatter source,
configuration, placement snapshots and keep-out fixture are unchanged by the package.

The shipped Challenger survey was also exercised through the existing terrain
integrity spec, selecting Challenger instead of its vent-site table for this local
diagnostic run. Costs include chunk skirts and near-LOD triangles, before culling.

| Tier   | Requested → fitted subdivision | Chunks | Resident vertices | Near-LOD triangles |
| ------ | -----------------------------: | -----: | ----------------: | -----------------: |
| Low    |                          1 → 1 |    225 |           911,125 |          1,765,400 |
| Medium |                          2 → 2 |    225 |         3,477,325 |          6,843,200 |
| High   |                          3 → 2 |    225 |         3,477,325 |          6,843,200 |

The existing 4,000,000-vertex fitting limit reduces High subdivision to two;
Medium and High therefore have the same resident costs. No terrain budget or
assertion was loosened.

## Buffer, bounds and isolation checks

- Local diagnostic assertions in the existing lander/scatter specs checked every
  geometry attribute and index for finiteness, plus complete instance matrix/color
  arrays and finite lander bounds/colliders. All passed at Low/Medium/High, with
  the lander fallback checked too.
- The existing terrain integrity assertions checked all Challenger terrain
  attributes and near indices at all three tiers: zero invalid indices and zero
  degenerate triangles.
- The lander relief spec still proves raised/sloped ground dressing cannot enlarge
  placement bounds or colliders. Real-survey opening, camera-arm and boulder
  keep-outs pass against unchanged fixtures/snapshots.
- `ccef323 → c83b305` changes only three runtime files: `TerrainBiome.ts`,
  `TerrainMaterial.ts`, and `terrain.frag.glsl`. Lander construction, colliders,
  bounds, terrain construction, scatter and survey/prop data are untouched.
  There is no subsequent diff from `c83b305 → 04cf357` in `src/world`, terrain
  configuration, Challenger survey/prop data or the audited isolation artifacts.
- Parsed the pre/post cross-site isolation snapshot: **53 changed leaves**,
  comprising 26 shader digests, 26 uniform digests and Challenger's biome digest.
  **Zero buffer digest changes**, across all 13 recorded biome/default entries at
  Low/High. All control biome digests and program cache keys are unchanged; the
  separate Beebe geometry/placement/budget snapshot is byte-identical.
- Control uniform digests change because each receives `uRippleReach: 0`, and
  shader digests change because the shader declares/uses that uniform. These are
  expected metadata changes, not control-site buffer changes. Challenger binds
  reach 0.4 and ripple strength 2.5; wavelength remains 1.6 m.

## Materially missing guard

Only the existing owned capability spec `biomeFloorVariety.test.ts` was edited.
The package's original check covered biome values but did not directly verify the
new uniform's binding/default or retained material isolation at every tier.
Added three table-driven cases constructing Titanic/Monterey controls before and
after Challenger. They check finite ripple inputs, positive wavelength, the actual
shader uniform binding, reach 0.4 versus default zero, independent uniform ownership,
and unchanged live control values/configuration/biome registry. No new spec or
weakened assertion.

## Validation and retained local evidence

- Standard capability runs: **6 files / 56 tests pass** (45 material/lander/
  scatter/isolation tests, plus 11 opening/keep-out tests).
- Extra numeric diagnostics inside existing specs: **3 files / 17 tests pass**;
  69 unrelated cases filtered out. Assertions inspect all buffers/caps and reuse
  the shipped-survey terrain integrity table. No additional spec was created.
- TypeScript and changed-file Prettier checks pass; `git diff --check` passes.
- Browser and full-repository gates were not needed for this numeric-only scope.

```sh
npm test -- --configLoader runner --silent=false --reporter=verbose tests/unit/landerVerification.test.ts tests/unit/beebeScatter.test.ts tests/unit/biomeFloorVariety.test.ts tests/unit/beebeIsolation.test.ts
npm test -- --configLoader runner tests/unit/verify1360.test.ts tests/unit/deepOpening.test.ts
npx vitest run --config .cache/3580-audit/vitest.config.mjs --configLoader runner --silent=false --reporter=verbose tests/unit/landerVerification.test.ts tests/unit/beebeScatter.test.ts tests/unit/terrain-detail.test.ts -t 'merged Challenger lander|1310: larger Challenger|challenger-deep.*finite'
npm run typecheck
npx prettier --check tests/unit/biomeFloorVariety.test.ts plan/progress/3580-S-verify-challenger-ripples.md
git diff --check
```

Ignored local evidence: `.cache/3580-audit/{capabilities,placement,numerics,typecheck}.log`,
the diagnostic Vite config, and `snapshot-delta.json`. Diagnostic transforms add
assertions/logging to existing tests and select the Challenger survey; they do not
alter runtime source, checked-in specs other than the guard above, or expectations.
