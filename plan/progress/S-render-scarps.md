# S-render — scarp preset dispatch

2026-10-13. Backlog item 18 in `plan/DIRECTOR.md` (§6). Branch: `codex/1650-S-render-scarp-kinds`, based on `0968fed`. The nonvisual scarp refactor is implemented; **S-render is not DONE**. Claude's golden comparison and Readable, Beautiful and Phone-OK judgments remain pending before collection.

## Scope and ownership

Before editing the builder, inspected the launched briefs for 1560 and 1570–1670, result reports through 1640, `git worktree list --porcelain`, live status/diffs against main, and commits awaiting collection. Main and this worktree started clean. The 1570/1580/1590 worktrees remain at `66da04a`; 1610–1670 are based on `0968fed`. Results for 1570–1640 describe finished work, but their implementations still live in worktree diffs; a PASS result is not evidence of a merge. No overlap with these three files was found. The title brief owns TitleScene/Headlights/MarineSnow and its unowned capability tests; the audio brief owns AudioSystem and its unowned capability tests. Neither is duplicated here. Brief 1560 explicitly excludes scarp/title/audio work; its nightly workflow and shared `S-render.md` are untouched, as is 1610's hosted-CI work.

Implementation changes only `src/world/props/geo/scarp.ts`, `tests/unit/scarpTerrain.test.ts` and this note. Shared geometry/material helpers, configurations, site data, camera poses, golden baselines, workflows, tools, DIRECTOR, README and CHANGELOG remain read-only. No player capability is cut; no UI, setting, guidance surface or site-id branch is introduced. GMRT terrain, site identities, five hero pieces, scanning, Journal, marine life, input and accessibility retain their existing callers/contracts; Arcade remains the default. Simple, Rewarding and Honest are preserved through this restricted scope and capability checks. S-manifest retains ownership of site-tuning design.

## Dispatch inventory and change

The original builder contained **16 kind comparisons**:

- Geometry: canyon fidelity above Low, resistant-bed hardness/palette preparation, irregular bed phase, ledge strength and slump displacement.
- Shading: per-bed albedo, lamination/drape exception, slump/scar dust, and three vertex-light-lift calls (wall, apron, boulders).
- Rubble: canyon scatter/runout, fractured templates and anisotropic stretch (including two extra RNG draws per rock).
- Decoration: canyon wall sponges/coral and tuff seep plumes. Hadal uses the regular-bed/angular-rock path without decoration.

All 16 comparisons now select behavior through the existing typed PRESETS lookup: `bedding`, optional `fidelity`, optional `rockfall`, optional wall/rubble `glow` tuples, and optional `decoration`. The three glow dispatches share one small helper. Distinct algorithms remain in one builder, guarded by their relevant capabilities rather than repeated kind identity tests. Existing profile, colours, dimensions/ratios, budgets, texture mapping, material values and public exports remain unchanged. This adds a few typed preset fields rather than a strategy/plugin framework or second catalogue. The simplification is centralized choices and merged glow dispatch, not a claim that the file has fewer lines.

Regular bedding still consumes its original separate bed stream even when the generated bed intervals are unused. Main, bed, scar, fallen-rock and boulder-template RNG seeds, draw order and arithmetic order remain unchanged. The rockfall capability retains the supported-scar replacement count and canyon stretch draws. Low still omits rubble and fidelity scars/erosion normals but retains canyon wall life, tuff seeps, full wall/apron, collision and its existing box impostor. The resource graph and existing disposal paths remain unchanged.

## Original numerical baseline and equivalence

Before changing `scarp.ts`, extended the existing capability test to observe the original builder using Three objects only. Original source is `0968fed:src/world/props/geo/scarp.ts`. Captured **24 builds**: three kinds × four supported tiers × two inputs:

- `[32, 16, 24]`, seed 42, `groundHeight()` undefined (flat/unsnapped fallback).
- `[70, 26, 36]`, seed 17, ground `0.045*x + 0.025*z` (sloping/local terrain).

