# V-deep-upper-frame

Built: the existing deep-water backdrop dome (`src/world/presets/TitanicHorizon.ts`, tuned by `ABYSS_HORIZON` in `src/core/config/atmosphere.ts`) now carries the whole water-column treatment; nothing parallel was added.

- Down-welling crown: the dome's upper colour is never darker than a fixed share (`downwell`) of the way from fog to the site's haze colour (per-channel max, so brighten only). The haze ramp is also steeper (sqrt) and starts lower (`fogMatchElevation` 0.2 -> 0.08), so the band just above the horizon lifts sooner.
- Sparse marine snow: 160 fixed motes on the upper dome (one `Points` draw, additive, fog off), slowly rotating; scaled by the tier particle budget and absent on Low (Low keeps the free gradient).
- Trench preset now builds the default dome, so Challenger (no authored horizon) gets the same treatment. Titanic, Axial and Beebe already had domes via site data; their per-site haze colours drive the gradient hue. No site branches.

See it: `GOLDEN_SITES=titanic,axial-seamount-ashes,challenger-deep,beebe-vent-field tools/golden.sh`. Before/after in `.cache/codex/shots/V-deep-upper-frame/` (`before-*` / `after-*-1-mission.png`).

Rating vs target: Beebe and Challenger read as lit water with drifting snow (about 7); Axial improved (about 6.5); Titanic about 6: crown and snow help but the strip just above the horizon is still the dark fog colour, because the far seabed fades into it. Lifting that further means raising fog lift, which changes seabed look; left alone.

Gaps: snow is static in view (no parallax, only a slow yaw drift); Titanic horizon strip still dark.
Rebaselined: see CHANGELOG if any (none unless listed there).
