# S-bughunt: Low-tier spawn placement

Scope: DIRECTOR item 9; numeric audit of all 13 sites, with no art changes.

## Plan

1. Run existing mission range/clearance and scan-access capability tests unchanged.
2. Extend table-driven coverage for Low mission/free-dive hull clearance, actual
   navigation with runtime prop contact and resolved Arcade scanning, and wreck
   silhouette overlap at desktop/phone openings. Capture per-site measurements.
3. Fix only small, demonstrated placement defects; retain every past regression
   assertion and put any site tuning in site data. Run `tools/gates.sh` and record
   findings, limits and remaining visual work.

## Progress

- Read `plan/DIRECTOR.md` and `CONTRIBUTING-AGENTS.md`.
- Existing tests enumerate 13 authored mission ranges, check all-tier safe transit,
  and search for water where each first primary can be scanned. Actual navigation
  with prop contacts is covered only for Monterey; other hero navigation omits
  runtime prop contact. Wreck framing assertions mostly exercise free dives.
- Baseline capability run passed before edits.

## Findings and evidence

Two audit rounds: (1) unchanged baseline range, terrain/prop clearance and scan
access specs; (2) expanded Low-tier runtime navigation, both opening types,
all-primary scan access and projected wreck geometry.

No unsafe opening, unreachable primary or mission range violation reproduced.
All 26 primary contacts can complete a scan from hull-safe water, retaining the
minimum-depth rejection and pitch-limit checks. All 13 first scans complete after
navigating from the actual mission opening with resolved Arcade equipment,
60 Hz physics and the runtime `PropContact` resolver: **zero contact frames**,
no hull breaches, and at least 12.00 m centre-to-terrain clearance through each
route. This is one reproducible approach to the first primary, not an exhaustive
pathfinding proof for every route or later objective.

Measurements use the default Low terrain/detail configuration, real heightmaps,
all shipped procedural props and Blake Plateau's two actual GLB meshes. GLB image
decoding alone is replaced by empty textures in Node. The new opening audit fits
hulls exactly as `submarineSystem` does (`requiredHull` from mission briefing
depth or tile minimum); older authored-hull regression cases remain intact.

| Site                 | Mission range (m) | Visible hull/terrain gap: mission / free (m) | First scan complete (s) |
| -------------------- | ----------------: | -------------------------------------------: | ----------------------: |
| axial-seamount-ashes |               180 |                                19.15 / 15.70 |                   10.52 |
| beebe-vent-field     |               220 |                                38.33 / 24.06 |                    9.88 |
| bismarck             |               150 |                                21.24 / 18.02 |                    9.98 |
| blake-plateau-corals |               160 |                                49.94 / 42.65 |                    8.82 |
| challenger-deep      |               200 |                                17.16 / 15.98 |                   10.20 |
| endurance            |               180 |                                21.51 / 15.34 |                    9.52 |
| great-blue-hole      |               150 |                               109.49 / 13.74 |                    9.57 |
| hudson-canyon        |               160 |                                15.12 / 32.44 |                    9.82 |
| hunga-tonga-caldera  |               160 |                                35.44 / 28.40 |                    7.82 |
| kamaehuakanaloa      |               200 |                               130.02 / 52.90 |                    9.20 |
| lost-city            |               220 |                                46.07 / 19.94 |                    9.90 |
| monterey-canyon      |               240 |                                80.12 / 23.06 |                    6.55 |
| titanic              |               220 |                                26.39 / 15.23 |                   14.30 |

### Wreck silhouettes (V-spawn-sub-clear evidence)

Actual visible vertices, including instanced fittings, are projected at
1600×900, 390×844 and 844×390. Positive envelope overlap is followed by a camera
ray intersecting both actual meshes, so a positive finding is not inferred from
bounding boxes alone. Desktop witnesses below give pixel, sub distance and wreck
distance from the camera; the nearer submarine obscures part of the wreck.

