# S-verify-19 — merged numeric and simplicity checks

2026-10-18, DIRECTOR Backlog 8. Reviewed Titanic seabed slice 3
(`28e63c9^1..28e63c9`) and closeup artifacts (`c4041dd^1..c4041dd`) on
`db262798`. Their completed verification briefs already supplied the relevant
regression guards (`291d333`, `be9edf9`). Re-exercised those existing capability
fixtures on this checkout; no demonstrated production bug or missing scoped
regression guard found. No duplicate tests, source fix or snapshot update.

- Life: `lifeTables` checks the continuous readability floor at 15 cm and its
  crossover with normal scale (3 cm shrimp ~0.608 m, 8 cm fish 0.9 m, blue tang
  ~1.157 m). `lifeSim` checks actual finite instance matrices for every species
  at individual scales 0.8/1/1.2: monotone 2%–100% proximity scaling, continuous
  edges capped at 5/10 m, and composition with spawn fade. Camera movement in
  frozen frames works at every site/tier without changing instance/draw budgets.
  Shared shader-source fixtures check specular x0.4, the continuous 0.28 knee
  and 0.45 reflected-light ceiling, retaining glow and fog. These are headless
  numeric/source checks, not GPU shader or screenshot acceptance.
- Wrecks: `wrecks` checks seeded finite geometry and instance buffers at every
  tier. Only trail plates/frames receive the three authored linear-color tints
  multiplied by 1.7; other kits and trail pipes retain grey jitter [0.8, 1.15].
  HDR components above one are intentional; no clamp or gain validation is
  needed for this internal, fixed kit table. Existing hull/scatter budgets hold.
- Scour: `terrain-detail` checks all tiers, both shoulders and the crest,
  rounded corners, finite height, rim weight [0, 1], and sampled-height/triangle
  agreement within 2 mm. Authored width 18 m gives rim support 15.3–34.2 m,
  crest 19.8 m; tint multiplier stays [1, 1.45]. `beebeIsolation` and
  `freeDiveComposition` retain their existing cross-site/opening snapshots.
- Closeup poses: `lowTierFollowups` retains all three Titanic tier cases,
  requiring approach/close positions above the full 12 m seabed physics floor,
  no hull/eye prop collision, finite pose data and central target projection.
  The earlier pose correction remains intact; no capture data was changed.

The merge diffs add no site-id branches in shared code, package-history comments,
runtime config mutation, new settings, UI, guidance surfaces or layout patches.
Per-site tuning stays in the existing terrain/kit tables and bow builder; life
uses the shared renderer/material path. Existing capability specs supply all
guards. No new on-screen element needs a replacement. Numerical continuity,
clearance and bounded costs support readable exploration without changing scan,
Journal, rewards or accessibility interfaces. Beauty, hue/readability acceptance,
phone appearance and screenshots remain Claude's review.

## Validation

- PASS: focused existing capabilities, **7 files / 160 tests**, 30.61 s:
  `lifeTables`, `lifeSim`, `wrecks`, `terrain-detail`, `lowTierFollowups`,
  `freeDiveComposition`, `beebeIsolation`. Log:
  `.cache/S-verify-19/focused.log`.
- PASS: `PERF_BUDGET_STATIC=1 npm test -- --configLoader runner --cache=false
tests/unit/perf-budget.test.ts tests/unit/montereyOpening.test.ts`, **2 files /
  30 tests**, 15.33 s. All 13 sites checked on Low/High; Titanic static prop
  costs are **37 calls / 135,178 triangles (Low)** and **55 / 587,250 (High)**.
  Low remains below unchanged 1,200-call / 1,200,000-triangle guards; High is
  diagnostic. These exclude terrain/life and are not rendered-frame timings.
  Monterey opening snapshots pass unchanged. Log:
  `.cache/S-verify-19/budgets-opening.log`; census:
  `.cache/perf-budget/static.json`.
- Required gates: running; final results follow.

No edits under `tools/`, to `plan/DIRECTOR.md`, art, layout, CSS or composition;
no merge, push or tag. Assertions and timeouts remain unchanged.
