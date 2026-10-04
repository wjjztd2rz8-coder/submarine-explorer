# Environment presets

Each dive selects a site effect after its props and POIs load. `?preset=<name>`
forces a preset for inspection. Otherwise `mission.json` `environment.preset`
wins, then the landmark `type` in `data/landmarks.json`, then `default`.
`mission.json` `environment.overrides` applies over `Config.presets.<name>`;
unknown, mistyped, nonfinite, negative values for nonnegative defaults, and
unbounded numeric overrides are ignored with a console warning. A forced
different preset does not inherit another preset's mission overrides.

| Type                | Preset   | Effect                                                             | Added draw calls observed in Chromium |
| ------------------- | -------- | ------------------------------------------------------------------ | ------------------------------------: |
| `vent`              | vent     | Chimney or vent-POI plumes, heat shimmer, local glow, upwelling    |                                     2 |
| `seep`              | brine    | Thin brine layer and mist at an explicit or locally searched depth |                                     2 |
| `canyon`            | canyon   | Terrain-guided, capped current and sediment plumes                 |                                     1 |
| `reef`, `hole`      | reef     | Shallow shafts, warmer ambient, stronger caustics                  |                                     1 |
| `trench`            | trench   | Hadal fog and darkness, pressure-creak cadence                     |                                     0 |
| `wreck`             | wreck    | Seabed haze and hull motes                                         |                                     2 |
| `seamount`, `ridge` | seamount | Local light at vent POIs                                           |                                     0 |
| other               | default  | Depth-band atmosphere only                                         |                                     0 |

Draw calls are the preset objects' `stats.draws`, checked by Playwright at
1280×800 in Chromium; visible calls can be lower when a material is culled or
the effect is outside view. Particle counts depend on graphics tier. `low`
allocates no preset draw geometry or glow lights; current force and trench
events still run. `medium` uses half the high-tier particle count. The global
`maxParticles` cap applies to each preset.

Sulfide sites may explicitly enable `hazeGlow` (default 0) for one additional
additive hot-water haze draw shared by all orifices. Beebe enables it at 0.5;
`hazeGlowSizeM` controls the sprites' size (default 7 m). Generic vent presets
retain the two-draw budget above, and carbonate fluid never adds this hot haze.

The base current is the attributed [offline HYCOM site grid](currents.md).
The canyon bends and scales that base flow; it does not add a separate fixed
current. The current's bearing is the direction water flows **toward**: 0° north
(`-Z`), 90° east (`+X`). Its vector is capped at `maxCurrentMps`, then coupled
toward the submarine's velocity at `currentCouplingPerS` over the fixed-step
simulation time. Zero current leaves ordinary submarine velocity and drag
untouched. A frozen briefing/globe frame supplies zero simulation time, so
the current cannot move the boat during a pause. `env:current` emits on a
material change in speed or bearing. `env:trench` emits at depth-dependent
intervals below 6,000 m; the audio system plays a captioned hull creak after
unlock, sharing the normal pressure-creak cooldown.

The particle materials approximate headlight falloff around the sub and match
the scene's exponential fog. Vent shimmer is a local multiply-blended sprite
ripple, not screen-space refraction. Brine sheen uses a procedural surface
normal, not a reflection texture. The presets adjust the mutable sample from
`Atmosphere.update()` each frame and copy fog, background, ambient and caustic
changes back to the scene. Atmosphere samples fresh depth-band values each
frame, so modifiers do not accumulate. The reef preset cannot extend the
base caustic projector below its configured 60 m range; it only strengthens
it where present. Trench grade and snow values are read later in the same
frame. Low-tier preset visuals, including ambient modifiers, are disabled.

Lost City uses the `fluid: "carbonate"` override in its mission file. Its
reconstructed chimneys emit pale carbonate plumes with faint glow, reflecting
the site's geology rather than generic dark sulfide smoke. The Blake Plateau
coral site is currently typed `ridge`, which maps to `seamount` under the
generic contract; its forthcoming content pack should specify
`environment.preset: "reef"` if reef lighting is wanted there. The data tile
and placed props remain distinct: preset particles and glows are visual
interpretations, not observations or survey measurements.

Representative screenshots: [Lost City carbonate vent](img/presets/lost-city.png),
[forced vent fixture](img/presets/vent.png), [brine](img/presets/brine.png),
[canyon](img/presets/canyon.png), [reef](img/presets/reef.png),
[trench](img/presets/trench.png), [wreck](img/presets/wreck.png),
[seamount](img/presets/seamount.png), and [default](img/presets/default.png).
They were captured by `tests/e2e/presets.spec.ts` on the C3 build. Their
forced-preset scenes demonstrate the renderer and do not imply that those
sites have the depicted feature.
