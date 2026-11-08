# S-verify-endurance-relief

Verification of merged `V-endurance-seabed-patches` at
`ee243d5cae55c488b400b1e02dc0475ee62b2822` (2026-11-08).
`0192a883` is an ancestor of this checkout; its preparatory edit is `9a93a4c5`.

## Plan and result

1. Inspect the alpha change, depth/sorting policy and tier registration.
2. Extend existing ridge and atmosphere capability tests for perimeter alpha,
   particle ordering and unchanged geometry cost.
3. Run focused Endurance browser checks and `tools/gates.sh`; record evidence
   and environment limits. Fix production code only for a demonstrated defect.

No production defect reproduced by the numeric checks. Production code remains
unchanged. Added five tests to the existing capability files and strengthened
existing marine-snow assertions. **Rendering acceptance is incomplete:** the
sandbox blocks the browser server before tests execute. No screenshot, absence
of sorting/overdraw artifacts or measured full-scene GPU budget is claimed.

## Capability evidence

`tests/unit/enduranceScour.test.ts` now builds the actual mesh on flat and
sloping terrain. It checks every perimeter vertex of all ten ridges, finite RGBA
values, alpha bounded to [0, 1], increasing alpha from either side toward each
crest, translucent interior samples and fully opaque crests. Perimeter alpha is
within `1e-10` of zero: `sin(pi)` and `cos(pi/2)` produce harmless floating-point
residues. The baked normal lighting preserves the alpha channel.
The installed Three.js `WebGLPrograms` enables `vertexAlphas` for this exact
combination of `vertexColors: true` and a four-component colour attribute.

It also checks vertex colours, normal blending, transparency, enabled depth
testing, disabled depth writing and a single front-facing material, without
child meshes or geometry groups. This protects opaque scene depth from being
ignored and prevents an accidental second material pass.

`tests/unit/enduranceAtmosphere.test.ts` checks actual preset construction at
all three tiers. Low has only the horizon and no relief. Medium and High each
have one relief, one horizon and the existing two particle layers. Haze, motes
and marine snow render after the relief, keep depth testing enabled and do not
write depth. All existing scene/material/buffer snapshots pass unchanged.

Read-only material audit: wreck wood/steel and dropstones use opaque materials;
the opaque submarine body also writes depth, so those surfaces participate in
the relief's depth test. Submarine acrylic has render order 2, wash 3 and halo 4;
preset particles and marine snow have order 1, while relief has order 0. The
wreck's transparent stern lettering is a separate depth-tested decal. These
policies are consistent with the intended composition but cannot establish
correct pixels for every camera angle. In particular, disabled relief depth
writing does not provide ridge occlusion for subsequent transparent particles.
That interaction and overlapping ridge triangles still require rendered review.

## Geometry cost comparison

Compared the pre-change builder (`9a93a4c5^`) with the current builder on the
same flat and sloping terrain, using Node type stripping and the shared RNG.
Position, normal and index buffers are byte-identical in both cases. Local
script and full hashes: `.cache/relief-audit/{compare.mjs,comparison.json}`.

| Tier   | Relief draws before / after | Relief triangles before / after |
| ------ | --------------------------: | ------------------------------: |
| Low    |                       0 / 0 |                           0 / 0 |
| Medium |                       1 / 1 |                     3360 / 3360 |
| High   |                       1 / 1 |                     3360 / 3360 |

Medium/High retain 2,030 vertices and one single-sided material. RGBA adds
8,120 bytes to the colour buffer. Moving the same geometry to the transparent
queue changes blending/fill cost, which is not measured by these CPU checks.
The draw figures describe the unchanged mesh/pass structure, not measured
`renderer.info` counters or frame time.

## Validation

Passed:

```sh
npm test -- --configLoader runner --cache=false tests/unit/enduranceScour.test.ts tests/unit/enduranceAtmosphere.test.ts
node .cache/relief-audit/compare.mjs
```

Focused capabilities: **2 files, 32 tests passed**; snapshots unchanged.

Searched `tests/e2e` for Endurance, relief/scour, dropstones and render budgets.
The following selects five existing tests (confirmed with `--list`), including
Low/Medium/High lighting and desktop/portrait captures, the Low scene budget,
and the opening/15 m detail approach:

```sh
DEBUG=pw:webserver GATES_CONFIG_MODE=writable PW_PORT=4197 PW_OUTDIR=dist-relief \
  npx playwright test tests/e2e/f-endurance-1180.spec.ts \
  tests/e2e/f-perf-budget.spec.ts tests/e2e/opening-framing.spec.ts \
  -g 'Endurance (low|medium|high): hull-close lighting stays finite and horizon renders|endurance opening stays within the Low-tier frame geometry budget|endurance: underwater free-dive opening' \
  --output=.cache/relief-e2e
```

**Blocked before test execution:** Playwright cannot start/check its web server;
local connections report `connect EPERM` for both `::1:4197` and
`127.0.0.1:4197`, then the configured web-server process exits 1. An earlier
attempt selecting just the three tier tests fails at the same startup step.
These tests were attempted, not passed. No browser evidence was produced.

Required gates:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4196 PW_OUTDIR=dist-relief bash tools/gates.sh
```

The gate run was interrupted with exit 130 after its unit stage produced no
summary for seventeen minutes. It is **not green**. Stage logs:
`.cache/runs/20261108-033130-2-xCB05L/`.

| Check                | Result                                                   |
| -------------------- | -------------------------------------------------------- |
| Config/content/build | PASS, including TypeScript and the production Vite build |
| Python               | FAIL: 164 passed, five failed, 169 total                 |
| Default unit stage   | Interrupted; no summary                                  |
| Smoke/project-base   | Not reached by the interrupted gate                      |
| Attribution/Prettier | PASS when run separately after interruption              |

Four Python manifest tests fail with `spawnSync git EPERM`; the golden-tooling
test fails with `SyntaxError: Unexpected end of JSON input` in its partial-set
comparison. These tooling paths are unchanged by this tests-only patch, and the
same failure categories appear in prior verification notes.

An explicit thread-pool diagnostic made progress but exceeded its deliberate
120-second limit (exit 124); it is not counted as a passing suite. The subsequent
full thread-pool rerun **passes: 196 files, 4,636 tests, exit 0**, in 933.27 seconds:

```sh
npm test -- --configLoader runner --cache=false --pool=threads --reporter=verbose
python3 tools/check_attribution.py
npx prettier --check .
git diff --check
```

Full thread-pool log: `.cache/relief-audit/unit-full-threads.log`.
Attribution, repository Prettier and `git diff --check` pass.
The interrupted default run does not establish a runner defect; no tooling
change is proposed. The temporary `dist-relief` build was removed after checks.

## Simplicity

Only two existing capability specs and this requested note change. No new
runtime branch, setting, system, guidance, layout patch, package-named test,
package number in code or snapshot rebaseline. No existing assertion is loosened.