The permanent test contains 48 fixed SHA-256 digests: geometry, placement, materials and collision for each kind/tier, with each category combining both inputs. Hashes include exact typed-array bytes/types/item sizes/counts, all geometry attributes and indices (including impostors and plume seeds), geometry groups/bounds, hierarchy/transforms/render flags, complete instance matrices/colours/counts, material parameters and sharing, shader-hook string transformations/cache keys/uniforms, prop bounds and every collider. Generated UUIDs are excluded. All 48 refactored digests equal the pre-edit baselines. This is exact sampled numerical equivalence, not visual acceptance or an exhaustive proof for every seed/dimension. Headless detail textures are null by the existing helper contract; browser texture generation and actual shader compilation still require Claude's review. No WebGLRenderer, browser or game rendering was used; shader hooks were invoked with inert arguments solely to inspect their string output.

Observed original counts (flat/sloping wall vertices; instance counts agree for both inputs):

| Kind   | Tier   | Wall vertices, flat/sloping | Rubble | Sponges/corals | Colliders, flat/sloping |
| ------ | ------ | --------------------------- | ------ | -------------- | ----------------------- |
| tuff   | low    | 728 / 2207                  | 0      | 0 / 0          | 76 / 151                |
| tuff   | medium | 1459 / 4552                 | 132    | 0 / 0          | 76 / 151                |
| tuff   | high   | 2244 / 6962                 | 220    | 0 / 0          | 76 / 151                |
| tuff   | ultra  | 4266 / 13544                | 352    | 0 / 0          | 76 / 151                |
| canyon | low    | 728 / 2207                  | 0      | 23 / 18        | 73 / 146                |
| canyon | medium | 5489 / 17516                | 96     | 54 / 42        | 73 / 146                |
| canyon | high   | 8470 / 27320                | 160    | 90 / 70        | 73 / 146                |
| canyon | ultra  | 16526 / 53219               | 256    | 108 / 84       | 73 / 146                |
| hadal  | low    | 728 / 2207                  | 0      | 0 / 0          | 78 / 150                |
| hadal  | medium | 1459 / 4552                 | 114    | 0 / 0          | 78 / 150                |
| hadal  | high   | 2244 / 6962                 | 190    | 0 / 0          | 78 / 150                |
| hadal  | ultra  | 4266 / 13544                | 304    | 0 / 0          | 78 / 150                |

Tuff retains three seep clouds at every tier. Sample sloping High canyon bounds remain min `[-35, -13.260212898254395, -10.406560897827148]` and max `[35, 39.51138687133789, 52.59305953979492]` (exact values are additionally guarded by the collision digest).

The existing real-Monterey terrain test retains every prior guard: all instances above -3 m and below half wall height; growth anchors exposed; requested sponge/coral counts; Medium total 192. It now also asserts the exact rubble count at every tier, Low's zero rubble, and positive seabed clearance for each rock centre. Equivalence tests check kind-specific life/seep counts, supported-tier rubble counts, nonempty colliders and impostor presence. Their cleanup disposes each unique geometry/material and checks a dispose event; this verifies headless cleanup, not GPU memory measurements. Existing talus, wall-life, fractured-boulder, scar support and frame-budget regressions remain intact and passed without loosening assertions or skips.

## Validation

Exact commands and outcomes:

