# S-verify — Lost City and Beebe geometry

2026-10-20. Numeric verification of `02d75ca`; no rendering. Reference requested
by the brief: `git show HEAD~8`, commit `cf9ff80`. That reference already contains
the tower, terrace and mouth-disc changes, so the growth comparison does not
measure their original introduction.

## Findings and minimal fix

- All three tiers of both sites pass finite attribute, matrix, bounds, collider,
  index-range and zero-area triangle checks after the fix below. Prop checks
  build every shipped definition against a sloping local ground fixture and
  inspect both full geometry and impostors, including instance templates.
  Terrain checks build the actual shipped heightmaps at the requested tier,
  including skirts. Low props and resident terrain each grow **0%** versus
  `cf9ff80`, below the 10% limit.
- The reference and initial checkout both contain **96 / 120 / 120 zero-area
  triangles per anemone template** on Lost City's Low / Medium / High hero.
  `buildAnemone` sweeps its vertical column using the default vertical reference
  axis; their cross product is zero, collapsing every column ring. Set that
  sweep's reference axis perpendicular to the column. No dimensions, colours,
  densities or other art values change, and triangle/draw counts stay equal.
  The three Poseidon buffer hashes and the legacy Lost City Low census hash
  change in existing snapshots;
  placement, bounds, colliders, vent anchors and budgets remain identical.
- Beebe checks **288 top-disc buffer vertices per tier**, including each triangle's
  duplicated centre and rim vertices. The independent assertion computes nearest
  points on the built body's triangles, rather than reproducing the ray-drop
  algorithm. Maximum distances: Low **0.009985703 m**, Medium **0.009994873 m**,
  High **0.009998337 m**; all are below **0.5 m**. Side outlet discs are separately
  identified by their horizontal normals; the exact top-vertex count prevents
  accidental omission. The assertion lives in `props-geo.test.ts`.
- `rg -n 'topMouthRecessFraction' src data docs` returns no matches.

## Budgets

Static prop calls count point effects, material groups/passes and instances using
the existing `perf-budget` census with all placed props present. These are CPU
geometry/content counts; terrain counts include every resident chunk at LOD 0,
not a camera-selected rendered frame. Scatter, vehicles and free-swimming life
are outside this census.

| Site      | Tier   | Prop triangles | Prop calls | Terrain triangles | Terrain chunks/calls |
| --------- | ------ | -------------: | ---------: | ----------------: | -------------------: |
| Lost City | Low    |         50,712 |         40 |           240,924 |                   30 |
| Lost City | Medium |        146,610 |         40 |         1,004,112 |                   90 |
| Lost City | High   |        205,828 |         40 |         1,229,904 |                   90 |
| Beebe     | Low    |         20,338 |         19 |           672,628 |                   90 |
| Beebe     | Medium |        104,306 |         19 |         2,605,296 |                   90 |
| Beebe     | High   |        179,834 |         19 |         5,798,004 |                   90 |

All prop costs are below the existing conservative 1,200,000 triangle / 1,200
call content bounds. Even adding every Low terrain chunk gives **291,636 / 70**
for Lost City and **692,966 / 109** for Beebe, leaving room under those bounds.
Medium/High terrain totals describe resident geometry, not the Low frame budget.
High Lost City correctly caps the base subdivision from 3 to 2 and retains nine
local subdivision-8 chunks. Resident vertices including skirts are respectively
124,296 / 513,522 / 627,570 for Lost City and
347,416 / 1,324,402 / 2,931,408 for Beebe.

## Validation

- Focused census: `VENT_SURFACE_AUDIT=1 PERF_BUDGET_STATIC=1 npx vitest run
tests/unit/props-geo.test.ts tests/unit/terrain-detail.test.ts
tests/unit/perf-budget.test.ts --configLoader runner --cache=false --pool=threads
-t 'authored vent surface integrity|shipped vent terrain integrity|catalog site static prop budgets.*(lost-city|beebe)'`:
  **18 tests passed**. Evidence: `.cache/vent-surfaces/{props,terrain}.json` and
  `.cache/perf-budget/static.json`.
- The same census in an isolated `git archive HEAD~8` checkout: **15 passed,
  3 failed**, precisely the three Lost City degenerate-template checks. Costs,
  terrain counts and Beebe distances agree with the current checkout. Retained
  baseline JSON: `.cache/vent-surfaces/baseline/`.
- The three Lost City golden cases were updated for the corrected anemone
  column; all three passed. The aggregate unit suite also exposed the legacy
  Lost City Low census hash, which includes the same anemone buffers. That hash
  alone was refreshed and its targeted check passed with unchanged draw/triangle
  assertions. No assertion or timeout was relaxed.
- Final `npm run typecheck` and `npm run build -- --outDir
.cache/vent-surfaces/production --config .cache/vent-surfaces/vite.config.mjs
--configLoader native` **passed**. The native config was bundled locally with
  the gate's existing Rolldown procedure to avoid the read-only dependency tree.
- Aggregate invocation: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  The first build attempt caught type annotations missing from the new tests;
  these were corrected, then the final typecheck and production build above
  passed. Python reports **162/167 passed** and five previously recorded failures:
  four CI manifest tests fail at child `spawnSync git EPERM`; golden tooling
  fails parsing empty CLI output with `Unexpected end of JSON input` (cause
  unclassified). See also `S-verify-21.md` for these signatures before this work.
  The unit gate completed in **614.31 s: 3,344 passed, 1 failed in 192 files**;
  its only failure was that legacy Lost City Low hash, corrected and independently
  retested above. Content, attribution and repository-wide Prettier **passed**.
  The aggregate invocation exited **1**; no aggregate-green claim is made.
- Final affected-spec verification after all corrections:
  `VENT_SURFACE_AUDIT=1 PERF_BUDGET_STATIC=1 npx vitest run
tests/unit/props-geo.test.ts tests/unit/terrain-detail.test.ts
tests/unit/perf-budget.test.ts tests/unit/terrainMerge1140.test.ts
tests/unit/lostCityBiome.test.ts --configLoader runner --cache=false
--pool=threads --maxWorkers=1`: **5 files / 192 tests passed**, 145.45 s.
  This includes the corrected legacy census snapshot, all golden cases in the
  prop spec, the existing terrace/physics checks, the complete static budget
  census, and the final instance-colour and non-singular transform guards.
  Log: `/tmp/vent-final-focused.log`.
- Final `git diff --check` and repository-wide Prettier **passed**.
- A separate `tools/gates.sh --phase build` bundles successfully but fails at its
  subsequent CI manifest writer with `spawnSync git EPERM`; this failure is
  separate from compilation and explains why the final direct build was used.
- Aggregate logs: `.cache/runs/20261020-164823-12-jS1jso/`;
  phase-build log: `.cache/runs/20261020-164930-12-y4Skqs/build.log`;
  successful production build: `/tmp/vent-production-build.log`.

## Simplicity

One sweep-axis correction; existing geometry, terrain and budget capability specs
extended. No new spec, runtime abstraction, dependency, setting, site branch,
guidance surface or UI. No art-value changes, browser execution or visual claim.
