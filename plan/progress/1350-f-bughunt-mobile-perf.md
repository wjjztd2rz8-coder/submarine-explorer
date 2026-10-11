# 1350 — Low-tier and touch performance paths

## Plan

Two rounds: (1) trace auto quality selection and touch resize/orientation handling,
extend the 1290 static prop census to every catalog site, and reproduce small
defects; (2) apply only clear small fixes, run regression gates, and record the
remaining limits. Keep existing assertions and budget thresholds.

## Round 1 — audit and reproduction

- Auto selection is made once at boot; URL fixed tier/auto overrides the saved
  setting. The fixed Medium default remains intentional. Software renderers,
  small GPU limits and weak CPU/memory precede handheld/discrete GPU rules;
  the screen's short side keeps phone detection stable across rotation.
  Boot passes the resolved tier to terrain, props, atmosphere, presets and life.
  Ultra is never automatic. GPU masking uses other device hints; missing memory
  and core counts are neutral, so a recognised flagship can select Medium.
  Added phone probes for UA, client hints and coarse-pointer detection, masked
  GPU strings, missing hints, weak flagship hardware and discrete GPU strings
  on handhelds. No selector defect reproduced; no heuristic changes made.
- Touch controls already clear held axes/buttons, active drag/pinch tracking and
  double-tap history on resize and orientationchange. Portrait hint timers are
  cancelled in landscape, and listeners are removed on disposal.
- The render system listens only for resize. An orientationchange with updated
  viewport dimensions leaves the drawing size, camera aspect/landscape shift,
  post target size and HUD scale stale until a separate resize arrives. Added
  an event-driven regression through the real render system and camera rig.

The 1290 census now reads all **13 production catalog sites** from
`data/landmarks/index.json`. It constructs shipped props with real tile metadata
and the production placement/builders, on a flat heightfield, before any frustum
or distance culling. Counts include all full prop trees, both internal LOD
branches, instances, material groups and transparent double-sided passes.
Blake's two rocks use the actual shipped GLB geometry/materials through
GLTFLoader; only texture image decoding is replaced with empty textures because
it does not affect geometry cost. All sites have zero failed/skipped props.
Terrain, submarine, life, markers and effects are excluded: these totals do not
establish full-frame budgets or physical-phone frame rates. Blue Hole's east
gallery is part of the same site/props document and is included in its total;
`_test` and `demo-synthetic` are fixtures, not catalog sites.

| Site                 | Low calls | Low triangles |
| -------------------- | --------: | ------------: |
| Titanic              |        33 |       116,438 |
| Challenger Deep      |         5 |        11,646 |
| Lost City            |        40 |        41,096 |
| Monterey Canyon      |        30 |       284,010 |
| Endurance            |        17 |        41,044 |
| Axial ASHES          |        16 |         8,206 |
| Hudson Canyon        |         5 |        14,548 |
| Kamaehuakanaloa      |         8 |        16,598 |
| Beebe vent field     |        19 |        19,926 |
| Great Blue Hole      |         8 |        21,228 |
| Bismarck             |        23 |        56,686 |
| Hunga Tonga caldera  |         5 |         8,326 |
| Blake Plateau corals |         7 |        41,076 |

All fit the unchanged static limits of **1,200 calls / 1,200,000 triangles**.
Monterey is largest at 23.7% of the triangle limit; Lost City has the most calls
at 3.3% of that limit. No content/LOD reduction is justified by these totals.
The existing complete-frame guard now covers all 13 sites, retaining its
**1,500 calls / 1,500,000 triangles** limits, loaded-prop counts, nonempty-scene
checks and renderer counter equality assertions.

Low continues to use the direct render path (no post pass), 300 snow particles,
no caustic texture/bloom/god rays, a 2× DPR ceiling, and dynamic resolution when
Auto is selected (unless `dynres=0`). Dynamic resolution changes pixel ratio,
then reuses `ctx.resize()`; it does not rebuild geometry tiers on rotation.

## Round 2 — fixes and validation

- **Fixed:** the render system also handles `orientationchange` using its
  existing resize callback. Before the fix, the new orientation regression
  failed because the last drawing size stayed at 390×844 after a change to
  844×390. After the fix all three new render tests pass: both event paths through
  two rotations, projection/FOV, DPR-scaled post sizing, HUD user scale, touch
  mode switches without resize, dynamic-resolution sizing and listener cleanup.
- Expanded touch interruption tests include orientationchange for held input,
  stale pointer completion and fresh double-tap sequences. Existing touch
  release/reset/timer behaviour passes; no touch control implementation change
  was needed.
- Focused units: **97 pass across 7 files**, including 26 Low/High diagnostic
  census cases. Logs: `.cache/verify1350/focused.log`; raw census:
  `.cache/perf-budget/static.json`.
- Production build (including TypeScript): pass. Used the writable bundled Vite
  config/native loader described in `tools/gates.sh` for read-only dependencies.
- Python: **156 pass**. Strict content validation: zero errors/warnings.
  Attribution check: pass (14 assets).
- Changed-file formatting and `git diff --check`: pass.
- Full unit suite: **181 files / 1,831 tests pass** (270.28 s), including the
  default 13-site Low census. Log: `.cache/verify1350/unit.log`.
- Full E2E attempted, blocked before tests by preview startup. Direct preview
  with the built config reproduces **listen EPERM 127.0.0.1:4350**. The expanded
  budget and touch specs collect **35 cases across 3 files**. Collection is not
  browser execution. No fresh screenshot exists; browser layout and full-frame
  budgets remain unverified. Logs: `.cache/verify1350/{e2e,preview,e2e-list}.log`.

No existing assertion, snapshot or budget threshold was loosened. Only the
orientation listener changes production behaviour.

On a runner with localhost/browser access, build this checkout into `dist-1350`
and replay:

```bash
PW_PORT=4350 PW_OUTDIR=dist-1350 npm run test:e2e -- \
  tests/e2e/f-perf-budget.spec.ts tests/e2e/f-touch-audit.spec.ts \
  tests/e2e/f-touch-stack.spec.ts
PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts \
  --configLoader runner --cache=false
```
