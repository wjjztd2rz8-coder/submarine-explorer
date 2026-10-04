# F-BUGHUNT-540 — merge-conflict residue

## Plan

1. Compare HUD and scarp merge history with current code, styles and tests.
2. Audit obsolete selectors and duplicate rules, changelog entries and stale docs.
3. Reproduce real placement problems with surveyed-terrain tests; fix and verify
   attachment, exposed ground/apron clearance, lit faces and requested counts.
4. Run the full gates including E2E and project-base; record results and limits.

## Findings and changes

- Scarp history: `9b87cd2` added seabed rejection; `20a75ed` brought the fuller
  exposed-wall fix; resolution `85b0e9e` kept only the seabed check. `13eaa5b`
  restored final talus plus `TALUS_LIP_RISE` clearance. That restoration is still
  present; `633be16` subsequently changed canyon colours rather than placement.
- Existing tests covered ground/apron clearance and counts but not attachment
  to exposed rock. Independent +Z raycasts against rendered triangles reproduced
  a Medium colony over 1.12 m off the rock and High/Ultra anchors inside it by
  0.056/0.140 m. A Low anchor was on a triangle outside the lit-face threshold.
- Smooth vertex normals can cross terrace edges. Placement now projects candidate
  seats onto the first rendered front triangle at their X/Y and offsets 0.12 m
  toward local −Z. Both the triangle normal and ground/apron checks must pass.
  Column and height filtering keeps the projection local to the extrusion.
- Sampling the pool of exposed seats replaces the fixed 4,000-try budget, which
  otherwise lost colonies on the steep far wall once attachment was enforced.
  The real-tile test retains all four walls, four tiers, exact counts and prior
  clearance thresholds, adding independent full-mesh raycasts for attachment and
  front-facing normals. Its timeout is 15 s to allow those additional raycasts.
- Removed retired `.hud-help` / `.hud-help-link` styles and old attribution
  wrapper background/opacity overrides. The native credit summary now receives
  the shared white focus ring; browser assertions check that ring after Escape.
- Consolidated superseded centre-aligned objectives rules in `flow.css` into
  the active right-stack rules. Identical-looking portrait/landscape rules in
  `hud-layout.css`, `touch.css` and `home.css` have different media scopes or reset
  intervening overrides, so those are retained.
- Consolidated the repeated vent-haze fix under F-VERIFY-480, preserving the
  distinct original wall-life fix and its post-merge restoration. Restored the
  omitted 450 attribution changelog entry. Documented the expandable credit in
  README/tile docs and marked F-TOUCH-150's tooltip description as superseded.
- No unresolved merge markers found in the inspected source and docs; HUD already
  constructs a single disclosure and safely inserts the metadata citation as text.

## Validation

- Focused surveyed-terrain suite: **9 passed** across `montereyWallLife`,
  `scarpTerrain` and `montereyScarpSupport`. The strengthened attachment checks
  failed on the original placement at all four quality tiers before the fix.
- `GATES_CONFIG_MODE=writable PW_PORT=4540 tools/gates.sh --full-e2e`:
  config bundling, production build/typecheck, **123 unit files / 1,307 tests**,
  **144 Python tests**, strict content, attribution and repository Prettier
  **PASS**. Both root and `/submarine-explorer/` builds pass.
- Full E2E and project-base E2E **fail before any browser assertions** because
  the preview process cannot start. A direct preview invocation with
  `--configLoader runner --port 4540 --strictPort` confirms
  `listen EPERM: operation not permitted 127.0.0.1:4540`. Overall gate exit: 1.
  No browser or screenshot success is claimed. Run the same full gate on a
  host allowing localhost/browser execution to validate the new focus assertion
  and existing HUD/scarp captures.
- Logs: `.cache/gates/{build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`.
  Gate-owned temporary build directories are cleaned up automatically.
- `git diff --check` passes; no conflict markers in source, docs, tests,
  README or CHANGELOG. No runtime dependencies, content placements or budgets
  changed.
