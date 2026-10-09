# f-lostcity-trunk

Changes

- spire.ts: new `trunk` option (with `irregular`): jittered terrace phase and per-terrace strength (some shelves nearly vanish), slow swells/waists along the trunk, 2.4x deeper top funnel. Off for Beebe (its irregular hero keeps identical geometry, snapshots unchanged).
- towers.ts: flanges cut (main 4 to 2, others 0-1, lone 1), narrower and shorter arcs; vertex colour adds cream/white and grey-blue mineral patches, vertical flow streaks, stronger seams, and a dark vent mouth painted at each column tip (follows lean).
- LostCityCarbonate.ts: shader albedo contrast 0.32 to 0.2 (less grey blotching).
- Colliders, scan targets, materials and draw calls unchanged.

Before: .cache/golden/2026-10-09-130936/lost-city-2.png
After: .cache/golden/2026-10-09-131943/lost-city-2.png (also lost-city-1/3)

Gates: PW_PORT=4881 tools/gates.sh all PASS. A first run failed Beebe snapshots because the new profile leaked into Beebe; fixed by gating on `trunk`.

Weaknesses

- Vent orifice is not visible in any golden pose (tips are under the HUD label or out of frame); not visually verified.
- Flow streaks are subtle (vertex density limits streak width); the remaining saucer flange in lost-city-2 is still flat.
- Low tier and phone not visually checked.
