# V-beebe-close

## What changed (data only)

- `data/landmarks/beebe-vent-field/mission.json` environment overrides: `ambientFill` 8 -> 6, `hullLight` 0.2 -> 0.27 (hull brightness held), `glowIntensity` 650 -> 3000, `glowDistanceM` 80 -> 60 (brighter but more local vent glow).
- `data/landmarks/beebe-vent-field/site.json` `atmosphere.lamps`: headlight 0.55 -> 0.45, fill 0.6 -> 0.35, so the lamps stop flooding the crust flat brown.
- No shared code or material changes. Tests: expected values updated in `presets.test.ts` and `siteManifest.test.ts`; Low sweep snapshots updated for the intended Beebe change.
- Tried ambientFill 2: darker still, but the hero readability invariant (ambient >= 6 without lamps) rightly rejects it, so 6 is the floor.

## Evidence

Before: `.cache/golden/2026-10-16-204522/beebe-vent-field-{2,3}.png`. After: `.cache/golden/2026-10-16-213703/beebe-vent-field-{2,3}.png` (worktree; frame 3 is the close pose).

## Honest rating

About 4.0 (from 3.8). Seabed and the far smoker now glow warm orange against a darker surround; the close flank has more value range and less beige wash.

## Remaining weakness

The close chimney flank is still mid-brown rather than dark basalt with bright crust highlights: its colour comes from material and lamp tint, and the ambient floor is pinned by the readability test. The glow at the mouth of the main stack is still faint; a visible mouth glow would need an emissive on the orifice (geometry/material work), not just light tuning.
