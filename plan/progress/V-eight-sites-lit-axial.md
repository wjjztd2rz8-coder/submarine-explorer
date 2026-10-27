# V-eight-sites-lit: Axial part

**What changed (net: +1 optional data field, no new system, no site branches):**

- `tools/golden-options.mjs`: aliases `axial`, `kama`, `hunga` for `GOLDEN_SITES` (the heroes for all three were already configured).
- `bodyGlow` is now an optional per-prop manifest field (`SiteManifest.ts`). `VENT_BUILDERS.chimney` applies the shared `vertexGlow` to plain chimneys that set it. Before, only the Beebe smoker cluster and crusted chimneys had it.
- Axial `site.json`: `bodyGlow: 0.5` on the five chimneys. Axial `mission.json`: vent-preset overrides (the same keys Beebe already uses, milder): `smokeOpacitySulfide`, `smokeColorSulfide`, `ambientFill`, `hullLight`, `hazeGlow`, `glowIntensity/Lights/Drop/Standoff`. Real-site facts and notes are unchanged.

**Screenshots** (mission opening, High, desktop 1600x900 and portrait 390x844, frame 2 = plume settled):

- Before: `.cache/golden/2026-10-27-004623/axial-seamount-ashes-2-mission.png` and `-portrait-2-`.
- First attempt (too hot, orange sub): `.cache/golden/2026-10-27-005002/`.
- After: `.cache/golden/2026-10-27-005250/axial-seamount-ashes-2-mission.png` and `-portrait-2-`.

**Honest score:** about 3.0 to 3.4. The chimneys now read as warm, lit, glowing cones with an orange hot-water haze at their base, the seabed picks up a warm pool, and the smoke is darker and denser. The sub, the seabed and a lit subject are all readable. Still weak: Mushroom is 4 m tall and 110 m away (the scan-floor rule keeps the spawn outside 100 m), so the subject is a few dozen pixels. The seabed carries harsh orange blotches from the biome texture, which now read stronger, and the plume is a big grey column that dominates the frame.

**What remains:** an approach-frame composition (for example, a closer free-dive or first-approach shot), the biome blotch colour, and the plume size. Hunga (dark subject) and Kama (first chimney hidden by the pillow prop) are untouched; the golden aliases are ready, but no BEFORE for them was captured.
