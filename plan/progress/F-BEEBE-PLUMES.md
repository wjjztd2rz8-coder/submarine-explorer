# F-BEEBE-PLUMES

## What changed
- `src/world/props/geo/plume.ts`: new `billow` mode in `makePlume` (still one Points draw, all motion in the vertex shader). Buoyant jet profile, radius swelling faster than linear, per-particle radial bias, height lobes and swirl, per-particle sprite size, drift growing as t^1.6. Fragment: rotated domain-warped noise puff, dense dark core (`core` colour) near the orifice fading to grey haze. `smokePlume` uses it and adds a child `plume-orifice-shimmer` Points (small warm-white flecks). `billowRadius` is a CPU mirror used by tests.
- `src/world/props/geo/smokers.ts`: plume count 150 x tier, culling bounds widened.
- `src/world/presets/VentPreset.ts` (outside the owned list; separate commit, easy to drop): the dominant funnels at Beebe are the VentPreset smoke, not `smokePlume`. Its radius `aSeed.z * pow(t,1.35)` filled a disc to a hard cone edge. Added height-dependent lobes, per-puff bias with a few stragglers, stronger meander/turbulence. No new draws, no per-frame CPU.
- Tests: `tests/unit/props-geo.test.ts` (smoke plume block), `tests/e2e/f-beebe-plumes.spec.ts` (3 distances + low tier, count comparison).

## Shots
`.cache/codex/shots/f-beebe-plumes/beebe-{wide,mid,close,low-tier}.png` (1280x720, HUD on). Before: golden `2026-10-03-175107/beebe-vent-field-1.png`.

## Limits
- Looks judged under SwiftShader only; on-device colour/overdraw not measured. Preset smoke count is unchanged (12000 default) so cost is as before; prop plumes scale with `GeoDetail.plume`.
- The prop-plume drift direction is fixed in prop space, not wired to the live current (the preset smoke is).
- Plumes are unlit (fog only), so the dark core is a colour, not shaded.
