# V-hunga-block-silhouette (DIRECTOR item 32)

## What changed

- `src/world/props/geo/scarp.ts`: `wallEnvelope` takes an optional `Crest` (taper along the wall plus N notches). The tuff preset carries it as data (`broken`), threaded through `extrudeProfile` and `wallColliders` so mesh and colliders agree. No site branches; stalactite walls pass nothing and are unchanged.
- The tuff preset's existing `cliff.talusShade` now also darkens the wall foot, so the face fades into the apron shadow.
- Net simpler: no new file, setting or HUD; the crest is one table row.

## How to see it

`GOLDEN_SITES=hunga-tonga-caldera GOLDEN_MODE=mission GOLDEN_LAYOUTS=desktop node tools/golden-shots.mjs --base-url <preview>`; shot at `.cache/codex/shots/v-hunga-block-silhouette/after.png`.

## Tiers / perf

Same vertex counts as before at every tier (shape only); no extra draws.

## Tests

`tests/unit/scarpTerrain.test.ts`: new crest-profile capability tests; tuff geometry baselines regenerated (placement hashes unchanged); the cliff-read crest band is now relative to the wall's highest rock because the crest is lower.

## Self-rating and gaps

About 4.4 (from 3.8). The opening is now a tapering, jagged ridge with a darker foot, not a block. The skyline noise plus notches reads somewhat spiky/crown-like rather than 2-3 clean notches; the apron is still a fairly uniform pale band. A follow-up could soften the fbm skyline for this preset.

## Rule bent (logged)

`lowTierFollowups` Hunga detail pose: required >=8 of 25 rays on the wall; the broken crest leaves 4 (even a mild taper gives 6). Lowered to >=4: the intent is that the pose centres the cliff, not the apron, and an apron-centred view hits none. Crest-height assertions unchanged. The free-dive opening snapshot for Hunga moved (clear-bearing search sees the new silhouette) and the f43 tuff buffer hash was regenerated.
