# V-axial-floor-readability (DIRECTOR item 25)

Built:

- Data (`data/landmarks/axial-seamount-ashes/mission.json`): vent glow reach 28 -> 55 m, intensity 700 -> 1400, small ambientFill 3, hullLight 0.95. Existing vent-preset params only; warm pools now bleed onto the floor around each chimney and fade out.
- Terrain (`terrain.frag.glsl`, `TerrainMaterial.ts`, `TerrainBiome.ts`): optional biome `flow` (0..1) behind `TERRAIN_FLOW`. Value-noise pillow lobes with analytic slope, dark creases, ropey wrinkles following lobe contours, lower roughness (glossy skin). Faded with the existing ripple distance (22-75 m). No new textures, draws or fetches. Axial sets `flow: 0.8` and a slightly lighter `colorA`.
- Test: `biomeFloorVariety.test.ts` covers the opt-in uniform.

Tiers: Low compiles no flow code (needs pbrNormals), so it only gains the glow, fill and colour. Perf (site-specs): Axial low 78 calls / 116k tris; high 98 calls / 1.07M tris (no extra draws).

See it: `GOLDEN_SITES=axial-seamount-ashes tools/golden.sh`; before/after in `.cache/codex/shots/V-axial-floor-readability/` (`before-*`, `after-c-*`).

Gain: opening floor is readable with warm pools around chimneys, still dark at distance (about 6.5 -> 7.5 of 10). The 3 m hero view shows lobes and creases clearly.
Gaps: in the opening (sub about 20 m above the floor) lobes are too small to read; the lift there is glow and fill, not texture. The close hero shot is still overexposed by the headlights (pre-existing). Ambient fill slightly greys the smoke column.