- `npm test -- tests/unit/scarpTerrain.test.ts` initially **BLOCKED**, before builder edits: Vite tried writing the bundled config into the read-only shared `node_modules/.vite-temp` (EROFS).
- `npm test -- --configLoader runner tests/unit/scarpTerrain.test.ts` **PASS** on the original builder: 16 tests, 9.18 s for the recorded baseline run (an earlier 16-test observation run also passed). Temporary numerical observations/digests were written under `/tmp`, then fixed into the capability test before refactoring.
- The same runner-loader command **PASS** after the initial refactor: 16 tests, 9.59 s, all baseline digests equal.
- `npm run typecheck` **PASS**, zero TypeScript errors.
- `npm run build` initially **BLOCKED** after typecheck: the same bundled-config EROFS.
- `npm run build -- --configLoader runner` **FAILED** in the existing PWA plugin's `closeBundle` hook: “Vite module runner has been closed.” No config or tooling was modified to suppress this.
- Temporarily replaced the worktree's dependency symlink with a local directory linking the same installed dependencies and supplying a writable `.vite-temp`. With this cache-only workaround, the unmodified `npm run build` **PASS**: typecheck, 282 modules, production bundle, public-data copy and service-worker stamping. The existing >500 kB chunk warning remains informational. The original dependency symlink was restored after checks.
- `npm test -- --configLoader runner tests/unit/scarpTerrain.test.ts tests/unit/geo-talus.test.ts tests/unit/props-geo.test.ts tests/unit/montereyScarpSupport.test.ts tests/unit/montereyRubble1320.test.ts tests/unit/montereyWallLife.test.ts tests/unit/montereyBoulders.test.ts tests/unit/montereyFidelity.test.ts tests/unit/montereyFrameBudget.test.ts tests/unit/f-monterey-polish.test.ts` **PASS**: 10 files, 98 tests, 28.82 s, including the final safe rockfall narrowing and strengthened terrain guards.
- `npm test -- tests/unit/scarpTerrain.test.ts` with the temporary writable cache **PASS**: 16 tests, 9.31 s, final implementation and original digests.
- `npx prettier --write src/world/props/geo/scarp.ts tests/unit/scarpTerrain.test.ts` and `npx prettier --write plan/progress/S-render-scarps.md` formatted only the permitted files.
- `npx prettier --check src/world/props/geo/scarp.ts tests/unit/scarpTerrain.test.ts plan/progress/S-render-scarps.md` **PASS**.
- `git diff --check` **PASS**; final `git status --short` shows exactly the three permitted files.

Rendering-dependent gates, e2e captures and golden tools were not run locally, as required by this brief. No merge, push or tag was performed. Git metadata is outside the writable workspace; no commit was created here. Collection should name S-render in its commit.

## Pending Claude comparison before collection

Read `tests/e2e/f-geo-scarp.spec.ts`, the existing Monterey wall-life/rubble/support/fidelity contracts, opening clearance contracts, and the existing golden options/poses without editing them or running captures. Claude must compare the pre-refactor and candidate on the **same existing poses, settings, tier and life seed**, with capture SHAs recorded:

1. Existing Medium `f-geo-scarp.spec.ts` wide, toe, oblique, high-angle and cockpit views for `caldera-tuff-wall` (Hunga Tonga), `canyon-wall-ledge` (Monterey) and `north-wall-scarp` (Challenger). Keep Great Blue Hole's existing scarp views as a control. Check unchanged wall outlines/strata, talus contact, scar rubble, exposed wall life and seep placement. Retain the existing instance-clearance and triangle-budget assertions.
2. Existing High hero golden set: Titanic, Lost City, Great Blue Hole (including east gallery), Beebe and Monterey, plus the existing Challenger and Endurance review views. Compare opening/approach/detail (1/2/3), especially Monterey wall life/rockfall and its authored inspection poses. Challenger's default golden hero is the lander, so its north-wall scarp additionally needs the dedicated scarp views in (1).
3. Hunga Tonga is outside the default seven-site set: use its **existing** golden selection (`GOLDEN_SITES=hunga-tonga-caldera`) for opening/approach/detail, without authoring new poses. Compare the affected scarp sites across currently supported Medium/High/Ultra settings and existing Low desktop, portrait and landscape golden layouts. Low must retain its omission of rubble, surviving wall life/seep effects and LOD/impostor behavior. Keep cameras, settings, baselines and tier policy unchanged.

Claude owns Readable in the first 10 seconds, Beautiful and Phone-OK, including browser texture/shader and player-visible comparisons. Those checks remain **PENDING**; numerical equivalence and a successful build do not declare visual acceptance. S-render's separate title/audio packages and nightly hosted review remain outside this package.
