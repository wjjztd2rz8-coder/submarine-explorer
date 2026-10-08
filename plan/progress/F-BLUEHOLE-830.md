# F-BLUEHOLE-830 — wall undercut and limestone relief

## Plan and scope

1. Inspect the gallery profile, terrain detail integration, opening placement and canonical Blue Hole poses.
2. Replace the gallery's exposed crest with a low limestone ledge that closes below the rising wall, with stalactites attached to its underside.
3. Add broken benches, vertical solution fluting and rubble around the shaft using prop geometry if 810 has not landed.
4. Check collision, roof support, terrain seating and opening/approach clearance over three rounds; run the full gates and capture all canonical poses before/after.

Only Blue Hole geometry/content/tests and this log/CHANGELOG are changed. The only edit to a shared test is the Blue Hole expected prop count (2 → 3). No terrain renderer, other site's geometry, gameplay configuration, POI coordinate or mission file is changed.

Orchestrator gate follow-up: the user authorized fixing the repository-wide formatting failure in `plan/PROCESS-LOG.md`. This adds only the missing blank line between its final heading and list.

810's terrain detail integration is absent from this checkout, so this package uses the prop fallback. The checkout also predates 770: its Blue Hole opening still uses a 205 m approach, and its retained historical opening image shows a 203 m scan target. This package preserves the checked-in spawn settings and contact coordinates, and does not replace 770's placement work when integrated.

## Implementation

- `src/world/props/geo/stalactites.ts`: remove the high rounded crest and carry a low roof behind the scalloped lip into the wall. The rear is buried beneath the rising terrain. Use the same pinch, displacement and end sinking for both galleries' pendant roots. Clamp pendant length against the sampled ledge. Retain large fallen blocks at Low and use finer compound shelf colliders.
- `src/world/props/geo/blueHoleWall.ts`: a Blue Hole-only terrain-following annular skin, broken ledges, long vertical flutes and instanced limestone rubble. The floor/reef boundaries and both gallery mouths feather below terrain; no cylinder collider fills the shaft. Small collision cells cover flatter raised surfaces, with individual rubble boxes. Relief on steep faces stays under 3 m, inside the existing 4 m submarine seabed clearance.
- `data/landmarks/great-blue-hole/props.json`: append `blue-hole-wall-relief` at the hole centre, using the existing geology builder entry point. Keep both galleries' coordinates, headings, dimensions and LOD distances. Retain reconstruction notes. The independent wall prop has its own bounds and cannot expand the gallery's spawn footprint.
- Tests cover supported lips, buried backs, pendant clearance, Low rubble, all four detail tiers, shaft seams and normals, seated rubble, static cost and clear opening/camera approaches.

## Progress and verification

### Round 1 — geometry and collision

The initial thinner roof exposed a collision coverage regression in the retained generic geology test. Increasing the shelf's vertical collider resolution from 8 to 12 slices fixed it without changing that test's coverage thresholds. Result: **4 files / 46 tests passed** (`.cache/bluehole-830-round1.log`).

### Round 2 — relief and tier coverage

Added Blue Hole wall tests, tested the east close view at all four tiers and checked both gallery backs and supported mouths at Low/High. Result: **5 files / 57 tests passed** (`.cache/bluehole-830-round2.log`).

### Round 3 — full verification and canonical poses

Initial full unit run: **137 files / 1,433 tests passed** (`.cache/bluehole-830-round3-unit.log`). Python: **144 tests passed** (`.cache/bluehole-830-python.log`). Strict Blue Hole prop validation: **3 valid entries, zero warnings/errors**.

Added an integration regression on the real tile comparing the opening with/without the wall prop and checking submarine/camera clearance for the shared spawn and all four authored golden approaches at Low/High. It exposed a west close-view hull collision at the lip. Reduced the west shelf projection while retaining the authored pose; the complete Low/High pose regression now passes, including the opening's actual vertical chase offset. Also smoothed the relief's duplicated UV seam normals. Targeted result: **4 files / 30 tests passed** (`.cache/bluehole-830-opening.log`).

