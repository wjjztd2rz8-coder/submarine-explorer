# S-bughunt — vent light offsets

Standing `plan/DIRECTOR.md` Backlog 12, **S-verify / S-bughunt [Codex, standing]**.
Reviewed HEAD `cb279a7a2ca6b5dacf8033024fe61429ac8798f6` against the offset delta
`4408f0a..421e7cb1ea19939bfc62a3a7507774c35d9718fb`, test follow-up
`416d32072e1c8fead465eb0419f9447eac93e792`, formatting `af6daf5`, and merge
`53d4d81f8a05ececd1dbab6a54320911dba7d071`. The current consumer differs from
the initial offset patch only in formatting before this fix.

Read `V-beebe-flank.md`, the actual diffs, Beebe mission/site data, and the
completed 2480 report (`S-verify-beebe-profile.md`, merged in `23be1bd`). Its
resolved material defaults/isolation audit predates these controls and was not
repeated. The dispatch result for 2480 reports outer smoke/project-base gates
passing; its authored report separately records inner Python failures and a
separately completed unit suite. Those are distinct evidence, not this run's results.

Before editing, checked launched briefs 2630–2680, available dispatch results,
current worktrees/status, and the neighboring capability specs. At inspection,
2630–2670 had no dispatch result files; 2630/2640/2650 had in-progress files or
notes. This worktree started clean. `presets.test.ts` is this brief's test scope;
2660 owns `props-geo.test.ts`, 2670 owns `wrecks.test.ts`. Neither is edited.
Scan/boost, event contacts, audio, release tooling, High fill budgets and Beebe
Low cap appearance remain outside this audit.

## Wiring and parameter matrix

`DEFAULT_PRESETS.vent` → `DEFAULT_CONFIG.presets` → `presetDefaults()` →
`PresetSystem.resolve()` / `mergePresetParams()` with mission environment
overrides → `PresetSystem.tryEnter()` → **`VentPreset.enter()`**, specifically
the `GlowLights` constructor positions map. This is the new parameter consumer.
The source positions are real orifice tops supplied by `toPresetProps()` (which
honors `ventTop`), or vent POI positions when no procedural chimneys exist.
Headless tests use deterministic reduced prop/POI fixtures, not rendered site geometry.

| Sulfide input drop / standoff (m) | Resolved drop / standoff | Placement relative to selected top                         |
| --------------------------------- | ------------------------ | ---------------------------------------------------------- |
| Both omitted                      | 4 / 0                    | `(0, -4, 0)`, same as before the delta                     |
| 0 / omitted                       | 0 / 0                    | At the top; zero does not trigger the 4 m fallback         |
| omitted / 6                       | 4 / 6                    | 4 m below, 6 m horizontally along lean                     |
| 12 / 0                            | 12 / 0                   | Directly 12 m below; zero standoff is preserved            |
| 0 / 6                             | 0 / 6                    | Level with top, 6 m horizontally along lean                |
| Beebe mission: 12 / 6             | 12 / 6                   | Authored offsets reach actual PointLight positions         |
| 1,000,000 / 1,000,000             | Same                     | Accepted existing numeric ceiling; positions remain finite |

Both resolved parameters and directly omitted consumer parameters are exercised.
The existing override merger accepts finite, nonnegative numeric values up to
1,000,000 for these keys. Focused guards reject NaN, both infinities, -1,
1,000,001, null and a numeric string, retaining 4/0 and warning once per key.
No validator, schema or configuration domain was added or changed.

The supported lean is derived from the first selected source:
`angle = 0.35 + (ventVariety(top).lean % 1) * 0.5`, direction
`(cos(angle), sin(angle))` in X/Z. It is finite and unit length; its angle is
within `[0.35, 0.85)` radians. There is no preset lean-direction override or
zero-vector direction input. Two different seeded source positions exercise
this existing direction path; no invented cardinal-direction domain is tested.
Unsorted chimney fixtures prove tallest-first selection, truncation by
`maxSources`, preference over POIs, exact vertical displacement, and 6 m
horizontal distance. Frozen source vectors/arrays and params remain unchanged.

## Reproduced defect and minimal fix

The config comment documents both new controls as **sulfide** controls. Before
this fix, carbonate ignored `glowDropM` but still applied `glowStandoffM`.
An accepted carbonate configuration with drop 12 and standoff 6 produced
`(4.87995645413711, -4988, 3.4908487514823037)` from top `(0, -4990, 0)`;
the existing carbonate contract requires `(0, -4988, 0)`.

The new regression failed on that exact mismatch: **1 failed, 84 passed** in
the two relevant capability specs. The fix resolves standoff to zero for
carbonate once in the existing glow construction branch. Sulfide still reads
the same configured standoff, and carbonate keeps +2 m and its existing 0.35
intensity multiplier. This changes no shipped site's authored appearance:
Lost City already requests zero glow lights; Beebe is sulfide.

## Tier, site and lifecycle evidence

