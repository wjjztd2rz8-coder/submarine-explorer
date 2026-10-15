# V-lander: weathered Challenger Deep lander (DIRECTOR item 10)

## What changed

File: `src/world/props/geo/lander.ts` only. No site branches, no settings, no new helpers
(uses `lerp` and `smoothstep` from `src/util/math.ts`).

- Palette: aluminium and the pressure housing are greyer and less white; flotation spheres are
  orange-yellow instead of bright yellow glass.
- Weathering pass (`weather()`): a per-vertex pass over the merged frame, so no extra triangles
  or draw calls. Sediment darkens the lower sections (strongest at the seabed), and irregular
  rust stains patch the structure below about 1.6 units.
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
- `PW_PORT=4871 tools/gates.sh` (default, smoke and project-base): see the result line below.

## Follow-ups

- Triangle count was not measured. The additions are a few low-segment primitives plus four
  height rings on each leg, all built at the existing `seg` density. Low tier uses the same
  builder with `seg` = 5 and a lower sphere detail.
