# V-eight-sites-lit (f): Hudson Canyon ledge lit at the opening

Shots: `.cache/codex/shots/V-eight-sites-lit-f/{before,after}-{desktop,portrait}.png` (mission opening, High tier, 1600x900 and 390x844, via `GOLDEN_MODE=mission GOLDEN_SITES=hudson-canyon`).

## What changed

- `src/world/props/geo/coral.ts`: strengthened and warmed the existing `vertexGlow` lift on the coral-mound body (0.3 to 0.45, tint 0xf0dcb4, floor 0.2) and colonies (0.4 to 0.5, tint 0xf6e6c4, floor 0.45). Parameter change only; no new code path, no site id. Blake shares the prop and gets the same lift.
- The "ledge" at Hudson is this procedural mound prop, which has no per-site tint field, so the shared glow parameters were the only existing lever. Site ambient already carries Hudson (intensity 15).

## Tier behaviour

Same shader injection on every tier; no extra geometry or draw calls.

## Rating (conservative)

| Shot            | Before | After |
| --------------- | ------ | ----- |
| Hudson desktop  | 3.2    | 3.5   |
| Hudson portrait | 3.0    | 3.3   |

## Gaps

- The mound is small and sits mostly behind the sub in the opening frame, so it is a modest warm-ivory lump with pale top and darker lower edge, not a broad shelf. Reading it as a shelf needs framing or a larger prop, not more glow (more would wash out the colony texture).
- Upper half of the frame is still dark open water.