| Opening           | Envelope overlap px²: desktop / portrait / landscape | Actual shared-ray witness at desktop  |
| ----------------- | ---------------------------------------------------: | ------------------------------------- |
| bismarck mission  |                         12286.52 / 2307.14 / 2307.14 | (792.24, 610.45); 102.15 m / 230.47 m |
| bismarck free     |                          8825.36 / 1657.21 / 1657.21 | (771.55, 632.78); 96.27 m / 192.40 m  |
| endurance mission |                                   0.00 / 0.00 / 0.00 | none; separated envelopes             |
| endurance free    |                                   0.00 / 0.00 / 0.00 | none; separated envelopes             |
| titanic mission   |                                   0.00 / 0.00 / 0.00 | none; separated envelopes             |
| titanic free      |                         11117.15 / 2087.55 / 2087.55 | (953.62, 594.34); 105.15 m / 128.37 m |

- **Titanic:** free-dive silhouette overlap confirmed; mission opening is clear.
- **Bismarck:** both opening types overlap the wreck silhouette. This extends the
  existing visual framing evidence to a third wreck; its mission remains exactly
  150 m from the first primary.
- **Endurance:** both opening types have separate envelopes in all three layouts.
  This does not judge the Director's remaining aesthetic concern that the sub
  floats above a thin hull strip.

No art or site placement was changed: these framing findings require visual
judgment in V-spawn-sub-clear. No small safe production defect was demonstrated,
so there is no speculative engine fix or relaxation of the 150–300 m rule.

## Changes and simplicity

- Extended existing `missionComposition.test.ts`, with one table-driven runtime
  case per site, rather than creating a package-named spec.
- Expanded the existing scan-access case from the first primary to both
  primaries at every site. All original assertions remain, including minimum
  depth rejection and the exact per-site mission-range assertions.
- Consolidated prop loading in a helper, removed procedural-only filtering, and
  dispose loaded props in all three fixtures. This replaces repeated partial
  setup with one complete loader, including GLBs.
- Added strict zero-envelope-overlap guards for the known clear Titanic mission
  and Endurance mission/free openings. Existing visual framing assertions were
  not weakened. Known overlapping openings remain measured findings, not passing
  assertions that claim separation.
- `SPAWN_AUDIT=1` retains the per-site JSON and actual-ray witnesses at
  `.cache/spawn-audit.json`; ordinary unit runs avoid the diagnostic ray sweep.
- Production code, art, settings, dependencies and UI are unchanged. No new
  shared-code site branches or package-number comments were introduced.

## Validation

- Unchanged baseline: **67/67** tests passed in `missionApproach.test.ts` and
  `missionComposition.test.ts` (`.cache/spawn-baseline.log`).
- Expanded capability spec: **40/40** passed (`.cache/spawn-audit.log`).
- Typecheck passed (`.cache/spawn-typecheck.log`).

Reproduce the numeric audit:

```bash
SPAWN_AUDIT=1 npm test -- --configLoader runner --cache=false tests/unit/missionComposition.test.ts
GATES_CONFIG_MODE=writable bash tools/gates.sh
```

Full gates were run with `GATES_CONFIG_MODE=writable` (the dependency tree is
read-only). Overall result: **FAIL**, with these individual results:

| Gate                                | Result                                                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config / content / root build       | PASS                                                                                                                                                                              |
| Full unit suite                     | PASS: **3,532 tests / 192 files**, 555.68 s                                                                                                                                       |
| Attribution / repository formatting | PASS                                                                                                                                                                              |
| Python tooling                      | FAIL: 5 of 167 Python cases; four provenance checks hit `spawnSync git EPERM`, and `test_golden_tooling` reports `Unexpected end of JSON input` in `golden-manifest.test.mjs:151` |
| Root smoke e2e                      | Not executed: Playwright preview process exited 1 before the server started                                                                                                       |
| Project-base e2e                    | Project-base build passed; browser checks not executed because the preview process exited 1                                                                                       |

Logs: `.cache/spawn-gates.log` and
`.cache/runs/20261022-121847-7-eaTxPa/{python,content,build,unit,e2e,e2e-base,attribution,prettier}.log`.
The failed tooling files and browser configuration are unchanged by this work.
No browser screenshots were produced, so the numeric findings make no claim of
visual acceptance or phone rendering verification. The known silhouette findings
remain with V-spawn-sub-clear, linked from `plan/DIRECTOR.md`.

Final checks after the test-fixture cleanup: typecheck, changed-file formatting
and `git diff --check` passed. No assertions guarding prior bugs were relaxed.
