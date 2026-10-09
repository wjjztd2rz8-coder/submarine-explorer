# f-lostcity-tower

Changes
- towers.ts: `roughenTrunk` displaces the tiered-spire vertices (noise radius, wandering ridges, broken/undercut ledges), vertex count unchanged. Main trunk gets a pocketed side orifice high up (t=0.8) painted dark with a stained rim and drip streak. Added faint blue-green biofilm paint on damp lower walls.
- LostCityFlange.ts: edge wedge (thin, drooping margin) and noise notches, so shelves are not flat saucers.
- No new draw calls or triangles; Low tier unaffected.

Before/after (desktop, lost-city-2 / lost-city-1)
- before: .cache/golden/2026-10-09-191533/ (main repo)
- after: .cache/golden/2026-10-09-193257/
- Note: golden.sh default port 4298 can hit a stale server from another worktree; use GOLDEN_PORT=4731.

Gates: PW_PORT=4711 tools/gates.sh passed (build, unit, python, content, attribution, prettier, e2e, e2e-base).
