# S-tiers: merge Ultra into High

## What changed

- Ultra is gone from `GraphicsTier` / `GRAPHICS_TIERS` (so Settings, `?tier=`, `isGraphicsTier`, auto-detection types and every `Record<GraphicsTier, ...>` lose it), the Settings select, and every per-tier table: quality (DPR cap 3), terrain tier (scatter density 1.8, range 320 m), terrain fidelity (`wallSegments`, near subdivisions), atmosphere, life, wreck and geo detail, wash particles, event particles, title snow and budgets, Lost City flange segments.
- Saved `ultra` migrates to `high` in `sanitizeDisplay` (`src/core/Save.ts`), so the next load persists `high`. `?tier=ultra` is now an unknown value and is ignored like any other.
- Dead code removed with it: the Titanic bow's second rusticle pass (only reachable at growth above 1) and `titleTier()` (an identity mapping once the tiers matched).
- Tests: Ultra entries dropped from every tier loop and baseline table (scarp, marine snow, snapshots); Ultra-specific assertions became High (title scene, life sim steering, wreck scatter, 1360 audit). New assertions: saved `ultra` migrates to `high`; `?tier=ultra` is ignored. No assertion was loosened; the Beebe habitat triangle budget stays 16,000 at High.
- Docs, nightly workflow (`PERF_TIERS`), golden tool options, preview pages and CI timing keys updated. CHANGELOG has the cut entry.

## Decision: what was folded into High

Nothing. Evidence (`.cache/codex/shots/S-tiers/ultra-before/` against `high-before/`, five hero sites, golden poses, 1600x900):

- DPR cap 3: invisible at 1x and 2x, and only costs fill on 3x displays (phones, which stay on Low/Medium). Not folded.
- Scatter density 1.8 and range 320 m (with the matching life, wreck and vent detail budgets): slightly more rocks, tube worms and corals at Beebe and on the Monterey wall, a richer plume. A modest difference, no change to composition or readability.
- Cost: perf-budget (software GL, 1280x720) High vs Ultra max triangles: Titanic 1.09 M vs 1.39 M, Lost City 0.98 M vs 1.62 M, Blue Hole 1.13 M vs 1.33 M. High is already about 1 M triangles, so the extra 20 to 65 percent does not fit.

High, Medium and Low are therefore unchanged (config values untouched); after-shots in `.cache/codex/shots/S-tiers/after/` match `high-before/` pose for pose.

## Gates

See the final report; `PW_PORT=4721 tools/gates.sh` in the worktree.
