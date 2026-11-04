# S-verify-dropstones

Verified merged HEAD `cc3c46618bd9d7367e4206c46283b62cc875675c` on 2026-11-04.

## Plan and result

1. Check feature registration, deterministic generation, DIMS and validation.
2. Place all Endurance props on real survey terrain at Low/Medium/High; check
   the free-dive and mission openings against rendered stones, submarine and wreck.
3. Fix demonstrated defects, run existing capability checks and record limits.

No production defect found. The builder and Endurance data remain unchanged.
The verification gap was test coverage: generic determinism compared only the
first 300 position values, and collision checks ignore these two deliberately
non-colliding clusters. Extended existing capability tests to cover both gaps.

## Findings

- `dropstones` is present in `GEO_FEATURES`, the builder registry, Python's
  `GEO_FEATURES`, and the `tests/unit/props-geo.test.ts` DIMS table (`[14, 12, 3]`).
  The existing generic finite-geometry, determinism and Low-vs-High cost tests pass.
- Added full-buffer/material/bounds/collider determinism checks for both authored
  clusters at every tier on flat and sloped ground. Independent same-seed builds
  match; changing the seed changes buffers; attributes and boxes remain finite;
  source definitions remain unchanged. Both clusters intersect the mud and retain
  above-ground relief on the synthetic slope.
- Strict `validate_props.py --tile endurance` accepts all six props with zero
  errors or warnings. The validator's 22 unit tests pass.
- Both clusters specify `collision: "none"`. Their builder collision boxes serve
  the impostor and would be available if a prop opted into box collision; current
  Endurance placement intentionally installs no collision volumes for the stones.
- Extended `deepOpening.test.ts` to compare actual world geometry bounds against
  the wreck and the submarine's swept bounds, padded by 4 m. Both mission and
  free-dive routes pass at all three tiers. The sweep runs continuously from the
  opening to the hull target's X/Z at the opening altitude and yaw, conservatively
  checking the whole enclosing box rather than isolated route samples.

Minimum measured gaps across Low/Medium/High (metres):

| Cluster      | Free-dive spawn centre to stone bounds | Mission spawn centre to stone bounds | Free-dive padded sweep to stone bounds | Mission padded sweep to stone bounds |
| ------------ | -------------------------------------: | -----------------------------------: | -------------------------------------: | -----------------------------------: |
| dropstones-a |                                 61.774 |                               23.117 |                                  4.936 |                               10.652 |
| dropstones-b |                                 90.903 |                               28.084 |                                  6.961 |                               12.677 |

Spawn columns measure point-to-box distance, not hull surface clearance. Sweep
columns are conservative box-to-box distances **after** the extra 4 m margin.
The wreck geometry bounds are disjoint from both clusters at every tier.

## Validation

Completed:

```sh
npm test -- --configLoader runner --cache=false --maxWorkers=1 --pool=threads tests/unit/props-geo.test.ts -t dropstone
npm test -- --configLoader runner --cache=false --maxWorkers=1 --pool=threads tests/unit/props-geo.test.ts
npm test -- --configLoader runner --cache=false --maxWorkers=1 --pool=threads tests/unit/deepOpening.test.ts -t endurance
npm test -- --configLoader runner --cache=false --maxWorkers=1 --pool=threads tests/unit/props-geo.test.ts tests/unit/props-collision.test.ts tests/unit/openingClearance1290.test.ts tests/unit/missionApproach.test.ts
python3 tools/validate_props.py data/landmarks/endurance/props.json --tile endurance --strict
python3 -m unittest tools.tests.test_validate_props
npm run typecheck
```

The broader capability run passes: **4 files, 200/200 tests**, covering all geo
props, prop collision, opening camera clearance and mission approaches. The full
props-geo suite also passes independently: **92/92 tests**, including existing
geometry snapshots. Focused runs pass the 6 dropstone tests, 3 extended Endurance
opening tests, and 3 existing Endurance camera/near-plane/arm checks. Endurance's
mission approaches pass in both modes at all three tiers. Formatting and
`git diff --check` pass.

Production build passes using a temporary copy of `vite.config.ts` under `/tmp`,
with its imports resolved to repository dependencies/plugins. This avoids writing
Vite's bundled config into the read-only shared `node_modules`; a runner-loader
build instead hit the existing PWA plugin's closed-module-runner error. No build
configuration or tooling is changed in the repository.

Searched `tests/e2e` for Endurance/opening/prop coverage and attempted:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4185 npx playwright test tests/e2e/opening-framing.spec.ts tests/e2e/f-endurance-1180.spec.ts -g 'endurance.*merged opening clears terrain|endurance: underwater free-dive opening|Endurance.*hull-close lighting stays finite'
```

This selects 10 existing tests (confirmed with `--list`). Execution is blocked
before any test runs: the sandbox denies the Vite preview server bind with
`listen EPERM: operation not permitted 127.0.0.1:4185`. Browser checks are not
claimed green. No visual acceptance, arbitrary subsequent piloting path or
first-person camera acceptance is inferred from the numeric checks.

## Simplicity

Only existing capability tests and this requested progress note change. No new
runtime system, setting, guidance, layout patch, site branch or snapshot update.
No guarding assertion is loosened and no new package-named spec is added.
