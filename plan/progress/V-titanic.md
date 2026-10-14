# V-titanic

## What changed

- Seabed (`BIOMES.titanic` in `src/world/TerrainBiome.ts`): much darker grey-brown silt (colours, contrast, detail), a dark damp patch material and a faint rust-flecked stain, lower broader ripple, bioturbation back to 0.3. The bright flat sand and the white dimple blotches are gone; the bed stays readable, never black.
- Plate variation (`paintWreck` option `plates`, `materials.ts`): staggered per-plate tone, with a few plates sprung darker or rust-orange. Used only by the Titanic bow and stern. Pure vertex paint, no per-frame cost, and the Low tier uses the same paint.
- Mud line on the hulls is deeper (bow 2.2 to 3.4 m, stern 1.8 to 3 m).
- Rusticles: optional `girth` on `hangRusticle` / `rusticlesAlong` (default 1, other wrecks unchanged); Titanic uses `HEAVY_RUSTICLES` (1.9), giving thicker, denser clumps.

## Screenshots

`.cache/codex/shots/V-titanic/before/`, `after/` (desktop and portrait, high), `after-low/` (desktop, low).

## Verdict

Seabed: clearly better (dark silt, subtle mottling). Wide view (shot 2): hull has visible per-plate patchiness and the thicker rusticles read well. Close view (shot 3): the hull remains fairly flat and peach under the headlights, because the vertex paint is too coarse to resolve plates at 40 m; the lower hull burial edge is not visible in that pose. Low tier is readable but plain (tan bed, rust hull). Honest rating: about 3.8, not yet 4. A texture-space plate/stain layer would be the next step for the close view.

## Gates

`PW_PORT=4590 tools/gates.sh`: all PASS (python, content, build, unit, e2e, e2e-base, attribution, prettier).
Deliberate re-baseline: the Titanic biome entries in the `beebeIsolation` and `beebeScatter` snapshots (new biome colours and ripple/burrow). No assertions loosened.
