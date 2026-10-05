# F-MONTEREY-CANYON-700

Status 2026-10-05: canyon implementation and reported gate root causes fixed. The orchestrator ran browser QA outside this sandbox; its full E2E rerun after the reset fix remains pending.

## Implementation

- `data/landmarks/monterey-canyon/props.json`: retain the original 140 × 50 × 64 m ledge and its exact colony/rubble counts. Extend the inward-facing west bank to 800 × 100 × 150 m and the opposing east bank to 700 × 110 × 170 m. Their narrow faces rise beside the opening instead of ending as short mounds. The far bank continues north beyond the east bank, without overlapping its planted surface, and now uses the builder's compound wall collision.
- `src/world/terrainFeatures.ts`: Monterey-only reconstructed bend beside the ledge, with a 180 m terrain incision, smooth shoulders, and a floor descending 20 m per 100 m northward around this local bend before the canyon continues west. Blend out over the ends of the 1,240 m reach; never raise the surveyed seabed. The original ledge seats and science contacts stay outside the carve. Both rendered terrain vertices and collision sampling use this same height function. No generated GMRT files changed.
- `src/game/Spawn.ts`: only Monterey's opening configuration changes. Keep the original short approach and bearing, lower the chase offset by 14 m, and add 20 m of lateral offset to expose the bend beside the hull. Retain the global chase distance (about 97.69 m) for both opening and X reset.
- Existing builders re-scatter all three sponge shapes and both sea-fan shapes onto each enlarged wall's rendered face and apron. No shared geometry, life, lighting, camera implementation, mission, POI, or test files changed.
- All four science targets retain their original coordinates and elevations: the incision does not move their terrain seats. Check them through real `Scanner.update` completion from collision-free poses rather than relocating surveyed contacts.

## Two review rounds

1. An elongated central wall and oblique opening put both banks in the camera frustum but broke the unchanged ledge-count and short-approach contracts. Replaced that layout with long flanking banks while retaining the original ledge. First full gate logs: `.cache/monterey-700/round1/gates/`.
2. Verify the larger flanks across all quality tiers, retain the original colony and rubble checks, inspect landscape/portrait camera frusta, traverse the playable floor, and scan every science contact. Final full gate logs: `.cache/gates/` (results below).

## Golden and portrait evidence

The shipped golden script accepts `GOLDEN_SITES=monterey-canyon`; the requested shorthand `monterey` is not an accepted selector. Keep the tool unchanged within this task's scope.

- Before build retained at `.cache/monterey-700/before/dist/`.
- Before canonical golden attempt: `.cache/golden/2026-10-05-064715/index.html` and `poses.json`. Manifest: `complete: false`, zero captures. Preview could not bind `127.0.0.1:4298` (`listen EPERM`); Chromium also failed at `sandbox_host_linux.cc` with `shutdown: Operation not permitted`.
- Second canonical golden attempt: `.cache/golden/2026-10-05-070833/index.html` and `poses.json`, also incomplete with zero captures. Log: `.cache/monterey-700/round2/golden.log`.
- Required image names after browser access is restored: before and after `monterey-canyon-{1,2,3}.png`, plus `monterey-canyon-portrait.png` at 390 × 844. These PNGs were **not produced** here.
- Final-code golden attempt: `.cache/golden/2026-10-05-071259/index.html` and `poses.json`, incomplete with zero captures. Log: `.cache/monterey-700/final-golden.log`.
- Portrait attempt (390 × 844): `.cache/monterey-700/portrait-result.json` records `complete: false`, `capture: null`, and the Chromium sandbox launch failure. Re-run `.cache/monterey-700/portrait.mjs` against a running preview when browser access is restored.
- Connected Browser recovery also reported `No browser is available`; its browser list was empty.
- Headless geometry evidence, not pixel QA: `.cache/monterey-700/preflight-{low,medium,high,ultra}.json`, paired `.log` files, `.cache/monterey-700/floor.json`. The check uses the real game terrain, prop geometry, opening pose, camera rig, colliders, and scanner. Both a near-bank and far-bank face must have more than 100 mesh vertices inside each landscape/portrait frustum. Frustum inclusion does not establish rendered lighting, occlusion, or haze quality.
- Reproducible headless preflight: `MONTEREY_TIER=medium npx vitest run --config .cache/monterey-700/vitest.config.mjs --configLoader runner --cache=false`. The untracked check is `.cache/monterey-700/preflight.test.ts`; production/test-file scope stays unchanged.

