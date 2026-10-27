# V-eight-sites-lit: Axial part

**What changed (net: +1 optional data field, no new system, no site branches):**

- `tools/golden-options.mjs`: aliases `axial`, `kama`, `hunga` for `GOLDEN_SITES` (the heroes for all three were already configured).
- `bodyGlow` is now an optional per-prop manifest field (`SiteManifest.ts`). `VENT_BUILDERS.chimney` applies the shared `vertexGlow` to plain chimneys that set it. Before, only the Beebe smoker cluster and crusted chimneys had it.
- Axial `site.json`: `bodyGlow: 0.5` on the five chimneys. Axial `mission.json`: vent-preset overrides (the same keys Beebe already uses, milder): `smokeOpacitySulfide`, `smokeColorSulfide`, `ambientFill`, `hullLight`, `hazeGlow`, `glowIntensity/Lights/Drop/Standoff`. Real-site facts and notes are unchanged.

**Rework after review** (the first pass spilled orange onto the seabed and hull): dropped the `ambientFill` and `hullLight` overrides, and kept the glow local. The two default glow lights now sit at the cone tops (`glowDropM` 0.5, `glowStandoffM` 1.5, `glowDistanceM` 28, `glowIntensity` 700), with `hazeGlow` 0.35 and `bodyGlow` 0.6 on the chimneys. The overrides are now only those, plus the Beebe-style dark dense smoke.

**Tests changed (legitimate):** `siteManifest.test.ts` prop-profile count 6 to 11 (five Axial props now carry data). `props-geo` snapshots for Axial (3) were regenerated because the chimney material gained the glow. `presets.test.ts` now reads a small table of authored glow values per site instead of hard-coding Beebe.

**Screenshots** (mission opening, High, frame 2 = plume settled; desktop and `-portrait-2-`):

- Before: `.cache/golden/2026-10-27-004623/axial-seamount-ashes-2-mission.png`
- Too hot (rejected): `.cache/golden/2026-10-27-005250/`
- After: `.cache/golden/2026-10-27-011935/axial-seamount-ashes-2-mission.png`

**Honest score:** about 3.2 (before 3.0). The seabed and sub look as before, the chimney tops carry a warm glow, and the smoke is darker and denser. Not a big gain: Mushroom is 4 m tall at 110 m (the scan-floor rule), so the lit subject is still a few dozen pixels, and the plume column dominates the frame.

**Gates:** `PW_PORT=4711 tools/gates.sh` passes (smoke plus project-base).

**What remains:** an approach composition or closer first frame for Axial, and a smaller or lighter plume. Hunga (dark subject) and Kama (first chimney hidden by the pillow prop) are untouched; the golden aliases are ready, but no BEFORE was captured for them.
