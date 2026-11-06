# V-closeup-materials (Lost City tower detail frame)

## Changes

- `src/world/LostCityCarbonate.ts`: detail tiers (medium/high/ultra) add a screen-space bump from an analytic flute field (two sine octaves per triplanar wall axis, phase drifting with height so flutes meander and pinch out). Amplitude 0.09 m, fades out 8-55 m. Analytic on purpose: a first attempt that took derivatives of the striation texture was noisy (per-texel derivative steps showed as vertical pixel streaks). Low tier skips it (no extra texture reads, no extra draw call).
- `src/world/props/geo/towers.ts`: ridge amplitude 0.13/0.10 to 0.18/0.14 and terrace ledge 0.06 to 0.09 on the tower columns (same vertex count); a soft biofilm tint hugging the base in the vertex paint.
- `src/world/props/geo/spire.ts`: trunk flute amplitude eases to about 55% over the top 20% of the column (smoothstep 0.8-0.97), which removed a serrated zig-zag facet the stronger ridges made on the crater rim (`a4-3.png` has it, `a5-3.png` is clean). Trunk-style spires elsewhere get the same rim easing.
- No new lights, no pose/framing change, no site branch (the material and builder are already the carbonate-tower ones; lone carbonate chimneys use the same path).

## Simplicity rules

1 net simpler: no new elements or settings, two constants added to the existing surface table. 4: no site branch. 7: comments explain why.

## Evidence

`.cache/codex/shots/V-closeup-materials/`: `before-3.png` and `before-2.png` (lost-city free-dive hero poses), `a5-3.png` (after, rim fixed; `a4-*` is the pre-fix pass). Mission openings are unchanged at scan distance (fluting fades by 55 m).

## Rating and remaining issues

Detail frame about 5.5/10 (was about 4.5); rim re-checked clean. Fluting and ridges now read on the crown and trunk, base is slightly greener. Still: the trunk is one large smooth-ish pillar with no real overhanging ledges or porous texture beyond about 18 m; tower still reads cream/blue-grey more than white; no true carbonate chimney "knobs". Beebe and Axial use other builders and are unaffected.