## Gates

Final static results: build passes; **124 unit files / 1,326 tests pass**; **144 Python tests pass**; content and attribution checks pass. The unchanged Monterey wall-life checks pass at Low, Medium, High and Ultra, including face raycasts, apron exposure, requested colony counts, and the original ledge's exact 192-instance Medium count.

Headless preflight passes at all four tiers: the playable floor path descends approximately 72 m over 400 m; every sampled vehicle pose is clear of prop collision. Both bank meshes enter the landscape and portrait frusta. All four real scan contacts complete from collision-free poses, and each contact is outside the terrain incision. These are geometry/logic checks only.

Changed-file formatting and `git diff --check` pass. The initial whole-repository Prettier failures were the existing `plan/OVERNIGHT-LOG.md` and `plan/PROCESS-LOG.md`. The user explicitly requested fixing both after the orchestrator gate run; formatting-only updates normalize their whitespace.

Full E2E and project-base E2E were attempted in both gate rounds with `VISUAL_QA=1`. Both stop before running tests because the sandbox blocks the preview server from listening (`EPERM`). Final logs are `.cache/gates/e2e.log` and `.cache/gates/e2e-base.log`; retained copy: `.cache/monterey-700/round2/gates/`. Related retained specs include `content-missions.spec.ts`, `f-visual-fixes.spec.ts`, `f-geo-scarp.spec.ts`, `f-flow-audit-510.spec.ts`, `f-bughunt-15.spec.ts`, `d-sonar.spec.ts`, and `visual-qa.spec.ts`.

Final command: `GATES_CONFIG_MODE=writable PW_PORT=4370 PW_OUTDIR=dist-monterey-700 VISUAL_QA=1 tools/gates.sh --full-e2e`.

The original dependency-tree symlink was read-only for Vite's temporary configuration cache. An ignored workspace-local dependency-link directory supplies writable caches; dependency versions and tracked files are unchanged.

## Orchestrator gate follow-up

The user supplied an outside-sandbox full gate run: build, unit, Python, content, attribution and project-base E2E passed; full E2E reported **392 passed, 8 skipped, 1 failed**. All Monterey wall geometry, Low-tier performance, opening, mission/scan and visual-QA cases passed. The one failure was `f-bughunt-18.spec.ts:196`, which requires X to restore the global chase radius after loading Monterey. Retained supplied logs: `.cache/monterey-700/orchestrator-gates/`.

Root cause: Monterey authored both `chaseRadius: 64` and `chaseOffsetY`. The existing props loader treats a pose with a vertical offset as a call to `CameraRig.setChaseRadiusDefault`, making 64 m the persistent reset radius. Remove only Monterey's radius override; keep its lower/lateral framing. The unchanged loader then uses the global radius, and X restores it after zoom. No assertions, tests, shared loader, camera implementation, or other site's pose changed.

The supplied run produced actual pre-fix review shots at `.cache/codex/shots/f-visual-qa/monterey-canyon-{1,2,3}.png`; the opening shot was inspected. It shows the sub, a tall near bank, and the opposing wall across the passage. These images precede the reset-distance fix and are not the requested golden/portrait set.

Follow-up validation: build and 33 related tests across six unit files pass. All 12 headless checks pass across four tiers: global reset after zoom, landscape/portrait geometry and clear channel traversal, and all four scans. Logs: `.cache/monterey-700/postfix-{low,medium,high,ultra}.log`. Whole-repository Prettier and `git diff --check` pass; formatting log: `.cache/monterey-700/postfix-prettier.log`. Full E2E confirmation must run with the orchestrator because this sandbox cannot start Vite or Chromium; run `tests/e2e/f-bughunt-18.spec.ts` first, then the full gate suite. No post-fix browser pass is claimed.
