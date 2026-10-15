# V-lander: weathered Challenger Deep lander (DIRECTOR item 10)

## What changed

File: `src/world/props/geo/lander.ts` only. No site branches, no settings, no new helpers
(uses `lerp` and `smoothstep` from `src/util/math.ts`).

- Palette (director review round 2): the frame is a mid grey-ochre (`0x5b5a52`, matte roughness
  0.85), the pressure housing is a dull grey, and the flotation spheres are orange-yellow instead
  of bright yellow glass. The bait arm and cage are a dark mesh and slightly thicker.
- Mast: thicker (radius 0.05 of the scale) with a dark cap at the top; the strobe is smaller.
- Weathering pass (`weather()`): a per-vertex pass over the merged frame, so no extra triangles
  or draw calls. Sediment darkens the lower 40% of the height with vertical streaks that follow
  the angle around each leg, strongest at the seabed. Dark brown rust stains patch the lower
  structure below about 1.6 units.
- Legs use four height rings instead of one, so the grime gradient runs along the leg.
- Sediment rings settle around each foot pad.
- Details: a dark camera lens dome, an acoustic release (dark body with an orange ring) on the
  ballast plate opposite the camera, and a coil of cable lying on the seabed.
- Unchanged: footprint, height, mast, flag, strobe, bait cage, `colliders`, `bounds` envelope
  (new parts stay within the existing extents), impostor colour, and the three-draw-call count.

## Screenshots

Golden capture, `GOLDEN_SITES=challenger-deep`, high tier, pose `leggo-lander-marker`:

- Before: `.cache/codex/shots/V-lander/before/challenger-deep-2.png`, `challenger-deep-3.png`,
  `challenger-deep-portrait-2.png` (and `-1`, `-3` variants)
- After: `.cache/codex/shots/V-lander/after/challenger-deep-2.png`, `challenger-deep-3.png`,
  `challenger-deep-portrait-2.png` (and `-1`, `-3` variants)

Judgement: the lander reads as a worn benchmark frame with dark, sedimented feet and an orange
flotation cluster. It is not too dark, and the legs and mast stay readable against the seabed.
The upper frame is still fairly clean. That is deliberate, so the wear stays on the lower
structure.

## Gates

- `PW_PORT=4871 tools/gates.sh --no-e2e`: PASS (content, build, unit, attribution, prettier).
- `PW_PORT=4871 tools/gates.sh` (default, smoke and project-base): PASS (python, content, build,
  unit, e2e smoke, e2e-base, attribution, prettier). Exit 0. Run again after the round-2 changes.

## Follow-ups

- Triangle count was not measured. The additions are a few low-segment primitives plus four
  height rings on each leg, all built at the existing `seg` density. Low tier uses the same
  builder with `seg` = 5 and a lower sphere detail.
