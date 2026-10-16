# V-titanic-seabed

## Change

Data-only, in the Titanic entry of `BIOMES` (`src/world/TerrainBiome.ts`); no shader, texture or shared-code change.

- Ripples: strength 0.12 to 0.8, crest spacing 0.9 m to 1.2 m, so the bed shows current-swept crests from the approach instead of a flat plane.
- Scatter: Titanic now has its own list: floor `dropstone` (density 30, size x2.2), new `rubble` on flat ground (density 10) and the existing mounds. This adds 1 draw (2 to 3) and about 1,700 instances on High; Low scales by its tier density.
- Scour and plating repetition not done: scour needs terrain-shape work, and the hull plating is a separate optional gap. The existing debris plates and the hull stay as they were.

Test: `tests/unit/biomeFloorVariety.test.ts` gains a Titanic case (pebbles, rubble, broad ripples) by capability.

## Screenshots

`.cache/codex/shots/V-titanic-seabed/before/` and `after/` (`GOLDEN_SITES=titanic`, High, poses 1 to 3). Colours unchanged, so not darker. The close pose (3) shows ripples and scattered stones clearly; the approach pose (2) shows the change faintly because the ripple fades with distance.

## Snapshots rebaselined (intended, Titanic only)

`beebeScatter` (Titanic scatter hash, draw calls 2 to 3, instances 148 to 1,862) and `beebeIsolation` (Titanic biome hash and terrain uniforms). Other sites byte-identical.

## Simplicity rules

Net: no new machinery, one data entry, no shared-code branch, no settings, test extended not added, no package numbers in code.

## Remaining issues

Seabed beside the hull is still modest from the approach; a scour moat would need a terrain change. Hull plating repetition untouched. Own rating: Titanic seabed ~3.2 before, ~3.6 after (judgement from screenshots).

## Gates

`PW_PORT=4733 tools/gates.sh`: all PASS.
