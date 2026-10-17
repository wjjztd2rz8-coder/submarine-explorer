# V-titanic-seabed-2

## Changes

- Scour moat: `TerrainFidelity` gains an optional `scour` (footprint rectangle, depth, width, rim height, rim tint). `Terrain.scourAt` returns a height offset (deepest against the footprint, irregular along its length) and a rim weight; `detailHeight` adds it, so mesh, physics, props and scatter all follow. Titanic gets a fidelity entry (focus on the bow, resolves on Low too, no rock normal detail) with the bow footprint, 5.5 m moat and 1.5 m rim.
- Silty rim: vertex colour lightens by the rim weight (the existing vertex-tint path, now also enabled by `scour.tint`).
- Debris trail: new `titanic-trail` scatter kit (elliptical strip of plates, frames, pipes, coal) and a `debris-trail` prop running ESE from the bow's starboard side; the python prop validator lists the new kit.
- Bow hull gets `y_offset_m: 3` so it keeps its exposure after snapping into the moat.
- Hull plating tint variation: not done (not cheap).

## Screenshots (`.cache/codex/shots/V-titanic-seabed-2/`)

`before/`, `after/` (High desktop and portrait), `low/`. From the opening and approach poses the hull now sits in a visible depression with a paler rim, and plates and frames string away toward the camera. Triangle counts did not rise (High about 1.5 M vs 1.6 to 1.8 M scene totals before; Low about 0.11 to 0.14 M).

## Tests

`tests/unit/terrain-detail.test.ts` gains a capability test (moat dips, rim lifts and tints, zero far away, Low and High). Rebaselined, Titanic only and intended: `beebeIsolation` (terrain buffers now carry colour), `freeDiveComposition` (opening y moves about 1.1 m with the hull). Gates: `PW_PORT=5330 tools/gates.sh` all PASS.

## Simplicity

One optional config field, one small function, one shared vertex-colour block (generalised, not duplicated), one data-only kit. No site branch in shared code, no settings. No package numbers in comments.

## Remaining issues

- At ~60 m on High the moat is clear but soft; the rim reads as a pale band rather than a crisp berm.
- Moat is symmetric around the hull; no deeper scour at the prow or stern.
- Trail plates are dark on dark silt at distance.
- Hull plating still repeats.

Own rating: approach view ~3.6 before, ~4.0 after.
