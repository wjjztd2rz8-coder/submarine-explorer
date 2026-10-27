# V-eight-sites-lit / S-verify: Axial body glow

Numeric verification on 2026-10-26 at `3e478036da49d53f083aa931954227a7dc107731`.
Reference before the Axial change: `be53e86f457e5188cafb1e037db1de6abb9ac169`
(`a1bb49a7^`). Read `plan/DIRECTOR.md` and
`plan/progress/V-eight-sites-lit-axial.md` first. No browser or image review.

**Result: no confirmed glow defect; report only.** No production code, data,
snapshots, settings or permanent tests changed. The change stays within the
existing manifest, chimney builder and vertex-glow system; no site branch or
additional mechanism is needed.

## Emissive bounds

Built all six shipped Axial props at Low, Medium and High, and inspected the
five plain chimneys carrying `bodyGlow: 0.6`. Each uses the existing
`vertexGlow2-0.5` shader, emissive intensity 1, and linear emissive RGB
`[0.6, 0.1938859255, 0.0830589690]`. The shader injection was invoked headlessly
and checked against its colour-floor and normal-lighting expressions.

All 5,460 colour vertices per tier are finite and within `[0,1]`. For these
five meshes the colours and emission are identical across tiers. Evaluating
the shader expression at normalized vertex normals gives:

| Channel |  Minimum |  Maximum |
| ------- | -------: | -------: |
| R       | 0.121898 | 0.342598 |
| G       | 0.039280 | 0.102570 |
| B       | 0.016805 | 0.042438 |

For arbitrary normalized fragment normals (including bump-map perturbations),
the normal multiplier is in `[0.4,1]`. Combining that with each mesh's actual
colour extrema gives conservative overall channel envelopes:
R `[0.121875,0.342599]`, G `[0.039273,0.102571]`,
B `[0.016802,0.042629]` (rounded outward). Thus the new emissive contribution
stays finite and inside `[0,1]`; this does not claim a bound on the complete
lit/HDR pixel. Low retains the material glow despite disabling preset visuals.

## Before/after isolation

Ran the existing `authored prop geometry golden` capability at the reference
commit in a temporary archive and again at HEAD: **12 tests pass at each**.
Compared the actual snapshot exports: Beebe and Lost City are byte-identical
before/after at all three tiers. The evidence hashes include geometry buffers,
indices, transforms, instances, materials, bounds, colliders and vent anchors.
The shared `vertexGlow` implementation is unchanged. Only Axial's five plain
chimney material hashes change; its mound, placements, anchors and budgets do
not. No other site's manifest gained top-level `bodyGlow`.

| Site      | Tier   | Full-builder draws | Triangles, unchanged |
| --------- | ------ | -----------------: | -------------------: |
| Beebe     | Low    |                 13 |               20,338 |
| Beebe     | Medium |                 13 |              104,306 |
| Beebe     | High   |                 13 |              179,834 |
| Lost City | Low    |                 14 |               49,124 |
| Lost City | Medium |                 14 |              146,994 |
| Lost City | High   |                 14 |              206,428 |

## Lights and static budget headroom

Entered the real `PresetSystem` with the shipped Axial mission and all six
placed props, using flat support terrain. Low adds no preset objects. Medium
and High each add exactly two shadowless, decay-2 point lights, on the two
tallest vent sources (the smoker mound and Inferno). Checked each actual light
against its prop's orifice: 0.5 m below, 1.5 m horizontal standoff, distance
28 m, base intensity 700 cd. Flicker is bounded by 623–777 cd. The two-light
count is the unchanged default, below the preset's three-light cap.

The conservative static prop census counts all full props, all internal LOD
branches, instances, material groups and transparent double-sided passes:

| Tier   | Prop calls | Prop triangles | Calls left of 1,200 | Triangles left of 1,200,000 | Preset draws | Preset particles | Lights |
| ------ | ---------: | -------------: | ------------------: | --------------------------: | -----------: | ---------------: | -----: |
| Low    |         18 |          8,206 |               1,182 |                   1,191,794 |            0 |                0 |      0 |
| Medium |         18 |         16,650 |               1,182 |                   1,183,350 |            3 |            6,036 |      2 |
| High   |         18 |         30,488 |               1,182 |                   1,169,512 |            3 |           12,036 |      2 |

