# F-LOSTCITY-5 — Lost City columns

Built

- LostCityCarbonate.ts: shader vertical flow striations (albedo re-sampled with the vertical axis stretched, two scales, brightness only, walls only, fades with distance). Works on Low (albedo only, 4 extra fetches).
- towers.ts: brucite fringe, thin tapered fins fanning from every vent lip (64 on the main vent, 24 elsewhere, scaled by tier growth), merged into the tower mesh (no extra draw call); painted white by the existing lip colouring.
- LostCityBands.ts: slope tint gains dark silt pockets and pale drifts (mean about 1.0, so no overall darkening).

See: GOLDEN_SITES=lost-city tools/golden.sh; shots in .cache/codex/shots/f-lostcity-5/ (base-_, after-_, high and low).

Perf: no new draw calls; fins add roughly 2-3k triangles on High, fewer on Low.

Gaps: no animated shimmer on the fins; the scan card sits over the tower tip in the opening shot (HUD position, unchanged); extra debris near towers not added (existing rubble scatter kept).
