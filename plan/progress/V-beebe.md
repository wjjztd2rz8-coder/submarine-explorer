# V-beebe

## Changed

- Beebe hero chimney mesh denser on Medium/High (64 segments, a ring every 0.18 m, was 40 / 0.3 m); chimneys 2-3 48 segments and a ring every 0.2 m (was 28 / 0.32 m). Low unchanged. Silhouette edges and banding are smoother; high-tier hero triangles 103k to 149k.
- Tests: beebeIsolation snapshot, props-geo max-of-spread fix. A global sub tone-down was tried and reverted: barely visible and affected every site.

## Screenshots (golden, beebe-vent-field, high)

- Before: .cache/golden/2026-10-15-235623/beebe-vent-field-{1,2,3}.png
- After chimney mesh: .cache/golden/2026-10-15-235806/

## Remains

- The white hull is still the brightest object in the opening: it is lit by Beebe's ambientFill 8 and headlights; a per-site hull dim needs a channel from the vent preset to vehicle materials (not added, to keep code simple).
- Remaining "facets" are the authored crust ledges, not mesh resolution.
