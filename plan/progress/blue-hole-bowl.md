# blue-hole-bowl

## Changed

- `src/world/TerrainBiome.ts`: Blue Hole depth shade 30-105 m with a darker tint (0x28556f), strata period 3.4 m / amount 0.8, new `horizonFadeM: [90, 380]`, sponge scatter on rock and flat.
- `src/world/TerrainMaterial.ts`: new generic `horizonFadeM` biome option (fragment fade to fog colour at any camera depth; own program cache key).
- `src/world/life/catalogue.ts`: blue tang size 0.25 -> 0.34 so schools read as fish silhouettes.
- Tests: depth-shade expectation and the beebeIsolation snapshot updated (Blue Hole only).

## Screenshots

- Before: /home/vijay/submarine-explorer/.cache/golden/2026-10-08-202656/great-blue-hole-*.png
- After: .cache/golden/2026-10-08-205041/great-blue-hole-*.png (in the worktree)

## Gates

`PW_PORT=4871 tools/gates.sh`: build, unit, python, content, attribution, prettier, e2e, e2e-base all PASS.

## Known weaknesses

- The horizon is softer but a faint line remains (sky gradient is paler than the fog colour).
- Geometric ledges were not changed; strata are mostly albedo bands. Sponges are sparse at the golden poses; fish are still small at long range.
- Low tier was not captured separately.
