# V-beebe: Beebe trunk surface and golden pose 2

## What changed
- `src/world/props/geo/crust.ts`: trunk branch of `paintCrust` adds vertical mineral streaks (long in y, tight around the axis), a soot-black orifice rim/bowl, softer crest oxide and a retuned brightness. Colours only, so triangle and draw budgets are unchanged.
- `src/world/props/geo/smokers.ts`: Beebe hero body self-lit tint 0.13 to 0.16 (per-hero value in the existing `beebeHero` ternaries, no site id test in shared code).
- `tools/beebe-poses.json` (new) wired in `tools/golden-shots.mjs`: pose 2 stands 44 m out aimed at 16 m up the trunk; pose 3 stands 32 m out, 14 m up. The first-person camera sits about 12 m ahead of the sub, so the previous 40 m / default close shot put the eye only 28 m / 18 m from the axis while aiming 5 m up, cutting off the top and putting the card over it.
- Snapshot re-baseline (deliberate): geometry/buffer digests in `beebeIsolation` and `terrainMerge1140` changed because vertex colours changed; triangles and draws in the same snapshots are identical. No assertion loosened.

## Visual review
Shots in `.cache/codex/shots/V-beebe/` (before-*, after-*).
- High desktop pose 2: whole trunk and both smoke columns in frame, trunk top at about y=320 versus card bottom 236, so the card clears it. Phones: portrait 390x844 trunk top at y~410 (card ends 195); landscape 844x390 top just under the card on Low (card ends ~115, top ~140). Trunk is dim but readable on High; honest verdict: better, not a hero still yet.
- Close pose 3 (High and Low): three orifices read as black mouths with smoke, flute streaks visible.
- Low: the coarse mesh averages the streaks, so the trunk still reads as a warm terracotta flute cone with little crust relief; geometry (not colour) is the limit and the Low triangle budget is pinned. Follow-up idea: a Low-only normal/bump or a darker Low palette.
- Not done: no ring/shelf count change (would alter budgets); mission opening camera itself unchanged (the framing spec still passes).
