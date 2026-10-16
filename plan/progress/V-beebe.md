# V-beebe

## Changed
- Beebe hero chimney mesh denser on Medium/High (64 segments, a ring every 0.18 m, was 40 / 0.3 m); chimneys 2-3 48 segments and a ring every 0.2 m (was 28 / 0.32 m). Low unchanged. Silhouette edges and banding are smoother; high-tier hero triangles 103k to 149k.
- Sub highlights calmer everywhere: camera key 0.55 to 0.45, gloss 1.6 to 1.0, highlight shoulder ceiling 0.9 to 0.75 (`src/vehicles/materials.ts`).
- Tests: beebeIsolation snapshot, vehicles shoulder constants, props-geo max-of-spread fix.

## Screenshots (golden, beebe-vent-field, high)
- Before: .cache/golden/2026-10-15-235623/beebe-vent-field-{1,2,3}.png
- After chimney mesh: .cache/golden/2026-10-15-235806/
- After sub tone-down: .cache/golden/2026-10-16-000018/

## Remains
- The white hull is still the brightest object in the opening: it is lit by Beebe's ambientFill 8 and headlights; a per-site hull dim needs a channel from the vent preset to vehicle materials (not added, to keep code simple).
- Remaining "facets" are the authored crust ledges, not mesh resolution.