Final full unit run: **138 files / 1,435 tests passed** (`.cache/bluehole-830-round3-unit-final.log`). Production build/typecheck, all-site strict content, attribution and formatting of changed files passed. The Low/High pose regression and static-budget diagnostic also passed (**12 tests**, `.cache/bluehole-830-perf-opening.log`). Conservative Blue Hole prop totals, counting both internal LOD branches: **12 calls / 42,030 triangles at Low; 12 calls / 180,474 triangles at High** (`.cache/perf-budget/static.json`). These are headless prop costs, not measured browser frame costs.

Baseline and changed production builds are retained as `dist-bluehole-830-before/` and `dist-bluehole-830/`. Both build successfully, including service-worker stamping. Baseline sources/content come from HEAD in `.cache/bluehole-830/before-source/`. The native temporary config `.cache/bluehole-830/vite.config.mjs` uses the repository's existing writable-config technique; tracked build tooling is unchanged. Logs: `.cache/bluehole-830-build-before.log` and `.cache/bluehole-830-build-after.log`.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh --full-e2e` outside this sandbox. Build, unit, Python, content, attribution, full E2E and project-base E2E passed. The sole failure was Prettier: `plan/PROCESS-LOG.md` lacked a blank line after its final heading. Added that blank line; no assertions or runtime code changed. Repository-wide `npx prettier --check .` now passes (`.cache/bluehole-830-prettier-followup.log`); `git diff --check` also passes.

## Local visual QA and browser blocker

**Fresh paired golden images and visual acceptance remain pending.** During the local attempts, the Browser runtime reported no connected browser. Both native and runner previews failed with `listen EPERM: operation not permitted 127.0.0.1:4383`. Chromium golden capture exited with `sandbox_host_linux.cc:41 ... shutdown: Operation not permitted`. Local full E2E (`FULL_E2E=1 ROUNDS=3 VISUAL_QA=1`) and explicit Blue Hole visual-QA tests failed before test execution because their preview server could not start. The later orchestrator full E2E and project-base E2E passed outside this sandbox. No browser assertions were removed or relaxed.

The inherited [opening image](../../.cache/codex/shots/f-visual-qa/great-blue-hole-1.png) was opened and inspected: the dark arched crest is visibly separate from the banded rim. It is historical reference, **not** a fresh baseline capture for this branch. Other retained historical views are [west approach](../../.cache/codex/shots/f-visual-qa/great-blue-hole-2.png), [west close](../../.cache/codex/shots/f-visual-qa/great-blue-hole-3.png) and [east close](../../.cache/codex/shots/f-visual-qa/great-blue-hole-east-3.png). There is no inherited east approach image in that folder.

Fresh capture attempts produced only incomplete manifests with zero captures:

- Before: `.cache/golden/2026-10-07-031633/poses.json` (`.cache/bluehole-830-before.log`).
- After: `.cache/golden/2026-10-07-032511/poses.json` (`.cache/bluehole-830-after.log`).
- Preview/full-suite/visual logs: `.cache/bluehole-830-preview.log`, `.cache/bluehole-830-e2e.log`, `.cache/bluehole-830-visual.log`.

### Reproduce pending screenshots

In an environment with localhost and Chromium access, serve each retained build in turn at the same URL and run the unchanged capture tool. `GOLDEN_SITES=blue-hole` captures all five canonical frames: `great-blue-hole-1/2/3.png` and `great-blue-hole-east-2/3.png`; the opening is shared between the two gallery sets.

```bash
# Terminal 1: repeat with --outDir dist-bluehole-830 for the changed build.
npx vite preview --outDir dist-bluehole-830-before --port 4383 --strictPort \
  --host 127.0.0.1 --config .cache/bluehole-830/vite.config.mjs --configLoader native
# Terminal 2: use the same command/URL for both builds.
GOLDEN_SITES=blue-hole node tools/golden-shots.mjs --base-url http://127.0.0.1:4383/

FULL_E2E=1 ROUNDS=3 VISUAL_QA=1 GATES_CONFIG_MODE=writable \
  PW_PORT=4383 PW_OUTDIR=dist-bluehole-830 npm run test:e2e
```

Review the opening for a wall-connected undercut rather than a mound, both approach/close pairs for attached pendants and cave clearance, and the shaft for visible fluting/ledges/rubble. Headless tests establish geometry and clearance; they do not establish final material blending or pixel-level appearance.