The repository enforces those static prop limits on Low; Medium/High margins
above use the same limits for comparison. Body glow adds no geometry or draw.
The optional haze adds one shared draw and 18 points at Medium/High; smoke and
shimmer supply the other two draws. Including this fixed sprite overhead,
particle headroom to 20,000 is 13,964 / 7,964 at Medium/High. The static census
has 18 calls versus the geometry golden's 10 because it includes extra
transparent double-sided passes. These are CPU counts, not rendered-frame
timings or a fresh full-scene/phone performance acceptance. The Low static
prop budget still leaves its separately reserved 300 calls / 300k triangles
for terrain, vehicles and life.

## Mission overrides: all seven live

Confirmed mission selection, override merging and actual preset consumption.
A parameter-read trace through `VentPreset.enter` reports zero unread authored
keys; the integration check also verifies the resulting uniforms and lights.

| Override              |                Value | Consumer                                          |
| --------------------- | -------------------: | ------------------------------------------------- |
| `smokeOpacitySulfide` |                  0.9 | Smoke `uOpacity` = 0.9                            |
| `smokeColorSulfide`   | 1841688 (`0x1c1a18`) | Smoke `uColor`, matching linear colour            |
| `hazeGlow`            |                 0.35 | Haze `uStrength` = 0.35; one shared additive draw |
| `glowIntensity`       |                  700 | Two light base intensities, then existing flicker |
| `glowDistanceM`       |                   28 | Both light distances                              |
| `glowDropM`           |                  0.5 | Both light vertical offsets                       |
| `glowStandoffM`       |                  1.5 | Both light horizontal offsets                     |

These visual controls intentionally produce no preset objects on Low. The
rejected ambient-fill and hull-light overrides are absent; hull light resolves
to the neutral default 1. No dead override needs removal.

## Validation

- Headless three-tier audit passes; local diagnostic inputs/results are
  `.cache/axial-audit.test.ts`, `.cache/axial-audit.config.mjs` and
  `.cache/axial-glow-audit.json` (untracked cache artifacts).
- Both reference and HEAD geometry-golden runs pass, using
  `node node_modules/vitest/vitest.mjs run tests/unit/props-geo.test.ts --configLoader runner --cache=false -t 'authored prop geometry golden'`.
- Existing `presets`, `ventHazeBudget`, `siteManifest` and `perf-budget`
  capability suites: **567 tests pass in four files**, 43.34 s, using
  `--configLoader runner --cache=false --pool=threads`.
- Required gates: `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e`.
  Writable configuration mode avoids writing bundled configuration into the
  shared dependency tree. **Not green:** content and production build pass;
  Python reports five failures in 167 tests. Four are CI-build-manifest tests
  failing on `spawnSync git EPERM`; the fifth is the golden-tooling test reading
  empty subprocess JSON (`Unexpected end of JSON input`). Minimal independent
  probes reproduce both symptoms: synchronous Git returns status 0 and its SHA
  but also `error.code: EPERM`, while an asynchronous Node child writing
  `{"ok":true}` returns empty stdout. These are environment/tooling failures,
  not evidence of an Axial defect; no test assertion was changed.
- The first aggregate attempt was interrupted when its default-worker unit
  phase produced no result. A second attempt appended `--pool=threads` to the
  gate's `npm test` invocation via a temporary exported shell function; it was
  also interrupted after more than eight minutes in the full unit phase with
  no summary. **Full unit suite and aggregate gate completion are unverified.**
  The separate focused four-file thread-worker run above completed normally.
  Logs: `.cache/runs/20261026-223212-2-dTVFYD/` and
  `.cache/runs/20261026-223540-2-TBkev7/`. E2e was disabled throughout.
- Attribution and repository-wide Prettier checks pass when run separately
  after the interrupted unit phase. Final report formatting and
  `git diff --check` also pass. The only deliverable is this report.
