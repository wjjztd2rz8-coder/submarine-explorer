# V-monterey-floor

## Change

Data-only, in the Monterey entry of `BIOMES` (`src/world/TerrainBiome.ts`); no shader, texture or shared-code change.

- Current ripples: strength 0.4 to 0.9, crest spacing 0.5 m to 1.3 m. The old fine ripple read as noise from the approach; the broader crests read at 10 to 30 m and still fade through the existing ripple fade distances.
- Cobble-sand patches: `patch` 0.35 to 0.55, so the existing slot-B sand shows more often between the silt.
- Floor pebbles: one new scatter entry, `dropstone` on flat ground (density 30, size x2.2). This adds one instanced draw (6 to 7 for the Monterey scatter) and about 1,500 instances on High; Low scales by its tier density (about 170 instances).

Test: `tests/unit/biomeFloorVariety.test.ts` checks, by capability, that a flat bed receives pebbles and the ripple is broad enough to read.

## Score estimate

Monterey ~3.5 before; ~3.8 after (open floor now has crests, patches and pebbles instead of one uniform sand sheet). The wall poses are unchanged. The estimate is a judgement from the screenshots below, not a measurement.

## Screenshots (flat canyon floor, 12 m, fixed pose, scatter fully streamed)

- Before High: `plan/progress/V-monterey-floor/before-high.png`; after High: `after-high.png`
- Before Low: `before-low.png`; after Low: `after-low.png`

Not darker: the colours are unchanged; only the normal-map ripple and pebble silhouettes differ. The golden wall poses (`tools/golden.sh`, GOLDEN_SITES=monterey) show the floor only at the edges and were also checked for no regression.

## Snapshots rebaselined (intended, Monterey only)

- `beebeScatter`: Monterey scatter meshes hash, draw calls 6 to 7, instances 164 to 1,701 (new floor pebbles).
- `beebeIsolation`: Monterey biome hash and the two Monterey terrain-uniform hashes (ripple, patch values).

All other sites are byte-identical.

## Gates

`PW_PORT=4712 tools/gates.sh`: all PASS (python, content, build, unit, e2e, e2e-base, attribution, prettier).