Existing per-site `PresetSystem` fixtures now supply four frozen vent POIs for
the three shipped vent missions and run three updates at every graphics tier.
They exercise mission resolution, actual visual-tier gating, construction,
flicker and disposal without WebGL.

| Site                 | Low lights | Medium lights | High lights | Offset (m)                                                           |
| -------------------- | ---------: | ------------: | ----------: | -------------------------------------------------------------------- |
| Beebe                |          0 |             3 |           3 | 12 down / 6 sideways                                                 |
| Axial Seamount ASHES |          0 |             2 |           2 | 4 down / 0 sideways, prior positions/count                           |
| Lost City            |          0 |             0 |           0 | Authored lights disabled; independent carbonate fixture retains +2 m |

There is no separate Medium light reduction: Low disables visual objects,
while Medium/High share `min(3, max(0, round(glowLights)), selectedSources)`.
The selected-source fixture requests eight lights with two selected sources
and receives two; with four selected sources it receives exactly three.
Existing generic omitted-param and forced-Titanic vent
checks retain their particle/draw contracts. Other sites keep their own preset
selection; no site JSON or per-site branch in shared code changed.

Each update retains finite positions and the expected horizontal/vertical
distances and unique light names. Actual PointLights retain 60 m distance,
decay 2, no shadows, and the existing index-dependent flicker formula at each
elapsed time. Its two sine amplitudes sum to 0.11, bounding intensity between
0.89 and 1.11 times base (3000 Beebe, 260 default). Updates change intensity,
not placement. Mission documents, configuration and input POIs serialize
identically before and after the complete system lifetime.

Repeated `enter → exit → enter` on the same preset, in both the reused scene
and a fresh scene, reuses immutable params without compounding offsets.
Interleaved visual-off, empty-source and
zero-light entries retain zero lights/stats. Each captured light's `dispose()`
runs exactly once, even with repeated exit; removed lights have null parents,
the scene empties, and stats reset. Mutating an old disposed light does not
move recreated lights or source positions. No lifecycle defect was reproduced
on this changed path. Direct double-enter without exit is outside the system's
supported lifecycle (`tryEnter` enters once).

## Checks

- Before fix: `npx vitest run tests/unit/presets.test.ts tests/unit/ventHazeBudget.test.ts --configLoader runner --cache=false`: **1 failed / 84 passed**, carbonate displacement regression above.
- After fix, same command: **2 files / 85 tests passed**.
- Final fixture refinements (three-light cap and fresh-scene recreation), same focused command: **2 files / 85 tests passed**; separate final `npm run typecheck`: **passed**.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`: **FAIL, exit 1, e2e=none**. Individual outcomes:

| Gate                                  | Actual outcome                              |
| ------------------------------------- | ------------------------------------------- |
| Writable config bundle                | PASS                                        |
| Python                                | FAIL: 167 tests, 5 failures                 |
| Strict content validation             | PASS                                        |
| Production build including TypeScript | PASS                                        |
| Full unit suite, default fork pool    | PASS: **192 files / 3,292 tests**, 604.67 s |
| Attribution                           | PASS                                        |
| Repository-wide Prettier check        | PASS                                        |
| Browser e2e / project-base            | Not executed (`--no-e2e`)                   |

Four Python failures are `test_ci_build_manifest` provenance cases, blocked at
child-process `git rev-parse HEAD` with **`spawnSync git EPERM`**. The fifth is
`test_golden_tooling`: its Node subtest “golden comparison refuses partial sets,
missing files and incompatible poses” fails with **`Unexpected end of JSON input`**.
The latter's root cause is unestablished; it is recorded as a tooling failure,
not reclassified as an environment pass. These are the same signatures in
2480's report and do not involve the vent offset path. No tooling was changed.

- Final `git diff --check` and changed-file Prettier check: **passed**.

Gate logs and saved before/after focused results:
`.cache/runs/20261018-183445-3-2vxa9I/`. E2E mode is explicitly
**none**, chosen to honor the no-game-rendering constraint. Browser smoke,
project-base, full e2e and golden captures are **not executed**, not passes.
Python's golden-tooling unit uses fixtures; no game capture was requested.

## Simplicity, rubric and limits

Production change is one local resolved scalar and two uses, reusing the
existing fluid distinction and resource owner. No new subsystem, setting,
dependency, UI, guidance surface, layout patch or site branch. The existing
capability spec is extended; assertions, budgets, snapshots and timeouts are
preserved. No runtime config mutation. `tools/` and `plan/DIRECTOR.md` are untouched.

Numerical correctness and factual preset behavior are covered above.
Discoverability/accessibility surfaces are unchanged; this audit makes no
claim about perceived light, flicker comfort, GPU disposal/compilation,
composition, screenshot acceptance or real-phone performance. Beauty and all
light appearance judgments remain with Claude/owner. No art/material,
geometry, plume appearance, camera, event or audio changes were made.
