# V-deep-upper-frame

Built: the existing deep-water backdrop dome (`src/world/presets/TitanicHorizon.ts`, tuned by `ABYSS_HORIZON` in `src/core/config/atmosphere.ts`) now carries the whole water-column treatment; nothing parallel was added.

- Down-welling crown: the dome's upper colour is never darker than a fixed share (`downwell`) of the way from fog to the site's haze colour (per-channel max, so brighten only). The fog-matched horizon ring and its ramp are unchanged, so the seam guard in `titanicHorizon.test.ts` still holds.
- Sparse marine snow: a hashed dot grid painted by the dome's own fragment shader (`onBeforeCompile`, additive, upper elevations only, slow yaw drift). No extra draw, object or particle buffer, so the draw and scene-child budgets are unchanged; density scales with the tier particle budget and Low keeps the plain vertex-colour dome. (A first version used a separate `Points` object; it broke the seam raycast and draw-budget tests and was replaced.)
- Trench preset now builds the default dome, so Challenger (no authored horizon) gets the same treatment. Titanic, Axial and Beebe already had domes via site data; their per-site haze colours drive the gradient hue. No site branches.

See it: `GOLDEN_SITES=titanic,axial-seamount-ashes,challenger-deep,beebe-vent-field tools/golden.sh`. Before/after in `.cache/codex/shots/V-deep-upper-frame/` (`before-*` / `after-*-1-mission.png`).

Rating vs target: Beebe and Challenger read as lit water with drifting snow (about 7); Axial improved (about 6.5); Titanic about 6: crown and snow help but the strip just above the horizon is still the dark fog colour, because the far seabed fades into it. Lifting that further means raising fog lift, which changes seabed look; left alone.

Gaps: snow has no parallax, only a slow yaw drift; Titanic horizon strip still dark.
Rebaselined (intended): `tests/unit/__snapshots__/enduranceAtmosphere.test.ts.snap`, only the dome colour-attribute hash (brighter crown). No test assertions were loosened.
